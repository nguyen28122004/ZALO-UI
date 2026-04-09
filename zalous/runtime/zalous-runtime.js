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
  }

  function applyTheme(themeName, state) {
    const allKeys = getAllThemeKeys(state);
    if (!allKeys.length) return { ok: false, reason: 'no_theme' };
    const hasTheme = !!(state.themes && state.themes[themeName]);
    const hasPack = !!(state.themePacks && state.themePacks[themeName]);
    const picked = (themeName && (hasTheme || hasPack)) ? themeName : allKeys[0];

    if (state.themePacks && state.themePacks[picked]) {
      const pack = state.themePacks[picked] || {};
      ensureStyleTag().textContent = pack.css || '';
      clearThemePackArtifacts();

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

  function createPersistFn(external, stateRef) {
    let fs = null;
    let cfgPath = '';
    if (external && typeof require === 'function') {
      try {
        fs = require('fs');
        cfgPath = external.cfgPath;
      } catch (_) {
        fs = null;
        cfgPath = '';
      }
    }

    return () => {
      const localOk = saveLocalConfig(stateRef.config);
      let externalOk = false;
      if (fs && cfgPath) {
        try {
          fs.writeFileSync(cfgPath, JSON.stringify(stateRef.config, null, 2), 'utf8');
          externalOk = true;
        } catch (e) {
          log('save config failed', e && e.message ? e.message : e);
        }
      }
      return localOk || externalOk;
    };
  }

  function createWriteAssetFn(external) {
    if (!external || typeof require !== 'function') return null;
    try {
      const fs = require('fs');
      const path = require('path');
      return (kind, name, content) => {
        try {
          const dir = kind === 'themes' ? 'themes' : 'extensions';
          const dstDir = path.join(external.root, dir);
          if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
          fs.writeFileSync(path.join(dstDir, name), content, 'utf8');
          return true;
        } catch (e) {
          log('write asset failed', e && e.message ? e.message : e);
          return false;
        }
      };
    } catch (_) {
      return null;
    }
  }

  function startLocalHotReloadWatcher(initialConfig) {
    if (window.__zalousHotReloadWatcher) return;

    let lastToken = readHotReloadToken(initialConfig);
    let reloading = false;
    let closed = false;

    const tick = () => {
      if (closed || reloading) return;
      try {
        const localCfg = tryLoadLocalConfig();
        if (!localCfg) return;
        const cfg = normalizeConfig(localCfg);
        const token = readHotReloadToken(cfg);
        if (!token || token === lastToken) return;
        lastToken = token;
        reloading = true;
        log('hot reload signal', {
          token,
          type: cfg.hotReload && cfg.hotReload.type,
          name: cfg.hotReload && cfg.hotReload.name,
          mode: 'localStorage.poll'
        });
        triggerRuntimeReload('hot-reload-token');
      } catch (_) {
      }
    };

    const timer = setInterval(tick, 700);
    const closeWatcher = () => {
      if (closed) return;
      closed = true;
      try { clearInterval(timer); } catch (_) {}
      window.__zalousHotReloadWatcher = null;
    };

    window.__zalousHotReloadWatcher = {
      mode: 'localStorage.poll',
      path: LOCAL_CONFIG_KEY,
      close: closeWatcher
    };
    window.addEventListener('beforeunload', closeWatcher, { once: true });
  }

  function startHotReloadWatcher(external, initialConfig) {
    if (window.__zalousHotReloadWatcher) return;

    const watcherEnabled = !initialConfig || !initialConfig.ui || initialConfig.ui.hotReloadWatcher !== false;
    if (!watcherEnabled) return;

    if (!external || !external.cfgPath || typeof require !== 'function') {
      startLocalHotReloadWatcher(initialConfig);
      return;
    }

    let fs = null;
    let path = null;
    try {
      fs = require('fs');
      path = require('path');
    } catch (_) {
      startLocalHotReloadWatcher(initialConfig);
      return;
    }

    const cfgPath = external.cfgPath;
    const cfgDir = path.dirname(cfgPath);
    const cfgName = path.basename(cfgPath);
    let lastToken = readHotReloadToken(initialConfig);
    let reloading = false;
    let readQueued = false;
    let closed = false;

    const readConfigAndReloadIfNeeded = () => {
      if (reloading || closed) return;

      try {
        if (!fs.existsSync(cfgPath)) return;
        const raw = fs.readFileSync(cfgPath, 'utf8').replace(/^\\uFEFF/, '');
        const cfg = normalizeConfig(JSON.parse(raw));
        const token = readHotReloadToken(cfg);
        if (!token || token === lastToken) return;
        lastToken = token;
        reloading = true;
        log('hot reload signal', {
          token,
          type: cfg.hotReload && cfg.hotReload.type,
          name: cfg.hotReload && cfg.hotReload.name,
          mode: 'fs.watch'
        });
        triggerRuntimeReload('hot-reload-token');
      } catch (_) {
      }
    };

    const scheduleRead = () => {
      if (readQueued || reloading || closed) return;
      readQueued = true;
      setTimeout(() => {
        readQueued = false;
        readConfigAndReloadIfNeeded();
      }, 120);
    };

    let fileWatcher = null;
    let dirWatcher = null;
    try {
      fileWatcher = fs.watch(cfgPath, { persistent: false }, () => scheduleRead());
    } catch (_) {
      fileWatcher = null;
    }

    try {
      dirWatcher = fs.watch(cfgDir, { persistent: false }, (eventType, filename) => {
        if (!filename || String(filename) === cfgName) scheduleRead();
      });
    } catch (_) {
      dirWatcher = null;
    }

    if (!fileWatcher && !dirWatcher) {
      startLocalHotReloadWatcher(initialConfig);
      return;
    }

    const closeWatcher = () => {
      if (closed) return;
      closed = true;
      try { if (fileWatcher) fileWatcher.close(); } catch (_) {}
      try { if (dirWatcher) dirWatcher.close(); } catch (_) {}
      window.__zalousHotReloadWatcher = null;
    };

    window.__zalousHotReloadWatcher = {
      mode: 'fs.watch',
      path: cfgPath,
      close: closeWatcher
    };
    window.addEventListener('beforeunload', closeWatcher, { once: true });
  }

  function setHotReloadWatcherEnabled(state, enabled) {
    if (!state.config.ui || typeof state.config.ui !== 'object') {
      state.config.ui = { controls: true, hotReloadWatcher: true };
    }
    state.config.ui.hotReloadWatcher = !!enabled;

    if (!state.config.ui.hotReloadWatcher) {
      try {
        if (window.__zalousHotReloadWatcher && typeof window.__zalousHotReloadWatcher.close === 'function') {
          window.__zalousHotReloadWatcher.close();
        }
      } catch (_) {
      }
      window.__zalousHotReloadWatcher = null;
      return;
    }

    startHotReloadWatcher(state.external, state.config);
  }

  function ensureMarketModal(state, refreshControls) {
    let modal = document.getElementById(MARKET_MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = MARKET_MODAL_ID;
      modal.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(9,20,14,.45)',
        'display:none',
        'align-items:center',
        'justify-content:center',
        'z-index:2147483647'
      ].join(';');
      document.body.appendChild(modal);
    }

    function safeName(name, ext) {
      const cleaned = String(name || '').trim().replace(/[^a-zA-Z0-9._-]/g, '-');
      if (!cleaned) return null;
      return cleaned.toLowerCase().endsWith(ext) ? cleaned : `${cleaned}${ext}`;
    }

    async function installFromInput(input, kind) {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;

      try {
        const raw = await file.text();
        const ext = kind === 'theme' ? '.css' : '.js';
        const name = safeName(file.name, ext);
        if (!name) return;

        if (kind === 'theme') {
          state.themes[name] = raw;
          if (state.writeAsset) state.writeAsset('themes', name, raw);
          if (!state.config.activeTheme) state.config.activeTheme = name;
          if (state.config.patchEnabled) applyTheme(state.config.activeTheme, state);
        } else {
          state.extensions[name] = raw;
          if (state.writeAsset) state.writeAsset('extensions', name, raw);
        }

        state.saveConfig();
        render();
        refreshControls();
      } catch (e) {
        log('install asset failed', e && e.message ? e.message : e);
      }
    }

    function render() {
      const themeRows = getAllThemeKeys(state).sort().map((name) => {
        const active = state.config.activeTheme === name;
        const isPack = !!(state.themePacks && state.themePacks[name]);
        const label = isPack
          ? ((state.themePacks[name] && state.themePacks[name].name) || name.replace(/^pack:/, ''))
          : name.replace(/\.css$/i, '');
        return `
          <button data-theme="${name}" style="display:flex;align-items:center;justify-content:space-between;width:100%;border:1px solid #c8d8d0;background:${active ? '#dff0e8' : '#ffffff'};border-radius:8px;padding:8px 10px;margin:0 0 6px 0;cursor:pointer">
            <span style="font-size:12px;color:#234536">${label}</span>
            <span style="font-size:11px;color:${active ? '#14532d' : '#72877b'}">${active ? 'active' : (isPack ? 'pack' : 'set')}</span>
          </button>
        `;
      }).join('');

      const extSet = new Set(state.config.enabledExtensions || []);
      const extRows = Object.keys(state.extensions).sort().map((name) => {
        const hasCfg = !!state.extensionConfigDefs[name];
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8d8d0;background:#fff;border-radius:8px;padding:8px 10px;margin:0 0 6px 0">
            <span style="font-size:12px;color:#234536">${name.replace(/\.js$/i, '')}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <button data-ext-config="${name}" ${hasCfg ? '' : 'disabled'} style="height:24px;padding:0 8px;border:1px solid #b8cfc1;border-radius:6px;background:${hasCfg ? '#eef4f1' : '#f3f6f4'};cursor:${hasCfg ? 'pointer' : 'not-allowed'};font-size:11px;color:${hasCfg ? '#224536' : '#8aa095'}">Config</button>
              <input type="checkbox" data-ext="${name}" ${extSet.has(name) ? 'checked' : ''} />
            </div>
          </div>
        `;
      }).join('');

      modal.innerHTML = `
        <div id="zalous-market-card" style="width:min(560px,92vw);max-height:78vh;overflow:auto;background:#f4faf7;border-radius:14px;border:1px solid #b9cec3;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:14px;box-sizing:border-box">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700;color:#1f4734">Zalous Market Manager</div>
            <button id="zalous-market-close" style="height:26px;min-width:50px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer">Close</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <button id="zalous-install-theme" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">Install Theme</button>
            <button id="zalous-install-extension" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">Install Extension</button>
            <button id="zalous-reload-page" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#e8f3ee;cursor:pointer;font-size:12px">Reload Trang</button>
            <input id="zalous-theme-file" type="file" accept=".css,text/css" style="display:none" />
            <input id="zalous-extension-file" type="file" accept=".js,text/javascript,application/javascript" style="display:none" />
          </div>
          <div style="font-size:12px;color:#567664;margin-bottom:10px">Theme apply ngay khong can reload. Neu can tai lai UI, bam Reload Trang.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:12px;font-weight:700;color:#2a513f;margin-bottom:6px">Themes</div>
              ${themeRows || '<div style="font-size:12px;color:#60786a">No themes</div>'}
            </div>
            <div>
              <div style="font-size:12px;font-weight:700;color:#2a513f;margin-bottom:6px">Extensions</div>
              ${extRows || '<div style="font-size:12px;color:#60786a">No extensions</div>'}
            </div>
          </div>
        </div>
      `;

      const closeModal = () => {
        state.saveConfig();
        modal.style.display = 'none';
        refreshControls();
      };
      modal.querySelector('#zalous-market-close').onclick = closeModal;
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      const themeInput = modal.querySelector('#zalous-theme-file');
      const extInput = modal.querySelector('#zalous-extension-file');
      modal.querySelector('#zalous-install-theme').onclick = () => themeInput.click();
      modal.querySelector('#zalous-install-extension').onclick = () => extInput.click();
      themeInput.onchange = () => { installFromInput(themeInput, 'theme'); };
      extInput.onchange = () => { installFromInput(extInput, 'extension'); };
      modal.querySelector('#zalous-reload-page').onclick = () => {
        try { state.saveConfig(); } catch (_) {}
        triggerRuntimeReload('market-manual');
      };

      modal.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-theme');
          state.config.activeTheme = name;
          if (state.config.patchEnabled) applyThemeHard(name, state);
          state.saveConfig();
          render();
          refreshControls();
        };
      });

      modal.querySelectorAll('[data-ext]').forEach((ck) => {
        ck.onchange = () => {
          const name = ck.getAttribute('data-ext');
          const set = new Set(state.config.enabledExtensions || []);
          if (ck.checked) {
            set.add(name);
          } else {
            set.delete(name);
          }
          state.config.enabledExtensions = [...set];
          state.saveConfig();
          state.reloadExtensions();
          render();
          refreshControls();
        };
      });

      modal.querySelectorAll('[data-ext-config]').forEach((btn) => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-ext-config');
          const def = state.extensionConfigDefs[name];
          if (!def) return;

          const existing = state.config.extensionConfigs[name] || {};
          const fields = Array.isArray(def.fields) ? def.fields : [];
          if (!fields.length) return;

          const escapeAttr = (v) => String(v || '').replace(/"/g, '&quot;');
          const rowHtml = fields.map((field) => {
            const key = String(field.key || '').trim();
            if (!key) return '';

            if (field.type === 'checkbox') {
              const checked = Object.prototype.hasOwnProperty.call(existing, key)
                ? !!existing[key]
                : !!field.default;
              return `
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#234536;margin-bottom:8px">
                  <input data-cfg-key="${escapeAttr(key)}" data-cfg-type="checkbox" type="checkbox" ${checked ? 'checked' : ''} />
                  <span>${field.label || key}</span>
                </label>
              `;
            }

            if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
              const current = Object.prototype.hasOwnProperty.call(existing, key)
                ? existing[key]
                : (field.default || field.options[0].value);
              const optionsHtml = field.options
                .map((op) => `<option value="${escapeAttr(op.value)}" ${String(op.value) === String(current) ? 'selected' : ''}>${op.label}</option>`)
                .join('');
              return `
                <label style="display:block;font-size:12px;color:#234536;margin-bottom:6px">${field.label || key}</label>
                <select data-cfg-key="${escapeAttr(key)}" data-cfg-type="select" style="width:100%;height:32px;border:1px solid #b8cfc1;border-radius:8px;padding:0 8px;background:#fff;margin-bottom:8px">${optionsHtml}</select>
              `;
            }

            return '';
          }).join('');
          if (!rowHtml.trim()) return;

          let cfg = document.getElementById('zalous-ext-config-modal');
          if (!cfg) {
            cfg = document.createElement('div');
            cfg.id = 'zalous-ext-config-modal';
            cfg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:2147483647';
            document.body.appendChild(cfg);
          }
          cfg.innerHTML = `
            <div style="width:min(420px,92vw);background:#f7fbf9;border:1px solid #b9cec3;border-radius:12px;padding:12px;box-sizing:border-box">
              <div style="font-size:14px;font-weight:700;color:#1f4734;margin-bottom:8px">${def.title || name}</div>
              <div style="font-size:12px;color:#4d6c5d;margin-bottom:10px">${def.description || ''}</div>
              <div id="zalous-ext-config-body">${rowHtml}</div>
              <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
                <button id="zalous-ext-config-cancel" style="height:30px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#fff">Cancel</button>
                <button id="zalous-ext-config-save" style="height:30px;padding:0 10px;border:1px solid #a7c6b7;border-radius:8px;background:#e8f3ee">Save</button>
              </div>
            </div>
          `;
          const closeCfg = () => { if (cfg && cfg.parentElement) cfg.remove(); };
          cfg.querySelector('#zalous-ext-config-cancel').onclick = closeCfg;
          cfg.onclick = (e) => { if (e.target === cfg) closeCfg(); };
          cfg.querySelector('#zalous-ext-config-save').onclick = () => {
            if (!state.config.extensionConfigs[name] || typeof state.config.extensionConfigs[name] !== 'object') state.config.extensionConfigs[name] = {};
            cfg.querySelectorAll('[data-cfg-key]').forEach((node) => {
              const key = node.getAttribute('data-cfg-key');
              const type = node.getAttribute('data-cfg-type');
              if (!key) return;
              if (type === 'checkbox') {
                state.config.extensionConfigs[name][key] = !!node.checked;
              } else {
                state.config.extensionConfigs[name][key] = node.value;
              }
            });
            state.saveConfig();
            state.reloadExtensions();
            render();
            refreshControls();
            closeCfg();
          };
        };
      });
    }

    return {
      open: () => {
        render();
        modal.style.display = 'flex';
      }
    };
  }

  function mountControls(state) {
    if (!state.config.ui.controls) return;
    const isLockScreen = () => !!(
      document.querySelector('.app-lock__main, .app-lock, [class*="app-lock"], [class*="lock-screen"]') ||
      document.querySelector('input#passcode, .app-lock__main__input')
    );
    const resolveTarget = () => {
      const nav = document.querySelector('.nav__tabs__bottom');
      if (nav) return nav;
      return document.body;
    };

    let wrap = document.getElementById(CTRL_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = CTRL_ID;
    }

    const placeControls = () => {
      const target = resolveTarget();
      if (target && wrap.parentElement !== target) target.appendChild(wrap);

      const lock = isLockScreen();
      const inNav = !!document.querySelector('.nav__tabs__bottom') && !lock;
      wrap.style.cssText = inNav
        ? [
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'justify-content:center',
          'gap:8px',
          'width:100%',
          'padding:8px 0',
          'box-sizing:border-box',
          'position:relative',
          'z-index:2147483647',
          '-webkit-app-region:no-drag'
          ].join(';')
        : [
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'justify-content:center',
          'gap:8px',
          'padding:8px',
          'box-sizing:border-box',
          'position:fixed',
          lock ? 'left:10px' : 'right:10px',
          'bottom:12px',
          'z-index:2147483647',
          'border:1px solid #b8cfc1',
          'border-radius:12px',
          'background:#f4faf7',
          'box-shadow:0 10px 24px rgba(0,0,0,.2)',
          '-webkit-app-region:no-drag'
          ].join(';');
    };
    placeControls();
    let placeQueued = false;
    const schedulePlace = () => {
      if (placeQueued) return;
      placeQueued = true;
      requestAnimationFrame(() => {
        placeQueued = false;
        placeControls();
      });
    };

    const toggleId = 'zalous-toggle';
    const themeId = 'zalous-theme';
    const marketId = 'zalous-market-btn';
    const reloadId = 'zalous-reload-btn';
    const watcherId = 'zalous-watcher-btn';
    const tgl = document.getElementById(toggleId) || Object.assign(document.createElement('button'), { id: toggleId });
    const thm = document.getElementById(themeId) || Object.assign(document.createElement('button'), { id: themeId });
    const mkt = document.getElementById(marketId) || Object.assign(document.createElement('button'), { id: marketId });
    const rld = document.getElementById(reloadId) || Object.assign(document.createElement('button'), { id: reloadId });
    const wtg = document.getElementById(watcherId) || Object.assign(document.createElement('button'), { id: watcherId });
    if (!tgl.parentElement) wrap.appendChild(tgl);
    if (!thm.parentElement) wrap.appendChild(thm);
    if (!mkt.parentElement) wrap.appendChild(mkt);
    if (!rld.parentElement) wrap.appendChild(rld);
    if (!wtg.parentElement) wrap.appendChild(wtg);

    const base = [
      'height:28px',
      'width:28px',
      'padding:0',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:999px',
      'font-size:10px',
      'font-weight:700',
      'line-height:1',
      'cursor:pointer',
      'outline:none',
      'box-shadow:none',
      '-webkit-app-region:no-drag'
    ].join(';');
    tgl.style.cssText = base;
    thm.style.cssText = base;
    mkt.style.cssText = base;
    rld.style.cssText = base;
    wtg.style.cssText = base;

    function refresh() {
      tgl.textContent = state.config.patchEnabled ? 'ON' : 'OFF';
      tgl.style.background = state.config.patchEnabled ? '#2f7a49' : '#dbe6df';
      tgl.style.color = state.config.patchEnabled ? '#fff' : '#2b3f34';

      const keys = getAllThemeKeys(state);
      const hasActive = !!(state.config.activeTheme && keys.includes(state.config.activeTheme));
      const idx = hasActive ? keys.indexOf(state.config.activeTheme) : -1;
      const activeKey = hasActive ? (keys[idx] || '--') : '--';
      const rawLabel = (state.themePacks && state.themePacks[activeKey] && state.themePacks[activeKey].name)
        ? state.themePacks[activeKey].name
        : String(activeKey).replace(/\.css$/i, '').replace(/^pack:/, '');
      const label = hasActive ? rawLabel.slice(0, 2).toUpperCase() : '--';
      thm.textContent = label;
      thm.style.background = '#eef4f1';
      thm.style.color = '#254437';

      mkt.textContent = 'MK';
      mkt.title = 'Open Zalous Market Manager';
      mkt.style.background = '#e8f3ee';
      mkt.style.color = '#204534';
      mkt.style.border = '1px solid #b8cfc1';

      rld.textContent = 'RL';
      rld.title = 'Reload UI';
      rld.style.background = '#eef4f1';
      rld.style.color = '#204534';
      rld.style.border = '1px solid #b8cfc1';

      const watcherOn = !state.config.ui || state.config.ui.hotReloadWatcher !== false;
      wtg.textContent = watcherOn ? 'WR' : 'WX';
      wtg.title = watcherOn ? 'Hot Reload Watcher: ON' : 'Hot Reload Watcher: OFF';
      wtg.style.background = watcherOn ? '#2f7a49' : '#4b4b4b';
      wtg.style.color = '#fff';
      wtg.style.border = '1px solid #b8cfc1';
    }

    const marketModal = ensureMarketModal(state, refresh);

    tgl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.config.patchEnabled = !state.config.patchEnabled;
      if (state.config.patchEnabled) applyThemeHard(state.config.activeTheme, state);
      else clearTheme();
      state.saveConfig();
      refresh();
    };

    thm.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const keys = getAllThemeKeys(state);
      if (!keys.length) return;
      const idx = Math.max(0, keys.indexOf(state.config.activeTheme || keys[0]));
      const next = keys[(idx + 1) % keys.length];
      state.config.activeTheme = next;
      if (state.config.patchEnabled) applyThemeHard(next, state);
      state.saveConfig();
      refresh();
    };

    mkt.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      marketModal.open();
    };

    rld.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerRuntimeReload('controls-manual');
    };

    wtg.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = !state.config.ui || state.config.ui.hotReloadWatcher !== false;
      setHotReloadWatcherEnabled(state, !current);
      state.saveConfig();
      refresh();
    };

    refresh();

    if (!window.__zalousControlsObserver) {
      const obs = new MutationObserver(() => schedulePlace());
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
      window.__zalousControlsObserver = obs;
      window.addEventListener('resize', schedulePlace, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) schedulePlace();
      });
    }
  }

  function boot() {
    const embedded = decodePayload();
    const external = tryLoadExternal();
    const localConfig = tryLoadLocalConfig();

    const config = normalizeConfig((external && external.config) || localConfig || embedded.config || {});
    const themes = Object.assign({}, embedded.themes || {}, (external && external.themes) || {});
    const themePacks = Object.assign({}, embedded.themePacks || {}, (external && external.themePacks) || {});
    const extensions = Object.assign({}, embedded.extensions || {}, (external && external.extensions) || {});

    if (config.patchEnabled && !config.activeTheme) {
      const names = Object.keys(themes).concat(Object.keys(themePacks));
      config.activeTheme = names.length ? names[0] : null;
    }
    if (config.patchEnabled) applyThemeHard(config.activeTheme, { themes, themePacks });
    else clearTheme();

    const state = {
      config,
      themes,
      themePacks,
      extensions,
      external,
      extensionConfigDefs: {},
      saveConfig: () => false,
      writeAsset: null,
      reloadExtensions: () => ({ loaded: [], failed: [] })
    };
    state.saveConfig = createPersistFn(external, state);
    state.writeAsset = createWriteAssetFn(external);
    startHotReloadWatcher(external, state.config);

    // Keep runtime behavior strictly aligned with persisted Zalous config/assets.
    let configChanged = false;
    const themeNames = getAllThemeKeys(state);
    const nextTheme = (state.config.activeTheme && state.themes[state.config.activeTheme])
      || (state.config.activeTheme && state.themePacks[state.config.activeTheme])
      ? state.config.activeTheme
      : (themeNames[0] || null);
    if (state.config.activeTheme !== nextTheme) {
      state.config.activeTheme = nextTheme;
      configChanged = true;
    }
    const validExt = new Set(Object.keys(state.extensions));
    const filteredEnabled = (state.config.enabledExtensions || []).filter((name) => validExt.has(name));
    if (JSON.stringify(filteredEnabled) !== JSON.stringify(state.config.enabledExtensions || [])) {
      state.config.enabledExtensions = filteredEnabled;
      configChanged = true;
    }
    if (configChanged) state.saveConfig();

    const extensionHooks = {
      getConfig: (name, fallbackValue) => {
        const value = state.config.extensionConfigs && state.config.extensionConfigs[name];
        if (value && typeof value === 'object') return value;
        return fallbackValue || {};
      },
      setConfig: (name, nextValue) => {
        if (!state.config.extensionConfigs || typeof state.config.extensionConfigs !== 'object') state.config.extensionConfigs = {};
        state.config.extensionConfigs[name] = Object.assign({}, state.config.extensionConfigs[name] || {}, nextValue || {});
        state.saveConfig();
        return true;
      },
      registerConfig: (name, definition) => {
        state.extensionConfigDefs[name] = definition || null;
      }
    };
    state.reloadExtensions = () => runExtensions(state.config.enabledExtensions, state.extensions, extensionHooks);
    const extResult = runExtensions(state.config.enabledExtensions, state.extensions, extensionHooks);
    mountControls(state);

    window.zalous = {
      version: (embedded.meta && embedded.meta.version) || 'dev',
      source: external ? 'external+embedded' : (localConfig ? 'local+embedded' : 'embedded'),
      getState: () => ({
        config: JSON.parse(JSON.stringify(state.config)),
        themes: Object.keys(state.themes),
        themePacks: Object.keys(state.themePacks || {}),
        extensions: Object.keys(state.extensions),
        extensionConfigurable: Object.keys(state.extensionConfigDefs || {})
      }),
      apply: () => applyTheme(state.config.activeTheme, state),
      clear: clearTheme,
      setTheme: (name) => {
        if (!state.themes[name] && !(state.themePacks && state.themePacks[name])) return false;
        state.config.activeTheme = name;
        if (state.config.patchEnabled) applyThemeHard(name, state);
        state.saveConfig();
        return true;
      },
      enablePatch: (on) => {
        state.config.patchEnabled = !!on;
        if (state.config.patchEnabled) applyThemeHard(state.config.activeTheme, state);
        else clearTheme();
        state.saveConfig();
      },
      reloadExtensions: () => state.reloadExtensions(),
      reloadPage: (reason) => triggerRuntimeReload(reason || 'api'),
      openMarket: () => {
        const modal = document.getElementById(MARKET_MODAL_ID);
        if (modal) modal.style.display = 'flex';
      }
    };

    log('booted', {
      source: window.zalous.source,
      activeTheme: state.config.activeTheme,
      patchEnabled: state.config.patchEnabled,
      enabledExtensions: state.config.enabledExtensions,
      extensionResult: extResult
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

