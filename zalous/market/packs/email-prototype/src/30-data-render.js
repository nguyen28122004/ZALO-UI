  function cacheFor(folder) {
    if (!state.folderCache[folder]) {
      state.folderCache[folder] = { uids: [], pages: {}, details: {} };
    }
    return state.folderCache[folder];
  }

  async function ensureImap(reset) {
    const conf = cfg();
    state.pageSize = conf.pageSize;
    state.onlyUnread = conf.onlyUnread;
    state.starredByFolder = (conf.starredByFolder && typeof conf.starredByFolder === 'object') ? conf.starredByFolder : {};

    const bridgeReady = hasImapBridge();
    if (bridgeReady && (!conf.imapHost || !conf.username || !conf.password)) {
      throw new Error('Missing IMAP host / username / password. Open Config to fill mailbox credentials.');
    }

    if (reset && state.imap) {
      try { await state.imap.close(); } catch (_) {}
      state.imap = null;
      state.connected = false;
    }
    if (state.imap && state.connected) return state.imap;

    state.imapMode = bridgeReady ? 'imap' : 'demo';
    state.imap = bridgeReady ? new ImapClient(conf) : new DemoImapClient();
    await state.imap.connect();
    state.connected = true;
    if (!bridgeReady) {
      state.notice = 'Demo mailbox active (Node IMAP bridge unavailable in this runtime).';
      state.error = '';
    }
    return state.imap;
  }

  async function loadFolders(refresh) {
    const client = await ensureImap(refresh);
    if (state.folders.length && !refresh) return;

    const list = await client.list();
    const rich = [];
    for (const f of list) {
      try {
        rich.push(Object.assign({}, f, await client.status(f.name)));
      } catch (_) {
        rich.push(Object.assign({}, f, { messages: 0, unseen: 0, recent: 0 }));
      }
    }

    state.folders = rich.sort((a, b) => {
      if (/inbox/i.test(a.name)) return -1;
      if (/inbox/i.test(b.name)) return 1;
      return String(a.name).localeCompare(String(b.name));
    });

    state.folderMap = state.folders.reduce((acc, x) => {
      acc[x.name] = x;
      return acc;
    }, {});

    if (!state.folderMap[state.currentFolder]) {
      const fallback = state.folders.find((x) => /inbox/i.test(x.name)) || state.folders[0] || { name: 'INBOX' };
      state.currentFolder = fallback.name;
    }
  }

  async function loadFolder(folder, page, refresh) {
    const client = await ensureImap(false);
    const name = folder || state.currentFolder;
    const cache = cacheFor(name);

    if (refresh) {
      cache.uids = [];
      cache.pages = {};
      cache.details = {};
    }

    await client.select(name);
    state.currentFolder = name;

    if (!cache.uids.length) cache.uids = await client.search();

    const totalPages = Math.max(1, Math.ceil(cache.uids.length / state.pageSize));
    state.page = Math.max(1, Math.min(totalPages, page || 1));

    const from = (state.page - 1) * state.pageSize;
    const to = state.page * state.pageSize;
    const slice = cache.uids.slice(from, to);

    if (!cache.pages[state.page]) cache.pages[state.page] = await client.page(slice);

    const rows = cache.pages[state.page];
    if (!state.selectedUid || !rows.some((x) => x.uid === state.selectedUid)) {
      state.selectedUid = rows[0] ? rows[0].uid : '';
    }

    if (state.selectedUid) await loadMessage(name, state.selectedUid, false);
    else state.selectedMessage = null;
  }

  async function loadMessage(folder, uid, refresh) {
    if (!uid) return;
    const conf = cfg();
    const cache = cacheFor(folder || state.currentFolder);
    if (!cache.details[uid] || refresh) {
      cache.details[uid] = await (await ensureImap(false)).message(uid, conf.previewBytes);
    }
    state.selectedUid = uid;
    state.selectedMessage = cache.details[uid];
  }

  function filteredRows() {
    const rows = cacheFor(state.currentFolder).pages[state.page] || [];
    const qv = state.query.trim().toLowerCase();
    return rows.filter((x) => {
      const unreadOk = !state.onlyUnread || !x.flags.includes('\\Seen');
      const queryOk = !qv || [x.from, x.subject, x.to].join(' ').toLowerCase().includes(qv);
      return unreadOk && queryOk;
    });
  }

  function totalStarred() {
    return Object.values(state.starredByFolder || {}).reduce((acc, list) => acc + (Array.isArray(list) ? list.length : 0), 0);
  }

  function syncItemState() {
    const item = document.getElementById(ITEM_ID);
    if (item) item.setAttribute('data-active', state.active ? '1' : '0');
  }

  function render(showSettings) {
    if (!state.shell) return;
    applyThemePalette();

    const folder = state.folderMap[state.currentFolder] || { label: state.currentFolder, messages: 0, unseen: 0, recent: 0 };
    const cache = cacheFor(state.currentFolder);
    const total = cache.uids.length || 0;
    const pages = Math.max(1, Math.ceil(total / state.pageSize) || 1);

    const chip = state.error
      ? `<span class="mail-chip err">${esc(state.error)}</span>`
      : state.imapMode === 'demo'
        ? '<span class="mail-chip">Demo mailbox</span>'
      : state.connected
        ? '<span class="mail-chip ok">IMAP connected</span>'
        : '<span class="mail-chip">Disconnected</span>';

    const foldersHtml = state.folders.length
      ? state.folders.map((f) => {
        const pathText = f.delimiter && f.name.includes(f.delimiter)
          ? f.name.split(f.delimiter).join(' / ')
          : f.name;
        return `<button class="mail-folder ${f.name === state.currentFolder ? 'active' : ''}" data-folder="${esc(f.name)}"><span><div><strong>${esc(f.label || f.name)}</strong></div><div class="mail-folder-path">${esc(pathText)}</div><div class="mail-muted">${Number(f.messages) || 0} mails | unseen ${Number(f.unseen) || 0}</div></span><span class="mail-badge">${Number(f.unseen) || 0}</span></button>`;
      }).join('')
      : '<div class="mail-empty">No folder loaded.</div>';

    const rows = filteredRows();
    const rowsHtml = rows.length
      ? rows.map((m) => `<button class="mail-row ${m.uid === state.selectedUid ? 'active' : ''}" data-uid="${esc(m.uid)}"><div class="mail-row-top"><div class="mail-row-from">${isStarred(state.currentFolder, m.uid) ? '★ ' : ''}${esc(m.from || '--')}</div><div class="mail-row-date">${esc(dateText(m.date))}</div></div><div class="mail-subject">${esc(m.subject || '(No subject)')}</div><div class="mail-preview">To: ${esc(m.to || '--')}</div><div class="mail-row-meta">${m.flags.includes('\\Seen') ? 'Seen' : 'Unread'} | ${esc(bytesText(m.size))} | UID ${esc(m.uid)}</div></button>`).join('')
      : '<div class="mail-empty">No mail in current page/filter.</div>';

    state.shell.innerHTML = `
      <div class="mail-app">
        ${renderFolderPanel(chip, foldersHtml)}
        ${renderListPanel(folder, total, pages, rowsHtml)}
        ${renderDetailPanel(chip, showSettings)}
      </div>`;
  }

  function setBusy(on, msg) {
    state.busy = !!on;
    if (msg != null) state.notice = msg;
    render(false);
  }

  function setErr(msg) {
    state.error = String(msg || '');
    if (state.error) state.notice = '';
    render(false);
  }

  async function refreshAll(reset) {
    try {
      setBusy(true, 'Connecting to IMAP and syncing mailbox...');
      await loadFolders(reset);
      await loadFolder(state.currentFolder, 1, true);
      state.error = '';
      setBusy(false, `Loaded ${state.currentFolder}.`);
    } catch (e) {
      state.connected = false;
      setBusy(false, '');
      setErr(e && e.message ? e.message : String(e));
    }
  }

  async function openFolder(name) {
    try {
      setBusy(true, `Opening folder ${name}...`);
      await loadFolder(name, 1, false);
      state.error = '';
      setBusy(false, `Viewing ${name}.`);
    } catch (e) {
      setBusy(false, '');
      setErr(e && e.message ? e.message : String(e));
    }
  }

  async function openPage(p) {
    try {
      setBusy(true, 'Changing page...');
      await loadFolder(state.currentFolder, p, false);
      state.error = '';
      setBusy(false, `Page ${state.page}.`);
    } catch (e) {
      setBusy(false, '');
      setErr(e && e.message ? e.message : String(e));
    }
  }

  async function openMail(uid) {
    try {
      setBusy(true, `Loading email ${uid}...`);
      await loadMessage(state.currentFolder, uid, false);
      state.error = '';
      setBusy(false, `Reading UID ${uid}.`);
    } catch (e) {
      setBusy(false, '');
      setErr(e && e.message ? e.message : String(e));
    }
  }

  function saveSettings() {
    const next = cfg();
    state.shell.querySelectorAll('[data-cfg]').forEach((n) => {
      next[n.getAttribute('data-cfg')] = n.value;
    });
    state.shell.querySelectorAll('[data-cfg-check]').forEach((n) => {
      next[n.getAttribute('data-cfg-check')] = !!n.checked;
    });

    next.imapPort = Number(next.imapPort) || defaults.imapPort;
    next.smtpPort = Number(next.smtpPort) || defaults.smtpPort;
    next.pageSize = Math.max(5, Math.min(100, Number(next.pageSize) || defaults.pageSize));
    next.previewBytes = Math.max(4096, Math.min(262144, Number(next.previewBytes) || defaults.previewBytes));
    next.starredByFolder = state.starredByFolder;

    zalous.setConfig(next);
    state.pageSize = next.pageSize;
    state.onlyUnread = !!next.onlyUnread;
    state.starredByFolder = (next.starredByFolder && typeof next.starredByFolder === 'object') ? next.starredByFolder : {};
    state.folderCache = {};
    state.notice = `Saved local config. Starred mails: ${totalStarred()}. Click Refresh mailbox to reload data.`;
    state.error = '';
    render(false);
  }
