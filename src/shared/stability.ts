import { clampSignal, getSignalTier } from './signalTier.ts';
import type { StabilityMetrics, TimelinePoint, WifiReading } from './wifiTypes.ts';

export const ONE_HOUR_MS = 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const DROPOUT_MAX_GAP_MS = 35 * 1000;

export function isValidCheckState(state: WifiReading['state']): boolean {
  return state === 'connected' || state === 'disconnected';
}

/**
 * Computes 1-hour stability metrics for a single location:
 * - "Online when checked": % of valid checks (connected or disconnected) that are connected.
 * - "Observed dropouts": count of connected -> disconnected transitions between
 *   consecutive valid checks <= 35 seconds apart. Any unknown/error check breaks adjacency.
 */
export function computeStabilityMetrics(
  readings: WifiReading[],
  location: string,
  windowStartMs: number,
  windowEndMs: number,
): StabilityMetrics {
  const inWindow = readings
    .filter((r) => r.ts >= windowStartMs && r.ts <= windowEndMs)
    .slice()
    .sort((a, b) => a.ts - b.ts);

  let validChecks = 0;
  let connectedChecks = 0;
  let disconnectedChecks = 0;
  let unknownChecks = 0;
  let observedDropouts = 0;

  let prevValid: WifiReading | null = null;

  for (const reading of inWindow) {
    if (!isValidCheckState(reading.state)) {
      unknownChecks += 1;
      // Failed/unknown checks break the comparison
      prevValid = null;
      continue;
    }

    validChecks += 1;
    if (reading.state === 'connected') {
      connectedChecks += 1;
    } else {
      disconnectedChecks += 1;
    }

    if (
      prevValid !== null &&
      prevValid.state === 'connected' &&
      reading.state === 'disconnected'
    ) {
      const deltaMs = reading.ts - prevValid.ts;
      if (deltaMs >= 0 && deltaMs <= DROPOUT_MAX_GAP_MS) {
        observedDropouts += 1;
      }
    }

    prevValid = reading;
  }

  const onlineWhenCheckedPct =
    validChecks > 0 ? Math.round((connectedChecks / validChecks) * 100) : null;

  return {
    location,
    windowStartMs,
    windowEndMs,
    totalSamples: inWindow.length,
    validChecks,
    connectedChecks,
    disconnectedChecks,
    unknownChecks,
    onlineWhenCheckedPct,
    observedDropouts,
  };
}

/**
 * Maps observed SQLite readings to Recharts-ready timeline points:
 * - connected -> signal% (0-100)
 * - disconnected -> 0
 * - unknown / error -> null (visual gap with connectNulls={false})
 */
export function buildTimelineSeries(readings: WifiReading[]): TimelinePoint[] {
  return readings
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((reading) => {
      if (reading.state === 'connected') {
        const val = clampSignal(reading.signal ?? 0);
        return {
          id: reading.id,
          ts: reading.ts,
          state: reading.state,
          signalValue: val,
          iface: reading.iface,
          ssid: reading.ssid,
          tier: getSignalTier(val),
        };
      }

      if (reading.state === 'disconnected') {
        return {
          id: reading.id,
          ts: reading.ts,
          state: reading.state,
          signalValue: 0,
          iface: reading.iface,
          ssid: null,
          tier: null,
        };
      }

      return {
        id: reading.id,
        ts: reading.ts,
        state: reading.state,
        signalValue: null,
        iface: reading.iface,
        ssid: null,
        tier: null,
      };
    });
}
