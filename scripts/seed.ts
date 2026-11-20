import { HistoryRepository } from '../server/db/historyRepository.ts';
import { buildSeedReadings } from '../server/db/seedData.ts';
import { SEVEN_DAYS_MS } from '../src/shared/stability.ts';

function main(): void {
  const repo = new HistoryRepository();
  const nowMs = Date.now();
  const cleared = repo.clearAll();
  const rows = buildSeedReadings(nowMs);

  // Also insert 3 stale rows (> 7 days old) to demonstrate automatic 7-day pruning on the next poll save.
  rows.push(
    {
      ts: nowMs - SEVEN_DAYS_MS - 60_000,
      state: 'connected',
      iface: 'wlp2s0',
      ssid: 'StudioNet-5G',
      signal: 75,
      location: 'Living Room',
    },
    {
      ts: nowMs - SEVEN_DAYS_MS - 3_600_000,
      state: 'disconnected',
      iface: 'wlp2s0',
      ssid: null,
      signal: 0,
      location: 'Living Room',
    },
  );

  const inserted = repo.insertBatch(rows);
  console.info(
    `[seed] cleared ${cleared} existing rows; inserted ${inserted} seed rows into ${repo.dbPath}`,
  );
  repo.close();
}

main();
