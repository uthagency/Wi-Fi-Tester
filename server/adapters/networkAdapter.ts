import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { clampSignal } from '../../src/shared/signalTier.ts';
import type { ConnectionState, WifiSampleResult } from '../../src/shared/wifiTypes.ts';

const execFileAsync = promisify(execFile);

export type ExecCommandFn = (
  file: string,
  args: string[],
  timeoutMs: number,
) => Promise<{ stdout: string; stderr: string }>;

export interface NetworkAdapter {
  readonly name: 'nmcli' | 'dbus' | 'fake';
  read(): Promise<WifiSampleResult>;
}

const defaultExec: ExecCommandFn = async (file, args, timeoutMs) => {
  const { stdout, stderr } = await execFileAsync(file, args, {
    timeout: timeoutMs,
    encoding: 'utf8',
    maxBuffer: 256 * 1024,
  });
  return { stdout, stderr };
};

/**
 * Splits a single `nmcli -t` colon-delimited line while respecting `\` escapes.
 */
export function splitNmcliTerseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let escaping = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (escaping) {
      current += ch;
      escaping = false;
      continue;
    }
    if (ch === '\\') {
      escaping = true;
      continue;
    }
    if (ch === ':') {
      fields.push(current);
      current = '';
      continue;
    }
    current += ch;
  }

  fields.push(current);
  return fields;
}

export interface ParsedDeviceRow {
  device: string;
  type: string;
  state: string;
  connection: string;
}

export function parseNmcliDevices(stdout: string): ParsedDeviceRow[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [device = '', type = '', state = '', connection = ''] =
        splitNmcliTerseLine(line);
      return {
        device: device.trim(),
        type: type.trim().toLowerCase(),
        state: state.trim().toLowerCase(),
        connection: connection.trim(),
      };
    });
}

export interface ParsedWifiRow {
  inUse: boolean;
  ssid: string;
  signal: number | null;
  device: string;
}

export function parseNmcliWifiList(stdout: string): ParsedWifiRow[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [inUseRaw = '', ssid = '', signalRaw = '', device = ''] =
        splitNmcliTerseLine(line);
      const parsedSignal = Number.parseInt(signalRaw.trim(), 10);
      return {
        inUse: inUseRaw.trim() === '*',
        ssid: ssid.trim(),
        signal: Number.isFinite(parsedSignal) ? clampSignal(parsedSignal) : null,
        device: device.trim(),
      };
    });
}

function classifyExecError(err: unknown): { code: string; message: string } {
  if (err && typeof err === 'object') {
    const record = err as { code?: string | number; message?: string; stderr?: string };
    if (record.code === 'ENOENT') {
      return {
        code: 'NMCLI_NOT_FOUND',
        message:
          'NetworkManager CLI (nmcli) was not found on this system. Install network-manager to read live Wi-Fi telemetry.',
      };
    }
    if (record.code === 'ETIMEDOUT' || record.code === 'ABORT_ERR') {
      return {
        code: 'NMCLI_TIMEOUT',
        message: 'NetworkManager did not respond within the 1200 ms poll budget.',
      };
    }
    const detail = (record.stderr || record.message || 'Unknown NetworkManager error').trim();
    return {
      code: 'NM_ERROR',
      message: detail,
    };
  }
  return {
    code: 'NM_ERROR',
    message: 'Unable to query NetworkManager.',
  };
}

/**
 * Primary read-only NetworkManager adapter using `nmcli -t`.
 * Never modifies settings and explicitly passes `--rescan no` so no hardware scan is ever triggered.
 */
export class NmcliAdapter implements NetworkAdapter {
  readonly name = 'nmcli' as const;
  private execFn: ExecCommandFn;
  private timeoutMs: number;

  constructor(execFn: ExecCommandFn = defaultExec, timeoutMs = 1200) {
    this.execFn = execFn;
    this.timeoutMs = timeoutMs;
  }

