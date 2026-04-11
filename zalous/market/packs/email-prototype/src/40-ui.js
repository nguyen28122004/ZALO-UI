  function createItem() {
    const item = document.createElement('div');
    item.id = ITEM_ID;
    item.className = 'msg-item pinned';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.innerHTML = '<div class="mail-pin"><div class="mail-pin-k">Workspace Mail</div><div class="mail-pin-t">Email (IMAP)</div><div class="mail-pin-p">Folder + pagination + read-only message viewer</div></div>';

    const go = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openView();
    };

    item.addEventListener('click', go);
    item.addEventListener('keydown', go);
    return item;
  }

  function shift(container) {
    const h = px(container.style.height || '');
    if (h != null) {
      const prevBase = Number(container.getAttribute(BASE_HEIGHT_ATTR) || '');
      const base = Number.isFinite(prevBase) ? prevBase : h;
      container.setAttribute(BASE_HEIGHT_ATTR, String(base));
      container.style.height = `${base + PINNED_HEIGHT}px`;
    }

    Array.from(container.children).forEach((el) => {
      if (!(el instanceof HTMLElement) || el.id === ITEM_ID || !el.classList.contains('msg-item')) return;
      const top = px(el.style.top || '');
      if (top == null) return;
      const prevBase = Number(el.getAttribute(BASE_TOP_ATTR) || '');
      const base = Number.isFinite(prevBase) ? prevBase : top;
      el.setAttribute(BASE_TOP_ATTR, String(base));
      el.style.top = `${base + PINNED_HEIGHT}px`;
    });
  }

  function ensureItem() {
    const container = listContainer();
    if (!container) return;
    let item = document.getElementById(ITEM_ID);
    if (!item) item = createItem();
    if (item.parentElement !== container) container.prepend(item);
    if (container.firstElementChild !== item) container.prepend(item);
    shift(container);
    syncItemState();
  }

  function restoreListLayout() {
    const container = listContainer();
    if (!container) return;
    const baseHeight = Number(container.getAttribute(BASE_HEIGHT_ATTR) || '');
    if (Number.isFinite(baseHeight)) container.style.height = `${baseHeight}px`;
    container.removeAttribute(BASE_HEIGHT_ATTR);
    Array.from(container.children).forEach((el) => {
      if (!(el instanceof HTMLElement) || !el.classList.contains('msg-item')) return;
      const baseTop = Number(el.getAttribute(BASE_TOP_ATTR) || '');
      if (Number.isFinite(baseTop)) el.style.top = `${baseTop}px`;
      el.removeAttribute(BASE_TOP_ATTR);
    });
    const item = document.getElementById(ITEM_ID);
    if (item && item.parentElement) item.remove();
  }

  function mainEl() {
    const direct = (
      document.querySelector('main')
      || document.querySelector('[role="main"]')
      || document.querySelector('.chat-box')
      || document.querySelector('[id*="main-content"]')
      || document.getElementById('chatDetail')
      || document.getElementById('chatOnboard')
      || document.querySelector('[id*="chat-detail"]')
      || document.querySelector('[id*="chatOnboard"]')
      || document.querySelector('.chat-onboard')
      || document.querySelector('[class*="chat-onboard"]')
      || document.querySelector('[class*="chat-board"]')
    );
    if (direct) return direct;
    const candidates = Array.from(document.querySelectorAll('div'))
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width < 420 || rect.height < 320) return false;
        const cls = String(el.className || '').toLowerCase();
        const id = String(el.id || '').toLowerCase();
        if (id.includes('main-tab') || cls.includes('leftmenu') || cls.includes('sidebar')) return false;
        return true;
      })
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
    return candidates[0] || null;
  }

  function captureMain(main) {
    if (!main) return;
    if (state.main !== main) {
      state.main = main;
      state.mainSnapshotNodes = [];
      state.mainSiblingsHidden = [];
    }
    if (!state.mainSnapshotNodes.length) {
      state.mainSnapshotNodes = Array.from(main.childNodes);
    }
  }

  function hideSiblingPanels(main) {
    if (!main || !main.parentElement || state.mainSiblingsHidden.length) return;
    const siblings = Array.from(main.parentElement.children).filter((el) => el !== main);
    siblings.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      state.mainSiblingsHidden.push({
        el,
        display: el.style.display,
        width: el.style.width,
        flex: el.style.flex
      });
      el.style.display = 'none';
      el.style.width = '0';
      el.style.flex = '0 0 0';
    });
    main.style.width = '100%';
    main.style.flex = '1 1 auto';
  }

  function restoreSiblingPanels() {
    state.mainSiblingsHidden.forEach((entry) => {
      const el = entry.el;
      if (!(el instanceof HTMLElement)) return;
      el.style.display = entry.display || '';
      el.style.width = entry.width || '';
      el.style.flex = entry.flex || '';
    });
    state.mainSiblingsHidden = [];
    if (state.main) {
      state.main.style.width = '';
      state.main.style.flex = '';
    }
  }

  function restore() {
    if (!state.main || !state.active) return;

    while (state.main.firstChild) {
      state.main.removeChild(state.main.firstChild);
    }

    state.mainSnapshotNodes.forEach((node) => {
      state.main.appendChild(node);
    });

    state.main.removeAttribute(ACTIVE_ATTR);
    restoreSiblingPanels();
    state.active = false;
    state.shell = null;
    syncItemState();
  }

  function shouldRestore(target) {
    if (!state.active) return false;
    if (!(target instanceof Element)) return false;
    if (target.closest(`#${ITEM_ID}`)) return false;
    if (state.shell && target.closest(`.${MAIN_MARKER}`)) return false;

    const list = listContainer();
    if (list && list.contains(target)) return true;
    if (target.closest('.msg-item, [role="tab"], [class*="conversation"], [class*="chat-item"], [data-id]')) return true;
    return false;
  }

  async function openView() {
    const main = mainEl();
    if (!main) return;

    captureMain(main);

    while (main.firstChild) {
      main.removeChild(main.firstChild);
    }

    main.setAttribute(ACTIVE_ATTR, '1');
    hideSiblingPanels(main);
    const wrap = document.createElement('div');
    wrap.className = MAIN_MARKER;
    main.appendChild(wrap);
    state.shell = wrap;
    state.active = true;
    syncItemState();

    render(false);

    try {
      await loadFolders(false);
      await loadFolder(state.currentFolder, state.page || 1, false);
      state.notice = `Opened ${state.currentFolder}.`;
      state.error = '';
      render(false);
    } catch (e) {
      setErr(e && e.message ? e.message : String(e));
    }
  }

  function bind() {
    const copyMessageId = async () => {
      const detail = state.selectedMessage;
      const id = detail && detail.messageId ? String(detail.messageId) : '';
      if (!id || id === '--') {
        state.notice = 'No Message-ID to copy.';
        render(false);
        return;
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const ta = document.createElement('textarea');
          ta.value = id;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        state.notice = 'Message-ID copied.';
      } catch (_) {
        state.notice = `Message-ID: ${id}`;
      }
      render(false);
    };

    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const act = t.closest('[data-act]');
      if (act && state.shell && state.shell.contains(act)) {
        const a = act.getAttribute('data-act');
        if (a === 'refresh-all') refreshAll(false);
        if (a === 'reconnect') refreshAll(true);
        if (a === 'open-settings') render(true);
        if (a === 'close-settings') render(false);
        if (a === 'save-settings') saveSettings();
        if (a === 'first') openPage(1);
        if (a === 'prev') openPage(state.page - 1);
        if (a === 'next') openPage(state.page + 1);
        if (a === 'last') {
          const total = cacheFor(state.currentFolder).uids.length || 0;
          const pages = Math.max(1, Math.ceil(total / state.pageSize));
          openPage(pages);
        }
        if (a === 'toggle-unread') {
          state.onlyUnread = !state.onlyUnread;
          render(false);
        }
        if (a === 'toggle-star') {
          const uid = state.selectedUid || (state.selectedMessage && state.selectedMessage.uid) || '';
          if (uid) {
            toggleStar(state.currentFolder, uid);
            state.notice = isStarred(state.currentFolder, uid) ? `Starred UID ${uid}.` : `Unstarred UID ${uid}.`;
            render(false);
          }
        }
        if (a === 'copy-message-id') copyMessageId();
        return;
      }

      const folder = t.closest('[data-folder]');
      if (folder && state.shell && state.shell.contains(folder)) {
        openFolder(folder.getAttribute('data-folder') || 'INBOX');
        return;
      }

      const uid = t.closest('[data-uid]');
      if (uid && state.shell && state.shell.contains(uid)) {
        openMail(uid.getAttribute('data-uid') || '');
        return;
      }

      if (shouldRestore(t)) restore();
    };

    const onKey = (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && shouldRestore(e.target)) restore();

      if (!state.active) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        refreshAll(false);
        return;
      }

      if (e.key.toLowerCase() === 's') {
        const uid = state.selectedUid || (state.selectedMessage && state.selectedMessage.uid) || '';
        if (uid) {
          e.preventDefault();
          toggleStar(state.currentFolder, uid);
          state.notice = isStarred(state.currentFolder, uid) ? `Starred UID ${uid}.` : `Unstarred UID ${uid}.`;
          render(false);
        }
        return;
      }

      if (e.key.toLowerCase() === 'c' && e.altKey) {
        e.preventDefault();
        copyMessageId();
        return;
      }

      if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k') {
        const rows = filteredRows();
        if (!rows.length) return;
        const idx = rows.findIndex((x) => x.uid === state.selectedUid);
        const nextIdx = e.key.toLowerCase() === 'j'
          ? Math.min(rows.length - 1, Math.max(0, idx) + 1)
          : Math.max(0, (idx < 0 ? 0 : idx) - 1);
        const next = rows[nextIdx];
        if (next && next.uid !== state.selectedUid) {
          e.preventDefault();
          openMail(next.uid);
        }
      }
    };

    const onInput = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || !t.matches('[data-role="search"]')) return;
      state.query = t.value || '';
      render(false);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('input', onInput, true);

    state.removeFns.push(() => document.removeEventListener('click', onClick, true));
    state.removeFns.push(() => document.removeEventListener('keydown', onKey, true));
    state.removeFns.push(() => document.removeEventListener('input', onInput, true));
  }

  function observe() {
    if (state.observer) return;
    state.observer = new MutationObserver(() => {
      ensureItem();
      if (state.main && !state.main.isConnected) {
        restoreSiblingPanels();
        state.main = null;
        state.mainSnapshotNodes = [];
      }
      applyThemePalette();
    });
    state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

    if (!state.themeObserver) {
      state.themeObserver = new MutationObserver(() => {
        applyThemePalette();
      });
      [document.documentElement, document.body].filter(Boolean).forEach((root) => {
        try {
          state.themeObserver.observe(root, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme', 'data-theme-name']
          });
        } catch (_) {}
      });
    }
  }

  function cleanup() {
    state.removeFns.splice(0).forEach((fn) => {
      try { fn(); } catch (_) {}
    });

    if (state.observer) {
      try { state.observer.disconnect(); } catch (_) {}
      state.observer = null;
    }
    if (state.themeObserver) {
      try { state.themeObserver.disconnect(); } catch (_) {}
      state.themeObserver = null;
    }

    if (state.imap) {
      state.imap.close().catch(() => {});
      state.imap = null;
    }
    restoreListLayout();
    restoreSiblingPanels();
    state.connected = false;
  }
