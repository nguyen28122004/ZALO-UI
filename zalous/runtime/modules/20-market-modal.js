  function ensureMarketModal(state, refreshControls) {
    const STYLE_ID = 'zalous-market-styles';
    const CONFIG_MODAL_ID = 'zalous-ext-config-modal';

    let modal = document.getElementById(MARKET_MODAL_ID);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = MARKET_MODAL_ID;
      document.body.appendChild(modal);
    }
    modal.classList.add('zalous-market-overlay');

    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function ensureStyles() {
      let style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        document.head.appendChild(style);
      }
      style.textContent = [
        '.zalous-market-overlay,.zalous-config-overlay{position:fixed;inset:0;z-index:2147483647;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:var(--zm-overlay,rgba(4,8,6,.58));-webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);color:var(--zm-text,#d9e9df)}',
        '.zalous-market-overlay{display:none}.zalous-market-overlay.is-open{display:flex}.zalous-config-overlay{display:flex}',
        '.zalous-market-panel,.zalous-config-panel{width:min(920px,100%);max-height:min(88vh,920px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--zm-border,rgba(255,255,255,.12));border-radius:26px;background:linear-gradient(180deg,var(--zm-surface-3,rgba(30,40,34,.98)) 0%,var(--zm-surface,rgba(20,28,24,.96)) 100%);box-shadow:var(--zm-shadow,0 26px 70px rgba(0,0,0,.38));color:var(--zm-text,#d9e9df)}',
        '.zalous-market-panel{min-height:520px}',
        '.zalous-market-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 22px 0}.zalous-market-heading{min-width:0}.zalous-market-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--zm-accent,#82df9e)}',
        '.zalous-market-title{margin:8px 0 0;font-size:22px;line-height:1.15;letter-spacing:-.02em}.zalous-market-subtitle{margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--zm-muted,rgba(217,233,223,.72));max-width:56ch}.zalous-market-header-actions{display:flex;align-items:center;gap:10px;flex:0 0 auto}',
        '.zalous-market-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 11px;border-radius:999px;border:1px solid var(--zm-border,rgba(255,255,255,.12));background:var(--zm-chip,rgba(255,255,255,.04));color:var(--zm-muted,rgba(217,233,223,.72));font-size:11px;font-weight:700;line-height:1;white-space:nowrap}',
        '.zalous-market-actions{display:flex;flex-wrap:wrap;gap:10px;padding:18px 22px 0}',
        '.zalous-market-button,.zalous-market-close,.zalous-config-action{appearance:none;border:1px solid var(--zm-border,rgba(255,255,255,.12));border-radius:14px;background:var(--zm-surface-2,rgba(255,255,255,.06));color:var(--zm-text,#d9e9df);font-size:12px;font-weight:700;line-height:1;cursor:pointer;-webkit-app-region:no-drag;transition:background-color 120ms ease,border-color 120ms ease,color 120ms ease,box-shadow 120ms ease,transform 120ms ease}',
        '.zalous-market-button{padding:10px 14px}.zalous-market-button.is-primary{background:var(--zm-accent,#6ed08a);border-color:transparent;color:var(--zm-accent-contrast,#07100b)}.zalous-market-button.is-secondary{background:var(--zm-surface-1,rgba(255,255,255,.03))}',
        '.zalous-market-button:hover,.zalous-market-close:hover,.zalous-config-action:hover{transform:translateY(-1px);border-color:var(--zm-accent,#6ed08a);background:var(--zm-hover,rgba(110,208,138,.12))}.zalous-market-button:disabled,.zalous-config-action:disabled{cursor:not-allowed;opacity:.55;transform:none}',
        '.zalous-market-button:focus-visible,.zalous-market-close:focus-visible,.zalous-config-action:focus-visible,.zalous-market-item:focus-visible,.zalous-config-field:focus-visible,.zalous-config-select:focus-visible,.zalous-config-textarea:focus-visible,input[type="checkbox"]:focus-visible{outline:2px solid var(--zm-accent,#6ed08a);outline-offset:2px}',
        '.zalous-market-note{padding:12px 22px 0;font-size:12px;line-height:1.5;color:var(--zm-muted,rgba(217,233,223,.72))}',
        '.zalous-market-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-height:0;padding:16px 22px 22px;overflow:auto}',
        '.zalous-market-column{display:flex;flex-direction:column;min-height:0;gap:10px}.zalous-market-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 0}.zalous-market-section-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--zm-muted,rgba(217,233,223,.72))}.zalous-market-section-count{font-size:11px;color:var(--zm-muted,rgba(217,233,223,.72))}',
        '.zalous-market-list{display:flex;flex-direction:column;gap:10px;min-height:0}',
        '.zalous-market-item{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px;border:1px solid var(--zm-border,rgba(255,255,255,.12));border-radius:18px;background:var(--zm-surface-2,rgba(255,255,255,.05));color:var(--zm-text,#d9e9df);text-align:left;cursor:pointer;box-sizing:border-box}.zalous-market-item:hover{transform:translateY(-1px);border-color:var(--zm-accent,#6ed08a);background:var(--zm-surface-3,rgba(255,255,255,.08))}.zalous-market-item.is-active{border-color:var(--zm-accent,#6ed08a);box-shadow:inset 0 0 0 1px var(--zm-accent-soft,rgba(110,208,138,.18))}',
        '.zalous-market-item-main{display:flex;flex-direction:column;gap:4px;min-width:0}.zalous-market-item-title{font-size:13px;font-weight:800;line-height:1.2;color:var(--zm-text,#d9e9df);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.zalous-market-item-subtitle{font-size:11px;line-height:1.35;color:var(--zm-muted,rgba(217,233,223,.72));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.zalous-market-item-stack,.zalous-market-item-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.zalous-market-chip.is-accent{background:var(--zm-accent,#6ed08a);color:var(--zm-accent-contrast,#07100b);border-color:transparent}.zalous-market-chip.is-muted{background:var(--zm-surface-1,rgba(255,255,255,.03))}',
        '.zalous-market-checkbox{width:16px;height:16px;margin:0;accent-color:var(--zm-accent,#6ed08a);cursor:pointer}.zalous-market-empty{padding:14px;border:1px dashed var(--zm-border,rgba(255,255,255,.12));border-radius:18px;color:var(--zm-muted,rgba(217,233,223,.72));font-size:12px;background:var(--zm-surface-1,rgba(255,255,255,.03))}',
        '.zalous-market-close{min-height:36px;min-width:36px;padding:0 12px;border-radius:999px;background:var(--zm-surface-2,rgba(255,255,255,.06))}',
        '.zalous-config-panel{width:min(560px,100%);max-height:min(90vh,860px);padding:18px;gap:14px}.zalous-config-title{margin:0;font-size:18px;font-weight:800;line-height:1.2}.zalous-config-subtitle{margin:6px 0 0;font-size:12px;line-height:1.5;color:var(--zm-muted,rgba(217,233,223,.72))}.zalous-config-body{display:flex;flex-direction:column;gap:12px;overflow:auto;min-height:0;padding-right:2px}',
        '.zalous-config-field-group{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:16px;border:1px solid var(--zm-border,rgba(255,255,255,.12));background:var(--zm-surface-2,rgba(255,255,255,.05))}.zalous-config-label{font-size:12px;font-weight:800;line-height:1.3;color:var(--zm-text,#d9e9df)}.zalous-config-description{font-size:11px;line-height:1.45;color:var(--zm-muted,rgba(217,233,223,.72))}',
        '.zalous-config-field,.zalous-config-select,.zalous-config-textarea{width:100%;border:1px solid var(--zm-border,rgba(255,255,255,.12));border-radius:12px;background:var(--zm-surface,rgba(24,30,27,.92));color:var(--zm-text,#d9e9df);box-sizing:border-box;padding:10px 12px;font:inherit}.zalous-config-field,.zalous-config-select{height:40px}.zalous-config-textarea{min-height:100px;resize:vertical}',
        '.zalous-config-checkbox-row{display:flex;align-items:center;gap:10px;padding:2px 0;cursor:pointer}.zalous-config-checkbox-row input{width:16px;height:16px;margin:0;accent-color:var(--zm-accent,#6ed08a);cursor:pointer}.zalous-config-footer{display:flex;justify-content:flex-end;gap:10px;padding-top:2px}.zalous-config-action.is-primary{background:var(--zm-accent,#6ed08a);border-color:transparent;color:var(--zm-accent-contrast,#07100b)}',
        '@media (max-width:840px){.zalous-market-panel,.zalous-config-panel{max-height:92vh;border-radius:22px}.zalous-market-header,.zalous-market-actions,.zalous-market-note,.zalous-market-grid{padding-left:16px;padding-right:16px}.zalous-market-grid{grid-template-columns:1fr}.zalous-market-header{flex-direction:column}.zalous-market-header-actions{width:100%;justify-content:space-between}}'
      ].join('\n');
    }

    function parseColor(value) {
      const raw = String(value || '').trim();
      if (!raw || raw === 'transparent') return null;
      let match = raw.match(/^#([0-9a-f]{3,8})$/i);
      if (match) {
        const hex = match[1];
        if (hex.length === 3) return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 };
        if (hex.length === 4) return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: parseInt(hex[3] + hex[3], 16) / 255 };
        if (hex.length === 6 || hex.length === 8) return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
      }
      match = raw.match(/^rgba?\((.+)\)$/i);
      if (match) {
        const parts = match[1].split(',').map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 3) return { r: Math.max(0, Math.min(255, Number(parts[0]))), g: Math.max(0, Math.min(255, Number(parts[1]))), b: Math.max(0, Math.min(255, Number(parts[2]))), a: parts.length > 3 ? Math.max(0, Math.min(1, Number(parts[3]))) : 1 };
      }
      return null;
    }

    function rgbaColor(color) {
      if (!color) return 'rgba(0, 0, 0, 0)';
      return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Math.max(0, Math.min(1, color.a == null ? 1 : color.a))})`;
    }

    function mixColor(a, b, amount) {
      const left = a || { r: 0, g: 0, b: 0, a: 1 };
      const right = b || { r: 255, g: 255, b: 255, a: 1 };
      const t = Math.max(0, Math.min(1, amount));
      return { r: left.r + (right.r - left.r) * t, g: left.g + (right.g - left.g) * t, b: left.b + (right.b - left.b) * t, a: left.a + (right.a - left.a) * t };
    }

    function luminance(color) {
      if (!color) return 0;
      const srgb = [color.r, color.g, color.b].map((channel) => {
        const v = channel / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return (0.2126 * srgb[0]) + (0.7152 * srgb[1]) + (0.0722 * srgb[2]);
    }

    function isDark(color) {
      return luminance(color) < 0.5;
    }

    function firstParsedColor(style, names) {
      for (const name of names) {
        const parsed = parseColor(style.getPropertyValue(name));
        if (parsed && parsed.a !== 0) return parsed;
      }
      return null;
    }

    function samplePalette() {
      const root = document.documentElement;
      const body = document.body || root;
      const rootStyle = getComputedStyle(root);
      const bodyStyle = getComputedStyle(body);
      const bg = firstParsedColor(rootStyle, ['--background','--background-color','--surface-background','--surface','--layer-background','--app-background','--main-background']) || firstParsedColor(bodyStyle, ['background-color']) || parseColor(bodyStyle.backgroundColor) || { r: 18, g: 24, b: 21, a: 1 };
      const text = firstParsedColor(rootStyle, ['--text','--text-color','--foreground','--main-text-color','--color']) || parseColor(bodyStyle.color) || (isDark(bg) ? { r: 233, g: 239, b: 235, a: 1 } : { r: 31, g: 38, b: 34, a: 1 });
      const accent = firstParsedColor(rootStyle, ['--primary','--primary-color','--accent','--accent-color','--brand','--brand-color','--highlight','--main-color','--color-primary']) || firstParsedColor(bodyStyle, ['color']) || (isDark(bg) ? { r: 110, g: 208, b: 138, a: 1 } : { r: 46, g: 132, b: 76, a: 1 });
      const mixBase = isDark(bg) ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
      const surface = mixColor(bg, mixBase, isDark(bg) ? 0.08 : 0.04);
      const surface2 = mixColor(bg, mixBase, isDark(bg) ? 0.14 : 0.08);
      const surface3 = mixColor(bg, mixBase, isDark(bg) ? 0.20 : 0.12);
      const border = mixColor(text, bg, isDark(bg) ? 0.28 : 0.16);
      const muted = mixColor(text, bg, 0.48);
      const accentSoft = mixColor(accent, bg, isDark(bg) ? 0.80 : 0.86);
      const hover = mixColor(accent, bg, isDark(bg) ? 0.18 : 0.12);
      return { bg: rgbaColor(bg), surface: rgbaColor(surface), surface2: rgbaColor(surface2), surface3: rgbaColor(surface3), border: rgbaColor(border), text: rgbaColor(text), muted: rgbaColor(muted), accent: rgbaColor(accent), accentSoft: rgbaColor(accentSoft), accentContrast: isDark(accent) ? 'rgba(255,255,255,.96)' : 'rgba(10,14,11,.96)', hover: rgbaColor(hover), overlay: isDark(bg) ? 'rgba(3,7,5,.64)' : 'rgba(8,12,10,.42)', shadow: isDark(bg) ? '0 28px 76px rgba(0,0,0,.52)' : '0 24px 58px rgba(18,24,20,.24)', scheme: isDark(bg) ? 'dark' : 'light' };
    }

    function applyPalette(target, palette) {
      if (!target || !palette) return;
      target.style.setProperty('--zm-bg', palette.bg);
      target.style.setProperty('--zm-surface', palette.surface);
      target.style.setProperty('--zm-surface-1', palette.surface);
      target.style.setProperty('--zm-surface-2', palette.surface2);
      target.style.setProperty('--zm-surface-3', palette.surface3);
      target.style.setProperty('--zm-border', palette.border);
      target.style.setProperty('--zm-text', palette.text);
      target.style.setProperty('--zm-muted', palette.muted);
      target.style.setProperty('--zm-accent', palette.accent);
      target.style.setProperty('--zm-accent-soft', palette.accentSoft);
      target.style.setProperty('--zm-accent-contrast', palette.accentContrast);
      target.style.setProperty('--zm-hover', palette.hover);
      target.style.setProperty('--zm-overlay', palette.overlay);
      target.style.setProperty('--zm-shadow', palette.shadow);
      target.dataset.zalousScheme = palette.scheme;
    }

    function safeName(name, ext) {
      const cleaned = String(name || '').trim().replace(/[^a-zA-Z0-9._-]/g, '-');
      if (!cleaned) return null;
      return cleaned.toLowerCase().endsWith(ext) ? cleaned : `${cleaned}${ext}`;
    }

    function themeLabel(name) {
      const isPack = !!(state.themePacks && state.themePacks[name]);
      return isPack ? ((state.themePacks[name] && state.themePacks[name].name) || name.replace(/^pack:/, '')) : name.replace(/\.css$/i, '');
    }

    function themeKind(name) {
      return state.themePacks && state.themePacks[name] ? 'Pack' : 'Theme';
    }

    function activeThemeSummary() {
      const keys = getAllThemeKeys(state);
      const active = state.config.activeTheme && keys.includes(state.config.activeTheme) ? state.config.activeTheme : (keys[0] || '');
      if (!active) return { name: 'No active theme', kind: 'None' };
      return { name: themeLabel(active), kind: themeKind(active) };
    }

    function installFromInput(input, kind) {
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return Promise.resolve();
      return file.text().then((raw) => {
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
        if (typeof refreshControls === 'function') refreshControls();
      }).catch((err) => {
        log('install asset failed', err && err.message ? err.message : err);
      });
    }

    function themeRowsHtml() {
      const keys = getAllThemeKeys(state).sort((a, b) => a.localeCompare(b));
      if (!keys.length) return '<div class="zalous-market-empty">No themes installed.</div>';
      return keys.map((name) => {
        const active = state.config.activeTheme === name;
        const isPack = !!(state.themePacks && state.themePacks[name]);
        const label = themeLabel(name);
        const stateLabel = active ? 'Active' : (isPack ? 'Pack' : 'Theme');
        return [`<button type="button" class="zalous-market-item${active ? ' is-active' : ''}" data-theme="${esc(name)}" aria-pressed="${active ? 'true' : 'false'}">`,
          '<span class="zalous-market-item-main">',
          `<span class="zalous-market-item-title">${esc(label)}</span>`,
          `<span class="zalous-market-item-subtitle">${esc(name)}</span>`,
          '</span>',
          '<span class="zalous-market-item-stack">',
          `<span class="zalous-market-chip${active ? ' is-accent' : ' is-muted'}">${esc(stateLabel)}</span>`,
          '</span>',
          '</button>'].join('');
      }).join('');
    }

    function extensionRowsHtml() {
      const names = Object.keys(state.extensions).sort((a, b) => a.localeCompare(b));
      const enabled = new Set(state.config.enabledExtensions || []);
      if (!names.length) return '<div class="zalous-market-empty">No extensions installed.</div>';
      return names.map((name) => {
        const hasCfg = !!state.extensionConfigDefs[name];
        const checked = enabled.has(name);
        return ['<div class="zalous-market-item">',
          '<span class="zalous-market-item-main">',
          `<span class="zalous-market-item-title">${esc(name.replace(/\.js$/i, ''))}</span>`,
          `<span class="zalous-market-item-subtitle">${esc(checked ? 'Enabled' : 'Disabled')}</span>`,
          '</span>',
          '<span class="zalous-market-item-actions">',
          `<button type="button" class="zalous-config-action" data-ext-config="${esc(name)}" ${hasCfg ? '' : 'disabled'}>${hasCfg ? 'Config' : 'No config'}</button>`,
          `<input class="zalous-market-checkbox" type="checkbox" data-ext="${esc(name)}" ${checked ? 'checked' : ''} aria-label="${esc(name)}" />`,
          '</span>',
          '</div>'].join('');
      }).join('');
    }
    function render() {
      ensureStyles();
      const palette = samplePalette();
      applyPalette(modal, palette);
      const summary = activeThemeSummary();
      const themeCount = getAllThemeKeys(state).length;
      const extCount = Object.keys(state.extensions || {}).length;
      modal.innerHTML = [
        '<div class="zalous-market-panel" role="dialog" aria-modal="true" aria-labelledby="zalous-market-title">',
        '  <div class="zalous-market-header">',
        '    <div class="zalous-market-heading">',
        '      <div class="zalous-market-eyebrow">Zalous Market</div>',
        '      <h2 id="zalous-market-title" class="zalous-market-title">Marketplace panel</h2>',
        '      <p class="zalous-market-subtitle">Install themes and extensions, toggle live patching, and keep the UI synced to the active palette.</p>',
        '    </div>',
        '    <div class="zalous-market-header-actions">',
        `      <span class="zalous-market-chip is-muted">${esc(summary.kind)}: ${esc(summary.name)}</span>`,
        `      <span class="zalous-market-chip is-muted">${esc(state.config.patchEnabled ? 'Theme patch on' : 'Theme patch off')}</span>`,
        '      <button type="button" id="zalous-market-close" class="zalous-market-close" aria-label="Close market">Close</button>',
        '    </div>',
        '  </div>',
        '  <div class="zalous-market-actions">',
        '    <button type="button" id="zalous-install-theme" class="zalous-market-button is-primary">Install Theme</button>',
        '    <button type="button" id="zalous-install-extension" class="zalous-market-button">Install Extension</button>',
        '    <button type="button" id="zalous-reload-page" class="zalous-market-button is-secondary">Reload UI</button>',
        '    <input id="zalous-theme-file" type="file" accept=".css,text/css" hidden />',
        '    <input id="zalous-extension-file" type="file" accept=".js,text/javascript,application/javascript" hidden />',
        '  </div>',
        `  <div class="zalous-market-note">Theme changes apply immediately. Reload only if a theme pack or extension needs it. ${themeCount} themes and ${extCount} extensions are available.</div>`,
        '  <div class="zalous-market-grid">',
        '    <section class="zalous-market-column" aria-label="Themes">',
        '      <div class="zalous-market-section-head">',
        '        <div class="zalous-market-section-title">Themes</div>',
        `        <div class="zalous-market-section-count">${themeCount}</div>`,
        '      </div>',
        `      <div class="zalous-market-list">${themeRowsHtml()}</div>`,
        '    </section>',
        '    <section class="zalous-market-column" aria-label="Extensions">',
        '      <div class="zalous-market-section-head">',
        '        <div class="zalous-market-section-title">Extensions</div>',
        `        <div class="zalous-market-section-count">${extCount}</div>`,
        '      </div>',
        `      <div class="zalous-market-list">${extensionRowsHtml()}</div>`,
        '    </section>',
        '  </div>',
        '</div>'
      ].join('');

      const closeModal = () => {
        state.saveConfig();
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        if (typeof refreshControls === 'function') refreshControls();
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
          if (typeof refreshControls === 'function') refreshControls();
        };
      });

      modal.querySelectorAll('[data-ext]').forEach((ck) => {
        ck.onchange = () => {
          const name = ck.getAttribute('data-ext');
          const set = new Set(state.config.enabledExtensions || []);
          if (ck.checked) set.add(name);
          else set.delete(name);
          state.config.enabledExtensions = [...set];
          state.saveConfig();
          state.reloadExtensions();
          render();
          if (typeof refreshControls === 'function') refreshControls();
        };
      });

      modal.querySelectorAll('[data-ext-config]').forEach((btn) => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-ext-config');
          const def = state.extensionConfigDefs[name];
          if (!def) return;
          if (!state.config.extensionConfigs || typeof state.config.extensionConfigs !== 'object') state.config.extensionConfigs = {};
          const existing = state.config.extensionConfigs[name] || {};
          const fields = Array.isArray(def.fields) ? def.fields : [];
          if (!fields.length) return;

          const fieldHtml = fields.map((field) => {
            const key = String(field.key || '').trim();
            if (!key) return '';
            const fieldKey = esc(key);
            const label = esc(field.label || key);
            const description = field.description ? `<div class="zalous-config-description">${esc(field.description)}</div>` : '';
            const current = Object.prototype.hasOwnProperty.call(existing, key) ? existing[key] : field.default;

            if (field.type === 'checkbox') {
              const checked = Object.prototype.hasOwnProperty.call(existing, key) ? !!existing[key] : !!field.default;
              return [`<label class="zalous-config-field-group zalous-config-checkbox-row">`,
                `  <input data-cfg-key="${fieldKey}" data-cfg-type="checkbox" type="checkbox" ${checked ? 'checked' : ''} />`,
                `  <span class="zalous-config-label">${label}</span>`,
                '</label>',
                description].join('');
            }

            if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
              const selected = Object.prototype.hasOwnProperty.call(existing, key) ? existing[key] : (field.default || field.options[0].value);
              const options = field.options.map((option) => `<option value="${esc(option.value)}" ${String(option.value) === String(selected) ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
              return [`<div class="zalous-config-field-group">`,
                `  <label class="zalous-config-label" for="zalous-cfg-${fieldKey}">${label}</label>`,
                `  <select id="zalous-cfg-${fieldKey}" data-cfg-key="${fieldKey}" data-cfg-type="select" class="zalous-config-select">${options}</select>`,
                description,
                '</div>'].join('');
            }

            if (field.type === 'textarea') {
              const rows = Number(field.rows) > 0 ? Number(field.rows) : 4;
              const value = current == null ? '' : current;
              return [`<div class="zalous-config-field-group">`,
                `  <label class="zalous-config-label" for="zalous-cfg-${fieldKey}">${label}</label>`,
                `  <textarea id="zalous-cfg-${fieldKey}" data-cfg-key="${fieldKey}" data-cfg-type="textarea" rows="${rows}" class="zalous-config-textarea">${esc(value)}</textarea>`,
                description,
                '</div>'].join('');
            }

            const inputType = field.type === 'password' ? 'password' : (field.type === 'number' ? 'number' : 'text');
            const stepAttr = field.type === 'number' && field.step != null ? ` step="${esc(field.step)}"` : '';
            const minAttr = field.type === 'number' && field.min != null ? ` min="${esc(field.min)}"` : '';
            const maxAttr = field.type === 'number' && field.max != null ? ` max="${esc(field.max)}"` : '';
            const value = current == null ? '' : current;
            return [`<div class="zalous-config-field-group">`,
              `  <label class="zalous-config-label" for="zalous-cfg-${fieldKey}">${label}</label>`,
              `  <input id="zalous-cfg-${fieldKey}" data-cfg-key="${fieldKey}" data-cfg-type="${esc(field.type || 'text')}" type="${inputType}" value="${esc(value)}" class="zalous-config-field"${stepAttr}${minAttr}${maxAttr} />`,
              description,
              '</div>'].join('');
          }).join('');

          if (!fieldHtml.trim()) return;

          let cfg = document.getElementById(CONFIG_MODAL_ID);
          if (!cfg) {
            cfg = document.createElement('div');
            cfg.id = CONFIG_MODAL_ID;
            cfg.className = 'zalous-config-overlay is-open';
            document.body.appendChild(cfg);
          }

          applyPalette(cfg, samplePalette());
          cfg.innerHTML = [
            '<div class="zalous-config-panel" role="dialog" aria-modal="true" aria-labelledby="zalous-config-title">',
            `  <h3 id="zalous-config-title" class="zalous-config-title">${esc(def.title || name)}</h3>`,
            `  <p class="zalous-config-subtitle">${esc(def.description || 'Configure extension options.')}</p>`,
            `  <div class="zalous-config-body">${fieldHtml}</div>`,
            '  <div class="zalous-config-footer">',
            '    <button type="button" id="zalous-ext-config-cancel" class="zalous-config-action">Cancel</button>',
            '    <button type="button" id="zalous-ext-config-save" class="zalous-config-action is-primary">Save</button>',
            '  </div>',
            '</div>'
          ].join('');

          const closeCfg = () => {
            if (cfg && cfg.parentElement) cfg.remove();
          };
          cfg.querySelector('#zalous-ext-config-cancel').onclick = closeCfg;
          cfg.onclick = (e) => {
            if (e.target === cfg) closeCfg();
          };
          cfg.querySelector('#zalous-ext-config-save').onclick = () => {
            if (!state.config.extensionConfigs[name] || typeof state.config.extensionConfigs[name] !== 'object') state.config.extensionConfigs[name] = {};
            cfg.querySelectorAll('[data-cfg-key]').forEach((node) => {
              const key = node.getAttribute('data-cfg-key');
              const type = node.getAttribute('data-cfg-type');
              if (!key) return;
              if (type === 'checkbox') state.config.extensionConfigs[name][key] = !!node.checked;
              else if (type === 'number') {
                const num = Number(node.value);
                state.config.extensionConfigs[name][key] = Number.isFinite(num) ? num : node.value;
              } else {
                state.config.extensionConfigs[name][key] = node.value;
              }
            });
            state.saveConfig();
            state.reloadExtensions();
            render();
            if (typeof refreshControls === 'function') refreshControls();
            closeCfg();
          };
        };
      });
    }

    function scheduleThemeSync() {
      const palette = samplePalette();
      applyPalette(modal, palette);
      const cfg = document.getElementById(CONFIG_MODAL_ID);
      if (cfg) applyPalette(cfg, palette);
      if (modal.classList.contains('is-open')) render();
    }

    if (!window.__zalousMarketStyleObserver) {
      const obs = new MutationObserver(() => {
        if (typeof window.__zalousMarketThemeSync === 'function') window.__zalousMarketThemeSync();
      });
      obs.observe(document.head || document.documentElement, { childList: true, subtree: true, characterData: true });
      obs.observe(document.documentElement || document.body, { attributes: true, attributeFilter: ['class', 'style'] });
      window.__zalousMarketStyleObserver = obs;
    }
    window.__zalousMarketThemeSync = scheduleThemeSync;

    function openModal() {
      render();
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
    }

    window.__zalousOpenMarket = openModal;

    return {
      open: openModal
    };
  }
