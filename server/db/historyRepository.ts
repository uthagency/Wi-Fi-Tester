import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { clampSignal, normalizeLocationLabel } from '../../src/shared/signalTier.ts';
import { ONE_HOUR_MS, SEVEN_DAYS_MS } from '../../src/shared/stability.ts';
import type { ConnectionState, LocationSummary, WifiReading } from '../../src/shared/wifiTypes.ts';

export interface NewReadingInput {
  ts: number;
  state: ConnectionState;
  iface: string | null;
  ssid: string | null;
  signal: number | null;
  location: string;
}

export interface SaveReadingResult {
  reading: WifiReading;
  prunedCount: number;
}

export function resolveDefaultDbPath(): string {
  if (process.env.WIFI_TESTER_DB_PATH) {
    return process.env.WIFI_TESTER_DB_PATH;
  }
  return path.resolve(process.cwd(), 'data', 'history.db');
}

export class HistoryRepository {
  private db: Database.Database;
  readonly dbPath: string;

  constructor(dbPath: string = resolveDefaultDbPath()) {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 3000');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('connected', 'disconnected', 'error', 'unknown')),
        iface TEXT,
        ssid TEXT,
        signal INTEGER,
        location TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_readings_location_ts
        ON readings(location, ts);

      CREATE INDEX IF NOT EXISTS idx_readings_ts
        ON readings(ts);
    `);
  }

  /**
   * Inserts a sampled reading and prunes any rows older than 7 days in a single transaction.
   * Never stores passwords, BSSIDs, MAC addresses, or network traffic.
   */
  saveAndPrune(input: NewReadingInput, nowMs: number = input.ts): SaveReadingResult {
    const normalizedLocation = normalizeLocationLabel(input.location);
    const sanitizedSignal =
      input.state === 'connected' && input.signal !== null
        ? clampSignal(input.signal)
        : input.state === 'disconnected'
          ? 0
          : null;

    const cutoffTs = nowMs - SEVEN_DAYS_MS;

    const insertStmt = this.db.prepare(`
      INSERT INTO readings (ts, state, iface, ssid, signal, location)
      VALUES (@ts, @state, @iface, @ssid, @signal, @location)
    `);

    const pruneStmt = this.db.prepare(`
      DELETE FROM readings WHERE ts < ?
    `);

    const runTx = this.db.transaction(() => {
      const info = insertStmt.run({
        ts: input.ts,
        state: input.state,
        iface: input.iface,
        ssid: input.state === 'connected' ? input.ssid : null,
        signal: sanitizedSignal,
        location: normalizedLocation,
      });

      const pruneInfo = pruneStmt.run(cutoffTs);

      return {
        id: Number(info.lastInsertRowid),
        prunedCount: pruneInfo.changes,
      };
    });

    const { id, prunedCount } = runTx();
    console.info(`[sqlite] pruned ${prunedCount} rows older than 7 days`);

    return {
      reading: {
        id,
        ts: input.ts,
        state: input.state,
        iface: input.iface,
        ssid: input.state === 'connected' ? input.ssid : null,
        signal: sanitizedSignal,
        location: normalizedLocation,
      },
      prunedCount,
    };
  }

  /**
   * Inserts a batch of readings in a single transaction (used for seeding or tests) without pruning.
   */
  insertBatch(inputs: NewReadingInput[]): number {
    const insertStmt = this.db.prepare(`
      INSERT INTO readings (ts, state, iface, ssid, signal, location)
      VALUES (@ts, @state, @iface, @ssid, @signal, @location)
    `);

    const runTx = this.db.transaction((rows: NewReadingInput[]) => {
      for (const row of rows) {
        insertStmt.run({
          ts: row.ts,
          state: row.state,
          iface: row.iface,
          ssid: row.state === 'connected' ? row.ssid : null,
          signal:
            row.state === 'connected' && row.signal !== null
              ? clampSignal(row.signal)
              : row.state === 'disconnected'
                ? 0
                : null,
          location: normalizeLocationLabel(row.location),
        });
      }
      return rows.length;
    });

    return runTx(inputs);
  }

  getLastHourReadings(location: string, nowMs: number = Date.now()): WifiReading[] {
    const normalizedLocation = normalizeLocationLabel(location);
    const windowStart = nowMs - ONE_HOUR_MS;

    return this.db
      .prepare(
        `
        SELECT id, ts, state, iface, ssid, signal, location
        FROM readings
        WHERE location = ? AND ts >= ? AND ts <= ?
        ORDER BY ts ASC, id ASC
      `,
      )
      .all(normalizedLocation, windowStart, nowMs) as WifiReading[];
  }

  getAllReadingsCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM readings').get() as { cnt: number };
    return row.cnt;
  }

  getLocations(): LocationSummary[] {
    return this.db
      .prepare(
        `
        SELECT location, COUNT(*) as sampleCount, MAX(ts) as lastTs
        FROM readings
        GROUP BY location
        ORDER BY lastTs DESC, location ASC
      `,
      )
      .all() as LocationSummary[];
  }

  clearLocation(location: string): number {
    const normalizedLocation = normalizeLocationLabel(location);
    const res = this.db.prepare('DELETE FROM readings WHERE location = ?').run(normalizedLocation);
    return res.changes;
  }

  clearAll(): number {
    const res = this.db.prepare('DELETE FROM readings').run();
    return res.changes;
  }

  close(): void {
    this.db.close();
  }
}
