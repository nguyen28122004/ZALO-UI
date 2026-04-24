const fs = require('fs');
const runtimeLoader = require('../../../zalous/runtime/zalous-runtime');
const { REPO_ROOT, ZALOUS_ROOT, LOCAL_CATALOG } = require('./constants');
const { ensureLayout, readConfig, saveConfig } = require('./config-store');
const { collectMap, collectThemePacks, syncBuiltInAssets, syncConfigWithAssets } = require('./asset-store');
const { resolveAsar, detectLatestAsar, applyPatch, restoreLatest } = require('./asar-service');
const { importFile, readCatalog, installPack, addAssetDirect, patchAssetDirect, reloadAssetsDirect } = require('./market-service');
const { resolveFullPayloadFlag, parseArgv, printHelp } = require('./cli-utils');

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

async function main(argv = process.argv.slice(2)) {
  const { command, flags } = parseArgv(argv);
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
      const asarPath = flags.asar ? await resolveAsar(flags.asar) : await detectLatestAsar();
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
      try { asarPath = flags.asar ? await resolveAsar(flags.asar) : await detectLatestAsar(); } catch (_) {}
      console.log(JSON.stringify({
        node: process.version,
        repoRoot: REPO_ROOT,
        zalousRoot: ZALOUS_ROOT,
        runtimeModules: runtimeLoader.getRuntimeModuleFiles(),
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

module.exports = {
  main,
  printStatus
};
