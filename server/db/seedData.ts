import type { NewReadingInput } from './historyRepository.ts';
import { HistoryRepository } from './historyRepository.ts';

/**
 * Generates deterministic, realistic 1-hour sample histories for three labelled locations:
 * - "Home Office": Strong signal (76-88%), 100% online, 0 dropouts
 * - "Living Room": Good-to-fair signal (54-72%) with 2 observed dropouts (<= 35s) and 1 unknown gap
 * - "Bedroom": Weak-to-fair signal (28-52%) with 3 observed dropouts and 1 extended offline period
 */
export function buildSeedReadings(nowMs: number = Date.now()): NewReadingInput[] {
  const rows: NewReadingInput[] = [];
  const intervalMs = 30_000; // 30s intervals for 1 hour = 120 samples per location
  const startMs = nowMs - 58 * 60 * 1000;

  // 1. Home Office — strong, reliable desk connection
  for (let i = 0; i < 110; i += 1) {
    const ts = startMs + i * intervalMs;
    const wave = Math.round(Math.sin(i * 0.35) * 6 + Math.cos(i * 0.17) * 3);
    const signal = Math.max(70, Math.min(92, 82 + wave));
    rows.push({
      ts,
      state: 'connected',
      iface: 'wlp2s0',
      ssid: 'StudioNet-5G',
      signal,
      location: 'Home Office',
    });
  }

  // 2. Living Room — good signal with 2 observed dropouts (<= 35s) and 1 unknown probe gap
  for (let i = 0; i < 110; i += 1) {
    const ts = startMs + i * intervalMs;
    if (i === 34 || i === 76) {
      // Observed dropout: connected at i-1 (30s ago <= 35s) -> disconnected at i
      rows.push({
        ts,
        state: 'disconnected',
        iface: 'wlp2s0',
        ssid: null,
        signal: 0,
        location: 'Living Room',
      });
    } else if (i === 52 || i === 53) {
      // Unknown gap: breaks adjacency, excluded from valid checks, renders as gap in chart
      rows.push({
        ts,
        state: 'unknown',
        iface: 'wlp2s0',
        ssid: null,
        signal: null,
        location: 'Living Room',
      });
    } else {
      const wave = Math.round(Math.sin(i * 0.25) * 8 + Math.cos(i * 0.42) * 4);
      const signal = Math.max(46, Math.min(76, 63 + wave));
      rows.push({
        ts,
        state: 'connected',
        iface: 'wlp2s0',
        ssid: 'StudioNet-5G',
        signal,
        location: 'Living Room',
      });
    }
  }

  // 3. Bedroom — fringe coverage across walls (Weak / Fair) with 3 dropouts
  for (let i = 0; i < 110; i += 1) {
    const ts = startMs + i * intervalMs;
    if (i === 20 || i === 21 || i === 48 || i === 84) {
      rows.push({
        ts,
        state: 'disconnected',
        iface: 'wlp2s0',
        ssid: null,
        signal: 0,
        location: 'Bedroom',
      });
    } else {
      const wave = Math.round(Math.sin(i * 0.3) * 11 + Math.cos(i * 0.14) * 5);
      const signal = Math.max(18, Math.min(54, 36 + wave));
      rows.push({
        ts,
        state: 'connected',
        iface: 'wlp2s0',
        ssid: 'StudioNet-5G',
        signal,
        location: 'Bedroom',
      });
    }
  }

  return rows;
}

export function ensureInitialSeed(repo: HistoryRepository, nowMs: number = Date.now()): number {
  if (repo.getAllReadingsCount() > 0) {
    return 0;
  }
  const rows = buildSeedReadings(nowMs);
  return repo.insertBatch(rows);
}
