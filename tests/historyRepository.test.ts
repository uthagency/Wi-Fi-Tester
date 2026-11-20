import { afterEach, describe, expect, it } from 'vitest';
import { HistoryRepository } from '../server/db/historyRepository.ts';
import { SEVEN_DAYS_MS } from '../src/shared/stability.ts';

describe('HistoryRepository (SQLite persistence, location scoping, 7-day pruning)', () => {
  let repo: HistoryRepository | null = null;

  afterEach(() => {
    if (repo) {
      repo.close();
      repo = null;
    }
  });

  it('persists readings without passwords, BSSIDs, or traffic columns', () => {
    repo = new HistoryRepository(':memory:');
    const now = 1_700_000_000_000;

    const { reading } = repo.saveAndPrune(
      {
        ts: now,
        state: 'connected',
        iface: 'wlp2s0',
        ssid: 'OfficeNet',
        signal: 84,
        location: '  Home   Office ',
      },
      now,
    );

    expect(reading.location).toBe('Home Office');
    expect(reading.signal).toBe(84);
    expect(reading.ssid).toBe('OfficeNet');
    expect(reading.iface).toBe('wlp2s0');

    const rows = repo.getLastHourReadings('Home Office', now);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual([
      'id',
      'iface',
      'location',
      'signal',
      'ssid',
      'state',
      'ts',
    ]);
  });

  it('scopes queries strictly to the requested location', () => {
    repo = new HistoryRepository(':memory:');
    const now = 1_700_000_000_000;

    repo.saveAndPrune(
      {
        ts: now - 20_000,
        state: 'connected',
        iface: 'wlan0',
        ssid: 'NetA',
        signal: 90,
        location: 'Kitchen',
      },
      now,
    );
    repo.saveAndPrune(
      {
        ts: now - 10_000,
        state: 'disconnected',
        iface: 'wlan0',
        ssid: null,
        signal: 0,
        location: 'Garage',
      },
      now,
    );

    const kitchen = repo.getLastHourReadings('Kitchen', now);
    const garage = repo.getLastHourReadings('Garage', now);

    expect(kitchen).toHaveLength(1);
    expect(kitchen[0].ssid).toBe('NetA');
    expect(garage).toHaveLength(1);
    expect(garage[0].state).toBe('disconnected');
  });

  it('prunes rows strictly older than 7 days in a single transaction on save', () => {
    repo = new HistoryRepository(':memory:');
    const now = 1_700_500_000_000;
    const cutoff = now - SEVEN_DAYS_MS;

    repo.insertBatch([
      // Should be pruned (< cutoff)
      {
        ts: cutoff - 1,
        state: 'connected',
        iface: 'wlan0',
        ssid: 'Old1',
        signal: 65,
        location: 'Desk',
      },
      {
        ts: cutoff - 86_400_000,
        state: 'disconnected',
        iface: 'wlan0',
        ssid: null,
        signal: 0,
        location: 'Desk',
      },
      // Should be retained (>= cutoff)
      {
        ts: cutoff,
        state: 'connected',
        iface: 'wlan0',
        ssid: 'BoundaryKeep',
        signal: 70,
        location: 'Desk',
      },
      {
        ts: now - 30_000,
        state: 'connected',
        iface: 'wlan0',
        ssid: 'RecentKeep',
        signal: 82,
        location: 'Desk',
      },
    ]);

    expect(repo.getAllReadingsCount()).toBe(4);

    const { prunedCount } = repo.saveAndPrune(
      {
        ts: now,
        state: 'connected',
        iface: 'wlan0',
        ssid: 'FreshSample',
        signal: 88,
        location: 'Desk',
      },
      now,
    );

    expect(prunedCount).toBe(2);
    expect(repo.getAllReadingsCount()).toBe(3);
  });
});
