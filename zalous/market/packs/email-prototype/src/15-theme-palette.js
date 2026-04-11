  function resolveThemePalette(themeKey) {
    const key = String(themeKey || '').toLowerCase();
    if (key.includes('hello-kitty')) {
      return { accent: '#ec4899', accentSoft: 'rgba(236,72,153,.18)', bgA: '#fff8fc', bgB: '#ffeef8' };
    }
    if (key.includes('console-minimal')) {
      return { accent: '#22c55e', accentSoft: 'rgba(34,197,94,.18)', bgA: '#f4fbf7', bgB: '#ebf8f0' };
    }
    if (key.includes('pastel')) {
      return { accent: '#0ea5e9', accentSoft: 'rgba(14,165,233,.16)', bgA: '#f8fbff', bgB: '#eef7ff' };
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
    if (state.themeKey === nextKey) return;
    state.themeKey = nextKey;
    const pal = resolveThemePalette(nextKey);
    state.shell.style.setProperty('--zmail-accent', pal.accent);
    state.shell.style.setProperty('--zmail-accent-soft', pal.accentSoft);
    state.shell.style.setProperty('--zmail-bg-a', pal.bgA);
    state.shell.style.setProperty('--zmail-bg-b', pal.bgB);
  }
