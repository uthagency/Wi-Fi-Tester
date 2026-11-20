export interface WallpaperPreset {
  id: string;
  name: string;
  subtitle: string;
  src: string;
}

export interface WallpaperSettings {
  selectedId: string;
  customDataUrl: string | null;
  customName: string | null;
  readabilityScrim: 'balanced' | 'high-contrast' | 'minimal';
}

export const DEFAULT_WALLPAPER_ID = 'dusk-forest-bg';

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'dusk-forest-bg',
    name: 'Dusk Pine Forest',
    subtitle: 'Default · bg.png',
    src: '/assets/aistudio/bg_7372d2ec.png',
  },
  {
    id: 'nordic-aurora',
    name: 'Nordic Aurora',
    subtitle: 'Built-in · Cool teal & indigo',
    src: '/wallpapers/nordic_aurora.svg',
  },
  {
    id: 'midnight-peaks',
    name: 'Midnight Peaks',
    subtitle: 'Built-in · Deep slate ridge',
    src: '/wallpapers/midnight_peaks.svg',
  },
  {
    id: 'amber-dusk',
    name: 'Amber Horizon',
    subtitle: 'Built-in · Plum & warm dusk',
    src: '/wallpapers/amber_dusk.svg',
  },
];

export const WALLPAPER_STORAGE_KEY = 'wifi-tester:wallpaper-settings';

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  selectedId: DEFAULT_WALLPAPER_ID,
  customDataUrl: null,
  customName: null,
  readabilityScrim: 'balanced',
};

export function loadWallpaperSettings(): WallpaperSettings {
  try {
    const raw = window.localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (!raw) return DEFAULT_WALLPAPER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<WallpaperSettings>;
    return {
      selectedId:
        typeof parsed.selectedId === 'string' && parsed.selectedId.length > 0
          ? parsed.selectedId
          : DEFAULT_WALLPAPER_ID,
      customDataUrl:
        typeof parsed.customDataUrl === 'string' ? parsed.customDataUrl : null,
      customName:
        typeof parsed.customName === 'string' ? parsed.customName : null,
      readabilityScrim:
        parsed.readabilityScrim === 'high-contrast' ||
        parsed.readabilityScrim === 'minimal'
          ? parsed.readabilityScrim
          : 'balanced',
    };
  } catch {
    return DEFAULT_WALLPAPER_SETTINGS;
  }
}

export function saveWallpaperSettings(settings: WallpaperSettings): void {
  try {
    window.localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function resolveWallpaperSrc(settings: WallpaperSettings): string {
  if (settings.selectedId === 'custom' && settings.customDataUrl) {
    return settings.customDataUrl;
  }
  const found = WALLPAPER_PRESETS.find((p) => p.id === settings.selectedId);
  return found ? found.src : WALLPAPER_PRESETS[0].src;
}
