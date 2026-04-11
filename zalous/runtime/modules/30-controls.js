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

