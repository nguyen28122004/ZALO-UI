  function readCssVar(target, name) {
    if (!target || !name || typeof getComputedStyle !== 'function') return '';
    try {
      return String(getComputedStyle(target).getPropertyValue(name) || '').trim();
    } catch (_) {
      return '';
    }
  }

  function firstCssVar(targets, names) {
    for (const target of targets) {
      for (const name of names) {
        const value = readCssVar(target, name);
        if (value) return value;
      }
    }
    return '';
  }

  function alphaColor(value, alpha) {
    const v = String(value || '').trim();
    if (!v) return '';
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    const hex = v.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const raw = hex[1];
      const parts = raw.length === 3 || raw.length === 4
        ? raw.split('').map((ch) => parseInt(ch + ch, 16))
        : raw.length === 6 || raw.length === 8
          ? raw.match(/.{2}/g).map((pair) => parseInt(pair, 16))
          : null;
      if (!parts) return '';
      const [r, g, b] = parts;
      return `rgba(${r},${g},${b},${a})`;
    }
    const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(',').map((x) => x.trim()).slice(0, 3);
      if (parts.length === 3) return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
    }
    return '';
  }

  function runtimeThemePalette() {
    if (!state.shell) {
      return { accent: '', accentSoft: '', bgA: '', bgB: '', text: '', textMuted: '', border: '', shadow: '', font: '', sig: '' };
    }

    const targets = [document.documentElement, document.body, state.shell].filter(Boolean);
    const accent = firstCssVar(targets, [
      '--zalous-theme-accent',
      '--button-primary-normal',
      '--button-primary-hover',
      '--button-secondary-neutral-text',
      '--accent-blue-bg',
      '--accent-green-bg',
      '--accent-orange-bg',
      '--accent-pink-bg',
      '--accent-purple-bg',
      '--accent-grey-bg',
      '--accent-steal-bg',
      '--accent-stealblue-bg',
      '--accent-yellow-bg'
    ]);
    const accentSoft = firstCssVar(targets, [
      '--zalous-theme-accent-soft',
      '--button-primary-tonal-normal',
      '--button-primary-tonal-hover',
      '--accent-blue-bg-subtle',
      '--accent-green-bg-subtle',
      '--accent-orange-bg-subtle',
      '--accent-pink-bg-subtle',
      '--accent-purple-bg-subtle',
      '--accent-grey-bg-subtle',
      '--accent-steal-bg-subtle',
      '--accent-stealblue-bg-subtle',
      '--accent-yellow-bg-subtle'
    ]);
    const bgA = firstCssVar(targets, [
      '--zalous-theme-bg-a',
      '--zalous-theme-surface',
      '--surface-background',
      '--layer-background',
      '--layer-background-subtle',
      '--layer-background-CSC',
      '--background-main',
      '--background'
    ]);
    const bgB = firstCssVar(targets, [
      '--zalous-theme-bg-b',
      '--zalous-theme-surface-2',
      '--surface-background-subtle',
      '--layer-background-subtle',
      '--layer-background-pinned',
      '--layer-background-CSC',
      '--background-subtle',
      '--background-alt'
    ]);
    const text = firstCssVar(targets, ['--zalous-theme-text', '--text-primary', '--text-main', '--zalo-text-main', '--button-secondary-neutral-text']);
    const textMuted = firstCssVar(targets, ['--zalous-theme-text-muted', '--text-secondary', '--text-sub', '--zalo-text-sub']);
    const border = firstCssVar(targets, ['--zalous-theme-border', '--border', '--layer-border', '--border-color', '--layer-background-selected']);
    const shadow = firstCssVar(targets, ['--shadow-color', '--layer-shadow']);
    const font = targets.map((t) => {
      try { return String(getComputedStyle(t).fontFamily || '').trim(); } catch (_) { return ''; }
    }).find(Boolean) || '';
    const sig = [accent, accentSoft, bgA, bgB, text, textMuted, border, shadow, font].join('|');
    return { accent, accentSoft, bgA, bgB, text, textMuted, border, shadow, font, sig };
  }

  function resolveThemePalette(themeKey) {
    const key = String(themeKey || '').toLowerCase();
    if (key.includes('console-minimal')) {
      return { accent: '#f1f1f1', accentSoft: 'rgba(255,255,255,.12)', bgA: '#000000', bgB: '#050505' };
    }
    if (key.includes('pastel-butter')) {
      return { accent: '#d1a000', accentSoft: 'rgba(209,160,0,.2)', bgA: '#fffdf4', bgB: '#fff9e6' };
    }
    if (key.includes('pastel-lilac')) {
      return { accent: '#8b5cf6', accentSoft: 'rgba(139,92,246,.18)', bgA: '#fbf8ff', bgB: '#f4eeff' };
    }
    if (key.includes('pastel-mint')) {
      return { accent: '#10b981', accentSoft: 'rgba(16,185,129,.18)', bgA: '#f3fdf8', bgB: '#e8fbf2' };
    }
    if (key.includes('pastel-peach')) {
      return { accent: '#f97316', accentSoft: 'rgba(249,115,22,.18)', bgA: '#fff8f3', bgB: '#fff1e7' };
    }
    if (key.includes('pastel-rose')) {
      return { accent: '#ec4899', accentSoft: 'rgba(236,72,153,.18)', bgA: '#fff7fb', bgB: '#ffedf5' };
    }
    if (key.includes('pastel-sage')) {
      return { accent: '#4d7c0f', accentSoft: 'rgba(77,124,15,.18)', bgA: '#f7fbf3', bgB: '#eef7e7' };
    }
    if (key.includes('pastel-sky')) {
      return { accent: '#0284c7', accentSoft: 'rgba(2,132,199,.18)', bgA: '#f4fbff', bgB: '#e9f6ff' };
    }
    if (key.includes('pastel-teal')) {
      return { accent: '#0f766e', accentSoft: 'rgba(15,118,110,.18)', bgA: '#f2fbfa', bgB: '#e6f7f5' };
    }
    if (key.includes('pastel-dawn')) {
      return { accent: '#7da3d6', accentSoft: 'rgba(125,163,214,.2)', bgA: '#f5f8fc', bgB: '#edf3fa' };
    }
    if (key.includes('pastel')) {
      return { accent: '#0ea5e9', accentSoft: 'rgba(14,165,233,.16)', bgA: '#f8fbff', bgB: '#eef7ff' };
    }
    if (key.includes('blue')) {
      return { accent: '#0284c7', accentSoft: 'rgba(2,132,199,.18)', bgA: '#f4f9fe', bgB: '#e9f4fd' };
    }
    if (key.includes('purple')) {
      return { accent: '#7c3aed', accentSoft: 'rgba(124,58,237,.18)', bgA: '#faf8ff', bgB: '#f2ecff' };
    }
    if (key.includes('green')) {
      return { accent: '#16a34a', accentSoft: 'rgba(22,163,74,.18)', bgA: '#f4fbf7', bgB: '#eaf8ef' };
    }
    if (key.includes('orange')) {
      return { accent: '#ea580c', accentSoft: 'rgba(234,88,12,.18)', bgA: '#fffaf5', bgB: '#fff1e6' };
    }
    if (key.includes('pink')) {
      return { accent: '#db2777', accentSoft: 'rgba(219,39,119,.18)', bgA: '#fff8fb', bgB: '#ffeef6' };
    }
    return { accent: '#2563eb', accentSoft: 'rgba(37,99,235,.18)', bgA: '#f8fbff', bgB: '#eef4ff' };
  }

  function applyThemePalette() {
    if (!state.shell) return;
    const nextKey = activeThemeKey();
    const runtime = runtimeThemePalette();
    const nextSig = `${nextKey}|${runtime.sig}`;
    if (state.themeShell === state.shell && state.themeKey === nextKey && state.themePaletteSig === nextSig) return;
    state.themeShell = state.shell;
    state.themeKey = nextKey;
    state.themePaletteSig = nextSig;

    const pal = resolveThemePalette(nextKey);
    const strictConsolePack = String(nextKey || '').toLowerCase().includes('console-minimal');
    const accent = strictConsolePack ? pal.accent : (runtime.accent || pal.accent);
    const accentSoft = strictConsolePack ? pal.accentSoft : (runtime.accentSoft || alphaColor(accent, 0.18) || pal.accentSoft);
    const bgA = strictConsolePack ? pal.bgA : (runtime.bgA || pal.bgA);
    const bgB = strictConsolePack ? pal.bgB : (runtime.bgB || pal.bgB);
    const surface = strictConsolePack ? '#000000' : (runtime.bgA || runtime.bgB || pal.bgA);
    const surface2 = strictConsolePack ? '#050505' : (runtime.bgB || runtime.bgA || pal.bgB);
    const border = strictConsolePack ? 'rgba(255,255,255,.14)' : (runtime.border || alphaColor(accent, 0.26) || '');
    const shadow = strictConsolePack ? 'rgba(0,0,0,.68)' : (runtime.shadow || alphaColor(accent, 0.14) || '');
    const text = strictConsolePack ? '#f3f3f3' : (runtime.text || '');
    const textMuted = strictConsolePack ? '#9d9d9d' : (runtime.textMuted || '');
    const font = strictConsolePack ? '\"Cascadia Mono\",\"JetBrains Mono\",\"Consolas\",\"Courier New\",monospace' : (runtime.font || '\"Segoe UI Variable Text\",\"Segoe UI\",Tahoma,sans-serif');

    state.shell.style.setProperty('--zmail-accent', accent);
    state.shell.style.setProperty('--zmail-accent-soft', accentSoft);
    state.shell.style.setProperty('--zmail-bg-a', bgA);
    state.shell.style.setProperty('--zmail-bg-b', bgB);
    state.shell.style.setProperty('--zmail-surface', surface);
    state.shell.style.setProperty('--zmail-surface-2', surface2);
    state.shell.style.setProperty('--zmail-text', text);
    state.shell.style.setProperty('--zmail-text-muted', textMuted);
    state.shell.style.setProperty('--zmail-border', border);
    state.shell.style.setProperty('--zmail-shadow', shadow);
    state.shell.style.setProperty('--zmail-font', font);
  }
