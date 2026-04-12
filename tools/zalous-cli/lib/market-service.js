const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { REPO_ROOT, LOCAL_CATALOG, ZALOUS_ROOT } = require('./constants');
const { readConfig, saveConfig } = require('./config-store');
const {
  themePackAssetFiles,
  safeAssetName,
  safePackId,
  normalizeAssetType,
  normalizeThemePackKey,
  readJsonFile,
  signalHotReload,
  copyThemePackDir,
  copyThemePackTree,
  collectThemePacks,
  collectMap,
  syncConfigWithAssets
} = require('./asset-store');

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
  for (const rel of themePackAssetFiles(nextManifest)) {
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
  } else if (type === 'extension' && flags.name) {
    const name = safeAssetName(flags.name, '.js', 'extension');
    if (!extensions[name]) throw new Error(`Extension khong ton tai ${name}`);
    if (flags.enable && !cfg.enabledExtensions.includes(name)) cfg.enabledExtensions.push(name);
    if (flags.disable) cfg.enabledExtensions = cfg.enabledExtensions.filter((x) => x !== name);
    target = name;
  }

  signalHotReload(cfg, { type, name: target, source: 'cli.reload' });
  await saveConfig(cfg);
  console.log(`[zalous] reload signaled ${type}${target ? ` ${target}` : ''}`);
}

module.exports = {
  importFile,
  readCatalog,
  installPack,
  addAssetDirect,
  patchAssetDirect,
  reloadAssetsDirect
};
