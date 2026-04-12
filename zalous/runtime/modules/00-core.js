(() => {
  const MARK = '[ZALOUS]';
  const STYLE_ID = 'zalous-theme-style';
  const CTRL_ID = 'zalous-controls';
  const MARKET_MODAL_ID = 'zalous-market-modal';
  const MAIN_TAB_FIX_ID = 'zalous-main-tab-fix';
  const THEME_PACK_HTML_ID = 'zalous-theme-pack-html';
  const LOCAL_CONFIG_KEY = 'zalous.config.v1';

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

  function clearTheme() {
    const tag = document.getElementById(STYLE_ID);
    if (tag) tag.textContent = '';
    clearThemePackArtifacts();
  }

  function getAllThemeKeys(state) {
    const themeKeys = Object.keys((state && state.themes) || {});
    const packKeys = Object.keys((state && state.themePacks) || {});
    return themeKeys.concat(packKeys);
  }

  function clearThemePackArtifacts() {
    try {
      if (typeof window.__zalousThemePackCleanup === 'function') window.__zalousThemePackCleanup();
    } catch (err) {
      log('theme-pack cleanup failed', err && err.message ? err.message : err);
    }
    window.__zalousThemePackCleanup = null;
    const root = document.getElementById(THEME_PACK_HTML_ID);
    if (root && root.parentElement) root.remove();
    try { document.documentElement.removeAttribute('data-zalous-theme-pack'); } catch (_) {}
  }

  function applyTheme(themeName, state) {
    const allKeys = getAllThemeKeys(state);
    if (!allKeys.length) return { ok: false, reason: 'no_theme' };
    const hasTheme = !!(state.themes && state.themes[themeName]);
    const hasPack = !!(state.themePacks && state.themePacks[themeName]);
    const picked = (themeName && (hasTheme || hasPack)) ? themeName : allKeys[0];

    if (state.themePacks && state.themePacks[picked]) {
      const pack = state.themePacks[picked] || {};
      clearThemePackArtifacts();
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
      'body:not(.dark) #main-tab,',
      'body:not(.dark) [id*="main-tab"],',
      'body:not(.dark) [class*="main-tab"],',
      'body:not(.dark) [class*="main_tab"],',
      'body:not(.dark) [class*="leftbar"],',
      'body:not(.dark) [class*="left-bar"],',
      'body:not(.dark) [class*="nav-left"] {',
      '  background: var(--layer-background-leftmenu, var(--layer-background, var(--surface-background, inherit))) !important;',
      '}',
      'body:not(.dark) #main-tab > *,',
      'body:not(.dark) [id*="main-tab"] > *,',
      'body:not(.dark) [class*="main-tab"] > *,',
      'body:not(.dark) [class*="main_tab"] > * {',
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

