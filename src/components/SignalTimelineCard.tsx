import { format } from 'date-fns';
import { LineChart as LineChartIcon, RefreshCw } from 'lucide-react';
import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimelinePoint } from '../shared/wifiTypes.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface SignalTimelineCardProps {
  location: string;
  timeline: TimelinePoint[];
  isLoading: boolean;
  onCheckNow: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TimelinePoint }>;
}

const TimelineTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-none bg-slate-950/90 backdrop-blur-md border border-white/35 px-3.5 py-2.5 shadow-xl text-xs text-white space-y-1">
      <p className="font-mono tabular-nums font-semibold text-white">
        {format(point.ts, 'HH:mm:ss')}
      </p>
      {point.state === 'connected' ? (
        <>
          <p className="font-semibold text-emerald-300">
            Connected · <span className="font-mono tabular-nums">{point.signalValue}%</span> ({point.tier})
          </p>
          <p className="text-white/80">
            {point.ssid || 'Hidden SSID'} · <span className="font-mono">{point.iface || 'wifi'}</span>
          </p>
        </>
      ) : point.state === 'disconnected' ? (
        <p className="font-semibold text-amber-300">No active Wi‑Fi · Plotted at 0%</p>
      ) : (
        <p className="font-semibold text-rose-300">Unknown / failed check · Gap</p>
      )}
    </div>
  );
};

export const SignalTimelineCard: React.FC<SignalTimelineCardProps> = ({
  location,
  timeline,
  isLoading,
  onCheckNow,
}) => {
  const hasPoints = timeline.length > 0;

  return (
    <LiquidGlass
      as="section"
      aria-label={`Signal timeline for ${location}`}
      backdropBlur={10}
      tintColor="rgba(255, 255, 255, 0.16)"
      displacementScale={150}
      turbulenceBaseFrequency={0.002}
      turbulenceSeed={3.5}
      glassBorder
      style={{ borderRadius: 0 }}
      className="col-span-2 md:col-span-4 lg:col-span-3 min-h-[340px] focus-within:ring-2 focus-within:ring-inset focus-within:ring-white"
      tabIndex={0}
    >
      <div className="px-6 py-6 sm:px-[34px] sm:py-7 flex flex-col justify-between gap-4 h-full glass-text-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.04em] text-white/75">
              1-Hour Signal History
            </p>
            <h2 className="mt-1 font-disp text-xl sm:text-[24px] font-semibold tracking-tight text-white">
              Signal Timeline — {location}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-white/[0.88]">
              Observed samples only · Disconnected = 0 · Unknown = gap
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/85 font-mono tabular-nums shrink-0">
            <span>{timeline.length} samples</span>
          </div>
        </div>

        {isLoading && !hasPoints ? (
          <div className="h-[235px] w-full rounded-none bg-white/15 animate-pulse" />
        ) : !hasPoints ? (
          <div className="h-[235px] w-full rounded-none bg-slate-950/35 border border-white/25 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="w-10 h-10 rounded-none bg-white/15 border border-white/30 text-white flex items-center justify-center">
              <LineChartIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-semibold text-white">
                No samples for “{location}” in the last hour
              </p>
              <p className="text-xs text-white/80">
                Keep this window open for automatic 10-second polling or trigger an immediate check.
              </p>
            </div>
            <button
              type="button"
              onClick={onCheckNow}
              className="liquid-control rounded-none inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-950 hover:bg-white/90 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Check now</span>
            </button>
          </div>
        ) : (
          <div className="h-[235px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  scale="time"
                  tickFormatter={(tsVal: number) => format(tsVal, 'HH:mm')}
                  tick={{ fontSize: 11, fill: 'rgba(255, 255, 255, 0.88)' }}
                  stroke="rgba(255, 255, 255, 0.35)"
                  minTickGap={36}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tickFormatter={(val: number) => `${val}%`}
                  tick={{ fontSize: 11, fill: 'rgba(255, 255, 255, 0.88)' }}
                  stroke="rgba(255, 255, 255, 0.35)"
                />
                <Tooltip content={<TimelineTooltip />} />
                <ReferenceLine y={80} stroke="rgba(52, 211, 153, 0.45)" strokeDasharray="4 4" />
                <ReferenceLine y={60} stroke="rgba(56, 189, 248, 0.4)" strokeDasharray="4 4" />
                <ReferenceLine y={40} stroke="rgba(165, 180, 252, 0.38)" strokeDasharray="4 4" />
                <ReferenceLine y={20} stroke="rgba(251, 191, 36, 0.4)" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="signalValue"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={{ r: 2.5, fill: '#38BDF8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#0F172A', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </LiquidGlass>
  );
};
