function resolveFullPayloadFlag(flags) {
  if (flags['lite-payload']) return false;
  if (flags['full-payload']) return true;
  return true;
}

function parseArgv(argv) {
  const [command = 'patch-now', ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
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

module.exports = {
  resolveFullPayloadFlag,
  parseArgv,
  printHelp
};
