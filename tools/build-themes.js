#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const paletteFile = path.join(repoRoot, 'zalous', 'market', 'theme-palettes.json');

const SYNC_BLOCK = /\/\* ZALOUS_THEME_SYNC_BEGIN \*\/[\s\S]*?\/\* ZALOUS_THEME_SYNC_END \*\//g;
const TOKEN_BLOCK = /\/\* ZALOUS_THEME_TOKEN_BEGIN \*\/[\s\S]*?\/\* ZALOUS_THEME_TOKEN_END \*\//g;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function alphaFallback(value, alpha) {
  return `color-mix(in srgb, ${value} ${Math.round(alpha * 100)}%, transparent)`;
}

function decl(name, value) {
  return `  ${name}: ${value};`;
}

function tokenBlock(entry) {
  const p = entry.palette || {};
  const accentHover = p.accentHover || p.accent;
  const accentPress = p.accentPress || accentHover;
  const accentSoft = p.accentSoft || alphaFallback(p.accent, 0.18);
  const navHover = p.navHover || p.hoverBg || p.navBg;
  const navSelected = p.navSelected || p.selectedBg || navHover;
  const timestamp = p.timestamp || `color-mix(in srgb, ${p.text} 46%, transparent)`;
  const disabledText = p.disabledText || `color-mix(in srgb, ${p.onColor || '#ffffff'} 76%, transparent)`;
  const scope = entry.scope || ':root, body';

  const lines = [
    '/* ZALOUS_THEME_TOKEN_BEGIN */',
    `${scope} {`,
    decl('--zalous-token-accent', p.accent),
    decl('--zalous-token-accent-hover', accentHover),
    decl('--zalous-token-accent-press', accentPress),
    decl('--zalous-token-accent-soft', accentSoft),
    decl('--zalous-token-bg-a', p.bgA),
    decl('--zalous-token-bg-b', p.bgB),
    decl('--zalous-token-surface', p.surface),
    decl('--zalous-token-surface-2', p.surface2),
    decl('--zalous-token-text', p.text),
    decl('--zalous-token-text-muted', p.textMuted),
    decl('--zalous-token-border', p.border),
    decl('--zalous-token-titlebar-bg', p.titlebarBg),
    decl('--zalous-token-titlebar-text', p.titlebarText),
    decl('--zalous-token-nav-bg', p.navBg),
    decl('--zalous-token-nav-text', p.navText),
    decl('--zalous-token-nav-hover', navHover),
    decl('--zalous-token-nav-selected', navSelected),
    decl('--zalous-token-selected-bg', p.selectedBg),
    decl('--zalous-token-hover-bg', p.hoverBg),
    decl('--zalous-token-on-color', p.onColor || '#ffffff'),
    decl('--zalous-token-timestamp', timestamp),
    decl('--zalous-token-disabled-text', disabledText),
    decl('--zalous-token-scheme', p.scheme || 'light'),
    '',
    decl('--zalous-theme-accent', 'var(--zalous-token-accent)'),
    decl('--zalous-theme-accent-soft', 'var(--zalous-token-accent-soft)'),
    decl('--zalous-theme-bg-a', 'var(--zalous-token-bg-a)'),
    decl('--zalous-theme-bg-b', 'var(--zalous-token-bg-b)'),
    decl('--zalous-theme-surface', 'var(--zalous-token-surface)'),
    decl('--zalous-theme-surface-2', 'var(--zalous-token-surface-2)'),
    decl('--zalous-theme-text', 'var(--zalous-token-text)'),
    decl('--zalous-theme-text-muted', 'var(--zalous-token-text-muted)'),
    decl('--zalous-theme-border', 'var(--zalous-token-border)'),
    decl('--zalous-theme-titlebar-bg', 'var(--zalous-token-titlebar-bg)'),
    decl('--zalous-theme-titlebar-text', 'var(--zalous-token-titlebar-text)'),
    decl('--zalous-theme-nav-bg', 'var(--zalous-token-nav-bg)'),
    decl('--zalous-theme-nav-text', 'var(--zalous-token-nav-text)'),
    decl('--zalous-theme-selected-bg', 'var(--zalous-token-selected-bg)'),
    decl('--zalous-theme-hover-bg', 'var(--zalous-token-hover-bg)'),
    decl('--zalous-theme-on-color', 'var(--zalous-token-on-color)'),
    decl('--zalous-theme-timestamp', 'var(--zalous-token-timestamp)'),
    decl('--zalous-theme-scheme', 'var(--zalous-token-scheme)'),
    '',
    decl('--bg-default', 'var(--zalous-token-bg-a)'),
    decl('--title-bar', 'var(--zalous-token-titlebar-bg)'),
    decl('--NG15', 'var(--zalous-token-titlebar-bg)'),
    decl('--surface-background', 'var(--zalous-token-bg-a)'),
    decl('--surface-background-subtle', 'var(--zalous-token-bg-b)'),
    decl('--surface-alt', 'var(--zalous-token-surface-2)'),
    decl('--layer-background', 'var(--zalous-token-surface)'),
    decl('--layer-background-subtle', 'var(--zalous-token-surface-2)'),
    decl('--layer-background-hover', 'var(--zalous-token-hover-bg)'),
    decl('--layer-background-selected', 'var(--zalous-token-selected-bg)'),
    decl('--layer-background-leftmenu', 'var(--zalous-token-nav-bg)'),
    decl('--layer-background-leftmenu-hover', 'var(--zalous-token-nav-hover)'),
    decl('--layer-background-leftmenu-selected', 'var(--zalous-token-nav-selected)'),
    decl('--layer-background-navbar-normal', 'var(--zalous-token-nav-bg)'),
    decl('--layer-background-navbar-hover', 'var(--zalous-token-nav-hover)'),
    decl('--layer-background-navbar-selected', 'var(--zalous-token-nav-selected)'),
    decl('--text-primary', 'var(--zalous-token-text)'),
    decl('--text-secondary', 'var(--zalous-token-text-muted)'),
    decl('--text-on-color', 'var(--zalous-token-on-color)'),
    decl('--timestamp', 'var(--zalous-token-timestamp)'),
    decl('--icon-primary', 'var(--zalous-token-text)'),
    decl('--icon-secondary', 'var(--zalous-token-text-muted)'),
    decl('--icon-navbar-normal', 'var(--zalous-token-nav-text)'),
    decl('--border', 'var(--zalous-token-border)'),
    decl('--border-subtle', 'color-mix(in srgb, var(--zalous-token-border) 68%, transparent)'),
    decl('--divider', 'var(--zalous-token-border)'),
    decl('--button-primary-normal', 'var(--zalous-token-accent)'),
    decl('--button-primary-hover', 'var(--zalous-token-accent-hover)'),
    decl('--button-primary-pressed', 'var(--zalous-token-accent-press)'),
    decl('--button-primary-text', 'var(--zalous-token-on-color)'),
    decl('--button-primary-text-disabled', 'var(--zalous-token-disabled-text)'),
    decl('--button-primary-tonal-normal', 'var(--zalous-token-accent-soft)'),
    decl('--button-secondary-neutral-normal', 'var(--zalous-token-surface-2)'),
    decl('--button-secondary-neutral-hover', 'var(--zalous-token-hover-bg)'),
    decl('--button-secondary-neutral-pressed', 'var(--zalous-token-selected-bg)'),
    decl('--button-secondary-neutral-text', 'var(--zalous-token-text)'),
    decl('--input-field-bg-filled', 'var(--zalous-token-surface-2)'),
    decl('--input-field-bg-outline', 'var(--zalous-token-surface)'),
    '',
    decl('--zmail-accent', 'var(--zalous-token-accent)'),
    decl('--zmail-accent-soft', 'var(--zalous-token-accent-soft)'),
    decl('--zmail-bg-a', 'var(--zalous-token-bg-a)'),
    decl('--zmail-bg-b', 'var(--zalous-token-bg-b)'),
    decl('--zmail-surface', 'var(--zalous-token-surface)'),
    decl('--zmail-surface-2', 'var(--zalous-token-surface-2)'),
    decl('--zmail-text', 'var(--zalous-token-text)'),
    decl('--zmail-text-muted', 'var(--zalous-token-text-muted)'),
    decl('--zmail-border', 'var(--zalous-token-border)'),
    '}',
    '/* ZALOUS_THEME_TOKEN_END */'
  ];
  return lines.join('\n');
}

function normalizeCss(filePath, entry) {
  const abs = path.join(repoRoot, entry.file);
  if (!fs.existsSync(abs)) throw new Error(`Theme file missing: ${entry.file}`);
  const before = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  const stripped = before
    .replace(SYNC_BLOCK, '')
    .replace(TOKEN_BLOCK, '')
    .trimEnd();
  const next = `${stripped}\n\n${tokenBlock(entry)}\n`;
  fs.writeFileSync(abs, next, 'utf8');
  return { file: filePath, before: before.length, after: next.length };
}

function main() {
  const cfg = readJson(paletteFile);
  const themes = Array.isArray(cfg.themes) ? cfg.themes : [];
  if (!themes.length) throw new Error('No themes in theme-palettes.json');
  const results = themes.map((entry) => normalizeCss(entry.file, entry));
  results.forEach((r) => console.log(`[themes] ${r.file} ${r.before} -> ${r.after}`));
}

main();
