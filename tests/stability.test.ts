import { describe, expect, it } from 'vitest';
import {
  ONE_HOUR_MS,
  buildTimelineSeries,
  computeStabilityMetrics,
} from '../src/shared/stability.ts';
import type { ConnectionState, WifiReading } from '../src/shared/wifiTypes.ts';

function makeReadings(
  entries: Array<{ offsetSec: number; state: ConnectionState; signal?: number | null }>,
  baseTs = 1_700_000_000_000,
): WifiReading[] {
  return entries.map((e, idx) => ({
    id: idx + 1,
    ts: baseTs + e.offsetSec * 1000,
    state: e.state,
    iface: 'wlp2s0',
    ssid: e.state === 'connected' ? 'LabNet' : null,
    signal: e.signal !== undefined ? e.signal : e.state === 'connected' ? 70 : e.state === 'disconnected' ? 0 : null,
    location: 'Lab',
  }));
}

describe('computeStabilityMetrics (20-sequence dropout & availability fixture)', () => {
  const baseTs = 1_700_000_000_000;
  const windowEnd = baseTs + ONE_HOUR_MS;

  const cases: Array<{
    name: string;
    entries: Array<{ offsetSec: number; state: ConnectionState }>;
    expectedDropouts: number;
    expectedOnlinePct: number | null;
  }> = [
    {
      name: '01: empty window',
      entries: [],
      expectedDropouts: 0,
      expectedOnlinePct: null,
    },
    {
      name: '02: all unknown checks',
      entries: [
        { offsetSec: 10, state: 'unknown' },
        { offsetSec: 20, state: 'error' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: null,
    },
    {
      name: '03: single connected check',
      entries: [{ offsetSec: 10, state: 'connected' }],
      expectedDropouts: 0,
      expectedOnlinePct: 100,
    },
    {
      name: '04: single disconnected check',
      entries: [{ offsetSec: 10, state: 'disconnected' }],
      expectedDropouts: 0,
      expectedOnlinePct: 0,
    },
    {
      name: '05: connected -> disconnected at 10s apart (1 dropout)',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 50,
    },
    {
      name: '06: connected -> disconnected at exact 35s boundary (1 dropout)',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 45, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 50,
    },
    {
      name: '07: connected -> disconnected at 36s apart (0 dropouts)',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 46, state: 'disconnected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 50,
    },
    {
      name: '08: unknown check breaks connected -> disconnected adjacency',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'unknown' },
        { offsetSec: 30, state: 'disconnected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 50,
    },
    {
      name: '09: error check breaks connected -> disconnected adjacency',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 18, state: 'error' },
        { offsetSec: 25, state: 'disconnected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 50,
    },
    {
      name: '10: disconnected -> connected is recovery, not a dropout',
      entries: [
        { offsetSec: 10, state: 'disconnected' },
        { offsetSec: 20, state: 'connected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 50,
    },
    {
      name: '11: repeated disconnected checks after one dropout still count as 1 dropout',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'disconnected' },
        { offsetSec: 30, state: 'disconnected' },
        { offsetSec: 40, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 25,
    },
    {
      name: '12: flap cycle produces 2 dropouts',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'disconnected' },
        { offsetSec: 30, state: 'connected' },
        { offsetSec: 40, state: 'disconnected' },
      ],
      expectedDropouts: 2,
      expectedOnlinePct: 50,
    },
    {
      name: '13: flap cycle with >35s gap on second drop produces 1 dropout',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'disconnected' },
        { offsetSec: 30, state: 'connected' },
        { offsetSec: 70, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 50,
    },
    {
      name: '14: unknown surrounded by connected does not cause dropout',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'unknown' },
        { offsetSec: 30, state: 'connected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 100,
    },
    {
      name: '15: unsorted input timestamps still evaluate chronologically',
      entries: [
        { offsetSec: 30, state: 'disconnected' },
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'connected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 67,
    },
    {
      name: '16: samples outside 1-hour window are excluded',
      entries: [
        { offsetSec: -60, state: 'connected' },
        { offsetSec: 10, state: 'disconnected' },
        { offsetSec: 3650, state: 'connected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 0,
    },
    {
      name: '17: 9 connected and 1 disconnected = 90% online, 1 dropout',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'connected' },
        { offsetSec: 30, state: 'connected' },
        { offsetSec: 40, state: 'connected' },
        { offsetSec: 50, state: 'connected' },
        { offsetSec: 60, state: 'connected' },
        { offsetSec: 70, state: 'connected' },
        { offsetSec: 80, state: 'connected' },
        { offsetSec: 90, state: 'connected' },
        { offsetSec: 100, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 90,
    },
    {
      name: '18: rapid double check at same timestamp (delta = 0ms) counts dropout',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 10, state: 'disconnected' },
      ],
      expectedDropouts: 1,
      expectedOnlinePct: 50,
    },
    {
      name: '19: three dropouts interrupted by unknown gap',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'disconnected' }, // dropout 1
        { offsetSec: 30, state: 'connected' },
        { offsetSec: 40, state: 'unknown' }, // breaks
        { offsetSec: 50, state: 'disconnected' }, // NOT a dropout
        { offsetSec: 60, state: 'connected' },
        { offsetSec: 70, state: 'disconnected' }, // dropout 2
      ],
      expectedDropouts: 2,
      expectedOnlinePct: 50,
    },
    {
      name: '20: continuous 100% online across 5 samples',
      entries: [
        { offsetSec: 10, state: 'connected' },
        { offsetSec: 20, state: 'connected' },
        { offsetSec: 30, state: 'connected' },
        { offsetSec: 40, state: 'connected' },
        { offsetSec: 50, state: 'connected' },
      ],
      expectedDropouts: 0,
      expectedOnlinePct: 100,
    },
  ];

  for (const tc of cases) {
    it(tc.name, () => {
      const readings = makeReadings(tc.entries, baseTs);
      const result = computeStabilityMetrics(readings, 'Lab', baseTs, windowEnd);
      expect(result.observedDropouts).toBe(tc.expectedDropouts);
      expect(result.onlineWhenCheckedPct).toBe(tc.expectedOnlinePct);
    });
  }
});

describe('buildTimelineSeries', () => {
  it('maps connected -> signal, disconnected -> 0, and unknown/error -> null gap', () => {
    const readings = makeReadings([
      { offsetSec: 10, state: 'connected', signal: 78 },
      { offsetSec: 20, state: 'disconnected', signal: 0 },
      { offsetSec: 30, state: 'unknown', signal: null },
      { offsetSec: 40, state: 'error', signal: null },
      { offsetSec: 50, state: 'connected', signal: 85 },
    ]);

    const series = buildTimelineSeries(readings);
    expect(series.map((p) => p.signalValue)).toEqual([78, 0, null, null, 85]);
    expect(series[0].tier).toBe('Good');
    expect(series[1].tier).toBeNull();
    expect(series[4].tier).toBe('Excellent');
  });
});
