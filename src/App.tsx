import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStatusCard } from './components/ConnectionStatusCard.tsx';
import { LiquidGlass } from './components/LiquidGlass.tsx';
import { RecentSamplesCard } from './components/RecentSamplesCard.tsx';
import { SignalEstimateCard } from './components/SignalEstimateCard.tsx';
import { SignalTimelineCard } from './components/SignalTimelineCard.tsx';
import { StabilityMetricsCards } from './components/StabilityMetricsCards.tsx';
import { TopBar } from './components/TopBar.tsx';
import { WallpaperSettingsModal } from './components/WallpaperSettingsModal.tsx';
import { normalizeLocationLabel } from './shared/signalTier.ts';
import {
  loadWallpaperSettings,
  resolveWallpaperSrc,
  saveWallpaperSettings,
  type WallpaperSettings,
} from './shared/wallpaperPresets.ts';
import type {
  HistoryResponse,
  LocationSummary,
  PollResponse,
  StabilityMetrics,
  TimelinePoint,
  WifiReading,
  WifiSampleResult,
} from './shared/wifiTypes.ts';

const LOCATION_STORAGE_KEY = 'wifi-tester:active-location';
const POLL_INTERVAL_SECONDS = 10;
const CHECK_NOW_DEBOUNCE_MS = 300;

