// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source modules are in ./src/*.js

// ===== 00-core.js =====
(() => {
  if (window.__zalousEmailPrototypeCleanup) {
    try { window.__zalousEmailPrototypeCleanup(); } catch (_) {}
  }

  const ITEM_ID = 'zalous-email-prototype-item';
  const STYLE_ID = 'zalous-email-prototype-style';
  const MAIN_MARKER = 'zalous-email-prototype-main';
  const PINNED_HEIGHT = 78;
  const BASE_TOP_ATTR = 'data-zalous-email-base-top';
  const BASE_HEIGHT_ATTR = 'data-zalous-email-base-height';
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
    starredByFolder: {}
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
    starredByFolder: {}
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

// ===== 10-style.js =====
  function ensureStyle() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      `#${ITEM_ID}{cursor:pointer;position:relative;left:0;top:0;width:100%;height:${PINNED_HEIGHT}px;z-index:3;box-sizing:border-box;padding:10px 14px 10px 20px;}`,
      `#${ITEM_ID} .mail-pin{height:100%;padding:10px 14px 10px 18px;border-radius:16px;border:1px solid var(--zmail-accent-soft,rgba(37,99,235,.18));background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.14)),rgba(14,165,233,.08));display:flex;flex-direction:column;justify-content:center;gap:3px;}`,
      `#${ITEM_ID}[data-active="1"] .mail-pin{background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.24)),rgba(14,165,233,.16));border-color:var(--zmail-accent-soft,rgba(37,99,235,.34));}`,
      `#${ITEM_ID} .mail-pin-k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;}#${ITEM_ID} .mail-pin-t{font-size:14px;font-weight:700;}#${ITEM_ID} .mail-pin-p{font-size:12px;opacity:.78;}`,
      `.${MAIN_MARKER}{height:100%;padding:16px;box-sizing:border-box;background:linear-gradient(180deg,var(--zmail-bg-a,#f8fbff),var(--zmail-bg-b,#eef4ff));font-family:"Segoe UI",Tahoma,sans-serif;color:var(--zmail-text,var(--text-primary,#0f172a));min-width:0;}`,
      `.${MAIN_MARKER} *{box-sizing:border-box;} .${MAIN_MARKER} .mail-app{display:grid;grid-template-columns:minmax(220px,1fr) minmax(320px,1.35fr) minmax(360px,1.55fr);gap:14px;height:100%;min-width:0;align-items:stretch;}`,
      `.${MAIN_MARKER} .mail-card{background:var(--zmail-surface,var(--layer-background,#fff));border:1px solid var(--zmail-border,rgba(148,163,184,.24));border-radius:20px;box-shadow:0 18px 36px var(--zmail-shadow,rgba(15,23,42,.08));display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;}`,
      `.${MAIN_MARKER} .mail-head{padding:16px 18px 12px;border-bottom:1px solid var(--zmail-border,rgba(148,163,184,.18));display:flex;justify-content:space-between;gap:10px;align-items:flex-start;min-width:0;flex-wrap:wrap;} .${MAIN_MARKER} .mail-body{padding:14px 16px;overflow:auto;min-height:0;min-width:0;}`,
      `.${MAIN_MARKER} .mail-brand{font-size:20px;font-weight:700;line-height:1.15;} .${MAIN_MARKER} .mail-muted{color:var(--zmail-text-muted,var(--text-secondary,#64748b));font-size:12px;} .${MAIN_MARKER} .mail-chip{padding:6px 10px;border-radius:999px;background:var(--zmail-accent-soft,rgba(37,99,235,.13));color:var(--zmail-accent,#1d4ed8);font-size:12px;font-weight:700;white-space:nowrap;}`,
      `.${MAIN_MARKER} .mail-chip.err{background:#fee2e2;color:#b91c1c;} .${MAIN_MARKER} .mail-chip.ok{background:#dcfce7;color:#047857;} .${MAIN_MARKER} .mail-tools{display:flex;gap:8px;flex-wrap:wrap;min-width:0;}`,
      `.${MAIN_MARKER} .mail-btn{border:none;border-radius:12px;padding:9px 12px;background:#e2e8f0;color:var(--zmail-text,var(--text-primary,#0f172a));font-size:12px;font-weight:700;cursor:pointer;max-width:100%;} .${MAIN_MARKER} .mail-btn.pri{background:var(--zmail-accent,#2563eb);color:#fff;} .${MAIN_MARKER} .mail-btn.ghost{background:var(--zmail-surface,var(--layer-background,#fff));border:1px solid var(--zmail-border,rgba(148,163,184,.28));} .${MAIN_MARKER} .mail-btn:disabled{opacity:.55;cursor:wait;}`,
      `.${MAIN_MARKER} .mail-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;} .${MAIN_MARKER} .mail-metric{padding:12px;border-radius:14px;background:var(--zmail-surface-2,#f8fafc);border:1px solid var(--zmail-border,rgba(148,163,184,.16));min-width:0;} .${MAIN_MARKER} .mail-metric strong{display:block;font-size:18px;line-height:1.1;}`,
      `.${MAIN_MARKER} .mail-folder-list,.${MAIN_MARKER} .mail-list{display:flex;flex-direction:column;gap:8px;min-width:0;} .${MAIN_MARKER} .mail-folder,.${MAIN_MARKER} .mail-row{padding:12px 14px;border-radius:16px;background:var(--zmail-surface,var(--layer-background,#fff));border:1px solid var(--zmail-border,rgba(148,163,184,.18));cursor:pointer;min-width:0;text-align:left;}`,
      `.${MAIN_MARKER} .mail-folder.active,.${MAIN_MARKER} .mail-row.active{background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.12)),rgba(14,165,233,.08));border-color:var(--zmail-accent-soft,rgba(37,99,235,.34));} .${MAIN_MARKER} .mail-folder{display:flex;justify-content:space-between;gap:8px;align-items:center;} .${MAIN_MARKER} .mail-badge{min-width:26px;height:26px;border-radius:999px;background:var(--zmail-accent-soft,rgba(37,99,235,.12));color:var(--zmail-accent,#1d4ed8);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:0 0 auto;}`,
      `.${MAIN_MARKER} .mail-folder-path{font-size:11px;color:var(--zmail-text-muted,#94a3b8);margin-top:2px;word-break:break-word;} .${MAIN_MARKER} .mail-search{width:100%;height:38px;border:1px solid var(--zmail-border,rgba(148,163,184,.3));border-radius:12px;padding:0 12px;background:var(--zmail-surface,var(--layer-background,#fff));margin-bottom:10px;min-width:0;}`,
      `.${MAIN_MARKER} .mail-row-top{display:flex;justify-content:space-between;gap:10px;min-width:0;} .${MAIN_MARKER} .mail-row-from{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .${MAIN_MARKER} .mail-row-date,.${MAIN_MARKER} .mail-row-meta{font-size:11px;color:var(--zmail-text-muted,#64748b);flex:0 0 auto;}`,
      `.${MAIN_MARKER} .mail-subject{font-size:13px;font-weight:700;margin-top:4px;word-break:break-word;} .${MAIN_MARKER} .mail-preview{font-size:12px;color:var(--zmail-text-muted,#64748b);margin-top:4px;line-height:1.4;word-break:break-word;} .${MAIN_MARKER} .mail-pager{padding:12px 16px;border-top:1px solid var(--zmail-border,rgba(148,163,184,.18));display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--zmail-text-muted,#475569);flex-wrap:wrap;}`,
      `.${MAIN_MARKER} .mail-detail-subject{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:12px;word-break:break-word;} .${MAIN_MARKER} .mail-grid{display:grid;grid-template-columns:minmax(92px,110px) minmax(0,1fr);gap:8px 12px;font-size:12px;margin-bottom:16px;} .${MAIN_MARKER} .mail-grid div:nth-child(odd){color:var(--zmail-text-muted,#64748b);}`,
      `.${MAIN_MARKER} .mail-text{white-space:pre-wrap;line-height:1.6;font-size:13px;color:var(--zmail-text,#1e293b);padding:18px;border-radius:16px;background:var(--zmail-surface,var(--layer-background,#fff));border:1px solid var(--zmail-border,rgba(148,163,184,.16));word-break:break-word;overflow-wrap:anywhere;} .${MAIN_MARKER} .mail-empty{padding:32px 18px;color:var(--zmail-text-muted,#64748b);text-align:center;}`,
      `.${MAIN_MARKER} .mail-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;} .${MAIN_MARKER} .mail-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--zmail-text,var(--text-primary,#334155));min-width:0;} .${MAIN_MARKER} .mail-form input{height:38px;border:1px solid var(--zmail-border,rgba(148,163,184,.3));border-radius:12px;padding:0 12px;background:var(--zmail-surface,var(--layer-background,#fff));min-width:0;color:var(--zmail-text,var(--text-primary,#0f172a));} .${MAIN_MARKER} .mail-form .full{grid-column:1/-1;} .${MAIN_MARKER} .mail-check{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--zmail-text,var(--text-primary,#334155));flex-direction:row;}`,
      `@media (max-width:1280px){.${MAIN_MARKER} .mail-app{grid-template-columns:minmax(220px,.95fr) minmax(320px,1.2fr);grid-auto-rows:minmax(0,1fr);} .${MAIN_MARKER} .mail-card:nth-child(3){grid-column:1/-1;}}`,
      `@media (max-width:980px){.${MAIN_MARKER}{padding:12px;} .${MAIN_MARKER} .mail-app{grid-template-columns:1fr;grid-auto-rows:auto;height:auto;} .${MAIN_MARKER} .mail-card{min-height:320px;} .${MAIN_MARKER} .mail-form{grid-template-columns:1fr;} .${MAIN_MARKER} .mail-detail-subject{font-size:20px;}}`,
      `@media (max-width:640px){.${MAIN_MARKER}{padding:10px;} .${MAIN_MARKER} .mail-head,.${MAIN_MARKER} .mail-body{padding-left:12px;padding-right:12px;} .${MAIN_MARKER} .mail-metrics{grid-template-columns:1fr;} .${MAIN_MARKER} .mail-tools{width:100%;} .${MAIN_MARKER} .mail-btn{flex:1 1 140px;} .${MAIN_MARKER} .mail-row-top{flex-direction:column;gap:4px;} .${MAIN_MARKER} .mail-row-date{align-self:flex-start;}}`
    ].join('');
  }

