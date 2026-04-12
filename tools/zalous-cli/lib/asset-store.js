const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { REPO_ROOT, ZALOUS_ROOT } = require('./constants');
const {
  ensureLayout,
  readConfig,
  saveConfig,
  readManagedAssets,
  saveManagedAssets
} = require('./config-store');

let hotReloadSeq = 0;

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
  } catch (_) {
    throw new Error(`Khong doc duoc ${label}: ${filePath}`);
  }
}

function signalHotReload(cfg, { type = 'all', name = '', source = 'cli' } = {}) {
  hotReloadSeq += 1;
  const prevToken = cfg && cfg.hotReload ? String(cfg.hotReload.token || '') : '';
  let nextToken = `${Date.now()}-${process.pid}-${hotReloadSeq}-${Math.random().toString(36).slice(2, 8)}`;
  if (nextToken === prevToken) nextToken = `${nextToken}-1`;
  cfg.hotReload = {
    token: nextToken,
    type: normalizeAssetType(type),
    name: String(name || ''),
    source: String(source || 'cli'),
    at: new Date().toISOString()
  };
}

async function pruneManagedFiles(dir, previousNames, nextNames) {
  const nextSet = new Set(nextNames || []);
  for (const name of previousNames || []) {
    if (!name || nextSet.has(name)) continue;
    await fsp.rm(path.join(dir, name), { force: true });
  }
}

async function pruneManagedDirs(dir, previousNames, nextNames) {
  const nextSet = new Set(nextNames || []);
  for (const name of previousNames || []) {
    if (!name || nextSet.has(name)) continue;
    await fsp.rm(path.join(dir, name), { recursive: true, force: true });
  }
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
  const copied = new Set();
  if (!fs.existsSync(packsRoot)) return copied;

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
    const outName = path.basename(manifest.entry);
    await fsp.copyFile(src, path.join(dstDir, outName));
    copied.add(outName);
  }
  return copied;
}

async function copyBuiltInThemePacks() {
  await ensureLayout();
  const packsRoot = path.join(REPO_ROOT, 'zalous', 'market', 'packs');
  const dstRoot = path.join(ZALOUS_ROOT, 'theme-packs');
  const copied = new Set();
  if (!fs.existsSync(packsRoot)) return copied;

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
    copied.add(id);
  }
  return copied;
}

async function copyLegacyThemesFromRoot() {
  await ensureLayout();
  const srcDir = path.join(REPO_ROOT, 'themes');
  const dstDir = path.join(ZALOUS_ROOT, 'themes');
  const copied = new Set();
  if (!fs.existsSync(srcDir)) return copied;
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.css')) continue;
    await fsp.copyFile(path.join(srcDir, ent.name), path.join(dstDir, ent.name));
    copied.add(ent.name);
  }
  return copied;
}

async function copyBuiltInExtensions() {
  await ensureLayout();
  const packsRoot = path.join(REPO_ROOT, 'zalous', 'market', 'packs');
  const dstDir = path.join(ZALOUS_ROOT, 'extensions');
  const copied = new Set();
  if (!fs.existsSync(packsRoot)) return copied;

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
    const outName = path.basename(manifest.entry);
    await fsp.copyFile(src, path.join(dstDir, outName));
    copied.add(outName);
  }
  return copied;
}

async function syncBuiltInAssets() {
  const prev = await readManagedAssets();
  const builtInThemes = await copyBuiltInThemes();
  const legacyThemes = await copyLegacyThemesFromRoot();
  const themePacks = await copyBuiltInThemePacks();
  const extensions = await copyBuiltInExtensions();
  const next = {
    themes: Array.from(new Set([...builtInThemes, ...legacyThemes])),
    themePacks: Array.from(themePacks),
    extensions: Array.from(extensions)
  };

  await pruneManagedFiles(path.join(ZALOUS_ROOT, 'themes'), prev.themes, next.themes);
  await pruneManagedDirs(path.join(ZALOUS_ROOT, 'theme-packs'), prev.themePacks, next.themePacks);
  await pruneManagedFiles(path.join(ZALOUS_ROOT, 'extensions'), prev.extensions, next.extensions);
  await saveManagedAssets(next);
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
    cfg.ui = { controls: true, hotReloadWatcher: true };
    changed = true;
  } else {
    if (typeof cfg.ui.controls !== 'boolean') {
      cfg.ui.controls = true;
      changed = true;
    }
    if (typeof cfg.ui.hotReloadWatcher !== 'boolean') {
      cfg.ui.hotReloadWatcher = true;
      changed = true;
    }
  }

  if (!cfg.extensionConfigs || typeof cfg.extensionConfigs !== 'object') {
    cfg.extensionConfigs = {};
    changed = true;
  }

  if (changed) await saveConfig(cfg);
  return { cfg, themes, themePacks, extensions };
}

module.exports = {
  themePackAssetFiles,
  safePackId,
  normalizeAssetType,
  safeAssetName,
  normalizeThemePackKey,
  readJsonFile,
  signalHotReload,
  copyThemePackDir,
  copyThemePackTree,
  syncBuiltInAssets,
  collectThemePacks,
  collectMap,
  syncConfigWithAssets
};