function getInitialLocation(): string {
  try {
    const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return normalizeLocationLabel(saved);
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return 'Living Room';
}

export default function App() {
  const [activeLocation, setActiveLocation] = useState<string>(getInitialLocation);
  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(
    loadWallpaperSettings,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isAutoPollPaused, setIsAutoPollPaused] = useState<boolean>(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false,
  );
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState<number>(POLL_INTERVAL_SECONDS);

  const [latestSample, setLatestSample] = useState<WifiSampleResult | null>(null);
  const [latestReading, setLatestReading] = useState<WifiReading | null>(null);
  const [metrics, setMetrics] = useState<StabilityMetrics | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [recentReadings, setRecentReadings] = useState<WifiReading[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);

  const activeLocationRef = useRef(activeLocation);
  activeLocationRef.current = activeLocation;

  const lastCheckTriggerRef = useRef<number>(0);
  const pollInFlightRef = useRef<boolean>(false);

  const handleUpdateWallpaperSettings = useCallback((next: WallpaperSettings) => {
    setWallpaperSettings(next);
    saveWallpaperSettings(next);
  }, []);

  const fetchLocationHistory = useCallback(async (location: string) => {
    setIsLoadingHistory(true);
    setMetrics(null);
    setTimeline([]);
    setRecentReadings([]);
    setLatestReading(null);

    try {
      const res = await fetch(`/api/history?location=${encodeURIComponent(location)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as HistoryResponse;
      if (activeLocationRef.current !== location) return;

      setMetrics(data.metrics);
      setTimeline(data.timeline);
      setRecentReadings(data.recentReadings);
      setLatestReading(data.recentReadings[0] ?? null);
      setLocations(data.locations);
      setRequestError(null);
    } catch (err) {
      setRequestError(
        err instanceof Error ? err.message : 'Unable to read local SQLite history.',
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const runPoll = useCallback(async (targetLocation?: string) => {
    const locationToUse = targetLocation ?? activeLocationRef.current;
    if (pollInFlightRef.current) return;

    pollInFlightRef.current = true;
    setIsPolling(true);

    try {
      const res = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationToUse }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as PollResponse;

      setLatestSample(data.sample);
      setSecondsUntilNextPoll(POLL_INTERVAL_SECONDS);
      setRequestError(null);

      // Only hydrate timeline/metrics if user is still viewing the polled location
      if (activeLocationRef.current === data.reading.location) {
        setLatestReading(data.reading);
        setMetrics(data.metrics);
        setTimeline(data.timeline);
        setRecentReadings(data.recentReadings);
      }
      setLocations(data.locations);
    } catch (err) {
      setRequestError(
        err instanceof Error ? err.message : 'Local NetworkManager poll request failed.',
      );
    } finally {
      pollInFlightRef.current = false;
      setIsPolling(false);
    }
  }, []);

  const handleCheckNow = useCallback(() => {
    const now = Date.now();
    if (now - lastCheckTriggerRef.current < CHECK_NOW_DEBOUNCE_MS) {
      return;
    }
    lastCheckTriggerRef.current = now;
    void runPoll();
  }, [runPoll]);

  const handleApplyLocation = useCallback(
    (nextRaw: string) => {
      const normalized = normalizeLocationLabel(nextRaw);
      try {
        window.localStorage.setItem(LOCATION_STORAGE_KEY, normalized);
      } catch {
        // Ignore storage errors
      }
      activeLocationRef.current = normalized;
      setActiveLocation(normalized);
      void fetchLocationHistory(normalized);
    },
    [fetchLocationHistory],
  );

  const handleClearLocation = useCallback(
    async (location: string) => {
      try {
        const res = await fetch(`/api/history?location=${encodeURIComponent(location)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        await fetchLocationHistory(location);
      } catch (err) {
        setRequestError(
          err instanceof Error ? err.message : 'Failed to clear location history.',
        );
      }
    },
    [fetchLocationHistory],
  );

  // Initial load: hydrate selected location history then run initial live poll
  useEffect(() => {
    void (async () => {
      await fetchLocationHistory(activeLocationRef.current);
      await runPoll(activeLocationRef.current);
    })();
  }, [fetchLocationHistory, runPoll]);

  // Automatic 10-second polling while window is visible; pause when hidden to save battery
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsAutoPollPaused(hidden);
      if (!hidden) {
        setSecondsUntilNextPoll(POLL_INTERVAL_SECONDS);
        void runPoll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    const ticker = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      setSecondsUntilNextPoll((prev) => {
        if (prev <= 1) {
          void runPoll();
          return POLL_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(ticker);
    };
  }, [runPoll]);

  const wallpaperSrc = resolveWallpaperSrc(wallpaperSettings);
  const scrimClass =
    wallpaperSettings.readabilityScrim === 'high-contrast'
      ? 'bg-gradient-to-br from-slate-950/55 via-slate-950/45 to-slate-950/60'
      : wallpaperSettings.readabilityScrim === 'minimal'
        ? 'bg-gradient-to-br from-slate-950/15 via-transparent to-slate-950/20'
        : 'bg-gradient-to-br from-slate-950/32 via-slate-950/22 to-slate-950/38';

  return (
    <div className="relative min-h-screen w-full px-[1px] lg:px-[4px] py-2 lg:py-3">
      {/* Stable 100% opacity full-viewport wallpaper across all screens */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-[#0B101B]"
      >
        <img
          src={wallpaperSrc}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-100 select-none"
        />
        <div className={`absolute inset-0 transition-colors duration-200 ${scrimClass}`} />
      </div>

      <TopBar
        activeLocation={activeLocation}
        onApplyLocation={handleApplyLocation}
        onCheckNow={handleCheckNow}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isPolling={isPolling}
        isAutoPollPaused={isAutoPollPaused}
        secondsUntilNextPoll={secondsUntilNextPoll}
      />

      {requestError ? (
        <LiquidGlass
          as="div"
          role="alert"
          backdropBlur={10}
          tintColor="rgba(159, 18, 57, 0.38)"
          displacementScale={150}
          turbulenceBaseFrequency={0.002}
          turbulenceSeed={3.5}
          glassBorder
          style={{ borderRadius: 0 }}
          className="mb-3 md:mb-4"
        >
          <div className="px-4 py-3 text-xs sm:text-sm text-white font-semibold glass-text-shadow">
            Local service error: {requestError}
          </div>
        </LiquidGlass>
      ) : null}

      <main className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 auto-rows-auto">
        <ConnectionStatusCard
          latestSample={latestSample}
          latestReading={latestReading}
          isLoading={isLoadingHistory}
        />

        <SignalEstimateCard
          latestSample={latestSample}
          latestReading={latestReading}
          isLoading={isLoadingHistory}
        />

        <StabilityMetricsCards
          metrics={metrics}
          isLoading={isLoadingHistory}
        />

        <SignalTimelineCard
          location={activeLocation}
          timeline={timeline}
          isLoading={isLoadingHistory}
          onCheckNow={handleCheckNow}
        />

        <RecentSamplesCard
          activeLocation={activeLocation}
          locations={locations}
          recentReadings={recentReadings}
          onSelectLocation={handleApplyLocation}
          onClearLocation={handleClearLocation}
        />
      </main>

      <WallpaperSettingsModal
        isOpen={isSettingsOpen}
        settings={wallpaperSettings}
        onUpdateSettings={handleUpdateWallpaperSettings}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
