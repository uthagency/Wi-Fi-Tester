import { Gauge } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { clampSignal, getSignalTier } from '../shared/signalTier.ts';
import type { SignalTier, WifiReading, WifiSampleResult } from '../shared/wifiTypes.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface SignalEstimateCardProps {
  latestSample: WifiSampleResult | null;
  latestReading: WifiReading | null;
  isLoading: boolean;
}

function getTierBarColor(tier: SignalTier | null): string {
  switch (tier) {
    case 'Excellent':
      return '#34D399';
    case 'Good':
      return '#38BDF8';
    case 'Fair':
      return '#A5B4FC';
    case 'Weak':
      return '#FBBF24';
    case 'Very weak':
      return '#FB7185';
    default:
      return '#CBD5E1';
  }
}

export const SignalEstimateCard: React.FC<SignalEstimateCardProps> = ({
  latestSample,
  latestReading,
  isLoading,
}) => {
  if (isLoading && !latestSample && !latestReading) {
    return (
      <LiquidGlass
        as="section"
        aria-label="Signal estimate loading"
        backdropBlur={10}
        tintColor="rgba(255, 255, 255, 0.16)"
        displacementScale={150}
        turbulenceBaseFrequency={0.002}
        turbulenceSeed={3.5}
        glassBorder
        style={{ borderRadius: 0 }}
        className="col-span-2 md:col-span-2 lg:col-span-1 min-h-[220px]"
      >
        <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between h-full">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-28 bg-white/25 rounded-none" />
            <div className="h-9 w-24 bg-white/25 rounded-none" />
            <div className="h-4 w-full bg-white/20 rounded-none" />
          </div>
          <div className="h-6 w-40 bg-white/15 rounded-none animate-pulse" />
        </div>
      </LiquidGlass>
    );
  }

  const effectiveState = latestSample?.state ?? latestReading?.state ?? 'unknown';
  const rawSignal =
    effectiveState === 'connected'
      ? (latestSample?.signal ?? latestReading?.signal ?? null)
      : effectiveState === 'disconnected'
        ? 0
        : null;

  const numericSignal = rawSignal !== null ? clampSignal(rawSignal) : null;
  const tier = effectiveState === 'connected' ? getSignalTier(numericSignal) : null;
  const barColor = getTierBarColor(tier);

  return (
    <LiquidGlass
      as="section"
      aria-label="Signal estimate"
      backdropBlur={10}
      tintColor="rgba(255, 255, 255, 0.16)"
      displacementScale={150}
      turbulenceBaseFrequency={0.002}
      turbulenceSeed={3.5}
      glassBorder
      style={{ borderRadius: 0 }}
      className="col-span-2 md:col-span-2 lg:col-span-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
      tabIndex={0}
    >
      <div className="px-6 py-6 sm:px-[28px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
              Signal Estimate
            </h2>
            <Gauge className="w-4 h-4 text-white/80" aria-hidden="true" />
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="text-3xl font-bold font-mono tabular-nums tracking-tight text-white">
              {numericSignal !== null ? `${numericSignal}%` : '—'}
            </p>
            <span className="text-sm font-semibold text-white">
              {tier ?? (effectiveState === 'disconnected' ? 'Offline' : 'Unavailable')}
            </span>
          </div>

          {/* Sharp square progress bar — zero curved corners */}
          <div
            className="mt-3.5 h-3.5 w-full rounded-none bg-slate-950/45 border border-white/25 overflow-hidden p-0.5"
            role="progressbar"
            aria-valuenow={numericSignal ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Wi-Fi signal strength estimate"
          >
            <motion.div
              className="h-full rounded-none origin-left"
              initial={false}
              animate={{
                width: `${numericSignal ?? 0}%`,
                backgroundColor: barColor,
              }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <p className="mt-2.5 text-[11px] leading-snug text-white/80 tabular-nums">
            &lt;20 Very weak · 20–39 Weak · 40–59 Fair · 60–79 Good · 80–100 Excellent
          </p>
        </div>

        <p className="pt-2.5 border-t border-white/20 text-xs text-white/80">
          NetworkManager estimate — not a calibrated measurement.
        </p>
      </div>
    </LiquidGlass>
  );
};
