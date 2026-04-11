#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const packRoot = path.join(__dirname, '..', 'zalous', 'market', 'packs', 'email-prototype');
const srcDir = path.join(packRoot, 'src');
const outFile = path.join(packRoot, 'email-prototype.js');

function main() {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Missing source dir: ${srcDir}`);
  }

  const files = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((ent) => ent.isFile() && ent.name.toLowerCase().endsWith('.js'))
    .map((ent) => ent.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (!files.length) throw new Error('No source modules found');

  const chunks = files.map((fileName) => {
    const full = path.join(srcDir, fileName);
    const body = fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '');
    return `// ===== ${fileName} =====\n${body.trimEnd()}\n`;
  });

  const output = [
    '// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.',
    '// Source modules are in ./src/*.js',
    '',
    ...chunks
  ].join('\n');

  fs.writeFileSync(outFile, output, 'utf8');
  console.log(`[email-prototype] built ${outFile} from ${files.length} modules`);
}

main();
