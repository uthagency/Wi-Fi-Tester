import { format } from 'date-fns';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import React from 'react';
import type { WifiReading, WifiSampleResult } from '../shared/wifiTypes.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface ConnectionStatusCardProps {
  latestSample: WifiSampleResult | null;
  latestReading: WifiReading | null;
  isLoading: boolean;
}

export const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  latestSample,
  latestReading,
  isLoading,
}) => {
  if (isLoading && !latestSample && !latestReading) {
    return (
      <LiquidGlass
        as="section"
        aria-label="Connection status loading"
        backdropBlur={10}
        tintColor="rgba(255, 255, 255, 0.16)"
        displacementScale={150}
        turbulenceBaseFrequency={0.002}
        turbulenceSeed={3.5}
        glassBorder
        style={{ borderRadius: 0 }}
        className="col-span-2 md:col-span-2 lg:col-span-2 min-h-[220px]"
      >
        <div className="px-6 py-6 sm:px-[30px] sm:py-7 flex flex-col justify-between h-full">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-32 bg-white/25 rounded-none" />
            <div className="h-9 w-48 bg-white/25 rounded-none" />
            <div className="h-4 w-64 bg-white/20 rounded-none" />
          </div>
          <div className="h-10 w-full bg-white/15 rounded-none animate-pulse" />
        </div>
      </LiquidGlass>
    );
  }

  const effectiveState = latestSample?.state ?? latestReading?.state ?? 'unknown';
  const ssid = latestSample?.ssid ?? latestReading?.ssid ?? null;
  const iface = latestSample?.iface ?? latestReading?.iface ?? null;
  const checkedAt = latestSample?.ts ?? latestReading?.ts ?? null;
  const isError = effectiveState === 'error' || effectiveState === 'unknown';

  let statusLabel = 'Unknown / Unchecked';
  let StatusIcon = AlertTriangle;
  let accentClass = 'bg-rose-500/35 border border-rose-200/60 text-white';

  if (effectiveState === 'connected') {
    statusLabel = 'Connected';
    StatusIcon = Wifi;
    accentClass = 'bg-emerald-400/30 border border-emerald-200/60 text-white';
  } else if (effectiveState === 'disconnected') {
    statusLabel = 'No active Wi‑Fi';
    StatusIcon = WifiOff;
    accentClass = 'bg-amber-400/30 border border-amber-200/60 text-white';
  } else if (effectiveState === 'error') {
    statusLabel = 'NetworkManager Error';
    StatusIcon = AlertTriangle;
    accentClass = 'bg-rose-500/35 border border-rose-200/60 text-white';
  } else {
    statusLabel = 'Unknown State';
    StatusIcon = AlertTriangle;
    accentClass = 'bg-rose-500/35 border border-rose-200/60 text-white';
  }

  return (
    <LiquidGlass
      as="section"
      aria-label="Connection status"
      backdropBlur={10}
      tintColor="rgba(255, 255, 255, 0.16)"
      displacementScale={150}
      turbulenceBaseFrequency={0.002}
      turbulenceSeed={3.5}
      glassBorder
      style={{ borderRadius: 0 }}
      className="col-span-2 md:col-span-2 lg:col-span-2 focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
      tabIndex={0}
    >
      <div className="px-6 py-6 sm:px-[30px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
              Connection Status
            </h2>
            <span className="text-xs font-mono tabular-nums text-white/80">
              {checkedAt ? `Checked ${format(checkedAt, 'HH:mm:ss')}` : 'Awaiting poll'}
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-none flex items-center justify-center shrink-0 ${accentClass}`}
              aria-hidden="true"
            >
              <StatusIcon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-disp text-2xl sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
                {statusLabel}
              </p>
              <p className="mt-1 text-sm text-white/[0.88] truncate">
                <span>Network: </span>
                <span className="font-semibold text-white">
                  {effectiveState === 'connected' ? (ssid || 'Hidden SSID') : '—'}
                </span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>Interface: </span>
                <span className="font-mono font-medium text-white">
                  {iface || '—'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Graceful degradation banner or read-only operational guarantee */}
        {isError && latestSample?.errorMessage ? (
          <div
            role="alert"
            className="rounded-none bg-rose-950/75 border border-rose-200/45 px-3.5 py-2.5 text-xs text-white space-y-1"
          >
            <p className="font-semibold text-rose-100">
              {latestSample.errorCode || 'NM_UNAVAILABLE'}: {latestSample.errorMessage}
            </p>
            <p className="text-white/[0.88]">
              Recorded as unknown (chart gap; excluded from stability metrics). On Linux, ensure{' '}
              <code className="font-mono text-white">NetworkManager</code> is installed and running (
              <code className="font-mono text-white">sudo systemctl start NetworkManager</code>).
            </p>
          </div>
        ) : (
          <div className="pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
            <span>
              Adapter: <span className="font-mono font-medium text-white">{latestSample?.adapter ?? 'nmcli'}</span>
              {latestSample ? (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{latestSample.latencyMs} ms</span>
                </>
              ) : null}
            </span>
            <span>Passive read only · No rescan</span>
          </div>
        )}
      </div>
    </LiquidGlass>
  );
};