  async read(): Promise<WifiSampleResult> {
    const startMs = Date.now();
    try {
      const devResult = await this.execFn(
        'nmcli',
        ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status'],
        this.timeoutMs,
      );

      const devices = parseNmcliDevices(devResult.stdout);
      const wifiDevices = devices.filter((d) => d.type === 'wifi');

      if (wifiDevices.length === 0) {
        return {
          ts: Date.now(),
          state: 'disconnected',
          iface: null,
          ssid: null,
          signal: null,
          adapter: 'nmcli',
          errorCode: null,
          errorMessage: null,
          latencyMs: Date.now() - startMs,
        };
      }

      const activeDevice =
        wifiDevices.find((d) => d.state === 'connected') ?? wifiDevices[0];

      if (activeDevice.state !== 'connected') {
        return {
          ts: Date.now(),
          state: 'disconnected',
          iface: activeDevice.device || null,
          ssid: null,
          signal: null,
          adapter: 'nmcli',
          errorCode: null,
          errorMessage: null,
          latencyMs: Date.now() - startMs,
        };
      }

      // Strictly passive read: `--rescan no` guarantees NetworkManager never scans.
      const wifiResult = await this.execFn(
        'nmcli',
        ['-t', '-f', 'IN-USE,SSID,SIGNAL,DEVICE', 'device', 'wifi', 'list', '--rescan', 'no'],
        this.timeoutMs,
      );

      const rows = parseNmcliWifiList(wifiResult.stdout);
      const matchedRow =
        rows.find((r) => r.inUse && (!r.device || r.device === activeDevice.device)) ??
        rows.find((r) => r.inUse);

      const ssid =
        matchedRow?.ssid ||
        (activeDevice.connection && activeDevice.connection !== '--'
          ? activeDevice.connection
          : null);

      return {
        ts: Date.now(),
        state: 'connected',
        iface: activeDevice.device || null,
        ssid,
        signal: matchedRow?.signal ?? null,
        adapter: 'nmcli',
        errorCode: null,
        errorMessage: null,
        latencyMs: Date.now() - startMs,
      };
    } catch (error) {
      const classified = classifyExecError(error);
      return {
        ts: Date.now(),
        state: 'error',
        iface: null,
        ssid: null,
        signal: null,
        adapter: 'nmcli',
        errorCode: classified.code,
        errorMessage: classified.message,
        latencyMs: Date.now() - startMs,
      };
    }
  }
}

/**
 * Alternate read-only NetworkManager adapter querying `org.freedesktop.NetworkManager` via `gdbus`.
 */
export class DBusAdapter implements NetworkAdapter {
  readonly name = 'dbus' as const;
  private execFn: ExecCommandFn;
  private timeoutMs: number;

  constructor(execFn: ExecCommandFn = defaultExec, timeoutMs = 1200) {
    this.execFn = execFn;
    this.timeoutMs = timeoutMs;
  }

  async read(): Promise<WifiSampleResult> {
    const startMs = Date.now();
    try {
      const stateOut = await this.execFn(
        'gdbus',
        [
          'call',
          '--system',
          '--dest',
          'org.freedesktop.NetworkManager',
          '--object-path',
          '/org/freedesktop/NetworkManager',
          '--method',
          'org.freedesktop.DBus.Properties.Get',
          'org.freedesktop.NetworkManager',
          'State',
        ],
        this.timeoutMs,
      );

      // NM_STATE_CONNECTED_GLOBAL = 70, NM_STATE_CONNECTED_SITE = 60, NM_STATE_CONNECTED_LOCAL = 50
      const match = stateOut.stdout.match(/uint32\s+(\d+)/);
      const nmState = match ? Number.parseInt(match[1], 10) : 0;
      if (nmState < 50) {
        return {
          ts: Date.now(),
          state: 'disconnected',
          iface: null,
          ssid: null,
          signal: null,
          adapter: 'dbus',
          errorCode: null,
          errorMessage: null,
          latencyMs: Date.now() - startMs,
        };
      }

      // Delegate Wi-Fi device property read passively via nmcli if available
      const nmcliFallback = new NmcliAdapter(this.execFn, this.timeoutMs);
      const sample = await nmcliFallback.read();
      return {
        ...sample,
        adapter: 'dbus',
        latencyMs: Date.now() - startMs,
      };
    } catch (error) {
      const classified = classifyExecError(error);
      return {
        ts: Date.now(),
        state: 'error',
        iface: null,
        ssid: null,
        signal: null,
        adapter: 'dbus',
        errorCode: classified.code === 'NMCLI_NOT_FOUND' ? 'DBUS_UNAVAILABLE' : classified.code,
        errorMessage: classified.message,
        latencyMs: Date.now() - startMs,
      };
    }
  }
}

export class FakeAdapter implements NetworkAdapter {
  readonly name = 'fake' as const;
  private sequence: Array<Partial<WifiSampleResult>>;
  private index = 0;

  constructor(sequence: Array<Partial<WifiSampleResult>>) {
    this.sequence = sequence;
  }

  async read(): Promise<WifiSampleResult> {
    const item = this.sequence[Math.min(this.index, Math.max(0, this.sequence.length - 1))] ?? {};
    this.index += 1;
    const state: ConnectionState = item.state ?? 'unknown';
    return {
      ts: item.ts ?? Date.now(),
      state,
      iface: item.iface ?? null,
      ssid: item.ssid ?? null,
      signal: item.signal ?? null,
      adapter: 'fake',
      errorCode: item.errorCode ?? null,
      errorMessage: item.errorMessage ?? null,
      latencyMs: item.latencyMs ?? 4,
    };
  }
}

export function createNetworkAdapter(): NetworkAdapter {
  const mode = (process.env.WIFI_ADAPTER || 'nmcli').toLowerCase();
  if (mode === 'dbus') {
    return new DBusAdapter();
  }
  return new NmcliAdapter();
}
