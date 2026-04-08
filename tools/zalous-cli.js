#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { createPackage, createPackageWithOptions, extractAll, extractFile, getRawHeader } = require('@electron/asar');

const REPO_ROOT = path.resolve(__dirname, '..');
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const ZALOUS_ROOT = path.join(APPDATA, 'Zalous');
const CONFIG_PATH = path.join(ZALOUS_ROOT, 'config.json');
const LOCAL_CATALOG = path.join(REPO_ROOT, 'zalous', 'market', 'catalog.local.json');
const RUNTIME_PATH = path.join(REPO_ROOT, 'zalous', 'runtime', 'zalous-runtime.js');
let HOT_RELOAD_SEQ = 0;

function defaultConfig() {
  return {
    version: 1,
    activeTheme: null,
    enabledExtensions: [],
    extensionConfigs: {},
    patchEnabled: false,
    appAsarPath: '',
    hotReload: {
      token: '',
      type: 'all',
      name: '',
      source: '',
      at: ''
    },
    ui: { controls: true },
    market: { source: 'local', catalogUrl: '' }
  };
}

async function ensureLayout() {
  for (const dir of [
    ZALOUS_ROOT,
    path.join(ZALOUS_ROOT, 'themes'),
    path.join(ZALOUS_ROOT, 'theme-packs'),
    path.join(ZALOUS_ROOT, 'extensions'),
    path.join(ZALOUS_ROOT, 'backups'),
    path.join(ZALOUS_ROOT, 'logs')
  ]) {
    await fsp.mkdir(dir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    await fsp.writeFile(CONFIG_PATH, JSON.stringify(defaultConfig(), null, 2), 'utf8');
  }
}

async function readConfig() {
  await ensureLayout();
  const text = (await fsp.readFile(CONFIG_PATH, 'utf8')).replace(/^\uFEFF/, '');
  const cfg = JSON.parse(text);
  return {
    ...defaultConfig(),
    ...cfg,
    ui: { controls: true, ...(cfg.ui || {}) },
    hotReload: {
      token: '',
      type: 'all',
      name: '',
      source: '',
      at: '',
      ...((cfg.hotReload && typeof cfg.hotReload === 'object') ? cfg.hotReload : {})
    },
    market: { source: 'local', catalogUrl: '', ...(cfg.market || {}) },
    enabledExtensions: Array.isArray(cfg.enabledExtensions) ? cfg.enabledExtensions : [],
    extensionConfigs: (cfg.extensionConfigs && typeof cfg.extensionConfigs === 'object') ? cfg.extensionConfigs : {}
  };
}

async function saveConfig(cfg) {
  await ensureLayout();
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function themePackAssetFiles(manifest) {
  const assets = manifest && manifest.assets && typeof manifest.assets === 'object' ? manifest.assets : {};
  const files = [];
  if (assets.css) files.push(assets.css);
  if (assets.js) files.push(assets.js);
  if (assets.html) files.push(assets.html);
  if (!files.length && manifest && manifest.entry) files.push(manifest.entry);
  return [...new Set(files)];
}

function safePackId(v, fallback = 'theme-pack') {
  const s = String(v || fallback).trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  return s || fallback;
}

function normalizeAssetType(v) {
  const raw = String(v || '').trim().toLowerCase();
  if (raw === 'theme' || raw === 'extension' || raw === 'theme-pack' || raw === 'all') return raw;
  if (raw === 'themepack' || raw === 'pack') return 'theme-pack';
  throw new Error('Can --type <theme|theme-pack|extension|all>');
}

function safeAssetName(v, ext, fallback = 'custom') {
  const s = String(v || fallback).trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  const base = s || fallback;
  return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`;
}

function normalizeThemePackKey(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  if (raw.startsWith('pack:')) return `pack:${safePackId(raw.slice(5), 'theme-pack')}`;
  return `pack:${safePackId(raw, 'theme-pack')}`;
}

async function readJsonFile(filePath, label = 'JSON') {
  try {
    const text = (await fsp.readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Khong doc duoc ${label}: ${filePath}`);
  }
}