// ===== 15-theme-palette.js =====
  function readCssVar(target, name) {
    if (!target || !name || typeof getComputedStyle !== 'function') return '';
    try {
      return String(getComputedStyle(target).getPropertyValue(name) || '').trim();
    } catch (_) {
      return '';
    }
  }

  function firstCssVar(targets, names) {
    for (const target of targets) {
      for (const name of names) {
        const value = readCssVar(target, name);
        if (value) return value;
      }
    }
    return '';
  }

  function alphaColor(value, alpha) {
    const v = String(value || '').trim();
    if (!v) return '';
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    const hex = v.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const raw = hex[1];
      const parts = raw.length === 3 || raw.length === 4
        ? raw.split('').map((ch) => parseInt(ch + ch, 16))
        : raw.length === 6 || raw.length === 8
          ? raw.match(/.{2}/g).map((pair) => parseInt(pair, 16))
          : null;
      if (!parts) return '';
      const [r, g, b] = parts;
      return `rgba(${r},${g},${b},${a})`;
    }
    const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
      const parts = rgb[1].split(',').map((x) => x.trim()).slice(0, 3);
      if (parts.length === 3) return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
    }
    return '';
  }

  function runtimeThemePalette() {
    if (!state.shell) {
      return { accent: '', accentSoft: '', bgA: '', bgB: '', text: '', textMuted: '', border: '', shadow: '', sig: '' };
    }

    const targets = [state.shell, document.documentElement, document.body].filter(Boolean);
    const accent = firstCssVar(targets, [
      '--zmail-accent',
      '--accent-blue-bg',
      '--accent-green-bg',
      '--accent-orange-bg',
      '--accent-pink-bg',
      '--accent-purple-bg',
      '--accent-grey-bg',
      '--accent-steal-bg',
      '--accent-stealblue-bg',
      '--accent-yellow-bg'
    ]);
    const accentSoft = firstCssVar(targets, [
      '--zmail-accent-soft',
      '--accent-blue-bg-subtle',
      '--accent-green-bg-subtle',
      '--accent-orange-bg-subtle',
      '--accent-pink-bg-subtle',
      '--accent-purple-bg-subtle',
      '--accent-grey-bg-subtle',
      '--accent-steal-bg-subtle',
      '--accent-stealblue-bg-subtle',
      '--accent-yellow-bg-subtle'
    ]);
    const bgA = firstCssVar(targets, [
      '--zmail-bg-a',
      '--layer-background',
      '--layer-background-subtle',
      '--layer-background-CSC',
      '--background-main',
      '--background'
    ]);
    const bgB = firstCssVar(targets, [
      '--zmail-bg-b',
      '--layer-background-subtle',
      '--layer-background-pinned',
      '--layer-background-CSC',
      '--background-subtle',
      '--background-alt'
    ]);
    const text = firstCssVar(targets, ['--text-primary', '--text-main', '--zalo-text-main']);
    const textMuted = firstCssVar(targets, ['--text-secondary', '--text-sub', '--zalo-text-sub']);
    const border = firstCssVar(targets, ['--layer-border', '--border-color', '--layer-background-selected']);
    const shadow = firstCssVar(targets, ['--shadow-color', '--layer-shadow']);
    const sig = [accent, accentSoft, bgA, bgB, text, textMuted, border, shadow].join('|');
    return { accent, accentSoft, bgA, bgB, text, textMuted, border, shadow, sig };
  }

  function resolveThemePalette(themeKey) {
    const key = String(themeKey || '').toLowerCase();
    if (key.includes('hello-kitty')) {
      return { accent: '#ec4899', accentSoft: 'rgba(236,72,153,.18)', bgA: '#fff8fc', bgB: '#ffeef8' };
    }
    if (key.includes('console-minimal')) {
      return { accent: '#22c55e', accentSoft: 'rgba(34,197,94,.18)', bgA: '#f4fbf7', bgB: '#ebf8f0' };
    }
    if (key.includes('pastel')) {
      return { accent: '#0ea5e9', accentSoft: 'rgba(14,165,233,.16)', bgA: '#f8fbff', bgB: '#eef7ff' };
    }
    if (key.includes('purple')) {
      return { accent: '#7c3aed', accentSoft: 'rgba(124,58,237,.18)', bgA: '#faf8ff', bgB: '#f2ecff' };
    }
    if (key.includes('green')) {
      return { accent: '#16a34a', accentSoft: 'rgba(22,163,74,.18)', bgA: '#f4fbf7', bgB: '#eaf8ef' };
    }
    if (key.includes('orange')) {
      return { accent: '#ea580c', accentSoft: 'rgba(234,88,12,.18)', bgA: '#fffaf5', bgB: '#fff1e6' };
    }
    if (key.includes('pink')) {
      return { accent: '#db2777', accentSoft: 'rgba(219,39,119,.18)', bgA: '#fff8fb', bgB: '#ffeef6' };
    }
    return { accent: '#2563eb', accentSoft: 'rgba(37,99,235,.18)', bgA: '#f8fbff', bgB: '#eef4ff' };
  }

  function applyThemePalette() {
    if (!state.shell) return;
    const nextKey = activeThemeKey();
    const runtime = runtimeThemePalette();
    const nextSig = `${nextKey}|${runtime.sig}`;
    if (state.themeShell === state.shell && state.themeKey === nextKey && state.themePaletteSig === nextSig) return;
    state.themeShell = state.shell;
    state.themeKey = nextKey;
    state.themePaletteSig = nextSig;

    const pal = resolveThemePalette(nextKey);
    const accent = runtime.accent || pal.accent;
    const accentSoft = runtime.accentSoft || alphaColor(accent, 0.18) || pal.accentSoft;
    const bgA = runtime.bgA || pal.bgA;
    const bgB = runtime.bgB || pal.bgB;
    const surface = runtime.bgA || pal.bgA;
    const surface2 = runtime.bgB || runtime.bgA || pal.bgB;

    state.shell.style.setProperty('--zmail-accent', accent);
    state.shell.style.setProperty('--zmail-accent-soft', accentSoft);
    state.shell.style.setProperty('--zmail-bg-a', bgA);
    state.shell.style.setProperty('--zmail-bg-b', bgB);
    state.shell.style.setProperty('--zmail-surface', surface);
    state.shell.style.setProperty('--zmail-surface-2', surface2);
    state.shell.style.setProperty('--zmail-text', runtime.text || '');
    state.shell.style.setProperty('--zmail-text-muted', runtime.textMuted || '');
    state.shell.style.setProperty('--zmail-border', runtime.border || '');
    state.shell.style.setProperty('--zmail-shadow', runtime.shadow || '');
  }

