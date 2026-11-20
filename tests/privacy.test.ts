import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx|html)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('Zero network egress & privacy audit', () => {
  it('contains no outbound external URLs or network/telemetry imports in source files', () => {
    const root = process.cwd();
    const files = [
      ...collectSourceFiles(path.join(root, 'src')),
      ...collectSourceFiles(path.join(root, 'server')),
      path.join(root, 'server.ts'),
      path.join(root, 'index.html'),
    ];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toMatch(/https?:\/\//);
      expect(content).not.toMatch(/from\s+['"](node:)?https?['"]/);
      expect(content).not.toMatch(/from\s+['"](node:)?net['"]/);
      expect(content).not.toMatch(/from\s+['"]axios['"]/);
    }
  });

  it('client fetch calls target only local /api/* routes', () => {
    const root = process.cwd();
    const clientFiles = collectSourceFiles(path.join(root, 'src'));

    for (const filePath of clientFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fetchMatches = [...content.matchAll(/fetch\(([^)]+)\)/g)];
      for (const match of fetchMatches) {
        const arg = match[1].trim();
        expect(arg.startsWith("'/api/") || arg.startsWith('`/api/')).toBe(true);
      }
    }
  });
});
