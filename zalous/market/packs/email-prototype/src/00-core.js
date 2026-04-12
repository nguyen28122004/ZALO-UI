(() => {
  if (window.__zalousEmailPrototypeCleanup) {
    try { window.__zalousEmailPrototypeCleanup(); } catch (_) {}
  }

  const ITEM_ID = 'zalous-email-prototype-item';
  const STYLE_ID = 'zalous-email-prototype-style';
  const MAIN_MARKER = 'zalous-email-prototype-main';
  const PINNED_HEIGHT = 78;
  const PINNED_EXTRA_OFFSET = 20;
  const BASE_TOP_ATTR = 'data-zalous-email-base-top';
  const BASE_HEIGHT_ATTR = 'data-zalous-email-base-height';
  const BASE_MIN_HEIGHT_ATTR = 'data-zalous-email-base-min-height';
  const ACTIVE_ATTR = 'data-zalous-email-active';
  const EXT_NAME = 'email-prototype.js';

  function safeRequire(mod) {
    try {
      const req = typeof require === 'function'
        ? require
        : (typeof window.require === 'function' ? window.require : null);
      if (!req) return null;
      return req(mod);
    } catch (_) {
      return null;
    }
  }

  const tls = safeRequire('tls');
  const net = safeRequire('net');
  const BufferRef = (safeRequire('buffer') || {}).Buffer || null;

  const defaults = {
    imapHost: '',
    imapPort: 993,
    imapSsl: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSsl: true,
    username: '',
    password: '',
    pageSize: 20,
    previewBytes: 65536,
    allowSelfSigned: false,
    onlyUnread: false,
    bridgeUrl: 'http://127.0.0.1:3921',
    starredByFolder: {},
    tagsByMail: {}
  };

  const state = {
    active: false,
    shell: null,
    main: null,
    mainSnapshotNodes: [],
    mainSiblingsHidden: [],
    notice: '',
    error: '',
    busy: false,
    folders: [],
    folderMap: {},
    folderCache: {},
    currentFolder: 'INBOX',
    page: 1,
    pageSize: defaults.pageSize,
    query: '',
    selectedUid: '',
    selectedMessage: null,
    connected: false,
    imapMode: 'imap',
    imap: null,
    observer: null,
    pinTimer: null,
    themeObserver: null,
    removeFns: [],
    view: 'mail',
    onlyUnread: false,
    themeKey: '',
    themeShell: null,
    themePaletteSig: '',
    starredByFolder: {},
    tagsByMail: {}
  };

  zalous.registerConfig({
    title: 'Email Prototype Config',
    description: 'Local IMAP config for the Mail workspace tab. Data is stored in local Zalous config only.',
    fields: [
      { key: 'imapHost', label: 'IMAP Host', type: 'text', placeholder: 'mail.example.com' },
      { key: 'imapPort', label: 'IMAP Port', type: 'number', min: 1, max: 65535, default: 993 },
      { key: 'imapSsl', label: 'IMAP SSL', type: 'checkbox', default: true },
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'mail.example.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'number', min: 1, max: 65535, default: 465 },
      { key: 'smtpSsl', label: 'SMTP SSL', type: 'checkbox', default: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'you@example.com' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Mailbox password' },
      { key: 'pageSize', label: 'Emails per page', type: 'number', min: 5, max: 100, default: 20 },
      { key: 'previewBytes', label: 'Body preview bytes', type: 'number', min: 4096, max: 262144, step: 1024, default: 65536 },
      { key: 'allowSelfSigned', label: 'Allow self-signed certificate', type: 'checkbox', default: false },
      { key: 'onlyUnread', label: 'Only unread by default', type: 'checkbox', default: false },
      { key: 'bridgeUrl', label: 'Bridge URL (HTTP IMAP fallback)', type: 'text', placeholder: 'http://127.0.0.1:3921' }
    ]
  });

  function localCfgFallback() {
    try {
      const raw = localStorage.getItem('zalous.config.v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const ext = parsed && parsed.extensionConfigs ? parsed.extensionConfigs[EXT_NAME] : null;
      return ext && typeof ext === 'object' ? ext : {};
    } catch (_) {
      return {};
    }
  }

  function cfg() {
    const fromApi = zalous.getConfig(defaults) || {};
    const fromLocal = localCfgFallback();
    const raw = Object.assign({}, fromLocal, fromApi);
    const localHost = String(fromLocal.imapHost || '').trim();
    const localUser = String(fromLocal.username || '').trim();
    const localPass = String(fromLocal.password || '').trim();
    if (localHost) raw.imapHost = localHost;
    if (localUser) raw.username = localUser;
    if (localPass) raw.password = localPass;
    raw.bridgeUrl = String(fromApi.bridgeUrl || '').trim()
      || String(fromLocal.bridgeUrl || '').trim()
      || defaults.bridgeUrl;
    const next = Object.assign({}, defaults, raw);
    next.imapPort = Number(next.imapPort) || defaults.imapPort;
    next.smtpPort = Number(next.smtpPort) || defaults.smtpPort;
    next.pageSize = Math.max(5, Math.min(100, Number(next.pageSize) || defaults.pageSize));
    next.previewBytes = Math.max(4096, Math.min(262144, Number(next.previewBytes) || defaults.previewBytes));
    next.imapSsl = next.imapSsl !== false;
    next.smtpSsl = next.smtpSsl !== false;
    next.allowSelfSigned = !!next.allowSelfSigned;
    next.onlyUnread = !!next.onlyUnread;
    next.bridgeUrl = String(next.bridgeUrl || defaults.bridgeUrl).trim() || defaults.bridgeUrl;
    next.starredByFolder = (next.starredByFolder && typeof next.starredByFolder === 'object') ? next.starredByFolder : {};
    next.tagsByMail = (next.tagsByMail && typeof next.tagsByMail === 'object') ? next.tagsByMail : {};
    return next;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function px(v) {
    if (typeof v !== 'string' || !v.trim().toLowerCase().endsWith('px')) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function dateText(v) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v || '--');
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  function bytesText(v) {
    const n = Number(v) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  function listContainer() {
    const byConversationList = document.querySelector('#conversationList .ReactVirtualized__Grid__innerScrollContainer');
    if (byConversationList) return byConversationList;
    const byVirtualized = document.querySelector('.virtualized-scroll .ReactVirtualized__Grid__innerScrollContainer');
    if (byVirtualized) return byVirtualized;
    const first = document.querySelector('.msg-item');
    return first && first.parentElement ? first.parentElement : null;
  }

  function activeThemeKey() {
    try {
      const st = zalous.getState();
      const cfgState = st && st.config ? st.config : {};
      return String(cfgState.activeTheme || '');
    } catch (_) {
      return '';
    }
  }

  function getFolderKey(folder) {
    return String(folder || state.currentFolder || 'INBOX');
  }

  function starredSet(folder) {
    const key = getFolderKey(folder);
    if (!state.starredByFolder[key]) state.starredByFolder[key] = [];
    return new Set((state.starredByFolder[key] || []).map((x) => String(x)));
  }

  function isStarred(folder, uid) {
    if (!uid) return false;
    return starredSet(folder).has(String(uid));
  }

  function persistStarred() {
    const next = cfg();
    next.starredByFolder = state.starredByFolder;
    next.tagsByMail = state.tagsByMail;
    zalous.setConfig(next);
  }

  function toggleStar(folder, uid) {
    if (!uid) return;
    const key = getFolderKey(folder);
    const set = starredSet(key);
    if (set.has(String(uid))) set.delete(String(uid));
    else set.add(String(uid));
    state.starredByFolder[key] = [...set];
    persistStarred();
  }

  function mailTagKey(folder, uid) {
    return `${getFolderKey(folder)}::${String(uid || '')}`;
  }

  function mailTags(folder, uid) {
    const key = mailTagKey(folder, uid);
    const list = state.tagsByMail[key];
    return Array.isArray(list)
      ? list.map((x) => String(x).trim()).filter(Boolean)
      : [];
  }

  function setMailTags(folder, uid, nextTags) {
    const key = mailTagKey(folder, uid);
    const clean = Array.from(new Set((Array.isArray(nextTags) ? nextTags : []).map((x) => String(x).trim()).filter(Boolean))).slice(0, 8);
    if (clean.length) state.tagsByMail[key] = clean;
    else delete state.tagsByMail[key];
    persistStarred();
  }
