import type { SignalTier } from './wifiTypes.ts';

export const MAX_LOCATION_LENGTH = 80;
export const DEFAULT_LOCATION_LABEL = 'Unlabelled';

export function clampSignal(signal: number): number {
  if (!Number.isFinite(signal)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(signal)));
}

/**
 * Maps NetworkManager's 0-100 signal estimate to the required tier label:
 * - Very weak: < 20 (0-19)
 * - Weak: 20-39
 * - Fair: 40-59
 * - Good: 60-79
 * - Excellent: 80-100
 */
export function getSignalTier(signal: number | null | undefined): SignalTier | null {
  if (signal === null || signal === undefined || !Number.isFinite(signal)) {
    return null;
  }

  const clamped = clampSignal(signal);
  if (clamped < 20) return 'Very weak';
  if (clamped < 40) return 'Weak';
  if (clamped < 60) return 'Fair';
  if (clamped < 80) return 'Good';
  return 'Excellent';
}

/**
 * Normalizes a location label:
 * - Collapses internal whitespace and trims outer whitespace
 * - Enforces <= 80 characters
 * - Returns "Unlabelled" when blank
 */
export function normalizeLocationLabel(raw: string | null | undefined): string {
  if (!raw) {
    return DEFAULT_LOCATION_LABEL;
  }

  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return DEFAULT_LOCATION_LABEL;
  }

  const truncated = collapsed.slice(0, MAX_LOCATION_LENGTH).trim();
  return truncated || DEFAULT_LOCATION_LABEL;
}
