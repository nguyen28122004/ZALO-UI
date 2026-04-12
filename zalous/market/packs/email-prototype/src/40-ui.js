  function createItem() {
    const item = document.createElement('div');
    item.id = ITEM_ID;
    item.className = 'msg-item pinned';
    item.setAttribute('data-zalous-email-item', '1');
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
    if (!container) return;
    const item = document.getElementById(ITEM_ID);
    if (!item || item.parentElement !== container) return;
    const offset = Math.ceil((item.getBoundingClientRect().height || PINNED_HEIGHT) + PINNED_EXTRA_OFFSET);
    const children = Array.from(container.children);
    let shifted = 0;
    let maxBottom = 0;
    children.forEach((node) => {
      if (!(node instanceof HTMLElement) || node === item) return;
      const baseTop = node.hasAttribute(BASE_TOP_ATTR)
        ? Number(node.getAttribute(BASE_TOP_ATTR))
        : (() => {
          const parsed = px(node.style.top);
          if (parsed == null) return null;
          node.setAttribute(BASE_TOP_ATTR, String(parsed));
          return parsed;
        })();
      if (baseTop == null) return;
      const nextTop = baseTop + offset;
      node.style.top = `${nextTop}px`;
      const nodeH = Math.ceil(node.getBoundingClientRect().height || node.offsetHeight || 0);
      maxBottom = Math.max(maxBottom, nextTop + nodeH);
      shifted += 1;
    });
    if (shifted > 0) {
      const baseHeight = container.hasAttribute(BASE_HEIGHT_ATTR)
        ? Number(container.getAttribute(BASE_HEIGHT_ATTR))
        : (() => {
          const parsed = px(container.style.height);
          if (parsed == null) return null;
          container.setAttribute(BASE_HEIGHT_ATTR, String(parsed));
          return parsed;
        })();
      const targetHeight = Math.max(
        baseHeight != null ? baseHeight + offset : 0,
        maxBottom + 8
      );
      if (targetHeight > 0) container.style.height = `${targetHeight}px`;

      const baseMinHeight = container.hasAttribute(BASE_MIN_HEIGHT_ATTR)
        ? Number(container.getAttribute(BASE_MIN_HEIGHT_ATTR))
        : (() => {
          const parsed = px(container.style.minHeight);
          if (parsed == null) return null;
          container.setAttribute(BASE_MIN_HEIGHT_ATTR, String(parsed));
          return parsed;
        })();
      const nextMinHeight = Math.max(baseMinHeight != null ? baseMinHeight : 0, targetHeight);
      if (nextMinHeight > 0) container.style.minHeight = `${nextMinHeight}px`;
    }
  }

  function ensureItem() {
    const container = listContainer();
    if (!container) return;
    let item = document.getElementById(ITEM_ID);
    if (item && item.getAttribute('data-zalous-email-item') !== '1') {
      try { item.remove(); } catch (_) {}
      item = null;
    }
    if (!item) item = createItem();
    if (item.parentElement !== container) container.prepend(item);
    if (container.firstElementChild !== item) container.prepend(item);
    shift(container);
    syncItemState();
  }

  function restoreListLayout() {
    const container = listContainer();
    if (!container) return;
    const item = document.getElementById(ITEM_ID);
    if (item && item.parentElement) item.remove();
    Array.from(container.children).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const baseTop = node.getAttribute(BASE_TOP_ATTR);
      if (baseTop != null) node.style.top = `${baseTop}px`;
      node.removeAttribute(BASE_TOP_ATTR);
    });
    const baseHeight = container.getAttribute(BASE_HEIGHT_ATTR);
    if (baseHeight != null) container.style.height = `${baseHeight}px`;
    else container.style.height = '';
    container.removeAttribute(BASE_HEIGHT_ATTR);
    const baseMinHeight = container.getAttribute(BASE_MIN_HEIGHT_ATTR);
    if (baseMinHeight != null) container.style.minHeight = `${baseMinHeight}px`;
    else container.style.minHeight = '';
    container.removeAttribute(BASE_MIN_HEIGHT_ATTR);
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
    if (!main) return;
  }

  function restoreSiblingPanels() {
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

  function promptTagInput(currentTags) {
    const base = Array.isArray(currentTags) ? currentTags.join(', ') : '';
    const input = window.prompt('Nhap tag (tach bang dau phay):', base);
    if (input == null) return null;
    return input.split(',').map((x) => x.trim()).filter(Boolean);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth || !cur) {
        cur = next;
      } else {
        lines.push(cur);
        cur = w;
      }
    });
    if (cur) lines.push(cur);
    const out = (typeof maxLines === 'number' && maxLines > 0) ? lines.slice(0, maxLines) : lines;
    out.forEach((line, idx) => ctx.fillText(line, x, y + idx * lineHeight));
    return out.length;
  }

  async function makeMailSnapshotBlob(detail) {
    if (!detail) throw new Error('No selected mail.');
    const w = 1120;
    const h = 700;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create canvas context.');
    const accent = getComputedStyle(state.shell || document.documentElement).getPropertyValue('--zmail-accent').trim() || '#2563eb';
    const bg = getComputedStyle(state.shell || document.documentElement).getPropertyValue('--zmail-bg-a').trim() || '#f8fbff';
    const surface = getComputedStyle(state.shell || document.documentElement).getPropertyValue('--zmail-surface').trim() || '#ffffff';
    const text = getComputedStyle(state.shell || document.documentElement).getPropertyValue('--zmail-text').trim() || '#0f172a';
    const muted = getComputedStyle(state.shell || document.documentElement).getPropertyValue('--zmail-text-muted').trim() || '#64748b';
    const tags = mailTags(state.currentFolder, detail.uid);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = surface;
    ctx.fillRect(36, 36, w - 72, h - 72);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.fillStyle = accent;
    ctx.font = '700 28px Segoe UI';
    ctx.fillText('Mail Snapshot', 64, 86);
    ctx.font = '600 15px Segoe UI';
    ctx.fillText(`Share target: Nguyen Bui / Bui Nguyen | ${dateText(new Date().toISOString())}`, 64, 114);

    ctx.fillStyle = text;
    ctx.font = '700 28px Segoe UI';
    drawWrappedText(ctx, detail.subject || '(No subject)', 64, 168, w - 128, 34, 2);

    ctx.fillStyle = muted;
    ctx.font = '600 15px Segoe UI';
    ctx.fillText(`From: ${detail.from || '--'}`, 64, 240);
    ctx.fillText(`To: ${detail.to || '--'}`, 64, 268);
    ctx.fillText(`Date: ${dateText(detail.date)}`, 64, 296);

    let tagX = 64;
    const tagY = 326;
    tags.forEach((tag) => {
      const label = `#${tag}`;
      ctx.font = '700 13px Segoe UI';
      const tw = Math.ceil(ctx.measureText(label).width) + 20;
      ctx.fillStyle = accent;
      ctx.fillRect(tagX, tagY, tw, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, tagX + 10, tagY + 18);
      tagX += tw + 8;
    });

    ctx.fillStyle = text;
    ctx.font = '500 16px Segoe UI';
    const body = String(detail.text || detail.body || '').replace(/\s+/g, ' ').trim();
    drawWrappedText(ctx, body || '(Empty body preview)', 64, 388, w - 128, 26, 10);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Failed to encode snapshot image.'));
        else resolve(blob);
      }, 'image/png');
    });
  }

  function findShareConversation() {
    const names = ['nguyen bui', 'bui nguyen'];
    const candidates = Array.from(document.querySelectorAll('.msg-item,[class*=\"conversation\"],[class*=\"chat-item\"]'));
    return candidates.find((el) => {
      const text = String(el.textContent || '').toLowerCase();
      return names.some((n) => text.includes(n));
    }) || null;
  }

  function tryAttachViaFileInput(file) {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const target = inputs.find((el) => {
      const accept = String(el.getAttribute('accept') || '').toLowerCase();
      const cls = String(el.className || '').toLowerCase();
      return accept.includes('image') || accept.includes('*/*') || cls.includes('attach') || cls.includes('file');
    }) || null;
    if (!target || typeof DataTransfer !== 'function') return false;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      target.files = dt.files;
      target.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function tryAttachViaPaste(file) {
    const composer = document.querySelector('[contenteditable="true"], textarea');
    if (!composer) return false;
    try {
      if (typeof DataTransfer !== 'function') return false;
      const dt = new DataTransfer();
      dt.items.add(file);
      const ev = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      Object.defineProperty(ev, 'clipboardData', { value: dt });
      composer.dispatchEvent(ev);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function shareSelectedMailAsImage() {
    const detail = state.selectedMessage;
    if (!detail) {
      state.notice = 'No selected mail to share.';
      render(false);
      return;
    }

    const conv = findShareConversation();
    if (!conv) {
      throw new Error('Khong tim thay chat Nguyen Bui/Bui Nguyen.');
    }
    try { conv.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));

    const blob = await makeMailSnapshotBlob(detail);
    const file = new File([blob], `mail-snapshot-${Date.now()}.png`, { type: 'image/png' });
    const viaFileInput = tryAttachViaFileInput(file);
    const viaPaste = viaFileInput ? false : tryAttachViaPaste(file);
    if (!viaFileInput && !viaPaste) {
      if (navigator.clipboard && typeof window.ClipboardItem === 'function') {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        state.notice = 'Khong auto-attach duoc; da copy anh vao clipboard trong chat Nguyen Bui/Bui Nguyen.';
      } else {
        throw new Error('Khong tim thay luong attach/forward file cua Zalo.');
      }
    } else {
      state.notice = 'Da dua anh vao composer chat Nguyen Bui/Bui Nguyen qua luong attach file.';
    }
    render(false);
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
        if (a === 'tag-mail') {
          const uid = state.selectedUid || (state.selectedMessage && state.selectedMessage.uid) || '';
          if (uid) {
            const nextTags = promptTagInput(mailTags(state.currentFolder, uid));
            if (nextTags) {
              setMailTags(state.currentFolder, uid, nextTags);
              state.notice = nextTags.length ? `Updated ${nextTags.length} tag(s).` : 'Cleared tags.';
              render(false);
            }
          }
        }
        if (a === 'share-mail-image') {
          shareSelectedMailAsImage().catch((err) => {
            state.notice = err && err.message ? err.message : 'Cannot share mail image.';
            render(false);
          });
        }
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

    if (!state.pinTimer) {
      state.pinTimer = setInterval(() => {
        try { ensureItem(); } catch (_) {}
      }, 1500);
    }

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
    if (state.pinTimer) {
      try { clearInterval(state.pinTimer); } catch (_) {}
      state.pinTimer = null;
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

