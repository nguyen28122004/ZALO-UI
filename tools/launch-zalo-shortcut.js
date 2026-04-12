#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function runCscript(sourceLines) {
  const tempJs = path.join(os.tmpdir(), `zalo-shortcut-${process.pid}-${Date.now()}.js`);
  fs.writeFileSync(tempJs, sourceLines.join('\n'), 'utf8');
  try {
    const result = spawnSync('cscript.exe', ['//nologo', tempJs], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || 'cscript failed').trim());
    }
    return String(result.stdout || '').trim();
  } finally {
    try { fs.unlinkSync(tempJs); } catch (_) {}
  }
}

function resolveShortcut(shortcutPath) {
  const output = runCscript([
    'var shell = WScript.CreateObject("WScript.Shell");',
    `var shortcut = shell.CreateShortcut(${JSON.stringify(shortcutPath)});`,
    'var out = [shortcut.TargetPath || "", shortcut.WorkingDirectory || "", shortcut.Arguments || "", shortcut.IconLocation || ""].join("\\n");',
    'WScript.StdOut.Write(out);'
  ]);
  const [targetPath = '', workingDirectory = '', argumentsText = '', iconLocation = ''] = output.split(/\r?\n/);
  return { targetPath, workingDirectory, argumentsText, iconLocation };
}

function launchShortcut(shortcutPath) {
  runCscript([
    'var shell = WScript.CreateObject("WScript.Shell");',
    `shell.Run(${JSON.stringify(shortcutPath)}, 1, false);`
  ]);
}

function main() {
  const shortcutPath = process.argv[2];
  if (!shortcutPath) {
    console.error('Usage: node tools/launch-zalo-shortcut.js <shortcut.lnk>');
    process.exit(1);
  }

  const resolvedShortcut = path.resolve(shortcutPath);
  if (!fs.existsSync(resolvedShortcut)) {
    console.error(`Shortcut not found: ${resolvedShortcut}`);
    process.exit(1);
  }

  const resolved = resolveShortcut(resolvedShortcut);
  launchShortcut(resolvedShortcut);
  console.log(JSON.stringify({
    shortcutPath: resolvedShortcut,
    targetPath: resolved.targetPath,
    workingDirectory: resolved.workingDirectory,
    args: resolved.argumentsText ? resolved.argumentsText.match(/(?:[^\s"]+|"[^"]*")+/g) || [] : [],
    launchedVia: 'shortcut'
  }, null, 2));
}

main();