// ===== 20-imap.js =====
  function decodeWords(v) {
    if (!v) return '';
    if (!BufferRef) return String(v).replace(/\r?\n\s+/g, ' ').trim();
    return String(v)
      .replace(/\r?\n\s+/g, ' ')
      .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, data) => {
        try {
          const charset = String(cs || '').toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf8';
          if (String(enc).toUpperCase() === 'B') return BufferRef.from(String(data || ''), 'base64').toString(charset);
          const qp = String(data || '')
            .replace(/_/g, ' ')
            .replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
          return BufferRef.from(qp, 'binary').toString(charset);
        } catch (_) {
          return String(data || '');
        }
      })
      .trim();
  }

  function parseHeaders(raw) {
    const out = {};
    let cur = '';
    String(raw || '').replace(/\r/g, '').split('\n').forEach((line) => {
      if (!line) return;
      if (/^[ \t]/.test(line) && cur) {
        out[cur] += ` ${line.trim()}`;
        return;
      }
      const i = line.indexOf(':');
      if (i <= 0) return;
      cur = line.slice(0, i).trim().toLowerCase();
      const val = line.slice(i + 1).trim();
      out[cur] = out[cur] ? `${out[cur]}, ${val}` : val;
    });
    return out;
  }

  function fmtAddr(v) {
    return v ? decodeWords(String(v)).replace(/\s*</g, ' <') : '--';
  }

  function q(v) {
    return `"${String(v || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  class ImapClient {
    constructor(conf) {
      this.conf = conf;
      this.socket = null;
      this.buf = '';
      this.current = null;
      this.connected = false;
      this.seq = 1;
    }

    connect() {
      if (!tls && !net) throw new Error('Runtime khong co Node bridge de mo IMAP socket.');
      if (this.connected && this.socket) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const opts = {
          host: this.conf.imapHost,
          port: this.conf.imapPort,
          servername: this.conf.imapHost,
          rejectUnauthorized: !this.conf.allowSelfSigned
        };

        this.socket = this.conf.imapSsl ? tls.connect(opts) : net.connect(opts);
        this.socket.on('data', (chunk) => {
          this.buf += chunk.toString('utf8');
          this.pump();
        });
        this.socket.on('error', (err) => {
          if (this.current) {
            const cur = this.current;
            this.current = null;
            cur.reject(err);
          }
        });
        this.socket.on('close', () => {
          this.connected = false;
          this.socket = null;
        });

        const timer = setTimeout(() => reject(new Error('IMAP connect timeout')), 15000);

        const bootPump = () => {
          const m = this.buf.match(/^(\* .+?)\r\n/);
          if (!m) return;
          clearTimeout(timer);
          this.buf = this.buf.slice(m[0].length);
          if (!/^\* OK/i.test(m[1])) {
            reject(new Error(`IMAP greeting failed: ${m[1]}`));
            return;
          }
          this.connected = true;
          this.pump = this._pump.bind(this);
          this.cmd(`LOGIN ${q(this.conf.username)} ${q(this.conf.password)}`).then(() => resolve()).catch(reject);
        };

        this.pump = bootPump;
      });
    }

    _pump() {
      if (!this.current) return;
      const tag = this.current.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|\\r\\n)${tag} (OK|NO|BAD)([^\\r\\n]*)\\r\\n`);
      const m = re.exec(this.buf);
      if (!m) return;
      const end = m.index + m[0].length;
      const raw = this.buf.slice(0, end);
      this.buf = this.buf.slice(end);
      const cur = this.current;
      this.current = null;
      if (m[1] === 'OK') cur.resolve(raw);
      else cur.reject(new Error(`${m[1]}${m[2] || ''}`.trim()));
    }

    cmd(text) {
      if (!this.socket || !this.connected) return Promise.reject(new Error('IMAP chua ket noi.'));
      if (this.current) return Promise.reject(new Error('IMAP dang ban.'));
      const tag = `A${String(this.seq++).padStart(4, '0')}`;
      return new Promise((resolve, reject) => {
        this.current = { tag, resolve, reject };
        this.socket.write(`${tag} ${text}\r\n`, 'utf8', (err) => {
          if (err) {
            this.current = null;
            reject(err);
          }
        });
      });
    }

    async list() { return parseList(await this.cmd('LIST "" "*"')); }
    async status(name) { return parseStatus(await this.cmd(`STATUS ${q(name)} (MESSAGES UNSEEN RECENT UIDNEXT UIDVALIDITY)`), name); }
    async select(name) { await this.cmd(`SELECT ${q(name)}`); }
    async search() { return parseSearch(await this.cmd('UID SEARCH ALL')); }
    async page(uids) {
      if (!uids.length) return [];
      return parseListFetch(await this.cmd(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`));
    }
    async message(uid, bytes) {
      return parseMessage(await this.cmd(`UID FETCH ${uid} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.${bytes}>)`), uid);
    }
    async close() {
      if (!this.socket) return;
      try { if (this.connected) await this.cmd('LOGOUT'); } catch (_) {}
      try { this.socket.end(); } catch (_) {}
      this.connected = false;
      this.socket = null;
    }
  }

  function hasImapBridge() {
    return !!(
      tls && typeof tls.connect === 'function' &&
      net && typeof net.connect === 'function'
    );
  }

  function demoSeed() {
    const now = Date.now();
    return {
      INBOX: [
        {
          uid: '9003',
          from: 'Bui Nguyen <buinguyen@example.com>',
          to: 'you@example.com',
          cc: '',
          subject: 'Welcome to Zalous Mail workspace',
          date: new Date(now - 3600 * 1000).toISOString(),
          size: 14200,
          flags: [],
          messageId: '<demo-9003@zalous.local>',
          body: 'Runtime does not expose Node IMAP sockets in this build. Demo mailbox is enabled so UI remains usable.'
        },
        {
          uid: '9002',
          from: 'Build Bot <noreply@zalous.dev>',
          to: 'you@example.com',
          cc: '',
          subject: 'Theme sync check completed',
          date: new Date(now - 5 * 3600 * 1000).toISOString(),
          size: 9624,
          flags: ['\\Seen'],
          messageId: '<demo-9002@zalous.local>',
          body: 'Market and email surfaces are synced with active theme variables.'
        }
      ],
      Updates: [
        {
          uid: '9101',
          from: 'Zalous Release <release@zalous.dev>',
          to: 'you@example.com',
          cc: '',
          subject: 'Release checklist reminder',
          date: new Date(now - 24 * 3600 * 1000).toISOString(),
          size: 10311,
          flags: ['\\Seen'],
          messageId: '<demo-9101@zalous.local>',
          body: 'After validating UI through CDP, run commit + tag + publish.'
        }
      ],
      Starred: []
    };
  }

  class DemoImapClient {
    constructor() {
      this.connected = false;
      this.currentFolder = 'INBOX';
      this.db = demoSeed();
    }

    async connect() {
      this.connected = true;
    }

    async list() {
      return Object.keys(this.db).map((name) => ({
        name,
        delimiter: '/',
        label: name
      }));
    }

    async status(name) {
      const rows = this.db[name] || [];
      const unseen = rows.filter((m) => !m.flags.includes('\\Seen')).length;
      return { name, messages: rows.length, unseen, recent: 0 };
    }

    async select(name) {
      this.currentFolder = this.db[name] ? name : 'INBOX';
    }

    async search() {
      const rows = this.db[this.currentFolder] || [];
      return rows.map((m) => Number(m.uid)).filter(Number.isFinite).sort((a, b) => b - a);
    }

    async page(uids) {
      const map = new Map((this.db[this.currentFolder] || []).map((m) => [String(m.uid), m]));
      return uids
        .map((uid) => map.get(String(uid)))
        .filter(Boolean)
        .map((m) => ({
          uid: String(m.uid),
          flags: Array.isArray(m.flags) ? m.flags.slice() : [],
          size: Number(m.size) || 0,
          date: m.date || '',
          from: m.from || '--',
          to: m.to || '--',
          subject: m.subject || '(No subject)'
        }));
    }

    async message(uid) {
      const row = (this.db[this.currentFolder] || []).find((m) => String(m.uid) === String(uid));
      if (!row) throw new Error(`Demo mail UID ${uid} not found.`);
      return {
        uid: String(row.uid),
        flags: Array.isArray(row.flags) ? row.flags.slice() : [],
        size: Number(row.size) || 0,
        date: row.date || '',
        from: row.from || '--',
        to: row.to || '--',
        cc: row.cc || '--',
        subject: row.subject || '(No subject)',
        messageId: row.messageId || '',
        body: row.body || ''
      };
    }

    async close() {
      this.connected = false;
    }
  }

  class HttpImapBridgeClient {
    constructor(conf) {
      this.conf = conf || {};
      this.connected = false;
      this.currentFolder = 'INBOX';
      this.bridgeUrl = String(this.conf.bridgeUrl || 'http://127.0.0.1:3921').replace(/\/+$/, '');
      this.auth = {
        host: String(this.conf.imapHost || ''),
        port: Number(this.conf.imapPort) || 993,
        ssl: this.conf.imapSsl !== false,
        username: String(this.conf.username || ''),
        password: String(this.conf.password || '')
      };
      this._lastFolders = [];
      this._lastPageRows = [];
    }

    async req(pathname, payload) {
      const resp = await fetch(`${this.bridgeUrl}${pathname}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: this.auth, ...(payload || {}) })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Bridge ${pathname} failed: ${resp.status} ${txt}`.trim());
      }
      const data = await resp.json();
      if (!data || data.ok !== true) throw new Error((data && data.error) || `Bridge ${pathname} error.`);
      return data;
    }

    async connect() {
      await this.req('/imap/ping', {});
      this.connected = true;
    }

    async list() {
      const data = await this.req('/imap/folders', {});
      this._lastFolders = Array.isArray(data.folders) ? data.folders : [];
      return this._lastFolders.map((f) => ({
        name: f.name,
        delimiter: f.delimiter || '/',
        label: f.label || f.name
      }));
    }

    async status(name) {
      const hit = (this._lastFolders || []).find((f) => String(f.name) === String(name));
      if (hit) {
        return {
          name: hit.name,
          messages: Number(hit.messages) || 0,
          unseen: Number(hit.unseen) || 0,
          recent: Number(hit.recent) || 0
        };
      }
      return { name, messages: 0, unseen: 0, recent: 0 };
    }

    async select(name) {
      this.currentFolder = String(name || 'INBOX');
    }

    async search() {
      const data = await this.req('/imap/search', { folder: this.currentFolder });
      return Array.isArray(data.uids) ? data.uids.map(Number).filter(Number.isFinite).sort((a, b) => b - a) : [];
    }

    async page(uids) {
      const data = await this.req('/imap/page', { folder: this.currentFolder, uids: Array.isArray(uids) ? uids : [] });
      this._lastPageRows = Array.isArray(data.rows) ? data.rows : [];
      return this._lastPageRows.map((m) => ({
        uid: String(m.uid),
        flags: Array.isArray(m.flags) ? m.flags : [],
        size: Number(m.size) || 0,
        date: m.date || '',
        from: m.from || '--',
        to: m.to || '--',
        subject: m.subject || '(No subject)'
      }));
    }

    async message(uid, bytes) {
      const data = await this.req('/imap/message', { folder: this.currentFolder, uid: String(uid || ''), previewBytes: Number(bytes) || 65536 });
      const m = data.message || {};
      return {
        uid: String(m.uid || uid || ''),
        flags: Array.isArray(m.flags) ? m.flags : [],
        size: Number(m.size) || 0,
        date: m.date || '',
        from: m.from || '--',
        to: m.to || '--',
        cc: m.cc || '--',
        subject: m.subject || '(No subject)',
        messageId: m.messageId || '',
        body: String(m.body || '')
      };
    }

    async close() {
      this.connected = false;
    }
  }

  class FileImapCacheClient {
    constructor(conf) {
      this.conf = conf || {};
      this.connected = false;
      this.currentFolder = 'INBOX';
      this.cacheUrl = String(this.conf.bridgeUrl || '').trim();
      this.cache = null;
      this.cacheAt = 0;
      this.maxAgeMs = 15000;
    }

    async loadCache(force) {
      const now = Date.now();
      if (!force && this.cache && (now - this.cacheAt) < this.maxAgeMs) return this.cache;
      if (!this.cacheUrl || !/^file:\/\//i.test(this.cacheUrl)) {
        throw new Error('bridgeUrl must be a file:// URL for file cache mode.');
      }
      const url = `${this.cacheUrl}${this.cacheUrl.includes('?') ? '&' : '?'}t=${now}`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Cannot read IMAP cache file: HTTP ${resp.status}`);
      const data = await resp.json();
      if (!data || data.ok !== true) throw new Error((data && data.error) || 'Invalid IMAP cache content.');
      this.cache = data;
      this.cacheAt = now;
      return data;
    }

    folderData(name) {
      const key = String(name || this.currentFolder || 'INBOX');
      const all = (this.cache && this.cache.byFolder) || {};
      return all[key] || { uids: [], rows: {}, messages: {} };
    }

    async connect() {
      await this.loadCache(true);
      this.connected = true;
    }

    async list() {
      const data = await this.loadCache(false);
      const folders = Array.isArray(data.folders) ? data.folders : [];
      return folders.map((f) => ({
        name: f.name,
        delimiter: f.delimiter || '/',
        label: f.label || f.name
      }));
    }

    async status(name) {
      const data = await this.loadCache(false);
      const hit = (Array.isArray(data.folders) ? data.folders : []).find((f) => String(f.name) === String(name));
      if (!hit) return { name, messages: 0, unseen: 0, recent: 0 };
      return {
        name: hit.name,
        messages: Number(hit.messages) || 0,
        unseen: Number(hit.unseen) || 0,
        recent: Number(hit.recent) || 0
      };
    }

    async select(name) {
      this.currentFolder = String(name || 'INBOX');
      await this.loadCache(false);
    }

    async search() {
      await this.loadCache(false);
      return (this.folderData(this.currentFolder).uids || []).map(Number).filter(Number.isFinite).sort((a, b) => b - a);
    }

    async page(uids) {
      await this.loadCache(false);
      const rows = this.folderData(this.currentFolder).rows || {};
      return (Array.isArray(uids) ? uids : [])
        .map((uid) => rows[String(uid)])
        .filter(Boolean)
        .map((m) => ({
          uid: String(m.uid),
          flags: Array.isArray(m.flags) ? m.flags : [],
          size: Number(m.size) || 0,
          date: m.date || '',
          from: m.from || '--',
          to: m.to || '--',
          subject: m.subject || '(No subject)'
        }));
    }

    async message(uid) {
      await this.loadCache(false);
      const f = this.folderData(this.currentFolder);
      const m = (f.messages || {})[String(uid)];
      if (!m) throw new Error(`Mail UID ${uid} is not in local cache yet. Wait for bridge sync.`);
      return {
        uid: String(m.uid || uid || ''),
        flags: Array.isArray(m.flags) ? m.flags : [],
        size: Number(m.size) || 0,
        date: m.date || '',
        from: m.from || '--',
        to: m.to || '--',
        cc: m.cc || '--',
        subject: m.subject || '(No subject)',
        messageId: m.messageId || '',
        body: String(m.body || '')
      };
    }

    async close() {
      this.connected = false;
    }
  }

  function parseList(raw) {
    const out = [];
    let m;
    const re = /^\* LIST \(([^)]*)\) ("[^"]*"|NIL) (.+)$/gim;
    while ((m = re.exec(raw))) {
      const delimiter = m[2] === 'NIL' ? '' : m[2].slice(1, -1);
      let name = m[3].trim();
      if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\"/g, '"');
      out.push({ name, delimiter, label: name.split(delimiter || '/').filter(Boolean).pop() || name });
    }
    return out;
  }

  function parseStatus(raw, fallback) {
    const out = { name: fallback, messages: 0, unseen: 0, recent: 0 };
    const m = raw.match(/^\* STATUS (.+?) \(([^)]*)\)$/im);
    if (!m) return out;
    let name = m[1].trim();
    if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\"/g, '"');
    out.name = name;
    String(m[2] || '').trim().split(/\s+/).forEach((t, i, arr) => {
      const n = Number(arr[i + 1]);
      if (!Number.isFinite(n)) return;
      const k = t.toUpperCase();
      if (k === 'MESSAGES') out.messages = n;
      if (k === 'UNSEEN') out.unseen = n;
      if (k === 'RECENT') out.recent = n;
    });
    return out;
  }

  function parseSearch(raw) {
    const m = raw.match(/^\* SEARCH(.*)$/im);
    return m
      ? String(m[1] || '').trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => b - a)
      : [];
  }

  function fetchBlocks(raw) {
    const matches = [...String(raw || '').matchAll(/^\* \d+ FETCH \(/gim)];
    if (!matches.length) return [];
    return matches.map((m, i) => {
      const endAt = i + 1 < matches.length
        ? matches[i + 1].index
        : (raw.lastIndexOf('\r\nA') > m.index ? raw.lastIndexOf('\r\nA') : raw.length);
      return raw.slice(m.index, endAt).trim();
    });
  }

  function parseListFetch(raw) {
    return fetchBlocks(raw)
      .map((block) => {
        const head = parseHeaders(((block.match(/BODY\[HEADER\.FIELDS[^\]]*\] \{\d+\}\r\n([\s\S]*?)\r\n\)$/i) || [])[1]) || '');
        return {
          uid: String(Number((block.match(/UID (\d+)/i) || [])[1] || 0)),
          flags: ((((block.match(/FLAGS \(([^)]*)\)/i) || [])[1]) || '').split(/\s+/).filter(Boolean)),
          size: Number((block.match(/RFC822\.SIZE (\d+)/i) || [])[1] || 0),
          date: head.date || ((block.match(/INTERNALDATE "([^"]+)"/i) || [])[1]) || '',
          from: fmtAddr(head.from),
          to: fmtAddr(head.to),
          subject: decodeWords(head.subject) || '(No subject)'
        };
      })
      .sort((a, b) => Number(b.uid) - Number(a.uid));
  }

  function decodeQuotedPrintable(v) {
    return String(v || '')
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function parseMessage(raw, uid) {
    const block = fetchBlocks(raw)[0] || raw;
    const head = parseHeaders(((block.match(/BODY\[HEADER\.FIELDS[^\]]*\] \{\d+\}\r\n([\s\S]*?)\r\nBODY\[TEXT\]/i) || [])[1]) || '');
    const bodyRaw = ((block.match(/BODY\[TEXT\]<0> \{\d+\}\r\n([\s\S]*?)\r\n\)$/i) || [])[1]) || '';
    const decoded = /Content-Transfer-Encoding:\s*quoted-printable/i.test(bodyRaw)
      ? decodeQuotedPrintable(bodyRaw)
      : bodyRaw;
    const content = /<html[\s>]/i.test(decoded) ? stripHtml(decoded) : decoded;
    return {
      uid: String(uid),
      flags: ((((block.match(/FLAGS \(([^)]*)\)/i) || [])[1]) || '').split(/\s+/).filter(Boolean)),
      size: Number((block.match(/RFC822\.SIZE (\d+)/i) || [])[1] || 0),
      date: head.date || ((block.match(/INTERNALDATE "([^"]+)"/i) || [])[1]) || '',
      from: fmtAddr(head.from),
      to: fmtAddr(head.to),
      cc: fmtAddr(head.cc),
      subject: decodeWords(head.subject) || '(No subject)',
      messageId: head['message-id'] || '',
      body: String(content || '').replace(/\r/g, '').trim()
    };
  }

