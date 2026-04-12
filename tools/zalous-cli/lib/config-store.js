const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const {
  ZALOUS_ROOT,
  CONFIG_PATH,
  MANAGED_ASSETS_PATH
} = require('./constants');

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
    ui: {
      controls: true,
      hotReloadWatcher: true
    },
    market: {
      source: 'local',
      catalogUrl: ''
    }
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
    ui: { controls: true, hotReloadWatcher: true, ...(cfg.ui || {}) },
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

function defaultManagedAssets() {
  return {
    themes: [],
    themePacks: [],
    extensions: []
  };
}

async function readManagedAssets() {
  await ensureLayout();
  if (!fs.existsSync(MANAGED_ASSETS_PATH)) return defaultManagedAssets();
  try {
    const text = (await fsp.readFile(MANAGED_ASSETS_PATH, 'utf8')).replace(/^\uFEFF/, '');
    const parsed = JSON.parse(text);
    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      themePacks: Array.isArray(parsed.themePacks) ? parsed.themePacks : [],
      extensions: Array.isArray(parsed.extensions) ? parsed.extensions : []
    };
  } catch (_) {
    return defaultManagedAssets();
  }
}

async function saveManagedAssets(assets) {
  await ensureLayout();
  const next = {
    themes: Array.from(new Set((assets && assets.themes) || [])).sort(),
    themePacks: Array.from(new Set((assets && assets.themePacks) || [])).sort(),
    extensions: Array.from(new Set((assets && assets.extensions) || [])).sort()
  };
  await fsp.writeFile(MANAGED_ASSETS_PATH, JSON.stringify(next, null, 2), 'utf8');
}

module.exports = {
  defaultConfig,
  ensureLayout,
  readConfig,
  saveConfig,
  defaultManagedAssets,
  readManagedAssets,
  saveManagedAssets
};
