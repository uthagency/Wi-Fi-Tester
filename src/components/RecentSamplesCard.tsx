import { format } from 'date-fns';
import { AlertTriangle, Database, MapPin, Trash2, Wifi, WifiOff } from 'lucide-react';
import React, { useState } from 'react';
import { getSignalTier } from '../shared/signalTier.ts';
import type { LocationSummary, WifiReading } from '../shared/wifiTypes.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface RecentSamplesCardProps {
  activeLocation: string;
  locations: LocationSummary[];
  recentReadings: WifiReading[];
  onSelectLocation: (location: string) => void;
  onClearLocation: (location: string) => Promise<void>;
}

export const RecentSamplesCard: React.FC<RecentSamplesCardProps> = ({
  activeLocation,
  locations,
  recentReadings,
  onSelectLocation,
  onClearLocation,
}) => {
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleConfirmClear = async () => {
    await onClearLocation(activeLocation);
    setConfirmingClear(false);
  };

  return (
    <LiquidGlass
      as="section"
      aria-label="Recorded locations and recent readings"
      backdropBlur={10}
      tintColor="rgba(255, 255, 255, 0.16)"
      displacementScale={150}
      turbulenceBaseFrequency={0.002}
      turbulenceSeed={3.5}
      glassBorder
      style={{ borderRadius: 0 }}
      className="col-span-2 md:col-span-4 lg:col-span-2 min-h-[340px] focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
      tabIndex={0}
    >
      <div className="px-6 py-6 sm:px-[30px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
        <div className="space-y-4 min-w-0">
          {/* Saved Locations Switcher — Sharp Square Controls */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h2 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
                <span>Recorded Locations</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-white/80">
                {locations.length} {locations.length === 1 ? 'place' : 'places'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Switch location">
              {locations.map((loc) => {
                const isSelected = loc.location === activeLocation;
                return (
                  <button
                    key={loc.location}
                    type="button"
                    onClick={() => onSelectLocation(loc.location)}
                    className={`rounded-none px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                      isSelected
                        ? 'bg-white text-slate-950 border border-white'
                        : 'bg-slate-950/35 hover:bg-white/20 text-white border border-white/30'
                    }`}
                  >
                    <span>{loc.location}</span>
                    <span className="ml-1.5 font-mono tabular-nums opacity-80">
                      {loc.sampleCount}
                    </span>
                  </button>
                );
              })}
              {!locations.some((l) => l.location === activeLocation) ? (
                <button
                  type="button"
                  onClick={() => onSelectLocation(activeLocation)}
                  className="rounded-none px-3 py-1.5 text-xs font-semibold bg-white text-slate-950 border border-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {activeLocation} · 0
                </button>
              ) : null}
            </div>
          </div>

          {/* Recent Samples List */}
          <div className="pt-3 border-t border-white/20">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
                Recent Checks
              </h3>
              <span className="text-xs text-white/80">Latest for {activeLocation}</span>
            </div>

            {recentReadings.length === 0 ? (
              <p className="text-xs text-white/80 py-6 text-center">
                No readings saved yet for this location.
              </p>
            ) : (
              <div className="max-h-[168px] overflow-y-auto pr-1 divide-y divide-white/15">
                {recentReadings.slice(0, 8).map((row) => {
                  const tier = row.state === 'connected' ? getSignalTier(row.signal) : null;
                  return (
                    <div
                      key={row.id}
                      className="py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {row.state === 'connected' ? (
                          <Wifi className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
                        ) : row.state === 'disconnected' ? (
                          <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" aria-hidden="true" />
                        )}

                        <span className="font-mono tabular-nums text-white/80 shrink-0">
                          {format(row.ts, 'HH:mm:ss')}
                        </span>

                        <span className="text-white font-medium truncate">
                          {row.state === 'connected'
                            ? `${row.ssid || 'Hidden'}`
                            : row.state === 'disconnected'
                              ? 'No active Wi‑Fi'
                              : 'Unknown'}
                        </span>

                        {row.iface ? (
                          <span className="font-mono text-white/75 hidden sm:inline shrink-0">
                            {row.iface}
                          </span>
                        ) : null}
                      </div>

                      <div className="font-mono tabular-nums font-semibold text-white shrink-0">
                        {row.state === 'connected' && row.signal !== null
                          ? `${row.signal}% · ${tier}`
                          : row.state === 'disconnected'
                            ? '0%'
                            : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Local SQLite footer + Clear location action */}
        <div className="pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>SQLite 7-day retention · Zero egress</span>
          </span>

          {recentReadings.length > 0 ? (
            confirmingClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="rounded-none px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="rounded-none px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white border border-white/35 text-[11px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="rounded-none inline-flex items-center gap-1 text-white/85 hover:text-rose-200 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white px-1.5 py-0.5"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                <span>Clear location</span>
              </button>
            )
          ) : null}
        </div>
      </div>
    </LiquidGlass>
  );
};
