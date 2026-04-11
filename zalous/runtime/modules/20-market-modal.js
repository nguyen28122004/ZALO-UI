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

            const label = field.label || key;
            const hint = field.placeholder ? ` placeholder="${escapeAttr(field.placeholder)}"` : '';
            const description = field.description
              ? `<div style="font-size:11px;color:#5c766a;margin:-4px 0 8px">${field.description}</div>`
              : '';

            if (field.type === 'checkbox') {
              const checked = Object.prototype.hasOwnProperty.call(existing, key)
                ? !!existing[key]
                : !!field.default;
              return `
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#234536;margin-bottom:8px">
                  <input data-cfg-key="${escapeAttr(key)}" data-cfg-type="checkbox" type="checkbox" ${checked ? 'checked' : ''} />
                  <span>${label}</span>
                </label>
                ${description}
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
                <label style="display:block;font-size:12px;color:#234536;margin-bottom:6px">${label}</label>
                <select data-cfg-key="${escapeAttr(key)}" data-cfg-type="select" style="width:100%;height:32px;border:1px solid #b8cfc1;border-radius:8px;padding:0 8px;background:#fff;margin-bottom:8px">${optionsHtml}</select>
                ${description}
              `;
            }

            if (field.type === 'textarea') {
              const current = Object.prototype.hasOwnProperty.call(existing, key)
                ? existing[key]
                : (field.default || '');
              return `
                <label style="display:block;font-size:12px;color:#234536;margin-bottom:6px">${label}</label>
                <textarea data-cfg-key="${escapeAttr(key)}" data-cfg-type="textarea" rows="${Number(field.rows) > 0 ? Number(field.rows) : 4}" style="width:100%;min-height:88px;border:1px solid #b8cfc1;border-radius:8px;padding:8px;background:#fff;margin-bottom:8px;box-sizing:border-box;resize:vertical"${hint}>${escapeAttr(current)}</textarea>
                ${description}
              `;
            }

            const current = Object.prototype.hasOwnProperty.call(existing, key)
              ? existing[key]
              : (field.default ?? '');
            const inputType = field.type === 'password' ? 'password' : (field.type === 'number' ? 'number' : 'text');
            const stepAttr = field.type === 'number' && field.step ? ` step="${escapeAttr(field.step)}"` : '';
            const minAttr = field.type === 'number' && field.min !== undefined ? ` min="${escapeAttr(field.min)}"` : '';
            const maxAttr = field.type === 'number' && field.max !== undefined ? ` max="${escapeAttr(field.max)}"` : '';
            return `
              <label style="display:block;font-size:12px;color:#234536;margin-bottom:6px">${label}</label>
              <input data-cfg-key="${escapeAttr(key)}" data-cfg-type="${escapeAttr(field.type || 'text')}" type="${inputType}" value="${escapeAttr(current)}" style="width:100%;height:32px;border:1px solid #b8cfc1;border-radius:8px;padding:0 8px;background:#fff;margin-bottom:8px;box-sizing:border-box"${hint}${stepAttr}${minAttr}${maxAttr} />
              ${description}
            `;
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
              } else if (type === 'number') {
                const num = Number(node.value);
                state.config.extensionConfigs[name][key] = Number.isFinite(num) ? num : node.value;
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

