import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCATION_LABEL,
  MAX_LOCATION_LENGTH,
  getSignalTier,
  normalizeLocationLabel,
} from '../src/shared/signalTier.ts';

describe('getSignalTier (all 101 integer values 0..100)', () => {
  it('maps every integer from 0 to 100 to the exact specified tier', () => {
    for (let sig = 0; sig <= 100; sig += 1) {
      const tier = getSignalTier(sig);
      if (sig < 20) {
        expect(tier).toBe('Very weak');
      } else if (sig < 40) {
        expect(tier).toBe('Weak');
      } else if (sig < 60) {
        expect(tier).toBe('Fair');
      } else if (sig < 80) {
        expect(tier).toBe('Good');
      } else {
        expect(tier).toBe('Excellent');
      }
    }
  });

  it('handles exact boundary thresholds accurately', () => {
    expect(getSignalTier(0)).toBe('Very weak');
    expect(getSignalTier(19)).toBe('Very weak');
    expect(getSignalTier(20)).toBe('Weak');
    expect(getSignalTier(39)).toBe('Weak');
    expect(getSignalTier(40)).toBe('Fair');
    expect(getSignalTier(59)).toBe('Fair');
    expect(getSignalTier(60)).toBe('Good');
    expect(getSignalTier(79)).toBe('Good');
    expect(getSignalTier(80)).toBe('Excellent');
    expect(getSignalTier(100)).toBe('Excellent');
  });

  it('clamps out-of-range finite numbers and returns null for missing values', () => {
    expect(getSignalTier(-15)).toBe('Very weak');
    expect(getSignalTier(135)).toBe('Excellent');
    expect(getSignalTier(null)).toBeNull();
    expect(getSignalTier(undefined)).toBeNull();
    expect(getSignalTier(Number.NaN)).toBeNull();
  });
});

describe('normalizeLocationLabel', () => {
  it('returns Unlabelled for empty or whitespace-only labels', () => {
    expect(normalizeLocationLabel('')).toBe(DEFAULT_LOCATION_LABEL);
    expect(normalizeLocationLabel('    ')).toBe(DEFAULT_LOCATION_LABEL);
    expect(normalizeLocationLabel('\t\n')).toBe(DEFAULT_LOCATION_LABEL);
    expect(normalizeLocationLabel(null)).toBe(DEFAULT_LOCATION_LABEL);
  });

  it('trims outer whitespace and collapses internal whitespace', () => {
    expect(normalizeLocationLabel('  Living   Room  ')).toBe('Living Room');
    expect(normalizeLocationLabel('\tHome\t\tOffice\n')).toBe('Home Office');
  });

  it('truncates labels longer than 80 characters', () => {
    const longInput = 'A'.repeat(120);
    const result = normalizeLocationLabel(longInput);
    expect(result.length).toBe(MAX_LOCATION_LENGTH);
    expect(result).toBe('A'.repeat(80));
  });
});
