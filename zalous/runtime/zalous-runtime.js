const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const RUNTIME_MODULE_DIR = path.join(__dirname, 'modules');

function getRuntimeModuleFiles() {
  if (!fs.existsSync(RUNTIME_MODULE_DIR)) return [];
  return fs
    .readdirSync(RUNTIME_MODULE_DIR, { withFileTypes: true })
    .filter((ent) => ent.isFile() && ent.name.toLowerCase().endsWith('.js'))
    .map((ent) => ent.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function getRuntimeModulePaths() {
  return getRuntimeModuleFiles().map((name) => path.join(RUNTIME_MODULE_DIR, name));
}

async function loadRuntimeCode() {
  const files = getRuntimeModulePaths();
  if (!files.length) {
    throw new Error(`Khong tim thay runtime modules trong ${RUNTIME_MODULE_DIR}`);
  }
  const chunks = await Promise.all(files.map((filePath) => fsp.readFile(filePath, 'utf8')));
  return chunks.join('\n');
}

module.exports = {
  RUNTIME_MODULE_DIR,
  getRuntimeModuleFiles,
  getRuntimeModulePaths,
  loadRuntimeCode
};
