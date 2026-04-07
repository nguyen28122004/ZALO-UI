(() => {
  const MARK = '[ZALOUS]';
  const STYLE_ID = 'zalous-theme-style';
  const CTRL_ID = 'zalous-controls';
  const MARKET_MODAL_ID = 'zalous-market-modal';
  const MAIN_TAB_FIX_ID = 'zalous-main-tab-fix';
  const LOCAL_CONFIG_KEY = 'zalous.config.v1';

  function log(...args) {
    try { console.log(MARK, ...args); } catch (_) {}
  }

  function decodePayload() {
    const embedded = window.__ZALOUS_EMBEDDED__ || {};
    return {
      meta: embedded.meta || {},
      config: embedded.config || {},
      themes: embedded.themes || {},
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

      return { config, themes, extensions, source: 'external', root, cfgPath };
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
      ui: { controls: true }
    }, cfg || {});

    if (!Array.isArray(next.enabledExtensions)) next.enabledExtensions = [];
    if (!next.ui || typeof next.ui !== 'object') next.ui = { controls: true };
    if (typeof next.ui.controls !== 'boolean') next.ui.controls = true;
    if (typeof next.patchEnabled !== 'boolean') next.patchEnabled = false;
    return next;
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
  }

  function applyTheme(themeName, themes) {
    const keys = Object.keys(themes || {});
    if (!keys.length) return { ok: false, reason: 'no_theme' };
    const picked = themeName && themes[themeName] ? themeName : keys[0];
    const css = themes[picked] || '';
    ensureStyleTag().textContent = css;
    return { ok: true, name: picked, length: css.length };
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

  function applyThemeHard(themeName, themes) {
    clearTheme();
    const first = applyTheme(themeName, themes);
    ensureMainTabFix();
    requestAnimationFrame(() => applyTheme(themeName, themes));
    setTimeout(() => applyTheme(themeName, themes), 40);
    forceThemeRefresh();
    return first;
  }

  function runExtensions(enabledExtensions, extensionMap) {
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
        const fn = new Function('window', 'document', 'console', code + '\n//# sourceURL=zalous-extension-' + extName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
        fn(window, document, console);
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
          if (state.config.patchEnabled) applyTheme(state.config.activeTheme, state.themes);
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
      const themeRows = Object.keys(state.themes).sort().map((name) => {
        const active = state.config.activeTheme === name;
        return `
          <button data-theme="${name}" style="display:flex;align-items:center;justify-content:space-between;width:100%;border:1px solid #c8d8d0;background:${active ? '#dff0e8' : '#ffffff'};border-radius:8px;padding:8px 10px;margin:0 0 6px 0;cursor:pointer">
            <span style="font-size:12px;color:#234536">${name.replace(/\.css$/i, '')}</span>
            <span style="font-size:11px;color:${active ? '#14532d' : '#72877b'}">${active ? 'active' : 'set'}</span>
          </button>
        `;
      }).join('');

      const extSet = new Set(state.config.enabledExtensions || []);
      const extRows = Object.keys(state.extensions).sort().map((name) => `
        <label style="display:flex;align-items:center;justify-content:space-between;border:1px solid #c8d8d0;background:#fff;border-radius:8px;padding:8px 10px;margin:0 0 6px 0;cursor:pointer">
          <span style="font-size:12px;color:#234536">${name.replace(/\.js$/i, '')}</span>
          <input type="checkbox" data-ext="${name}" ${extSet.has(name) ? 'checked' : ''} />
        </label>
      `).join('');

      modal.innerHTML = `
        <div id="zalous-market-card" style="width:min(560px,92vw);max-height:78vh;overflow:auto;background:#f4faf7;border-radius:14px;border:1px solid #b9cec3;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:14px;box-sizing:border-box">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700;color:#1f4734">Zalous Market Manager</div>
            <button id="zalous-market-close" style="height:26px;min-width:50px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer">Close</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <button id="zalous-install-theme" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">Install Theme</button>
            <button id="zalous-install-extension" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#fff;cursor:pointer;font-size:12px">Install Extension</button>
            <button id="zalous-reload-extensions" style="height:28px;padding:0 10px;border:1px solid #b8cfc1;border-radius:8px;background:#e8f3ee;cursor:pointer;font-size:12px">Reload Extensions</button>
            <input id="zalous-theme-file" type="file" accept=".css,text/css" style="display:none" />
            <input id="zalous-extension-file" type="file" accept=".js,text/javascript,application/javascript" style="display:none" />
          </div>
          <div style="font-size:12px;color:#567664;margin-bottom:10px">Theme apply ngay khong can reload. Extension co the can bam Reload de load lai.</div>
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
      modal.querySelector('#zalous-reload-extensions').onclick = () => {
        state.reloadExtensions();
      };

      modal.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-theme');
          state.config.activeTheme = name;
          if (state.config.patchEnabled) applyThemeHard(name, state.themes);
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
            runExtensions([name], state.extensions);
          } else {
            set.delete(name);
          }
          state.config.enabledExtensions = [...set];
          state.saveConfig();
          refreshControls();
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
    const tgl = document.getElementById(toggleId) || Object.assign(document.createElement('button'), { id: toggleId });
    const thm = document.getElementById(themeId) || Object.assign(document.createElement('button'), { id: themeId });
    const mkt = document.getElementById(marketId) || Object.assign(document.createElement('button'), { id: marketId });
    if (!tgl.parentElement) wrap.appendChild(tgl);
    if (!thm.parentElement) wrap.appendChild(thm);
    if (!mkt.parentElement) wrap.appendChild(mkt);

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

    function refresh() {
      tgl.textContent = state.config.patchEnabled ? 'ON' : 'OFF';
      tgl.style.background = state.config.patchEnabled ? '#2f7a49' : '#dbe6df';
      tgl.style.color = state.config.patchEnabled ? '#fff' : '#2b3f34';

      const keys = Object.keys(state.themes);
      const hasActive = !!(state.config.activeTheme && keys.includes(state.config.activeTheme));
      const idx = hasActive ? keys.indexOf(state.config.activeTheme) : -1;
      const label = hasActive ? (keys[idx] || '--').replace(/\.css$/i, '').slice(0, 2).toUpperCase() : '--';
      thm.textContent = label;
      thm.style.background = '#eef4f1';
      thm.style.color = '#254437';

      mkt.textContent = 'MK';
      mkt.title = 'Open Zalous Market Manager';
      mkt.style.background = '#e8f3ee';
      mkt.style.color = '#204534';
      mkt.style.border = '1px solid #b8cfc1';
    }

    const marketModal = ensureMarketModal(state, refresh);

    tgl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.config.patchEnabled = !state.config.patchEnabled;
      if (state.config.patchEnabled) applyThemeHard(state.config.activeTheme, state.themes);
      else clearTheme();
      state.saveConfig();
      refresh();
    };

    thm.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const keys = Object.keys(state.themes);
      if (!keys.length) return;
      const idx = Math.max(0, keys.indexOf(state.config.activeTheme || keys[0]));
      const next = keys[(idx + 1) % keys.length];
      state.config.activeTheme = next;
      if (state.config.patchEnabled) applyThemeHard(next, state.themes);
      state.saveConfig();
      refresh();
    };

    mkt.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      marketModal.open();
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
    const extensions = Object.assign({}, embedded.extensions || {}, (external && external.extensions) || {});

    if (config.patchEnabled && !config.activeTheme) {
      const names = Object.keys(themes);
      config.activeTheme = names.length ? names[0] : null;
    }
    if (config.patchEnabled) applyThemeHard(config.activeTheme, themes);
    else clearTheme();

    const state = {
      config,
      themes,
      extensions,
      saveConfig: () => false,
      writeAsset: null,
      reloadExtensions: () => ({ loaded: [], failed: [] })
    };
    state.saveConfig = createPersistFn(external, state);
    state.writeAsset = createWriteAssetFn(external);

    // Keep runtime behavior strictly aligned with persisted Zalous config/assets.
    let configChanged = false;
    const themeNames = Object.keys(state.themes);
    const nextTheme = (state.config.activeTheme && state.themes[state.config.activeTheme])
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

    state.reloadExtensions = () => runExtensions(state.config.enabledExtensions, state.extensions);
    const extResult = runExtensions(state.config.enabledExtensions, state.extensions);
    mountControls(state);

    window.zalous = {
      version: (embedded.meta && embedded.meta.version) || 'dev',
      source: external ? 'external+embedded' : (localConfig ? 'local+embedded' : 'embedded'),
      getState: () => ({
        config: JSON.parse(JSON.stringify(state.config)),
        themes: Object.keys(state.themes),
        extensions: Object.keys(state.extensions)
      }),
      apply: () => applyTheme(state.config.activeTheme, state.themes),
      clear: clearTheme,
      setTheme: (name) => {
        if (!state.themes[name]) return false;
        state.config.activeTheme = name;
        if (state.config.patchEnabled) applyThemeHard(name, state.themes);
        state.saveConfig();
        return true;
      },
      enablePatch: (on) => {
        state.config.patchEnabled = !!on;
        if (state.config.patchEnabled) applyThemeHard(state.config.activeTheme, state.themes);
        else clearTheme();
        state.saveConfig();
      },
      reloadExtensions: () => state.reloadExtensions(),
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