// ===== 30-data-render.js =====
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
    const fileCacheMode = /^file:\/\//i.test(String(conf.bridgeUrl || '').trim());
    if (!conf.imapHost || !conf.username || !conf.password) {
      throw new Error('Missing IMAP host / username / password. Open Config to fill mailbox credentials.');
    }

    if (reset && state.imap) {
      try { await state.imap.close(); } catch (_) {}
      state.imap = null;
      state.connected = false;
    }
    if (state.imap && state.connected) return state.imap;

    if (bridgeReady) {
      state.imapMode = 'imap';
      state.imap = new ImapClient(conf);
      await state.imap.connect();
      state.connected = true;
    } else if (fileCacheMode) {
      state.imapMode = 'cache-file';
      state.imap = new FileImapCacheClient(conf);
      try {
        await state.imap.connect();
        state.connected = true;
      } catch (err) {
        state.imapMode = 'demo';
        state.imap = new DemoImapClient();
        await state.imap.connect();
        state.connected = true;
        state.notice = `IMAP cache unavailable, switched to demo mailbox. ${err && err.message ? err.message : ''}`.trim();
        state.error = '';
      }
    } else {
      state.imapMode = 'bridge-http';
      state.imap = new HttpImapBridgeClient(conf);
      try {
        await state.imap.connect();
        state.connected = true;
      } catch (err) {
        state.imapMode = 'demo';
        state.imap = new DemoImapClient();
        await state.imap.connect();
        state.connected = true;
        state.notice = `Bridge unavailable, switched to demo mailbox. ${err && err.message ? err.message : ''}`.trim();
        state.error = '';
      }
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
      : state.imapMode === 'cache-file'
        ? '<span class="mail-chip ok">IMAP cache sync</span>'
      : state.imapMode === 'bridge-http'
        ? '<span class="mail-chip ok">IMAP via bridge</span>'
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

// ===== 31-panel-folder.js =====
  function renderFolderPanel(chip, foldersHtml) {
    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-brand">Mail Workspace</div><div class="mail-muted">Folders, pagination, read view. Reply/send is disabled.</div></div>${chip}</div>
        <div class="mail-body">
          <div class="mail-tools">
            <button class="mail-btn pri" data-act="refresh-all" ${state.busy ? 'disabled' : ''}>Refresh mailbox</button>
            <button class="mail-btn ghost" data-act="reconnect" ${state.busy ? 'disabled' : ''}>Reconnect</button>
            <button class="mail-btn ghost" data-act="toggle-unread">${state.onlyUnread ? 'Showing unread' : 'Showing all'}</button>
            <button class="mail-btn ghost" data-act="open-settings">Config</button>
          </div>
          <div class="mail-muted" style="margin-top:10px">${esc(state.notice || (state.busy ? 'Syncing mailbox...' : ''))}</div>
          <div class="mail-metrics">
            <div class="mail-metric"><strong>${state.folders.length}</strong><span class="mail-muted">Folders</span></div>
            <div class="mail-metric"><strong>${state.folders.reduce((s, x) => s + (Number(x.messages) || 0), 0)}</strong><span class="mail-muted">Total mails</span></div>
            <div class="mail-metric"><strong>${state.folders.filter((x) => Number(x.unseen) > 0).length}</strong><span class="mail-muted">Folders unread</span></div>
            <div class="mail-metric"><strong>${state.pageSize}</strong><span class="mail-muted">Page size</span></div>
          </div>
          <div class="mail-folder-list" style="margin-top:16px">${foldersHtml}</div>
        </div>
      </div>`;
  }

// ===== 32-panel-list.js =====
  function renderListPanel(folder, total, pages, rowsHtml) {
    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-brand">${esc(folder.label || folder.name || 'Folder')}</div><div class="mail-muted">${esc(folder.name || state.currentFolder)} | ${total} mails</div></div>
          <div class="mail-tools">
            <button class="mail-btn ghost" data-act="first" ${state.busy || state.page <= 1 ? 'disabled' : ''}>First</button>
            <button class="mail-btn ghost" data-act="prev" ${state.busy || state.page <= 1 ? 'disabled' : ''}>Prev</button>
            <button class="mail-btn ghost" data-act="next" ${state.busy || state.page >= pages ? 'disabled' : ''}>Next</button>
            <button class="mail-btn ghost" data-act="last" ${state.busy || state.page >= pages ? 'disabled' : ''}>Last</button>
          </div>
        </div>
        <div class="mail-body"><input class="mail-search" data-role="search" type="search" placeholder="Filter by from / to / subject" value="${esc(state.query)}"><div class="mail-list">${rowsHtml}</div></div>
        <div class="mail-pager"><span>Page ${state.page}/${pages}</span><span>${esc(dateText(new Date().toISOString()))}</span></div>
      </div>`;
  }

// ===== 33-panel-detail.js =====
  function renderDetailPanel(chip, showSettings) {
    const detail = state.selectedMessage;
    const currentStar = detail ? isStarred(state.currentFolder, detail.uid) : false;

    if (showSettings) {
      return `
        <div class="mail-card">
          <div class="mail-head"><div><div class="mail-brand">Mail Settings</div><div class="mail-muted">Saved to local extension config only.</div></div><span class="mail-chip">Local config</span></div>
          <div class="mail-body"><div class="mail-form">
            <label>IMAP Host<input data-cfg="imapHost" type="text" value="${esc(cfg().imapHost)}"></label>
            <label>IMAP Port<input data-cfg="imapPort" type="number" value="${esc(cfg().imapPort)}"></label>
            <label>SMTP Host<input data-cfg="smtpHost" type="text" value="${esc(cfg().smtpHost)}"></label>
            <label>SMTP Port<input data-cfg="smtpPort" type="number" value="${esc(cfg().smtpPort)}"></label>
            <label class="full">Username<input data-cfg="username" type="text" value="${esc(cfg().username)}"></label>
            <label class="full">Password<input data-cfg="password" id="zalous-email-config-pass" class="zalous-email-config-pass" data-zalous-skip-pin="1" type="password" value="${esc(cfg().password)}"></label>
            <label>Emails per page<input data-cfg="pageSize" type="number" value="${esc(cfg().pageSize)}"></label>
            <label>Body preview bytes<input data-cfg="previewBytes" type="number" value="${esc(cfg().previewBytes)}"></label>
            <label class="mail-check"><input data-cfg-check="imapSsl" type="checkbox" ${cfg().imapSsl ? 'checked' : ''}> IMAP SSL</label>
            <label class="mail-check"><input data-cfg-check="smtpSsl" type="checkbox" ${cfg().smtpSsl ? 'checked' : ''}> SMTP SSL</label>
            <label class="mail-check"><input data-cfg-check="onlyUnread" type="checkbox" ${cfg().onlyUnread ? 'checked' : ''}> Only unread by default</label>
            <label class="mail-check full"><input data-cfg-check="allowSelfSigned" type="checkbox" ${cfg().allowSelfSigned ? 'checked' : ''}> Allow self-signed certificate</label>
          </div><div class="mail-tools" style="margin-top:14px;justify-content:flex-end"><button class="mail-btn ghost" data-act="close-settings">Close</button><button class="mail-btn pri" data-act="save-settings">Save local config</button></div></div>
        </div>`;
    }

    if (!detail) {
      return '<div class="mail-card"><div class="mail-empty">Choose one email to view detail.</div></div>';
    }

    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-detail-subject">${esc(detail.subject || '(No subject)')}</div><div class="mail-muted">Read-only IMAP detail view</div></div>
          <div class="mail-tools"><button class="mail-btn ghost" data-act="toggle-star">${currentStar ? 'Unstar' : 'Star'}</button><button class="mail-btn ghost" data-act="copy-message-id">Copy Message-ID</button>${chip}</div>
        </div>
        <div class="mail-body"><div class="mail-grid"><div>From</div><div>${esc(detail.from || '--')}</div><div>To</div><div>${esc(detail.to || '--')}</div><div>CC</div><div>${esc(detail.cc || '--')}</div><div>Date</div><div>${esc(dateText(detail.date))}</div><div>Size</div><div>${esc(bytesText(detail.size))}</div><div>Message-ID</div><div>${esc(detail.messageId || '--')}</div></div><div class="mail-text">${esc(detail.body || '(Empty body preview)')}</div></div>
      </div>`;
  }

// ===== 40-ui.js =====
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
    const height = Math.ceil(item.getBoundingClientRect().height || PINNED_HEIGHT);
    const children = Array.from(container.children);
    let shifted = 0;
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
      node.style.top = `${baseTop + height}px`;
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
      if (baseHeight != null) container.style.height = `${baseHeight + height}px`;
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
    container.removeAttribute(BASE_HEIGHT_ATTR);
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

// ===== 90-init.js =====
  ensureStyle();
  ensureItem();
  bind();
  observe();

  window.__zalousEmailPrototypeObserver = state.observer;
  window.__zalousEmailPrototypeCleanup = cleanup;
})();
