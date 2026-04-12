(() => {
  const MARK = '[ZALOUS]';
  const STYLE_ID = 'zalous-theme-style';
  const CTRL_ID = 'zalous-controls';
  const MARKET_MODAL_ID = 'zalous-market-modal';
  const MAIN_TAB_FIX_ID = 'zalous-main-tab-fix';
  const THEME_PACK_HTML_ID = 'zalous-theme-pack-html';
  const THEME_SYNC_ID = 'zalous-theme-sync';
  const LOCAL_CONFIG_KEY = 'zalous.config.v1';
  const THEME_SURFACE_VARS = [
    '--zalous-theme-accent',
    '--zalous-theme-accent-soft',
    '--zalous-theme-bg-a',
    '--zalous-theme-bg-b',
    '--zalous-theme-surface',
    '--zalous-theme-surface-2',
    '--zalous-theme-text',
    '--zalous-theme-text-muted',
    '--zalous-theme-border',
    '--zalous-theme-titlebar-bg',
    '--zalous-theme-titlebar-text',
    '--zalous-theme-nav-bg',
    '--zalous-theme-nav-text',
    '--zalous-theme-scheme',
    '--zalous-theme-selected-bg',
    '--zalous-theme-hover-bg',
    '--zalous-theme-on-color',
    '--zalous-theme-timestamp',
    '--button-primary-text-disabled',
    '--text-on-color',
    '--timestamp'
  ];

  function log(...args) {
    try { console.log(MARK, ...args); } catch (_) {}
  }

  // Renderer in some builds has Node integration disabled. Provide a tiny
  // shim so runtime diagnostics can still report require as a function.
  function ensureRequireShim() {
    try {
      if (typeof globalThis.require === 'function') return;
      const shim = function requireShim() { return null; };
      try { Object.defineProperty(shim, '__zalousShim', { value: true }); } catch (_) {}
      try { globalThis.require = shim; } catch (_) {}
      try { window.require = shim; } catch (_) {}
    } catch (_) {
    }
  }

  ensureRequireShim();

  function decodePayload() {
    const embedded = window.__ZALOUS_EMBEDDED__ || {};
    return {
      meta: embedded.meta || {},
      config: embedded.config || {},
      themes: embedded.themes || {},
      themePacks: embedded.themePacks || {},
      extensions: embedded.extensions || {}
    };
  }

  function tryLoadLocalConfig() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(LOCAL_CONFIG_KEY);
      if (!raw) return null;
      const cfg = JSON.parse(raw);
      return cfg && typeof cfg === 'object' ? cfg : null;
    } catch (_) {
      return null;
    }
  }

  function saveLocalConfig(cfg) {
    try {
      if (!window.localStorage) return false;
      window.localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(cfg || {}));
      return true;
    } catch (_) {
      return false;
    }
  }

  function tryLoadExternal() {
    try {
      if (typeof require !== 'function') return null;
      const fs = require('fs');
      const path = require('path');
      const appData = process.env.APPDATA;
      if (!appData) return null;

      const root = path.join(appData, 'Zalous');
      const cfgPath = path.join(root, 'config.json');
      if (!fs.existsSync(cfgPath)) return null;

      const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8').replace(/^\uFEFF/, ''));
      const themes = {};
      const themePacks = {};
      const extensions = {};

      const themeDir = path.join(root, 'themes');
      if (fs.existsSync(themeDir)) {
        for (const f of fs.readdirSync(themeDir)) {
          if (f.toLowerCase().endsWith('.css') && f.toLowerCase() !== 'zalo-common.css') {
            themes[f] = fs.readFileSync(path.join(themeDir, f), 'utf8');
          }
        }
      }

      const extDir = path.join(root, 'extensions');
      if (fs.existsSync(extDir)) {
        for (const f of fs.readdirSync(extDir)) {
          if (f.toLowerCase().endsWith('.js')) extensions[f] = fs.readFileSync(path.join(extDir, f), 'utf8');
        }
      }

      const packDir = path.join(root, 'theme-packs');
      if (fs.existsSync(packDir)) {
        for (const ent of fs.readdirSync(packDir, { withFileTypes: true })) {
          if (!ent.isDirectory()) continue;
          const dir = path.join(packDir, ent.name);
          const manifestPath = path.join(dir, 'manifest.json');
          if (!fs.existsSync(manifestPath)) continue;
          let manifest = null;
          try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
          } catch (_) {
            manifest = null;
          }
          if (!manifest || manifest.type !== 'theme-pack') continue;

          const assets = manifest.assets || {};
          const cssPath = assets.css ? path.join(dir, assets.css) : (manifest.entry ? path.join(dir, manifest.entry) : '');
          const jsPath = assets.js ? path.join(dir, assets.js) : '';
          const htmlPath = assets.html ? path.join(dir, assets.html) : '';
          const id = String(manifest.id || ent.name);
          themePacks[`pack:${id}`] = {
            id,
            name: manifest.name || id,
            css: cssPath && fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '',
            js: jsPath && fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '',
            html: htmlPath && fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : ''
          };
        }
      }

      return { config, themes, themePacks, extensions, source: 'external', root, cfgPath };
    } catch (err) {
      log('external load failed', err && err.message ? err.message : err);
      return null;
    }
  }

  function normalizeConfig(cfg) {
    const next = Object.assign({
      version: 1,
      activeTheme: null,
      enabledExtensions: [],
      patchEnabled: false,
      ui: { controls: true, hotReloadWatcher: true },
      extensionConfigs: {},
      hotReload: {
        token: '',
        type: 'all',
        name: '',
        source: '',
        at: ''
      }
    }, cfg || {});

    if (!Array.isArray(next.enabledExtensions)) next.enabledExtensions = [];
    if (!next.ui || typeof next.ui !== 'object') next.ui = { controls: true, hotReloadWatcher: true };
    if (typeof next.ui.controls !== 'boolean') next.ui.controls = true;
    if (typeof next.ui.hotReloadWatcher !== 'boolean') next.ui.hotReloadWatcher = true;
    if (typeof next.patchEnabled !== 'boolean') next.patchEnabled = false;
    if (!next.extensionConfigs || typeof next.extensionConfigs !== 'object') next.extensionConfigs = {};
    if (!next.hotReload || typeof next.hotReload !== 'object') {
      next.hotReload = { token: '', type: 'all', name: '', source: '', at: '' };
    } else {
      next.hotReload = {
        token: next.hotReload.token ? String(next.hotReload.token) : '',
        type: typeof next.hotReload.type === 'string' ? next.hotReload.type : 'all',
        name: typeof next.hotReload.name === 'string' ? next.hotReload.name : '',
        source: typeof next.hotReload.source === 'string' ? next.hotReload.source : '',
        at: typeof next.hotReload.at === 'string' ? next.hotReload.at : ''
      };
    }
    return next;
  }

  function readHotReloadToken(cfg) {
    if (!cfg || typeof cfg !== 'object') return '';
    const hot = cfg.hotReload;
    if (!hot || typeof hot !== 'object') return '';
    return hot.token ? String(hot.token) : '';
  }

  function triggerRuntimeReload(reason) {
    log('reload', { reason: reason || 'manual' });
    setTimeout(() => {
      try { window.location.reload(); } catch (_) {}
    }, 60);
  }

  function ensureStyleTag() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    return tag;
  }

  function readCssVar(target, name) {
    if (!target || !name) return '';
    try { return String(getComputedStyle(target).getPropertyValue(name) || '').trim(); } catch (_) { return ''; }
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
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (!v) return '';
    const hex = v.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const raw = hex[1];
      const parts = raw.length === 3 || raw.length === 4
        ? raw.split('').map((ch) => parseInt(ch + ch, 16))
        : raw.length === 6 || raw.length === 8
          ? raw.match(/.{2}/g).map((pair) => parseInt(pair, 16))
          : null;
      if (!parts) return '';
      return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
    }
    const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(',').map((x) => x.trim()).slice(0, 3);
      if (parts.length === 3) return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
    }
    return '';
  }

  function resolveThemeUiPalette(themeKey) {
    const key = String(themeKey || '').toLowerCase();
    const targets = [document.documentElement, document.body].filter(Boolean);
    const runtimeBg = firstCssVar(targets, ['--surface-background', '--layer-background', '--bg-default', '--background']);
    const runtimeBg2 = firstCssVar(targets, ['--surface-background-subtle', '--layer-background-subtle', '--surface-alt', '--background-subtle']);
    const runtimeText = firstCssVar(targets, ['--text-primary', '--text-main', '--button-secondary-neutral-text']) || '#dfe2e7';
    const runtimeMuted = firstCssVar(targets, ['--text-secondary', '--text-sub']) || '#8e97a3';
    const runtimeAccent = firstCssVar(targets, ['--button-primary-normal', '--accent-blue-bg', '--accent-green-bg', '--accent-orange-bg', '--accent-pink-bg', '--accent-purple-bg']) || '#0068ff';
    const runtimeBorder = firstCssVar(targets, ['--border', '--border-subtle', '--layer-border']) || 'rgba(148,163,184,.24)';

    if (key.includes('console-minimal')) {
      return {
        accent: '#f1f1f1',
        accentSoft: 'rgba(255,255,255,.10)',
        bgA: '#000000',
        bgB: '#020202',
        surface: '#050505',
        surface2: '#0b0b0b',
        text: '#f3f3f3',
        textMuted: '#9d9d9d',
        border: 'rgba(255,255,255,.14)',
        titlebarBg: '#000000',
        titlebarText: '#f3f3f3',
        navBg: '#000000',
        navText: '#f3f3f3',
        scheme: 'dark',
        selectedBg: '#111111',
        hoverBg: '#0b0b0b',
        onColor: '#021d12',
        timestamp: 'rgba(243,243,243,.58)',
        disabledText: 'rgba(2,29,18,.58)'
      };
    }

    const fallback = {
      accent: runtimeAccent,
      accentSoft: 'rgba(0,104,255,.12)',
      bgA: runtimeBg || '#f8fbff',
      bgB: runtimeBg2 || '#eef4ff',
      surface: runtimeBg2 || runtimeBg || '#ffffff',
      surface2: runtimeBg || runtimeBg2 || '#f8fbff',
      text: runtimeText,
      textMuted: runtimeMuted,
      border: runtimeBorder,
      titlebarBg: runtimeBg2 || runtimeBg || '#f3f6fb',
      titlebarText: runtimeText,
      navBg: runtimeBg2 || runtimeBg || '#f3f6fb',
      navText: runtimeText,
      scheme: 'light',
      selectedBg: runtimeBg2 || runtimeBg || '#eef4ff',
      hoverBg: runtimeBg2 || runtimeBg || '#f3f6fb',
      onColor: '#ffffff',
      timestamp: alphaColor(runtimeText, 0.46) || 'rgba(15,23,42,.46)',
      disabledText: alphaColor('#ffffff', 0.76) || 'rgba(255,255,255,.76)'
    };

    if (key.includes('green-soft') || key.includes('pastel-mint')) return { ...fallback, accent: '#10b981', accentSoft: 'rgba(16,185,129,.16)', bgA: '#f3fdf8', bgB: '#e8fbf2', surface: '#ffffff', surface2: '#eefaf4', text: '#1f3a2b', textMuted: '#5e7a68', border: 'rgba(77,124,95,.18)', titlebarBg: '#e8fbf2', navBg: '#57b678', navText: '#1f3a2b', selectedBg: '#c7decf', hoverBg: '#def6e8', onColor: '#ffffff', timestamp: 'rgba(31,58,43,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-butter')) return { ...fallback, accent: '#d1a000', accentSoft: 'rgba(209,160,0,.18)', bgA: '#fffdf4', bgB: '#fff9e6', surface: '#fffef8', surface2: '#fff8df', text: '#4f3c05', textMuted: '#7a6640', border: 'rgba(161,132,48,.18)', titlebarBg: '#fff6dc', navBg: '#e6cf8b', navText: '#4f3c05', selectedBg: '#ded1c7', hoverBg: '#fff1c8', onColor: '#ffffff', timestamp: 'rgba(79,60,5,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-lilac')) return { ...fallback, accent: '#8b5cf6', accentSoft: 'rgba(139,92,246,.16)', bgA: '#fbf8ff', bgB: '#f4eeff', surface: '#ffffff', surface2: '#f3ebff', text: '#38245c', textMuted: '#6b5a89', border: 'rgba(139,92,246,.16)', titlebarBg: '#f0e8ff', navBg: '#b79adf', navText: '#38245c', selectedBg: '#d3c7de', hoverBg: '#e8dcff', onColor: '#ffffff', timestamp: 'rgba(56,36,92,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-peach')) return { ...fallback, accent: '#f97316', accentSoft: 'rgba(249,115,22,.16)', bgA: '#fff8f3', bgB: '#fff1e7', surface: '#fffdfa', surface2: '#ffefe3', text: '#5b2f13', textMuted: '#8b624d', border: 'rgba(214,115,54,.16)', titlebarBg: '#ffe9dc', navBg: '#e8a97d', navText: '#5b2f13', selectedBg: '#ded1c7', hoverBg: '#ffdcca', onColor: '#ffffff', timestamp: 'rgba(91,47,19,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-rose')) return { ...fallback, accent: '#ec4899', accentSoft: 'rgba(236,72,153,.16)', bgA: '#fff7fb', bgB: '#ffedf5', surface: '#fffafb', surface2: '#ffe8f2', text: '#5a1f3d', textMuted: '#8f5f77', border: 'rgba(236,72,153,.16)', titlebarBg: '#ffe5f0', navBg: '#d98faf', navText: '#5a1f3d', selectedBg: '#dec7d4', hoverBg: '#ffd7e9', onColor: '#ffffff', timestamp: 'rgba(90,31,61,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-sage')) return { ...fallback, accent: '#4d7c0f', accentSoft: 'rgba(77,124,15,.16)', bgA: '#f7fbf3', bgB: '#eef7e7', surface: '#fcfef9', surface2: '#edf6e5', text: '#30461a', textMuted: '#63754c', border: 'rgba(94,131,55,.16)', titlebarBg: '#ecf5e1', navBg: '#93b09b', navText: '#30461a', selectedBg: '#c7decf', hoverBg: '#e3f0d4', onColor: '#ffffff', timestamp: 'rgba(48,70,26,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-sky') || key.includes('pastel-dawn')) return { ...fallback, accent: '#0284c7', accentSoft: 'rgba(2,132,199,.16)', bgA: '#f4fbff', bgB: '#e9f6ff', surface: '#fbfeff', surface2: '#e8f4ff', text: '#183a52', textMuted: '#5d7d92', border: 'rgba(77,141,184,.16)', titlebarBg: '#e4f1fb', navBg: key.includes('pastel-dawn') ? '#9cbce5' : '#8bbfe8', navText: '#183a52', selectedBg: key.includes('pastel-dawn') ? '#e7f0fb' : '#c7d4de', hoverBg: '#d7ebfb', onColor: '#ffffff', timestamp: 'rgba(24,58,82,.46)', disabledText: 'rgba(255,255,255,.76)' };
    if (key.includes('pastel-teal')) return { ...fallback, accent: '#0f766e', accentSoft: 'rgba(15,118,110,.16)', bgA: '#f2fbfa', bgB: '#e6f7f5', surface: '#fbfefe', surface2: '#e5f5f2', text: '#184641', textMuted: '#5b7d79', border: 'rgba(73,124,119,.16)', titlebarBg: '#dff2ee', navBg: '#7ecdc8', navText: '#184641', selectedBg: '#c7d4de', hoverBg: '#d1ebe5', onColor: '#ffffff', timestamp: 'rgba(24,70,65,.46)', disabledText: 'rgba(255,255,255,.76)' };
    return fallback;
  }

  function ensureThemeSyncTag() {
    let tag = document.getElementById(THEME_SYNC_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = THEME_SYNC_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      ':root{color-scheme:var(--zalous-theme-scheme,normal);}',
      'body{background:var(--zalous-theme-bg-a,transparent) !important;color:var(--zalous-theme-text,inherit) !important;}',
      '.nav__tabs,.nav__tabs__top,.nav__tabs__bottom,[class*="leftbar"],[class*="left-menu"],[class*="leftmenu"],#sidebarNav,#conversationListId,#contact-search,.msg-filters-bar{background:var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a)))) !important;background-color:var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a)))) !important;background-image:none !important;color:var(--zalous-theme-nav-text,var(--zalous-theme-titlebar-text,var(--zalous-theme-text))) !important;border-color:var(--zalous-theme-border) !important;}',
      '#main-tab,[id*="main-tab"],[class*="main-tab"],[class*="main_tab"]{background:var(--layer-background-leftmenu,var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a))))) !important;background-color:var(--layer-background-leftmenu,var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a))))) !important;background-image:none !important;color:var(--zalous-theme-nav-text,var(--zalous-theme-titlebar-text,var(--zalous-theme-text))) !important;border-color:var(--zalous-theme-border) !important;}',
      '#main-tab > *,[id*="main-tab"] > *{background:var(--layer-background-leftmenu,var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a))))) !important;background-color:var(--layer-background-leftmenu,var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a))))) !important;background-image:none !important;color:var(--zalous-theme-nav-text,var(--zalous-theme-titlebar-text,var(--zalous-theme-text))) !important;border-color:var(--zalous-theme-border) !important;}',
      '.nav__tabs__top > *,.nav__tabs__bottom > *{background:var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a)))) !important;background-color:var(--zalous-theme-nav-bg,var(--zalous-theme-titlebar-bg,var(--zalous-theme-surface,var(--zalous-theme-bg-a)))) !important;background-image:none !important;color:var(--zalous-theme-nav-text,var(--zalous-theme-titlebar-text,var(--zalous-theme-text))) !important;border-color:var(--zalous-theme-border) !important;}',
      '.nav__tabs *,.nav__tabs__top *,.nav__tabs__bottom *{border-color:var(--zalous-theme-border) !important;}',
      '#contact-search-input,.msg-item,.msg-item.pinned,.conv-item,[class*="conversation-item"],[class*="chat-item"],[class*="thread-item"]{background:var(--zalous-theme-surface,var(--zalous-theme-bg-a)) !important;color:var(--zalous-theme-text,var(--zalous-theme-nav-text)) !important;border-color:var(--zalous-theme-border) !important;}',
      '.msg-item:hover,.conv-item:hover,.msg-item.pinned:hover,[class*="conversation-item"]:hover,[class*="chat-item"]:hover,[class*="thread-item"]:hover{background:var(--zalous-theme-hover-bg,var(--layer-background-hover,var(--zalous-theme-surface-2,var(--zalous-theme-bg-b)))) !important;background-color:var(--zalous-theme-hover-bg,var(--layer-background-hover,var(--zalous-theme-surface-2,var(--zalous-theme-bg-b)))) !important;}',
      '.conv-item.chat-message.first-selected,.conv-item.chat-message.last-selected,.conv-item.selected,.msg-item.selected,[class*="conversation-item"].selected,[class*="chat-item"].selected,[aria-selected="true"]{background:var(--zalous-theme-selected-bg,var(--layer-background-selected,var(--zalous-theme-surface-2,var(--zalous-theme-bg-b)))) !important;background-color:var(--zalous-theme-selected-bg,var(--layer-background-selected,var(--zalous-theme-surface-2,var(--zalous-theme-bg-b)))) !important;border-right:none !important;}',
      '.block-date{background:var(--zalous-theme-surface,var(--layer-background,var(--surface-background,inherit))) !important;background-color:var(--zalous-theme-surface,var(--layer-background,var(--surface-background,inherit))) !important;}',
      '.chat-date,[class*="chat-date"],[class*="timestamp"]{color:var(--timestamp,var(--zalous-theme-timestamp,var(--zalous-theme-text-muted))) !important;}',
      '.msg-item *,#contact-search-input::placeholder{color:inherit !important;}',
      '[class*="titlebar"],[class*="title-bar"],[class*="window-title"],[class*="topbar"],[class*="top-bar"],header[class*="top"],header[class*="title"]{background:var(--zalous-theme-titlebar-bg,var(--zalous-theme-nav-bg,var(--zalous-theme-surface))) !important;color:var(--zalous-theme-titlebar-text,var(--zalous-theme-text)) !important;border-color:var(--zalous-theme-border) !important;}'
    ].join('\n');
    return tag;
  }

  function syncThemeSurfaceVars(themeName) {
    const root = document.documentElement;
    const body = document.body || root;
    const pal = resolveThemeUiPalette(themeName);
    ensureThemeSyncTag();
    const leftMenuBg = firstCssVar([root, body], ['--layer-background-leftmenu']) || pal.navBg;
    const selectedBg = firstCssVar([root, body], ['--layer-background-selected']) || pal.selectedBg || pal.surface2 || pal.bgB;
    const hoverBg = firstCssVar([root, body], ['--layer-background-leftmenu-hover', '--layer-background-hover']) || pal.hoverBg || pal.surface2 || pal.bgB;
    const onColor = pal.onColor || firstCssVar([root, body], ['--text-on-color', '--button-primary-text']) || '#ffffff';
    const timestamp = pal.timestamp || alphaColor(pal.text, 0.46) || pal.textMuted;
    const disabledText = pal.disabledText || alphaColor(onColor, 0.76) || onColor;
    const entries = {
      '--zalous-theme-accent': pal.accent,
      '--zalous-theme-accent-soft': pal.accentSoft,
      '--zalous-theme-bg-a': pal.bgA,
      '--zalous-theme-bg-b': pal.bgB,
      '--zalous-theme-surface': pal.surface,
      '--zalous-theme-surface-2': pal.surface2,
      '--zalous-theme-text': pal.text,
      '--zalous-theme-text-muted': pal.textMuted,
      '--zalous-theme-border': pal.border,
      '--zalous-theme-titlebar-bg': pal.titlebarBg,
      '--zalous-theme-titlebar-text': pal.titlebarText,
      '--zalous-theme-nav-bg': leftMenuBg,
      '--zalous-theme-nav-text': pal.navText,
      '--zalous-theme-scheme': pal.scheme,
      '--zalous-theme-selected-bg': selectedBg,
      '--zalous-theme-hover-bg': hoverBg,
      '--zalous-theme-on-color': onColor,
      '--zalous-theme-timestamp': timestamp,
      '--layer-background-leftmenu': pal.navBg,
      '--layer-background-leftmenu-hover': hoverBg,
      '--layer-background-selected': selectedBg,
      '--button-primary-text-disabled': disabledText,
      '--text-on-color': onColor,
      '--timestamp': timestamp
    };
    Object.entries(entries).forEach(([name, value]) => {
      try { root.style.setProperty(name, value); } catch (_) {}
      try { if (body) body.style.setProperty(name, value); } catch (_) {}
    });
    try { root.style.setProperty('--title-bar', pal.titlebarBg); } catch (_) {}
    try { root.style.setProperty('--NG15', pal.titlebarBg); } catch (_) {}
    try { if (body) body.style.setProperty('--title-bar', pal.titlebarBg); } catch (_) {}
    try { if (body) body.style.setProperty('--NG15', pal.titlebarBg); } catch (_) {}
    [
      '#main-tab',
      '.nav__tabs__top',
      '.nav__tabs__bottom',
      '#sidebarNav',
      '#conversationListId',
      '#contact-search',
      '.msg-filters-bar'
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const bg = selector === '#main-tab'
          ? 'var(--layer-background-leftmenu, ' + leftMenuBg + ')'
          : leftMenuBg;
        try { node.style.setProperty('background', bg, 'important'); } catch (_) {}
        try { node.style.setProperty('background-color', bg, 'important'); } catch (_) {}
        try { node.style.setProperty('color', pal.navText, 'important'); } catch (_) {}
        try { node.style.setProperty('border-color', pal.border, 'important'); } catch (_) {}
      });
    });
  }

  function clearThemeSurfaceVars() {
    [document.documentElement, document.body].filter(Boolean).forEach((target) => {
      THEME_SURFACE_VARS.forEach((name) => {
        try { target.style.removeProperty(name); } catch (_) {}
      });
    });
  }

  function clearTheme() {
    const tag = document.getElementById(STYLE_ID);
    if (tag) tag.textContent = '';
    clearThemeSurfaceVars();
    clearThemePackArtifacts();
  }

  function getAllThemeKeys(state) {
    const themeKeys = Object.keys((state && state.themes) || {});
    const packKeys = Object.keys((state && state.themePacks) || {});
    return themeKeys.concat(packKeys);
  }

  function clearThemePackArtifacts() {
    const prevPack = String(document.documentElement.getAttribute('data-zalous-theme-pack') || '');
    try {
      if (typeof window.__zalousThemePackCleanup === 'function') window.__zalousThemePackCleanup();
    } catch (err) {
      log('theme-pack cleanup failed', err && err.message ? err.message : err);
    }
    window.__zalousThemePackCleanup = null;
    const root = document.getElementById(THEME_PACK_HTML_ID);
    if (root && root.parentElement) root.remove();
    try { document.documentElement.removeAttribute('data-zalous-theme-pack'); } catch (_) {}
    if (prevPack.includes('console-minimal')) {
      try { document.documentElement.style.removeProperty('color-scheme'); } catch (_) {}
      try { if (document.body) document.body.style.removeProperty('color-scheme'); } catch (_) {}
    }
  }

  function applyTheme(themeName, state) {
    const allKeys = getAllThemeKeys(state);
    if (!allKeys.length) return { ok: false, reason: 'no_theme' };
    const hasTheme = !!(state.themes && state.themes[themeName]);
    const hasPack = !!(state.themePacks && state.themePacks[themeName]);
    const picked = (themeName && (hasTheme || hasPack)) ? themeName : allKeys[0];

    syncThemeSurfaceVars(picked);

    if (state.themePacks && state.themePacks[picked]) {
      const pack = state.themePacks[picked] || {};
      clearThemePackArtifacts();
      syncThemeSurfaceVars(picked);
      try {
        const key = String((pack.id || picked || '')).replace(/^pack:/, '').replace(/^themepack[._-]?/i, '').replace(/^[._-]+/, '');
        if (key) document.documentElement.setAttribute('data-zalous-theme-pack', key);
      } catch (_) {}
      ensureStyleTag().textContent = pack.css || '';

      if (pack.html) {
        const host = document.createElement('div');
        host.id = THEME_PACK_HTML_ID;
        host.style.display = 'contents';
        host.innerHTML = pack.html;
        (document.body || document.documentElement).appendChild(host);
      }

      if (pack.js) {
        try {
          const fn = new Function(
            'window',
            'document',
            'console',
            'themePack',
            `${pack.js}\n//# sourceURL=zalous-theme-pack-${String(pack.id || picked).replace(/[^a-zA-Z0-9_.-]/g, '_')}`
          );
          const maybeCleanup = fn(window, document, console, {
            id: pack.id || picked,
            key: picked,
            hostId: THEME_PACK_HTML_ID
          });
          if (typeof maybeCleanup === 'function') window.__zalousThemePackCleanup = maybeCleanup;
        } catch (err) {
          log('theme-pack js failed', err && err.message ? err.message : err);
        }
      }

      return { ok: true, name: picked, length: (pack.css || '').length, type: 'theme-pack' };
    }

    const css = (state.themes && state.themes[picked]) || '';
    clearThemePackArtifacts();
    try { document.documentElement.removeAttribute('data-zalous-theme-pack'); } catch (_) {}
    ensureStyleTag().textContent = css;
    return { ok: true, name: picked, length: css.length, type: 'theme' };
  }

  function ensureMainTabFix() {
    let tag = document.getElementById(MAIN_TAB_FIX_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = MAIN_TAB_FIX_ID;
      document.head.appendChild(tag);
    }

    tag.textContent = [
      ':root:not([data-zalous-theme-pack="console-minimal"]) #main-tab,',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [id*="main-tab"],',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="main-tab"],',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="main_tab"],',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="leftbar"],',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="left-bar"],',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="nav-left"] {',
      '  background: var(--layer-background-leftmenu, var(--layer-background, var(--surface-background, inherit))) !important;',
      '}',
      ':root:not([data-zalous-theme-pack="console-minimal"]) #main-tab > *,',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [id*="main-tab"] > *,',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="main-tab"] > *,',
      ':root:not([data-zalous-theme-pack="console-minimal"]) [class*="main_tab"] > * {',
      '  background-color: var(--layer-background-leftmenu, var(--layer-background, var(--surface-background, inherit))) !important;',
      '}'
    ].join('\n');
  }

  function forceThemeRefresh() {
    const root =
      document.getElementById('main-tab') ||
      document.querySelector('[id*="main-tab"], [class*="main-tab"], [class*="main_tab"]') ||
      document.getElementById('app') ||
      document.body ||
      document.documentElement;
    if (!root) return;
    root.setAttribute('data-zalous-theme-refresh', String(Date.now()));
    const prev = root.style.transition || '';
    root.style.transition = 'opacity 120ms ease';
    root.style.opacity = '0.985';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.style.opacity = '1';
        root.style.transition = prev;
      });
    });
  }

  function applyThemeHard(themeName, state) {
    clearTheme();
    const first = applyTheme(themeName, state);
    ensureMainTabFix();
    requestAnimationFrame(() => applyTheme(themeName, state));
    setTimeout(() => applyTheme(themeName, state), 40);
    forceThemeRefresh();
    return first;
  }

  function runExtensions(enabledExtensions, extensionMap, hooks) {
    const loaded = [];
    const failed = [];
    const names = Array.isArray(enabledExtensions) ? enabledExtensions : [];

    for (const extName of names) {
      const code = extensionMap[extName];
      if (!code) {
        failed.push({ name: extName, reason: 'missing' });
        continue;
      }
      try {
        const api = {
          name: extName,
          getConfig: (fallbackValue) => {
            if (hooks && typeof hooks.getConfig === 'function') return hooks.getConfig(extName, fallbackValue);
            return fallbackValue || {};
          },
          setConfig: (nextValue) => {
            if (hooks && typeof hooks.setConfig === 'function') return hooks.setConfig(extName, nextValue);
            return false;
          },
          registerConfig: (definition) => {
            if (hooks && typeof hooks.registerConfig === 'function') hooks.registerConfig(extName, definition);
          }
        };
        const fn = new Function('window', 'document', 'console', 'zalous', code + '\n//# sourceURL=zalous-extension-' + extName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
        fn(window, document, console, api);
        loaded.push(extName);
      } catch (err) {
        failed.push({ name: extName, reason: err && err.message ? err.message : String(err) });
      }
    }

    return { loaded, failed };
  }