function signalHotReload(cfg, { type = 'all', name = '', source = 'cli' } = {}) {
  HOT_RELOAD_SEQ += 1;
  const prevToken = cfg && cfg.hotReload ? String(cfg.hotReload.token || '') : '';
  let nextToken = `${Date.now()}-${process.pid}-${HOT_RELOAD_SEQ}-${Math.random().toString(36).slice(2, 8)}`;
  if (nextToken === prevToken) nextToken = `${nextToken}-1`;

  cfg.hotReload = {
    token: nextToken,
    type: normalizeAssetType(type),
    name: String(name || ''),
    source: String(source || 'cli'),
    at: new Date().toISOString()
  };
}

async function copyThemePackDir(srcDir, dstDir, manifest) {
  await fsp.mkdir(dstDir, { recursive: true });
  await fsp.copyFile(path.join(srcDir, 'manifest.json'), path.join(dstDir, 'manifest.json'));
  for (const rel of themePackAssetFiles(manifest)) {
    const src = path.join(srcDir, rel);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(dstDir, rel);
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.copyFile(src, dst);
  }
}

async function copyThemePackTree(srcDir, dstDir, manifestOverride) {
  await fsp.rm(dstDir, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(dstDir), { recursive: true });
  await fsp.cp(srcDir, dstDir, { recursive: true, force: true });
  if (manifestOverride) {
    await fsp.writeFile(path.join(dstDir, 'manifest.json'), JSON.stringify(manifestOverride, null, 2), 'utf8');
  }
}

