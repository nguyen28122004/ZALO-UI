const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { createPackage, createPackageWithOptions, extractAll, extractFile, getRawHeader } = require('@electron/asar');
const runtimeLoader = require('../../../zalous/runtime/zalous-runtime');
const { LOCALAPPDATA, ZALOUS_ROOT } = require('./constants');
const { ensureLayout, readConfig, saveConfig } = require('./config-store');
const { syncBuiltInAssets, syncConfigWithAssets } = require('./asset-store');

function escapeScript(text) {
  return text.replace(/<\/script>/gi, '<\\/script>');
}

async function resolveAsar(preferred) {
  if (preferred && fs.existsSync(preferred)) return path.resolve(preferred);

  const cfg = await readConfig();
  if (cfg.appAsarPath && fs.existsSync(cfg.appAsarPath)) return path.resolve(cfg.appAsarPath);

  const zaloRoot = path.join(LOCALAPPDATA, 'Programs', 'Zalo');
  if (!fs.existsSync(zaloRoot)) throw new Error('Khong tim thay thu muc cai Zalo');
  const dirs = (await fsp.readdir(zaloRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && /^Zalo-\d+/.test(d.name))
    .map((d) => d.name);

  dirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  for (const d of dirs) {
    const p = path.join(zaloRoot, d, 'resources', 'app.asar');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Khong tim thay app.asar. Dung --asar <path>');
}

async function detectLatestAsar() {
  const zaloRoot = path.join(LOCALAPPDATA, 'Programs', 'Zalo');
  if (!fs.existsSync(zaloRoot)) throw new Error('Khong tim thay thu muc cai Zalo');
  const dirs = (await fsp.readdir(zaloRoot, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && /^Zalo-\d+/.test(d.name))
    .map((d) => d.name);

  dirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  for (const d of dirs) {
    const p = path.join(zaloRoot, d, 'resources', 'app.asar');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Khong tim thay app.asar ban moi nhat');
}

function cleanBackupPathForAsar(asarPath) {
  const versionDir = path.basename(path.dirname(path.dirname(asarPath)));
  const safeVersion = String(versionDir || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(ZALOUS_ROOT, 'backups', `app.asar.clean.${safeVersion}.bak`);
}

function isZalousPatchedAsar(asarPath) {
  try {
    const html = String(extractFile(asarPath, 'pc-dist/index.html'));
    return /<!-- ZALOUS:BEGIN -->[\s\S]*?<!-- ZALOUS:END -->/m.test(html);
  } catch (_) {
    return false;
  }
}

function readAsarVersion(asarPath) {
  try {
    const text = String(extractFile(asarPath, 'package.json'));
    const pkg = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch (_) {}
  return '';
}

function parseBackupMeta(fileName) {
  const clean = fileName.match(/^app\.asar\.clean\.(.+)\.bak$/);
  if (clean) return { kind: 'clean', stamp: '', key: clean[1], fileName };

  const patch = fileName.match(/^app\.asar\.(\d{14})\.bak$/);
  if (patch) return { kind: 'patch', stamp: patch[1], key: '', fileName };

  const pre = fileName.match(/^app\.asar\.pre_restore\.(\d{14})\.bak$/);
  if (pre) return { kind: 'pre_restore', stamp: pre[1], key: '', fileName };

  return null;
}

async function listBackupsByPriority() {
  const backupDir = path.join(ZALOUS_ROOT, 'backups');
  if (!fs.existsSync(backupDir)) return [];
  const files = (await fsp.readdir(backupDir))
    .map((name) => parseBackupMeta(name))
    .filter(Boolean)
    .filter((x) => x.kind === 'patch' || x.kind === 'pre_restore')
    .sort((a, b) => {
      const order = { patch: 0, pre_restore: 1 };
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      return b.stamp.localeCompare(a.stamp);
    });
  return files.map((x) => path.join(backupDir, x.fileName));
}

async function pickUnpatchedBackupCandidate({ targetVersion = '' } = {}) {
  const files = await listBackupsByPriority();
  for (const full of files) {
    if (targetVersion) {
      const ver = readAsarVersion(full);
      if (!ver || ver !== targetVersion) continue;
    }
    if (!isZalousPatchedAsar(full)) return full;
  }
  return null;
}

async function ensureCleanBaseForPatch(asarPath) {
  await ensureLayout();
  const cleanBackup = cleanBackupPathForAsar(asarPath);
  if (!fs.existsSync(cleanBackup)) {
    if (!isZalousPatchedAsar(asarPath)) {
      await fsp.copyFile(asarPath, cleanBackup);
      console.log(`[zalous] clean backup ${cleanBackup}`);
    } else {
      const targetVersion = readAsarVersion(asarPath);
      const candidate = await pickUnpatchedBackupCandidate({ targetVersion });
      if (!candidate) {
        throw new Error('Khong tim thay clean backup chua patch. Hay restore app.asar sach roi apply lai.');
      }
      await fsp.copyFile(candidate, cleanBackup);
      console.log(`[zalous] clean backup seeded ${candidate} -> ${cleanBackup}`);
    }
  }

  await fsp.copyFile(cleanBackup, asarPath);
  console.log(`[zalous] restored clean base ${cleanBackup}`);
}

function collectUnpackDirs(asarPath) {
  const raw = getRawHeader(asarPath);
  const dirs = new Set();

  function walk(node, curr) {
    if (!node || typeof node !== 'object') return;
    if (node.unpacked === true) {
      const posixPath = String(curr || '').replace(/\\/g, '/');
      const asDir = node.files ? posixPath : path.posix.dirname(posixPath);
      if (asDir && asDir !== '.') dirs.add(asDir);
    }
    if (node.files && typeof node.files === 'object') {
      for (const name of Object.keys(node.files)) {
        const next = curr ? `${curr}/${name}` : name;
        walk(node.files[name], next);
      }
    }
  }

  walk({ files: (raw && raw.header && raw.header.files) || {} }, '');
  const sorted = [...dirs].sort((a, b) => a.length - b.length);
  const roots = [];
  for (const dir of sorted) {
    if (!roots.some((r) => dir === r || dir.startsWith(`${r}/`))) roots.push(dir);
  }
  return roots;
}

async function createPackagePreserveUnpacked(extractDir, outAsar, sourceAsarPath) {
  const unpackDirs = collectUnpackDirs(sourceAsarPath);
  if (!unpackDirs.length) {
    await createPackage(extractDir, outAsar);
    return [];
  }
  const unpackDir = unpackDirs.length === 1 ? unpackDirs[0] : `{${unpackDirs.join(',')}}`;
  await createPackageWithOptions(extractDir, outAsar, { unpackDir });
  return unpackDirs;
}

function listMissingUnpackedFiles(asarPath, maxItems = 12) {
  let header;
  try {
    const raw = getRawHeader(asarPath);
    header = raw && raw.header ? raw.header : null;
  } catch (_) {
    return [];
  }
  if (!header || !header.files) return [];

  const unpackedRoot = `${asarPath}.unpacked`;
  const missing = [];
  function walk(node, curr) {
    if (!node || typeof node !== 'object') return;
    const isDir = !!node.files;
    const isSymlink = typeof node.link === 'string';
    const isFile = !isDir && !isSymlink;
    if (node.unpacked === true && isFile) {
      const rel = String(curr || '').replace(/\//g, path.sep);
      const full = path.join(unpackedRoot, rel);
      if (!fs.existsSync(full)) missing.push(rel);
    }
    if (node.files && typeof node.files === 'object') {
      for (const name of Object.keys(node.files)) {
        const next = curr ? `${curr}/${name}` : name;
        walk(node.files[name], next);
      }
    }
  }
  walk({ files: header.files }, '');
  if (!Number.isFinite(maxItems) || maxItems <= 0 || missing.length <= maxItems) return missing;
  return missing.slice(0, maxItems).concat(`... (${missing.length - maxItems} more)`);
}

async function repairUnpackedFromCandidates(asarPath, missingList) {
  const targetUnpacked = `${asarPath}.unpacked`;
  const backupRoot = path.join(ZALOUS_ROOT, 'backups');
  const targetReal = (() => {
    try {
      return fs.realpathSync.native ? fs.realpathSync.native(targetUnpacked) : fs.realpathSync(targetUnpacked);
    } catch (_) {
      return path.resolve(targetUnpacked);
    }
  })();

  const candidates = [];
  const seen = new Set();
  function pushCandidate(src, reason) {
    if (!src) return;
    const abs = path.resolve(src);
    if (!fs.existsSync(abs)) return;
    let st;
    try { st = fs.statSync(abs); } catch (_) { return; }
    if (!st.isDirectory()) return;
    let real;
    try { real = fs.realpathSync.native ? fs.realpathSync.native(abs) : fs.realpathSync(abs); } catch (_) { real = abs; }
    if (real === targetReal || seen.has(real)) return;
    seen.add(real);
    candidates.push({ src: abs, reason, mtimeMs: st.mtimeMs || 0 });
  }

  if (fs.existsSync(backupRoot)) {
    const entries = await fsp.readdir(backupRoot, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && ent.name.startsWith('app.asar.unpacked')) {
        pushCandidate(path.join(backupRoot, ent.name), `backup:${ent.name}`);
      }
    }
  }

  const brokenBase = `${path.basename(targetUnpacked)}.broken.`;
  const parentDir = path.dirname(targetUnpacked);
  if (fs.existsSync(parentDir)) {
    const entries = await fsp.readdir(parentDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && ent.name.startsWith(brokenBase)) {
        pushCandidate(path.join(parentDir, ent.name), `broken:${ent.name}`);
      }
    }
  }

  const zaloRoot = path.join(LOCALAPPDATA, 'Programs', 'Zalo');
  const currVersionDir = path.dirname(path.dirname(asarPath));
  if (fs.existsSync(zaloRoot)) {
    const versions = await fsp.readdir(zaloRoot, { withFileTypes: true });
    for (const ent of versions) {
      if (!ent.isDirectory() || !/^Zalo-/i.test(ent.name)) continue;
      const vdir = path.join(zaloRoot, ent.name);
      if (path.resolve(vdir) === path.resolve(currVersionDir)) continue;
      pushCandidate(path.join(vdir, 'resources', 'app.asar.unpacked'), `version:${ent.name}`);
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  let missing = Array.isArray(missingList) ? [...missingList] : listMissingUnpackedFiles(asarPath, 0);
  if (!missing.length) return { repaired: true, source: '', copied: 0, remaining: [] };

  let copiedTotal = 0;
  let chosenSource = '';
  for (const cand of candidates) {
    let copied = 0;
    for (const rel of missing) {
      const srcFile = path.join(cand.src, rel);
      const dstFile = path.join(targetUnpacked, rel);
      if (fs.existsSync(dstFile) || !fs.existsSync(srcFile)) continue;
      await fsp.mkdir(path.dirname(dstFile), { recursive: true });
      await fsp.copyFile(srcFile, dstFile);
      copied += 1;
    }
    if (copied > 0) {
      copiedTotal += copied;
      if (!chosenSource) chosenSource = cand.src;
      console.log(`[zalous] repaired unpacked +${copied} files from ${cand.reason}`);
      missing = listMissingUnpackedFiles(asarPath, 0);
      if (!missing.length) {
        return { repaired: true, source: chosenSource || cand.src, copied: copiedTotal, remaining: [] };
      }
    }
  }

  return { repaired: false, source: chosenSource, copied: copiedTotal, remaining: missing };
}

async function applyPatch({ asarPath, noBackup, fullPayload = true, keepControls = false }) {
  await ensureLayout();
  await ensureCleanBaseForPatch(asarPath);
  await syncBuiltInAssets();
  const synced = await syncConfigWithAssets();
  const cfg = synced.cfg;
  const themes = synced.themes;
  const themePacks = synced.themePacks;
  const extensions = synced.extensions;
  if (!Object.keys(themes).length && !Object.keys(themePacks).length) {
    throw new Error('Chua co theme/theme-pack trong %APPDATA%\\Zalous');
  }

  const runtimeCode = escapeScript(await runtimeLoader.loadRuntimeCode());
  if (!cfg.ui || typeof cfg.ui !== 'object') cfg.ui = { controls: true, hotReloadWatcher: true };
  if (!keepControls) cfg.ui.controls = false;

  const payload = {
    meta: {
      version: '0.3.2',
      generatedAt: new Date().toISOString(),
      engine: 'hara-zalous',
      mode: fullPayload ? 'full' : 'lite'
    },
    config: cfg,
    themes: fullPayload ? themes : {},
    themePacks: fullPayload ? themePacks : {},
    extensions: fullPayload ? extensions : {}
  };

  const injectBlock = [
    '<!-- ZALOUS:BEGIN -->',
    `<script id="zalous-payload">window.__ZALOUS_EMBEDDED__ = ${JSON.stringify(payload)};</script>`,
    '<script id="zalous-runtime">',
    runtimeCode,
    '</script>',
    '<!-- ZALOUS:END -->'
  ].join('\n');

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'zalous-'));
  const extractDir = path.join(tempRoot, 'extract');
  const repackedAsar = path.join(tempRoot, 'app.asar');

  try {
    await fsp.mkdir(extractDir, { recursive: true });
    let missingUnpacked = listMissingUnpackedFiles(asarPath, 0);
    if (missingUnpacked.length) {
      const repair = await repairUnpackedFromCandidates(asarPath, missingUnpacked);
      missingUnpacked = repair.remaining || listMissingUnpackedFiles(asarPath, 0);
      if (!missingUnpacked.length && repair.repaired) {
        console.log(`[zalous] unpacked repaired from ${repair.source || 'candidates'} (copied ${repair.copied})`);
      }
    }
    if (missingUnpacked.length) {
      const preview = missingUnpacked.slice(0, 12).join('\n- ');
      const tail = missingUnpacked.length > 12 ? '\n- ... (' + (missingUnpacked.length - 12) + ' more)' : '';
      throw new Error(`Thieu file trong ${asarPath}.unpacked:\n- ${preview}${tail}\nDa thu auto-repair tu backup/version khac nhung chua du file native. Hay khoi phuc app.asar.unpacked day du roi apply lai.`);
    }

    console.log(`[zalous] extract ${asarPath}`);
    await extractAll(asarPath, extractDir);
    const indexPath = path.join(extractDir, 'pc-dist', 'index.html');
    if (!fs.existsSync(indexPath)) throw new Error('Khong tim thay pc-dist/index.html');
    let html = await fsp.readFile(indexPath, 'utf8');
    const marker = /<!-- ZALOUS:BEGIN -->[\s\S]*?<!-- ZALOUS:END -->/m;
    if (marker.test(html)) {
      html = html.replace(marker, injectBlock);
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${injectBlock}\n</head>`);
    } else if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${injectBlock}\n</body>`);
    } else {
      throw new Error('Khong tim thay </head> hoac </body> de chen runtime');
    }
    await fsp.writeFile(indexPath, html, 'utf8');

    console.log('[zalous] repack');
    const unpackDirs = await createPackagePreserveUnpacked(extractDir, repackedAsar, asarPath);
    if (unpackDirs.length) console.log(`[zalous] preserve unpacked ${unpackDirs.join(', ')}`);

    if (!noBackup) {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const backupPath = path.join(ZALOUS_ROOT, 'backups', `app.asar.${stamp}.bak`);
      await fsp.copyFile(asarPath, backupPath);
      console.log(`[zalous] backup ${backupPath}`);
    }

    await fsp.copyFile(repackedAsar, asarPath);
    const repackedUnpacked = `${repackedAsar}.unpacked`;
    const targetUnpacked = `${asarPath}.unpacked`;
    if (fs.existsSync(repackedUnpacked)) {
      try {
        await fsp.rm(targetUnpacked, { recursive: true, force: true });
        await fsp.cp(repackedUnpacked, targetUnpacked, { recursive: true, force: true });
        console.log(`[zalous] synced unpacked ${targetUnpacked}`);
      } catch (err) {
        await fsp.cp(repackedUnpacked, targetUnpacked, { recursive: true, force: true });
        console.log(`[zalous] synced unpacked (merge) ${targetUnpacked}`);
        if (err && err.code) console.log(`[zalous] unpacked replace fallback ${err.code}`);
      }
    }
    cfg.appAsarPath = asarPath;
    await saveConfig(cfg);
    console.log(`[zalous] applied ${asarPath}`);
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

async function restoreLatest(asarPath) {
  const files = await listBackupsByPriority();
  if (!files.length) throw new Error('Khong co backup');
  const src = files[0];
  await fsp.copyFile(src, asarPath);
  console.log(`[zalous] restored ${src} -> ${asarPath}`);
}

module.exports = {
  resolveAsar,
  detectLatestAsar,
  applyPatch,
  restoreLatest
};
