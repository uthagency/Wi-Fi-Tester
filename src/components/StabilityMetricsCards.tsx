import { Activity, ShieldCheck } from 'lucide-react';
import React from 'react';
import type { StabilityMetrics } from '../shared/wifiTypes.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface StabilityMetricsCardsProps {
  metrics: StabilityMetrics | null;
  isLoading: boolean;
}

export const StabilityMetricsCards: React.FC<StabilityMetricsCardsProps> = ({
  metrics,
  isLoading,
}) => {
  if (isLoading && !metrics) {
    return (
      <>
        <LiquidGlass
          as="section"
          aria-label="Online when checked loading"
          backdropBlur={10}
          tintColor="rgba(255, 255, 255, 0.16)"
          displacementScale={150}
          turbulenceBaseFrequency={0.002}
          turbulenceSeed={3.5}
          glassBorder
          style={{ borderRadius: 0 }}
          className="col-span-1 md:col-span-2 lg:col-span-1 min-h-[220px]"
        >
          <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between h-full">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-28 bg-white/25 rounded-none" />
              <div className="h-9 w-20 bg-white/25 rounded-none" />
            </div>
            <div className="h-5 w-32 bg-white/15 rounded-none animate-pulse" />
          </div>
        </LiquidGlass>

        <LiquidGlass
          as="section"
          aria-label="Observed dropouts loading"
          backdropBlur={10}
          tintColor="rgba(255, 255, 255, 0.16)"
          displacementScale={150}
          turbulenceBaseFrequency={0.002}
          turbulenceSeed={3.5}
          glassBorder
          style={{ borderRadius: 0 }}
          className="col-span-1 md:col-span-2 lg:col-span-1 min-h-[220px]"
        >
          <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between h-full">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-28 bg-white/25 rounded-none" />
              <div className="h-9 w-16 bg-white/25 rounded-none" />
            </div>
            <div className="h-5 w-32 bg-white/15 rounded-none animate-pulse" />
          </div>
        </LiquidGlass>
      </>
    );
  }

  const onlinePct = metrics?.onlineWhenCheckedPct ?? null;
  const validChecks = metrics?.validChecks ?? 0;
  const connectedChecks = metrics?.connectedChecks ?? 0;
  const unknownChecks = metrics?.unknownChecks ?? 0;
  const dropouts = metrics?.observedDropouts ?? 0;

  return (
    <>
      {/* Card 3: Online when checked */}
      <LiquidGlass
        as="section"
        aria-label="Online when checked"
        backdropBlur={10}
        tintColor="rgba(255, 255, 255, 0.16)"
        displacementScale={150}
        turbulenceBaseFrequency={0.002}
        turbulenceSeed={3.5}
        glassBorder
        style={{ borderRadius: 0 }}
        className="col-span-1 md:col-span-2 lg:col-span-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
        tabIndex={0}
      >
        <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
                Online When Checked
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
            </div>

            <p className="mt-3 text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight text-white">
              {onlinePct !== null ? `${onlinePct}%` : '—'}
            </p>

            <p className="mt-2 text-xs text-white/[0.88] tabular-nums">
              {validChecks > 0
                ? `${connectedChecks} / ${validChecks} valid checks`
                : 'No valid checks in last hour'}
            </p>
          </div>

          <div className="pt-2.5 border-t border-white/20 text-xs text-white/80 tabular-nums">
            Last hour · {unknownChecks > 0 ? `${unknownChecks} unknown excluded` : 'All checks valid'}
          </div>
        </div>
      </LiquidGlass>

      {/* Card 4: Observed dropouts */}
      <LiquidGlass
        as="section"
        aria-label="Observed dropouts"
        backdropBlur={10}
        tintColor="rgba(255, 255, 255, 0.16)"
        displacementScale={150}
        turbulenceBaseFrequency={0.002}
        turbulenceSeed={3.5}
        glassBorder
        style={{ borderRadius: 0 }}
        className="col-span-1 md:col-span-2 lg:col-span-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
        tabIndex={0}
      >
        <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
                Observed Dropouts
              </h2>
              <Activity
                className={`w-4 h-4 shrink-0 ${dropouts > 0 ? 'text-amber-300' : 'text-white/80'}`}
                aria-hidden="true"
              />
            </div>

            <p className="mt-3 text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight text-white">
              {dropouts}
            </p>

            <p className="mt-2 text-xs text-white/[0.88]">
              Connected → Disconnected ≤ 35 s
            </p>
          </div>

          <div className="pt-2.5 border-t border-white/20 text-xs text-white/80">
            Failed checks break comparison
          </div>
        </div>
      </LiquidGlass>
    </>
  );
};
