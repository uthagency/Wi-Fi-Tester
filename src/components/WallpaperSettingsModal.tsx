import { Check, Image as ImageIcon, RotateCcw, Upload, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_WALLPAPER_SETTINGS,
  WALLPAPER_PRESETS,
  type WallpaperSettings,
} from '../shared/wallpaperPresets.ts';
import { LiquidGlass } from './LiquidGlass.tsx';

interface WallpaperSettingsModalProps {
  isOpen: boolean;
  settings: WallpaperSettings;
  onUpdateSettings: (next: WallpaperSettings) => void;
  onClose: () => void;
}

export const WallpaperSettingsModal: React.FC<WallpaperSettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Image exceeds 4 MB local browser storage limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setUploadError('Could not read the selected image file.');
        return;
      }
      setUploadError(null);
      onUpdateSettings({
        ...settings,
        selectedId: 'custom',
        customDataUrl: result,
        customName: file.name,
      });
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected local file.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <LiquidGlass
        as="div"
        role="dialog"
        aria-modal="true"
        aria-label="Wallpaper and readability settings"
        backdropBlur={14}
        tintColor="rgba(255, 255, 255, 0.16)"
        displacementScale={150}
        turbulenceBaseFrequency={0.002}
        turbulenceSeed={3.5}
        glassBorder
        style={{ borderRadius: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-white/75">
                Appearance &amp; Wallpaper
              </p>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight">
                Background Settings
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/[0.88]">
                Applied at 100% opacity across all views with sharp Liquid Glass panels.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-none p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/30 text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Preset Wallpapers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Select Wallpaper</h3>
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  onUpdateSettings(DEFAULT_WALLPAPER_SETTINGS);
                }}
                className="rounded-none inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset to bg.png</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected = settings.selectedId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        selectedId: preset.id,
                      })
                    }
                    className={`rounded-none group relative text-left border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                      isSelected
                        ? 'border-white bg-white/25'
                        : 'border-white/25 bg-slate-950/35 hover:bg-white/15'
                    }`}
                  >
                    <div className="relative h-28 w-full overflow-hidden rounded-none border-b border-white/20">
                      <img
                        src={preset.src}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover opacity-100"
                      />
                      {isSelected ? (
                        <span className="absolute top-2 right-2 rounded-none bg-white text-slate-950 px-2 py-0.5 text-[11px] font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" aria-hidden="true" />
                          Active
                        </span>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white">{preset.name}</p>
                      <p className="text-xs text-white/75">{preset.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Local Upload */}
          <div className="space-y-2.5 pt-2 border-t border-white/20">
            <h3 className="text-sm font-semibold text-white">Custom Local Wallpaper</h3>
            <p className="text-xs text-white/80">
              Load an image directly from your computer. Stored locally in your browser with zero network egress.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload custom wallpaper image"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-none inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-white text-slate-950 hover:bg-white/90 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Choose Local Image</span>
              </button>

              {settings.customDataUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      selectedId: 'custom',
                    })
                  }
                  className={`rounded-none inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] border text-xs font-semibold whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                    settings.selectedId === 'custom'
                      ? 'bg-white/25 border-white text-white'
                      : 'bg-slate-950/40 border-white/30 text-white/90 hover:bg-white/15'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="max-w-[200px] truncate">
                    {settings.customName || 'Custom image'}
                  </span>
                </button>
              ) : null}
            </div>

            {uploadError ? (
              <p role="alert" className="text-xs font-semibold text-rose-200">
                {uploadError}
              </p>
            ) : null}
          </div>

          {/* Background Readability Contrast Scrim */}
          <div className="space-y-2.5 pt-2 border-t border-white/20">
            <h3 className="text-sm font-semibold text-white">Readability Contrast Layer</h3>
            <p className="text-xs text-white/80">
              Balances bright sunset highlights behind transparent Liquid Glass cards for crisp text contrast.
            </p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Readability contrast mode">
              {(
                [
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'high-contrast', label: 'High Contrast' },
                  { id: 'minimal', label: 'Clear Bright' },
                ] as const
              ).map((opt) => {
                const active = settings.readabilityScrim === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        readabilityScrim: opt.id,
                      })
                    }
                    className={`rounded-none px-3 py-2.5 min-h-[42px] text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                      active
                        ? 'bg-white text-slate-950 border-white'
                        : 'bg-slate-950/35 text-white border-white/30 hover:bg-white/15'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done Footer */}
          <div className="pt-3 border-t border-white/20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none px-5 py-2.5 min-h-[42px] bg-white text-slate-950 hover:bg-white/90 text-sm font-bold whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
            >
              Done
            </button>
          </div>
        </div>
      </LiquidGlass>
    </div>
  );
};
