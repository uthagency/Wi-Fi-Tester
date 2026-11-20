import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createNetworkAdapter } from './server/adapters/networkAdapter.ts';
import { HistoryRepository } from './server/db/historyRepository.ts';
import { buildSeedReadings, ensureInitialSeed } from './server/db/seedData.ts';
import { normalizeLocationLabel } from './src/shared/signalTier.ts';
import {
  ONE_HOUR_MS,
  buildTimelineSeries,
  computeStabilityMetrics,
} from './src/shared/stability.ts';
import type { HistoryResponse, PollResponse } from './src/shared/wifiTypes.ts';

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

function buildHistoryPayload(
  repo: HistoryRepository,
  locationInput: string,
  nowMs: number = Date.now(),
): HistoryResponse {
  const location = normalizeLocationLabel(locationInput);
  const readings = repo.getLastHourReadings(location, nowMs);
  const windowStartMs = nowMs - ONE_HOUR_MS;
  const metrics = computeStabilityMetrics(readings, location, windowStartMs, nowMs);
  const timeline = buildTimelineSeries(readings);
  const recentReadings = readings.slice(-24).reverse();
  const locations = repo.getLocations();

  return {
    location,
    metrics,
    timeline,
    recentReadings,
    locations,
  };
}

export async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const repo = new HistoryRepository();
  const adapter = createNetworkAdapter();

  const seededCount = ensureInitialSeed(repo);
  if (seededCount > 0) {
    console.info(`[init] seeded ${seededCount} initial 1-hour sample readings`);
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      adapter: adapter.name,
      totalReadings: repo.getAllReadingsCount(),
    });
  });

  app.get('/api/history', (req, res) => {
    const rawLocation = typeof req.query.location === 'string' ? req.query.location : '';
    const payload = buildHistoryPayload(repo, rawLocation);
    res.json(payload);
  });

  app.post('/api/poll', async (req, res) => {
    try {
      const rawLocation =
        req.body && typeof req.body.location === 'string' ? req.body.location : '';
      const location = normalizeLocationLabel(rawLocation);

      const sample = await adapter.read();
      // Record failed/error NetworkManager checks as 'unknown' in SQLite so they create a chart gap
      // and break dropout adjacency without polluting valid checks.
      const persistedState = sample.state === 'error' ? 'unknown' : sample.state;

      const { reading, prunedCount } = repo.saveAndPrune(
        {
          ts: sample.ts,
          state: persistedState,
          iface: sample.iface,
          ssid: sample.ssid,
          signal: sample.signal,
          location,
        },
        sample.ts,
      );

      const history = buildHistoryPayload(repo, location, sample.ts);
      const response: PollResponse = {
        sample,
        reading,
        prunedCount,
        metrics: history.metrics,
        timeline: history.timeline,
        recentReadings: history.recentReadings,
        locations: history.locations,
      };

      res.json(response);
    } catch (err) {
      console.error('[poll] unexpected failure:', err);
      res.status(500).json({ error: 'Failed to poll NetworkManager or persist reading.' });
    }
  });

  app.delete('/api/history', (req, res) => {
    const clearAll = req.query.all === 'true';
    const rawLocation = typeof req.query.location === 'string' ? req.query.location : '';
    const deleted = clearAll ? repo.clearAll() : repo.clearLocation(rawLocation);
    res.json({
      deleted,
      locations: repo.getLocations(),
    });
  });

  app.post('/api/seed', (_req, res) => {
    const nowMs = Date.now();
    repo.clearAll();
    const inserted = repo.insertBatch(buildSeedReadings(nowMs));
    res.json({
      inserted,
      locations: repo.getLocations(),
    });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.info(`[wifi-tester] local server listening on ${HOST}:${PORT} (adapter=${adapter.name})`);
  });

  const shutdown = () => {
    server.close(() => {
      repo.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[wifi-tester] startup failed:', err);
  process.exit(1);
});
