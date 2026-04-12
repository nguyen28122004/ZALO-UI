#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function resolveShortcut(shortcutPath) {
  const tempJs = path.join(os.tmpdir(), `resolve-shortcut-${process.pid}-${Date.now()}.js`);
  const script = [
    'var shell = WScript.CreateObject("WScript.Shell");',
    `var shortcut = shell.CreateShortcut(${JSON.stringify(shortcutPath)});`,
    'var out = [shortcut.TargetPath || "", shortcut.WorkingDirectory || "", shortcut.Arguments || "", shortcut.IconLocation || ""].join("\\n");',
    'WScript.StdOut.Write(out);'
  ].join('\n');
  fs.writeFileSync(tempJs, script, 'utf8');
  try {
    const result = spawnSync('cscript.exe', ['//nologo', tempJs], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error((result.stderr || result.stdout || 'resolve shortcut failed').trim());
    }
    const [targetPath = '', workingDirectory = '', argumentsText = ''] = String(result.stdout || '').split(/\r?\n/);
    if (!targetPath) throw new Error('shortcut target is empty');
    return { targetPath, workingDirectory, argumentsText };
  } finally {
    try { fs.unlinkSync(tempJs); } catch (_) {}
  }
}

function main() {
  const shortcutPath = process.argv[2];
  const extraArgs = process.argv.slice(3);
  if (!shortcutPath) {
    console.error('Usage: node tools/launch-zalo-shortcut.js <shortcut.lnk> [...extra args]');
    process.exit(1);
  }

  const resolved = resolveShortcut(path.resolve(shortcutPath));
  const baseArgs = resolved.argumentsText ? resolved.argumentsText.match(/(?:[^\s"]+|"[^"]*")+/g) || [] : [];
  const mergedArgs = [...baseArgs.map((x) => x.replace(/^"(.*)"$/, '$1')), ...extraArgs];
  const child = spawn(resolved.targetPath, mergedArgs, {
    cwd: resolved.workingDirectory || path.dirname(resolved.targetPath),
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log(JSON.stringify({
    shortcutPath: path.resolve(shortcutPath),
    targetPath: resolved.targetPath,
    workingDirectory: resolved.workingDirectory || path.dirname(resolved.targetPath),
    args: mergedArgs
  }, null, 2));
}

main();