async function copyBuiltInThemes() {
  await ensureLayout();
  const packsRoot = path.join(REPO_ROOT, 'zalous', 'market', 'packs');
  const dstDir = path.join(ZALOUS_ROOT, 'themes');
  if (!fs.existsSync(packsRoot)) return;

  const packs = await fsp.readdir(packsRoot, { withFileTypes: true });
  for (const p of packs) {
    if (!p.isDirectory()) continue;
    const packDir = path.join(packsRoot, p.name);
    const manifestPath = path.join(packDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse((await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (_) {
      continue;
    }

    if (!manifest || manifest.type !== 'theme' || !manifest.entry) continue;
    const src = path.join(packDir, manifest.entry);
    if (!fs.existsSync(src)) continue;
    await fsp.copyFile(src, path.join(dstDir, path.basename(manifest.entry)));
  }
}

async function copyBuiltInThemePacks() {
  await ensureLayout();
  const packsRoot = path.join(REPO_ROOT, 'zalous', 'market', 'packs');
  const dstRoot = path.join(ZALOUS_ROOT, 'theme-packs');
  if (!fs.existsSync(packsRoot)) return;

  const packs = await fsp.readdir(packsRoot, { withFileTypes: true });
  for (const p of packs) {
    if (!p.isDirectory()) continue;
    const packDir = path.join(packsRoot, p.name);
    const manifestPath = path.join(packDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse((await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (_) {
      continue;
    }

    if (!manifest || manifest.type !== 'theme-pack') continue;
    const id = safePackId(manifest.id || p.name, p.name);
    await copyThemePackDir(packDir, path.join(dstRoot, id), manifest);
  }
}

async function copyLegacyThemesFromRoot() {
  await ensureLayout();
  const srcDir = path.join(REPO_ROOT, 'themes');
  const dstDir = path.join(ZALOUS_ROOT, 'themes');
  if (!fs.existsSync(srcDir)) return;
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.css')) continue;
    await fsp.copyFile(path.join(srcDir, ent.name), path.join(dstDir, ent.name));
  }
}

async function copyBuiltInExtensions() {
  await ensureLayout();
  const packsRoot = path.join(REPO_ROOT, 'zalous', 'market', 'packs');
  const dstDir = path.join(ZALOUS_ROOT, 'extensions');
  if (!fs.existsSync(packsRoot)) return;

  const packs = await fsp.readdir(packsRoot, { withFileTypes: true });
  for (const p of packs) {
    if (!p.isDirectory()) continue;
    const packDir = path.join(packsRoot, p.name);
    const manifestPath = path.join(packDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse((await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (_) {
      continue;
    }

    if (!manifest || manifest.type !== 'extension' || !manifest.entry) continue;
    const src = path.join(packDir, manifest.entry);
    if (!fs.existsSync(src)) continue;
    await fsp.copyFile(src, path.join(dstDir, path.basename(manifest.entry)));
  }
}

async function syncBuiltInAssets() {
  await copyBuiltInThemes();
  await copyBuiltInThemePacks();
  await copyLegacyThemesFromRoot();
  await copyBuiltInExtensions();
}

async function collectThemePacks() {
  const packRoot = path.join(ZALOUS_ROOT, 'theme-packs');
  const out = {};
  if (!fs.existsSync(packRoot)) return out;

  const dirs = await fsp.readdir(packRoot, { withFileTypes: true });
  for (const ent of dirs) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(packRoot, ent.name);
    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse((await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (_) {
      continue;
    }
    if (!manifest || manifest.type !== 'theme-pack') continue;

    const assets = manifest.assets || {};
    const cssRel = assets.css || manifest.entry || '';
    const jsRel = assets.js || '';
    const htmlRel = assets.html || '';
    const id = safePackId(manifest.id || ent.name, ent.name);
    const cssPath = cssRel ? path.join(dir, cssRel) : '';
    const jsPath = jsRel ? path.join(dir, jsRel) : '';
    const htmlPath = htmlRel ? path.join(dir, htmlRel) : '';

    out[`pack:${id}`] = {
      id,
      name: manifest.name || id,
      css: cssPath && fs.existsSync(cssPath) ? await fsp.readFile(cssPath, 'utf8') : '',
      js: jsPath && fs.existsSync(jsPath) ? await fsp.readFile(jsPath, 'utf8') : '',
      html: htmlPath && fs.existsSync(htmlPath) ? await fsp.readFile(htmlPath, 'utf8') : ''
    };
  }
  return out;
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

async function collectMap(dirName, ext) {
  const dir = path.join(ZALOUS_ROOT, dirName);
  const out = {};
  if (!fs.existsSync(dir)) return out;
  const files = (await fsp.readdir(dir)).filter((f) => f.toLowerCase().endsWith(ext));
  files.sort((a, b) => a.localeCompare(b));
  for (const f of files) {
    out[f] = await fsp.readFile(path.join(dir, f), 'utf8');
  }
  return out;
}

async function syncConfigWithAssets() {
  const cfg = await readConfig();
  const themes = await collectMap('themes', '.css');
  delete themes['zalo-common.css'];
  const themePacks = await collectThemePacks();
  const extensions = await collectMap('extensions', '.js');

  let changed = false;
  const themeNames = Object.keys(themes).concat(Object.keys(themePacks));
  if (!cfg.activeTheme || (!themes[cfg.activeTheme] && !themePacks[cfg.activeTheme])) {
    const next = themeNames.length ? themeNames[0] : null;
    if (cfg.activeTheme !== next) {
      cfg.activeTheme = next;
      changed = true;
    }
  }

  const normalizedEnabled = (cfg.enabledExtensions || []).filter((name) =>
    Object.prototype.hasOwnProperty.call(extensions, name)
  );
  if (JSON.stringify(normalizedEnabled) !== JSON.stringify(cfg.enabledExtensions || [])) {
    cfg.enabledExtensions = normalizedEnabled;
    changed = true;
  }

  if (!cfg.ui || typeof cfg.ui !== 'object') {
    cfg.ui = { controls: true };
    changed = true;
  } else if (typeof cfg.ui.controls !== 'boolean') {
    cfg.ui.controls = true;
    changed = true;
  }
  if (!cfg.extensionConfigs || typeof cfg.extensionConfigs !== 'object') {
    cfg.extensionConfigs = {};
    changed = true;
  }

  if (changed) await saveConfig(cfg);
  return { cfg, themes, themePacks, extensions };
}

function escapeScript(text) {
  return text.replace(/<\/script>/gi, '<\\/script>');
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
    if (!roots.some((r) => dir === r || dir.startsWith(`${r}/`))) {
      roots.push(dir);
    }
  }
  return roots;
}

async function createPackagePreserveUnpacked(extractDir, outAsar, sourceAsarPath) {
  const unpackDirs = collectUnpackDirs(sourceAsarPath);
  if (!unpackDirs.length) {
    await createPackage(extractDir, outAsar);
    return [];
  }

  const unpackDir = unpackDirs.length === 1
    ? unpackDirs[0]
    : `{${unpackDirs.join(',')}}`;

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
  if (missing.length <= maxItems) return missing;
  return missing.slice(0, maxItems).concat(`... (${missing.length - maxItems} more)`);
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

  const runtimeCode = escapeScript(await fsp.readFile(RUNTIME_PATH, 'utf8'));
  if (!cfg.ui || typeof cfg.ui !== 'object') cfg.ui = { controls: true };
  if (!keepControls) cfg.ui.controls = false;

  const payload = {
    meta: {
      version: '0.2.1',
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

    const missingUnpacked = listMissingUnpackedFiles(asarPath);
    if (missingUnpacked.length) {
      const preview = missingUnpacked.join('\n- ');
      throw new Error(`Thieu file trong ${asarPath}.unpacked:\n- ${preview}\nHay khoi phuc app.asar.unpacked day du roi apply lai.`);
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
async function importFile(kind, filePath, name) {
  if (!filePath) throw new Error('Thieu --file <path>');
  const src = path.resolve(filePath);
  if (!fs.existsSync(src)) throw new Error(`Khong tim thay file ${src}`);
  const ext = kind === 'theme' ? '.css' : '.js';
  const outName = safeAssetName(name || path.basename(src), ext, kind);
  const dst = path.join(ZALOUS_ROOT, kind === 'theme' ? 'themes' : 'extensions', outName);
  await fsp.copyFile(src, dst);
  console.log(`[zalous] imported ${kind} ${dst}`);
  return { name: outName, path: dst };
}

async function readCatalog(catalogPath) {
  const target = catalogPath ? path.resolve(catalogPath) : LOCAL_CATALOG;
  if (!fs.existsSync(target)) throw new Error(`Khong tim thay catalog ${target}`);
  return JSON.parse((await fsp.readFile(target, 'utf8')).replace(/^\uFEFF/, ''));
}

async function installPack(packId, catalogPath) {
  if (!packId) throw new Error('Thieu --id <packId>');
  const cat = await readCatalog(catalogPath);
  const pack = (cat.packs || []).find((p) => p.id === packId);
  if (!pack) throw new Error(`Khong tim thay pack ${packId}`);

  const packDir = path.join(REPO_ROOT, 'zalous', 'market', pack.path);
  const manifestPath = path.join(packDir, 'manifest.json');
  const manifest = JSON.parse((await fsp.readFile(manifestPath, 'utf8')).replace(/^\uFEFF/, ''));
  const entryPath = path.join(packDir, manifest.entry);
  if (manifest.type !== 'theme-pack' && !fs.existsSync(entryPath)) {
    throw new Error(`Pack missing entry ${entryPath}`);
  }

  if (manifest.type === 'theme') {
    await importFile('theme', entryPath, manifest.entry);
  } else if (manifest.type === 'theme-pack') {
    const id = safePackId(manifest.id || path.basename(packDir), path.basename(packDir));
    const dst = path.join(ZALOUS_ROOT, 'theme-packs', id);
    await copyThemePackDir(packDir, dst, manifest);
    const cfg = await readConfig();
    const key = `pack:${id}`;
    if (!cfg.activeTheme) {
      cfg.activeTheme = key;
      await saveConfig(cfg);
    }
  } else if (manifest.type === 'extension') {
    await importFile('extension', entryPath, manifest.entry);
    const cfg = await readConfig();
    if (!cfg.enabledExtensions.includes(manifest.entry)) {
      cfg.enabledExtensions.push(manifest.entry);
      await saveConfig(cfg);
    }
  } else {
    throw new Error(`Loai pack khong ho tro: ${manifest.type}`);
  }

  console.log(`[zalous] installed ${manifest.id}`);
}

async function readThemePackFromDir(srcDir, idOverride = '') {
  if (!srcDir) throw new Error('Can --dir <path>');
  const abs = path.resolve(srcDir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`Thu muc theme-pack khong ton tai: ${abs}`);
  }
  const manifestPath = path.join(abs, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Thieu manifest.json trong ${abs}`);
  }

  const manifest = await readJsonFile(manifestPath, 'manifest');
  if (!manifest || manifest.type !== 'theme-pack') {
    throw new Error(`Manifest khong hop le hoac khong phai theme-pack: ${manifestPath}`);
  }

  const id = safePackId(idOverride || manifest.id || path.basename(abs), path.basename(abs));
  const nextManifest = { ...manifest, id, type: 'theme-pack' };
  const assets = themePackAssetFiles(nextManifest);
  for (const rel of assets) {
    const full = path.join(abs, rel);
    if (!fs.existsSync(full)) throw new Error(`Theme-pack thieu asset ${rel}`);
  }

  return {
    srcDir: abs,
    id,
    key: `pack:${id}`,
    manifest: nextManifest
  };
}

async function addAssetDirect(flags) {
  const type = normalizeAssetType(flags.type);
  if (type === 'all') throw new Error('add khong ho tro --type all');

  const cfg = await readConfig();
  let addedName = '';

  if (type === 'theme') {
    const added = await importFile('theme', flags.file, flags.name);
    addedName = added.name;
    if (!cfg.activeTheme || flags.activate) cfg.activeTheme = addedName;
  } else if (type === 'extension') {
    const added = await importFile('extension', flags.file, flags.name);
    addedName = added.name;
    if (!flags['no-enable'] && !cfg.enabledExtensions.includes(addedName)) {
      cfg.enabledExtensions.push(addedName);
    }
  } else if (type === 'theme-pack') {
    const info = await readThemePackFromDir(flags.dir, flags.id);
    const dst = path.join(ZALOUS_ROOT, 'theme-packs', info.id);
    await copyThemePackTree(info.srcDir, dst, info.manifest);
    addedName = info.key;
    if (!cfg.activeTheme || flags.activate) cfg.activeTheme = info.key;
    console.log(`[zalous] imported theme-pack ${dst}`);
  }

  await saveConfig(cfg);
  const synced = await syncConfigWithAssets();
  const nextCfg = synced.cfg;
  if (flags.reload) signalHotReload(nextCfg, { type, name: addedName, source: 'cli.add' });
  await saveConfig(nextCfg);
  console.log(`[zalous] added ${type} ${addedName}`);
}

async function patchThemePackFiles(dstDir, flags) {
  const manifestPath = path.join(dstDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Theme-pack bi thieu manifest: ${manifestPath}`);
  const manifest = await readJsonFile(manifestPath, 'manifest');
  if (!manifest || manifest.type !== 'theme-pack') throw new Error(`Manifest khong hop le: ${manifestPath}`);

  if (!manifest.assets || typeof manifest.assets !== 'object') manifest.assets = {};
  let changed = false;

  const patchAsset = async (flagKey, assetKey, fallbackRel) => {
    const srcFlag = flags[flagKey];
    if (!srcFlag) return;
    const src = path.resolve(srcFlag);
    if (!fs.existsSync(src)) throw new Error(`Khong tim thay file ${src}`);
    const rel = manifest.assets[assetKey] || (assetKey === 'css' ? (manifest.entry || fallbackRel) : fallbackRel);
    const dst = path.join(dstDir, rel);
    await fsp.mkdir(path.dirname(dst), { recursive: true });
    await fsp.copyFile(src, dst);
    manifest.assets[assetKey] = rel;
    if (assetKey === 'css' && !manifest.entry) manifest.entry = rel;
    changed = true;
  };

  await patchAsset('css', 'css', 'theme-pack.css');
  await patchAsset('js', 'js', 'theme-pack.js');
  await patchAsset('html', 'html', 'theme-pack.html');

  if (!changed) {
    throw new Error('patch theme-pack can --dir hoac mot trong --css/--js/--html');
  }
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

async function patchAssetDirect(flags) {
  const type = normalizeAssetType(flags.type);
  if (type === 'all') throw new Error('patch khong ho tro --type all');

  const cfg = await readConfig();
  let patchedName = '';

  if (type === 'theme') {
    if (!flags.name) throw new Error('patch theme can --name <file.css>');
    if (!flags.file) throw new Error('patch theme can --file <path.css>');
    const name = safeAssetName(flags.name, '.css', 'theme');
    const src = path.resolve(flags.file);
    if (!fs.existsSync(src)) throw new Error(`Khong tim thay file ${src}`);
    const dst = path.join(ZALOUS_ROOT, 'themes', name);
    if (!fs.existsSync(dst)) throw new Error(`Khong co theme ${name}`);
    await fsp.copyFile(src, dst);
    patchedName = name;
    if (flags.activate) cfg.activeTheme = name;
  } else if (type === 'extension') {
    if (!flags.name) throw new Error('patch extension can --name <file.js>');
    if (!flags.file) throw new Error('patch extension can --file <path.js>');
    const name = safeAssetName(flags.name, '.js', 'extension');
    const src = path.resolve(flags.file);
    if (!fs.existsSync(src)) throw new Error(`Khong tim thay file ${src}`);
    const dst = path.join(ZALOUS_ROOT, 'extensions', name);
    if (!fs.existsSync(dst)) throw new Error(`Khong co extension ${name}`);
    await fsp.copyFile(src, dst);
    patchedName = name;
  } else if (type === 'theme-pack') {
    if (!flags.id) throw new Error('patch theme-pack can --id <pack-id>');
    const id = safePackId(flags.id, 'theme-pack');
    const key = `pack:${id}`;
    const dst = path.join(ZALOUS_ROOT, 'theme-packs', id);
    if (!fs.existsSync(dst)) throw new Error(`Khong co theme-pack ${key}`);

    if (flags.dir) {
      const info = await readThemePackFromDir(flags.dir, id);
      await copyThemePackTree(info.srcDir, dst, info.manifest);
    } else {
      await patchThemePackFiles(dst, flags);
    }
    patchedName = key;
    if (flags.activate) cfg.activeTheme = key;
  }

  await saveConfig(cfg);
  const synced = await syncConfigWithAssets();
  const nextCfg = synced.cfg;
  if (flags.reload) signalHotReload(nextCfg, { type, name: patchedName, source: 'cli.patch' });
  await saveConfig(nextCfg);
  console.log(`[zalous] patched ${type} ${patchedName}`);
}

async function reloadAssetsDirect(flags) {
  const type = normalizeAssetType(flags.type || 'all');
  if (flags.enable && flags.disable) throw new Error('Khong the dung cung luc --enable va --disable');

  const cfg = await readConfig();
  const themes = await collectMap('themes', '.css');
  delete themes['zalo-common.css'];
  const packs = await collectThemePacks();
  const extensions = await collectMap('extensions', '.js');
  let target = '';

  if (type === 'theme') {
    const name = flags.name ? safeAssetName(flags.name, '.css', 'theme') : cfg.activeTheme;
    if (!name || !themes[name]) throw new Error(`Theme khong ton tai ${name || '(empty)'}`);
    cfg.activeTheme = name;
    target = name;
  } else if (type === 'theme-pack') {
    const currentPack = String(cfg.activeTheme || '').startsWith('pack:') ? cfg.activeTheme : '';
    let key = normalizeThemePackKey(flags.name || currentPack);
    if (!key || !packs[key]) key = Object.keys(packs).sort()[0] || '';
    if (!key || !packs[key]) throw new Error('Khong co theme-pack de reload');
    cfg.activeTheme = key;
    target = key;
  } else if (type === 'extension') {
    if (flags.name) {
      const name = safeAssetName(flags.name, '.js', 'extension');
      if (!extensions[name]) throw new Error(`Extension khong ton tai ${name}`);
      if (flags.enable && !cfg.enabledExtensions.includes(name)) cfg.enabledExtensions.push(name);
      if (flags.disable) cfg.enabledExtensions = cfg.enabledExtensions.filter((x) => x !== name);
      target = name;
    }
  }

  signalHotReload(cfg, { type, name: target, source: 'cli.reload' });
  await saveConfig(cfg);
  console.log(`[zalous] reload signaled ${type}${target ? ` ${target}` : ''}`);
}

function resolveFullPayloadFlag(flags) {
  if (flags['lite-payload']) return false;
  if (flags['full-payload']) return true;
  return true;
}
function parseArgv(argv) {
  const [command = 'patch-now', ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const t = rest[i];
    if (!t.startsWith('--')) continue;
    const key = t.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return { command, flags };
}

async function printStatus() {
  const cfg = await readConfig();
  const themes = await collectMap('themes', '.css');
  delete themes['zalo-common.css'];
  const themePacks = await collectThemePacks();
  const exts = await collectMap('extensions', '.js');
  console.log(JSON.stringify({
    root: ZALOUS_ROOT,
    appAsarPath: cfg.appAsarPath,
    activeTheme: cfg.activeTheme,
    patchEnabled: cfg.patchEnabled,
    hotReload: cfg.hotReload || {},
    enabledExtensions: cfg.enabledExtensions,
    themeCount: Object.keys(themes).length,
    themePackCount: Object.keys(themePacks).length,
    extensionCount: Object.keys(exts).length
  }, null, 2));
}

function printHelp() {
  console.log('hara-zalous CLI (Node)');
  console.log('');
  console.log('Mac dinh (khong truyen command): patch-now');
  console.log('');
  console.log('Commands:');
  console.log('  patch-now [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]');
  console.log('  init');
  console.log('  detect [--asar <path>]');
  console.log('  status');
  console.log('  apply [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]');
  console.log('  restore [--asar <path>]');
  console.log('  list-themes');
  console.log('  set-theme --theme <file.css|pack:pack-id>');
  console.log('  list-extensions');
  console.log('  enable-extension --name <file.js>');
  console.log('  disable-extension --name <file.js>');
  console.log('  import-theme --file <path.css> [--name custom.css]');
  console.log('  import-extension --file <path.js> [--name custom.js]');
  console.log('  add --type <theme|theme-pack|extension> [--file <path>|--dir <path>] [--name <name>] [--id <pack-id>] [--activate] [--reload]');
  console.log('  patch --type <theme|theme-pack|extension> [--name <file>] [--id <pack-id>] [--file <path>] [--dir <path>] [--css <path>] [--js <path>] [--html <path>] [--activate] [--reload]');
  console.log('  reload [--type <all|theme|theme-pack|extension>] [--name <asset>] [--enable|--disable]');
  console.log('  market-list [--catalog <path.json>]');
  console.log('  market-install --id <packId> [--catalog <path.json>]');
  console.log('  doctor');
}

async function main() {
  const { command, flags } = parseArgv(process.argv.slice(2));
  await ensureLayout();

  switch (command) {
    case 'patch-now':
      await applyPatch({
        asarPath: flags.asar ? await resolveAsar(flags.asar) : await detectLatestAsar(),
        noBackup: !!flags['no-backup'],
        fullPayload: resolveFullPayloadFlag(flags),
        keepControls: !!flags['keep-controls']
      });
      break;
    case 'help':
      printHelp();
      break;
    case 'init':
      await syncBuiltInAssets();
      await syncConfigWithAssets();
      console.log(`[zalous] initialized ${ZALOUS_ROOT}`);
      break;
    case 'detect': {
      const asarPath = await resolveAsar(flags.asar);
      const cfg = await readConfig();
      cfg.appAsarPath = asarPath;
      await saveConfig(cfg);
      console.log(`[zalous] app.asar ${asarPath}`);
      break;
    }
    case 'status':
      await printStatus();
      break;
    case 'apply':
      await applyPatch({
        asarPath: flags.asar ? await resolveAsar(flags.asar) : await detectLatestAsar(),
        noBackup: !!flags['no-backup'],
        fullPayload: resolveFullPayloadFlag(flags),
        keepControls: !!flags['keep-controls']
      });
      break;
    case 'restore':
      await restoreLatest(await resolveAsar(flags.asar));
      break;
    case 'list-themes': {
      const themes = await collectMap('themes', '.css');
      delete themes['zalo-common.css'];
      Object.keys(themes).sort().forEach((t) => console.log(t));
      const packs = await collectThemePacks();
      Object.keys(packs).sort().forEach((t) => console.log(t));
      break;
    }
    case 'set-theme': {
      if (!flags.theme) throw new Error('Can --theme <file.css|pack:pack-id>');
      const themes = await collectMap('themes', '.css');
      delete themes['zalo-common.css'];
      const packs = await collectThemePacks();
      if (!themes[flags.theme] && !packs[flags.theme]) throw new Error(`Theme khong ton tai ${flags.theme}`);
      const cfg = await readConfig();
      cfg.activeTheme = flags.theme;
      await saveConfig(cfg);
      console.log(`[zalous] activeTheme ${flags.theme}`);
      break;
    }
    case 'list-extensions': {
      const exts = await collectMap('extensions', '.js');
      const cfg = await readConfig();
      Object.keys(exts).sort().forEach((e) => {
        const on = cfg.enabledExtensions.includes(e) ? '[on]' : '[off]';
        console.log(`${on} ${e}`);
      });
      break;
    }
    case 'enable-extension': {
      if (!flags.name) throw new Error('Can --name <file.js>');
      const exts = await collectMap('extensions', '.js');
      if (!exts[flags.name]) throw new Error(`Khong co extension ${flags.name}`);
      const cfg = await readConfig();
      if (!cfg.enabledExtensions.includes(flags.name)) cfg.enabledExtensions.push(flags.name);
      await saveConfig(cfg);
      console.log(`[zalous] enabled ${flags.name}`);
      break;
    }
    case 'disable-extension': {
      if (!flags.name) throw new Error('Can --name <file.js>');
      const cfg = await readConfig();
      cfg.enabledExtensions = cfg.enabledExtensions.filter((x) => x !== flags.name);
      await saveConfig(cfg);
      console.log(`[zalous] disabled ${flags.name}`);
      break;
    }
    case 'import-theme':
      await importFile('theme', flags.file, flags.name);
      break;
    case 'import-extension':
      await importFile('extension', flags.file, flags.name);
      break;
    case 'add':
      await addAssetDirect(flags);
      break;
    case 'patch':
      await patchAssetDirect(flags);
      break;
    case 'reload':
      await reloadAssetsDirect(flags);
      break;
    case 'market-list': {
      const cat = await readCatalog(flags.catalog);
      for (const p of cat.packs || []) console.log(`${p.id} | ${p.type} | ${p.name}`);
      break;
    }
    case 'market-install':
      await installPack(flags.id, flags.catalog);
      break;
    case 'doctor': {
      let asarPath = '';
      try { asarPath = await resolveAsar(flags.asar); } catch (_) {}
      console.log(JSON.stringify({
        node: process.version,
        repoRoot: REPO_ROOT,
        zalousRoot: ZALOUS_ROOT,
        runtimeExists: fs.existsSync(RUNTIME_PATH),
        catalogExists: fs.existsSync(LOCAL_CATALOG),
        asarDetected: !!asarPath,
        asarPath
      }, null, 2));
      break;
    }
    default:
      throw new Error(`Command khong hop le: ${command}`);
  }
}

main().catch((err) => {
  console.error('[zalous] ERROR', err && err.message ? err.message : err);
  process.exit(1);
});

