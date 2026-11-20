import { MapPin, RefreshCw, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { MAX_LOCATION_LENGTH, normalizeLocationLabel } from '../shared/signalTier.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface TopBarProps {
  activeLocation: string;
  onApplyLocation: (nextLocation: string) => void;
  onCheckNow: () => void;
  onOpenSettings: () => void;
  isPolling: boolean;
  isAutoPollPaused: boolean;
  secondsUntilNextPoll: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeLocation,
  onApplyLocation,
  onCheckNow,
  onOpenSettings,
  isPolling,
  isAutoPollPaused,
  secondsUntilNextPoll,
}) => {
  const [draftLocation, setDraftLocation] = useState(activeLocation);

  useEffect(() => {
    setDraftLocation(activeLocation);
  }, [activeLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeLocationLabel(draftLocation);
    setDraftLocation(normalized);
    onApplyLocation(normalized);
  };

  return (
    <LiquidGlass
      as="header"
      backdropBlur={10}
      tintColor="rgba(255, 255, 255, 0.16)"
      displacementScale={150}
      turbulenceBaseFrequency={0.002}
      turbulenceSeed={3.5}
      glassBorder
      style={{ borderRadius: 0 }}
      className="mb-3 md:mb-4"
    >
      <div className="px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6 glass-text-shadow">
        {/* Brand + Active Location */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/assets/aistudio/App_logo_7d567632.svg"
              alt="Wi-Fi Tester application logo"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-none shrink-0 object-cover border border-white/40"
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight whitespace-nowrap">
                Wi‑Fi Tester
              </h1>
              <p className="text-xs sm:text-sm text-white/[0.88] truncate">
                Location: <span className="font-semibold text-white">{activeLocation}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {isAutoPollPaused ? 'Poll paused' : `Next poll ${secondsUntilNextPoll}s`}
                </span>
              </p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onOpenSettings}
              aria-label="Open wallpaper settings"
              className="liquid-control rounded-none inline-flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] bg-white/15 hover:bg-white/25 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onCheckNow}
              disabled={isPolling}
              className="liquid-control rounded-none inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-white text-slate-950 hover:bg-white/90 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
            >
              <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Check now</span>
            </motion.button>
          </div>
        </div>

        {/* Location Label Sharp Square Input + Desktop Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 lg:gap-3 shrink-0">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 w-full sm:w-auto"
            aria-label="Set location label"
          >
            <div className="relative flex-1 sm:w-64 md:w-72">
              <MapPin
                className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={draftLocation}
                maxLength={MAX_LOCATION_LENGTH}
                onChange={(e) => setDraftLocation(e.target.value)}
                placeholder="Location label (blank = Unlabelled)"
                aria-label="Location label"
                className="liquid-input rounded-none w-full pl-9 pr-3.5 py-2 min-h-[42px] text-sm text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="liquid-control rounded-none px-4 py-2 min-h-[42px] bg-white/20 hover:bg-white/30 text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              Apply
            </motion.button>
          </form>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onOpenSettings}
            className="hidden lg:inline-flex liquid-control rounded-none items-center justify-center gap-2 px-4 py-2 min-h-[42px] bg-white/15 hover:bg-white/25 text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span>Settings</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onCheckNow}
            disabled={isPolling}
            className="hidden lg:inline-flex liquid-control rounded-none items-center justify-center gap-2 px-5 py-2 min-h-[42px] bg-white text-slate-950 hover:bg-white/90 text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Check now</span>
          </motion.button>
        </div>
      </div>
    </LiquidGlass>
  );
};
