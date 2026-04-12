const path = require('path');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const ZALOUS_ROOT = path.join(APPDATA, 'Zalous');
const CONFIG_PATH = path.join(ZALOUS_ROOT, 'config.json');
const MANAGED_ASSETS_PATH = path.join(ZALOUS_ROOT, 'managed-assets.json');
const LOCAL_CATALOG = path.join(REPO_ROOT, 'zalous', 'market', 'catalog.local.json');

module.exports = {
  REPO_ROOT,
  APPDATA,
  LOCALAPPDATA,
  ZALOUS_ROOT,
  CONFIG_PATH,
  MANAGED_ASSETS_PATH,
  LOCAL_CATALOG
};
