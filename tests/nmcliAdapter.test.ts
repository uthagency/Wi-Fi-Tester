import { describe, expect, it } from 'vitest';
import {
  NmcliAdapter,
  type ExecCommandFn,
} from '../server/adapters/networkAdapter.ts';

describe('NmcliAdapter', () => {
  it('reads connected Wi-Fi with escaped colons in SSID and never triggers rescan', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const mockExec: ExecCommandFn = async (file, args) => {
      calls.push({ file, args });
      if (args.includes('status')) {
        return {
          stdout: 'eth0:ethernet:unavailable:--\nwlp2s0:wifi:connected:Home\\:WiFi\n',
          stderr: '',
        };
      }
      return {
        stdout: ' :NeighborNet:45:wlp2s0\n*:Home\\:WiFi:78:wlp2s0\n',
        stderr: '',
      };
    };

    const adapter = new NmcliAdapter(mockExec);
    const sample = await adapter.read();

    expect(sample.state).toBe('connected');
    expect(sample.iface).toBe('wlp2s0');
    expect(sample.ssid).toBe('Home:WiFi');
    expect(sample.signal).toBe(78);

    // Ensure --rescan no is passed and rescan is never triggered
    expect(calls).toHaveLength(2);
    expect(calls[1].args).toContain('--rescan');
    expect(calls[1].args).toContain('no');
    for (const c of calls) {
      expect(c.args.join(' ')).not.toMatch(/device\s+wifi\s+rescan/);
    }
  });

  it('reports disconnected when Wi-Fi device is not connected', async () => {
    const mockExec: ExecCommandFn = async () => ({
      stdout: 'wlp2s0:wifi:disconnected:--\n',
      stderr: '',
    });

    const adapter = new NmcliAdapter(mockExec);
    const sample = await adapter.read();

    expect(sample.state).toBe('disconnected');
    expect(sample.iface).toBe('wlp2s0');
    expect(sample.ssid).toBeNull();
    expect(sample.signal).toBeNull();
  });

  it('degrades gracefully when nmcli binary is missing (ENOENT)', async () => {
    const mockExec: ExecCommandFn = async () => {
      const err = new Error('spawn nmcli ENOENT') as Error & { code: string };
      err.code = 'ENOENT';
      throw err;
    };

    const adapter = new NmcliAdapter(mockExec);
    const sample = await adapter.read();

    expect(sample.state).toBe('error');
    expect(sample.errorCode).toBe('NMCLI_NOT_FOUND');
    expect(sample.errorMessage).toContain('nmcli');
  });
});
