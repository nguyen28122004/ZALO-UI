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

