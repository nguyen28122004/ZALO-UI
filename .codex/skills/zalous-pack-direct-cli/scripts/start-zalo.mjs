#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function processRunning() {
  try {
    const out = execFileSync('tasklist', ['/NH'], { encoding: 'utf8' });
    return out.includes('Zalo.exe') || out.includes('ZaloExecutable.exe');
  } catch {
    return false;
  }
}

function launchDetached(command, args) {
  try {
    const p = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    p.unref();
    return true;
  } catch {
    return false;
  }
}

function discoverVersionedExes(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^Zalo-\d+\.\d+\.\d+$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => (a < b ? 1 : -1));

  const out = [];
  for (const d of dirs) {
    out.push(path.join(baseDir, d, 'Zalo.exe'));
    out.push(path.join(baseDir, d, 'ZaloExecutable.exe'));
  }
  return out;
}

function main() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const shortcut = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Zalo.lnk');
  const zaloBase = path.join(localAppData, 'Programs', 'Zalo');

  const attempts = [];
  if (fs.existsSync(shortcut)) {
    attempts.push(() => launchDetached('cmd.exe', ['/c', 'start', '', shortcut]));
    attempts.push(() => launchDetached('explorer.exe', [shortcut]));
  }

  const directExes = [
    path.join(zaloBase, 'Zalo.exe'),
    path.join(zaloBase, 'ZaloExecutable.exe'),
    ...discoverVersionedExes(zaloBase)
  ];

  for (const exe of directExes) {
    if (fs.existsSync(exe)) {
      attempts.push(() => launchDetached(exe, []));
    }
  }

  for (const run of attempts) {
    if (!run()) continue;
    sleep(900);
    if (processRunning()) {
      console.log('[zalous] zalo launch success');
      process.exit(0);
    }
  }

  console.error('[zalous] cannot launch Zalo by shortcut/exe fallback');
  process.exit(1);
}

main();
