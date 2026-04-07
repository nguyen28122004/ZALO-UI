(() => {
  const MARK = '[ZALOUS]';
  const STYLE_ID = 'zalous-theme-style';
  const CTRL_ID = 'zalous-controls';

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

      const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const themes = {};
      const extensions = {};

      const themeDir = path.join(root, 'themes');
      if (fs.existsSync(themeDir)) {
        for (const f of fs.readdirSync(themeDir)) {
          if (f.toLowerCase().endsWith('.css')) {
            themes[f] = fs.readFileSync(path.join(themeDir, f), 'utf8');
          }
        }
      }

      const extDir = path.join(root, 'extensions');
      if (fs.existsSync(extDir)) {
        for (const f of fs.readdirSync(extDir)) {
          if (f.toLowerCase().endsWith('.js')) {
            extensions[f] = fs.readFileSync(path.join(extDir, f), 'utf8');
          }
        }
      }

      return { config, themes, extensions, source: 'external' };
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
      patchEnabled: true,
      ui: { controls: true }
    }, cfg || {});

    if (!Array.isArray(next.enabledExtensions)) next.enabledExtensions = [];
    if (!next.ui || typeof next.ui !== 'object') next.ui = { controls: true };
    if (typeof next.ui.controls !== 'boolean') next.ui.controls = true;
    if (typeof next.patchEnabled !== 'boolean') next.patchEnabled = true;
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

    const tag = ensureStyleTag();
    tag.textContent = css;
    return { ok: true, name: picked, length: css.length };
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

  function mountControls(state) {
    if (!state.config.ui.controls) return;

    const target = document.querySelector('.nav__tabs__bottom') || document.body;
    if (!target) return;

    let wrap = document.getElementById(CTRL_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = CTRL_ID;
      target.appendChild(wrap);
    }

    wrap.style.cssText = [
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
    ].join(';');

    const toggleId = 'zalous-toggle';
    const themeId = 'zalous-theme';

    let tgl = document.getElementById(toggleId);
    if (!tgl) {
      tgl = document.createElement('button');
      tgl.id = toggleId;
      wrap.appendChild(tgl);
    }

    let thm = document.getElementById(themeId);
    if (!thm) {
      thm = document.createElement('button');
      thm.id = themeId;
      wrap.appendChild(thm);
    }

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

    function refresh() {
      tgl.textContent = state.config.patchEnabled ? 'ON' : 'OFF';
      tgl.style.background = state.config.patchEnabled ? '#2f7a49' : '#dbe6df';
      tgl.style.color = state.config.patchEnabled ? '#fff' : '#2b3f34';

      const keys = Object.keys(state.themes);
      const idx = Math.max(0, keys.indexOf(state.config.activeTheme));
      const label = (keys[idx] || 'th').replace(/\.css$/i, '').slice(0, 2).toUpperCase();
      thm.textContent = label;
      thm.style.background = '#eef4f1';
      thm.style.color = '#254437';
    }

    tgl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.config.patchEnabled = !state.config.patchEnabled;
      if (state.config.patchEnabled) {
        applyTheme(state.config.activeTheme, state.themes);
      } else {
        clearTheme();
      }
      refresh();
    };

    thm.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const keys = Object.keys(state.themes);
      if (!keys.length) return;
      const idx = Math.max(0, keys.indexOf(state.config.activeTheme));
      const next = keys[(idx + 1) % keys.length];
      state.config.activeTheme = next;
      if (state.config.patchEnabled) applyTheme(next, state.themes);
      refresh();
    };

    refresh();
  }

  function boot() {
    const embedded = decodePayload();
    const external = tryLoadExternal();

    const config = normalizeConfig((external && external.config) || embedded.config || {});
    const themes = Object.assign({}, embedded.themes || {}, (external && external.themes) || {});
    const extensions = Object.assign({}, embedded.extensions || {}, (external && external.extensions) || {});

    if (!config.activeTheme) {
      const names = Object.keys(themes);
      config.activeTheme = names.length ? names[0] : null;
    }

    if (config.patchEnabled) {
      applyTheme(config.activeTheme, themes);
    } else {
      clearTheme();
    }

    const extResult = runExtensions(config.enabledExtensions, extensions);

    const state = { config, themes, extensions };
    mountControls(state);

    window.zalous = {
      version: (embedded.meta && embedded.meta.version) || 'dev',
      source: external ? 'external+embedded' : 'embedded',
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
        if (state.config.patchEnabled) applyTheme(name, state.themes);
        return true;
      },
      enablePatch: (on) => {
        state.config.patchEnabled = !!on;
        if (state.config.patchEnabled) applyTheme(state.config.activeTheme, state.themes);
        else clearTheme();
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