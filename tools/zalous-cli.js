#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { createPackage, extractAll } = require('@electron/asar');

const REPO_ROOT = path.resolve(__dirname, '..');
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const ZALOUS_ROOT = path.join(APPDATA, 'Zalous');
const CONFIG_PATH = path.join(ZALOUS_ROOT, 'config.json');
const LOCAL_CATALOG = path.join(REPO_ROOT, 'zalous', 'market', 'catalog.local.json');
const RUNTIME_PATH = path.join(REPO_ROOT, 'zalous', 'runtime', 'zalous-runtime.js');

function defaultConfig() {
  return {
    version: 1,
    activeTheme: 'zalo-green.css',
    enabledExtensions: [],
    patchEnabled: true,
    appAsarPath: '',
    ui: { controls: true },
    market: { source: 'local', catalogUrl: '' }
  };
}

async function ensureLayout() {
  for (const dir of [
    ZALOUS_ROOT,
    path.join(ZALOUS_ROOT, 'themes'),
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
    market: { source: 'local', catalogUrl: '', ...(cfg.market || {}) },
    enabledExtensions: Array.isArray(cfg.enabledExtensions) ? cfg.enabledExtensions : []
  };
}

async function saveConfig(cfg) {
  await ensureLayout();
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

async function copyBuiltInThemes() {
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

function escapeScript(text) {
  return text.replace(/<\/script>/gi, '<\\/script>');
}

async function applyPatch({ asarPath, noBackup }) {
  await ensureLayout();
  const cfg = await readConfig();
  const themes = await collectMap('themes', '.css');
  const extensions = await collectMap('extensions', '.js');
  if (!Object.keys(themes).length) throw new Error('Chua co theme trong %APPDATA%\\Zalous\\themes');

  if (!cfg.activeTheme || !themes[cfg.activeTheme]) {
    cfg.activeTheme = Object.keys(themes)[0];
  }

  const runtimeCode = escapeScript(await fsp.readFile(RUNTIME_PATH, 'utf8'));
  const payload = {
    meta: { version: '0.2.0', generatedAt: new Date().toISOString(), engine: 'hara-zalous' },
    config: cfg,
    themes,
    extensions
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
  await fsp.mkdir(extractDir, { recursive: true });

  console.log(`[zalous] extract ${asarPath}`);
  await extractAll(asarPath, extractDir);

  const indexPath = path.join(extractDir, 'pc-dist', 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error('Khong tim thay pc-dist/index.html');
  let html = await fsp.readFile(indexPath, 'utf8');
  const marker = /<!-- ZALOUS:BEGIN -->[\s\S]*?<!-- ZALOUS:END -->/m;
  if (marker.test(html)) {
    html = html.replace(marker, injectBlock);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${injectBlock}\n</head>`);
  } else {
    throw new Error('Khong tim thay </head> de chen runtime');
  }
  await fsp.writeFile(indexPath, html, 'utf8');

  console.log('[zalous] repack');
  await createPackage(extractDir, repackedAsar);

  if (!noBackup) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const backupPath = path.join(ZALOUS_ROOT, 'backups', `app.asar.${stamp}.bak`);
    await fsp.copyFile(asarPath, backupPath);
    console.log(`[zalous] backup ${backupPath}`);
  }

  await fsp.copyFile(repackedAsar, asarPath);
  cfg.appAsarPath = asarPath;
  await saveConfig(cfg);
  await fsp.rm(tempRoot, { recursive: true, force: true });
  console.log(`[zalous] applied ${asarPath}`);
}

async function restoreLatest(asarPath) {
  const backupDir = path.join(ZALOUS_ROOT, 'backups');
  if (!fs.existsSync(backupDir)) throw new Error('Khong co backup');
  const files = (await fsp.readdir(backupDir))
    .filter((f) => /^app\.asar\..+\.bak$/.test(f))
    .sort((a, b) => b.localeCompare(a));
  if (!files.length) throw new Error('Khong co backup');
  const src = path.join(backupDir, files[0]);
  await fsp.copyFile(src, asarPath);
  console.log(`[zalous] restored ${src} -> ${asarPath}`);
}

async function importFile(kind, filePath, name) {
  if (!filePath) throw new Error('Thieu --file <path>');
  const src = path.resolve(filePath);
  if (!fs.existsSync(src)) throw new Error(`Khong tim thay file ${src}`);
  const ext = kind === 'theme' ? '.css' : '.js';
  let outName = name || path.basename(src);
  if (!outName.toLowerCase().endsWith(ext)) outName += ext;
  const dst = path.join(ZALOUS_ROOT, kind === 'theme' ? 'themes' : 'extensions', outName);
  await fsp.copyFile(src, dst);
  console.log(`[zalous] imported ${kind} ${dst}`);
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
  if (!fs.existsSync(entryPath)) throw new Error(`Pack missing entry ${entryPath}`);

  if (manifest.type === 'theme') {
    await importFile('theme', entryPath, manifest.entry);
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

function parseArgv(argv) {
  const [command = 'help', ...rest] = argv;
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
  const exts = await collectMap('extensions', '.js');
  console.log(JSON.stringify({
    root: ZALOUS_ROOT,
    appAsarPath: cfg.appAsarPath,
    activeTheme: cfg.activeTheme,
    patchEnabled: cfg.patchEnabled,
    enabledExtensions: cfg.enabledExtensions,
    themeCount: Object.keys(themes).length,
    extensionCount: Object.keys(exts).length
  }, null, 2));
}

function printHelp() {
  console.log('hara-zalous CLI (Node)');
  console.log('');
  console.log('Commands:');
  console.log('  init');
  console.log('  detect [--asar <path>]');
  console.log('  status');
  console.log('  apply [--asar <path>] [--no-backup]');
  console.log('  restore [--asar <path>]');
  console.log('  list-themes');
  console.log('  set-theme --theme <file.css>');
  console.log('  list-extensions');
  console.log('  enable-extension --name <file.js>');
  console.log('  disable-extension --name <file.js>');
  console.log('  import-theme --file <path.css> [--name custom.css]');
  console.log('  import-extension --file <path.js> [--name custom.js]');
  console.log('  market-list [--catalog <path.json>]');
  console.log('  market-install --id <packId> [--catalog <path.json>]');
  console.log('  doctor');
}

async function main() {
  const { command, flags } = parseArgv(process.argv.slice(2));
  await ensureLayout();

  switch (command) {
    case 'help':
      printHelp();
      break;
    case 'init':
      await copyBuiltInThemes();
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
      await applyPatch({ asarPath: await resolveAsar(flags.asar), noBackup: !!flags['no-backup'] });
      break;
    case 'restore':
      await restoreLatest(await resolveAsar(flags.asar));
      break;
    case 'list-themes': {
      const themes = await collectMap('themes', '.css');
      Object.keys(themes).sort().forEach((t) => console.log(t));
      break;
    }
    case 'set-theme': {
      if (!flags.theme) throw new Error('Can --theme <file.css>');
      const themes = await collectMap('themes', '.css');
      if (!themes[flags.theme]) throw new Error(`Theme khong ton tai ${flags.theme}`);
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
