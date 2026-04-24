  function boot() {
    const embedded = decodePayload();
    const external = tryLoadExternal();
    const localConfig = tryLoadLocalConfig();

    function pickConfig() {
      if (external && external.config) return external.config;
      const embeddedConfig = embedded.config || {};
      if (localConfig && typeof localConfig === 'object') {
        const localAsar = String(localConfig.appAsarPath || '');
        const embeddedAsar = String(embeddedConfig.appAsarPath || '');
        if (localAsar && embeddedAsar && localAsar !== embeddedAsar) {
          return Object.assign({}, localConfig, embeddedConfig, {
            extensionConfigs: Object.assign({}, embeddedConfig.extensionConfigs || {}, localConfig.extensionConfigs || {})
          });
        }
        return localConfig;
      }
      return embeddedConfig;
    }

    const config = normalizeConfig(pickConfig());
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
    const marketModal = ensureMarketModal(state, () => {});
    mountControls(state);

    const resolveExtensionName = (name) => {
      const raw = String(name || '').trim();
      if (!raw) return '';
      if (state.extensions[raw]) return raw;
      if (!raw.toLowerCase().endsWith('.js') && state.extensions[`${raw}.js`]) return `${raw}.js`;
      const byId = Object.keys(state.extensions).find((x) => x.replace(/\.js$/i, '') === raw.replace(/^extension[._-]/i, ''));
      return byId || raw;
    };

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
      getExtensionConfig: (name) => {
        const extName = resolveExtensionName(name);
        const cfg = state.config.extensionConfigs && state.config.extensionConfigs[extName];
        return JSON.parse(JSON.stringify((cfg && typeof cfg === 'object') ? cfg : {}));
      },
      setExtensionConfig: (name, patchValue) => {
        const extName = resolveExtensionName(name);
        if (!extName || !state.extensions[extName]) return false;
        if (!state.config.extensionConfigs || typeof state.config.extensionConfigs !== 'object') state.config.extensionConfigs = {};
        const prev = state.config.extensionConfigs[extName];
        const patch = (patchValue && typeof patchValue === 'object') ? patchValue : {};
        state.config.extensionConfigs[extName] = Object.assign({}, (prev && typeof prev === 'object') ? prev : {}, patch);
        state.saveConfig();
        if ((state.config.enabledExtensions || []).includes(extName)) state.reloadExtensions();
        return true;
      },
      reloadPage: (reason) => triggerRuntimeReload(reason || 'api'),
      openMarket: () => {
        if (typeof window.__zalousOpenMarket === 'function') {
          window.__zalousOpenMarket();
          return true;
        }
        if (marketModal && typeof marketModal.open === 'function') {
          marketModal.open();
          return true;
        }
        const modal = document.getElementById(MARKET_MODAL_ID);
        if (modal) {
          modal.style.display = 'flex';
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
          return true;
        }
        return false;
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

