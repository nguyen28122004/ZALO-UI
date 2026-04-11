(() => {
  if (window.__zalousEmailPrototypeCleanup) {
    try { window.__zalousEmailPrototypeCleanup(); } catch (_) {}
  }

  const ITEM_ID = 'zalous-email-prototype-item';
  const STYLE_ID = 'zalous-email-prototype-style';
  const MAIN_MARKER = 'zalous-email-prototype-main';
  const PINNED_HEIGHT = 78;
  const BASE_TOP_ATTR = 'data-zalous-email-base-top';
  const SHIFTED_ATTR = 'data-zalous-email-shifted';
  const BASE_HEIGHT_ATTR = 'data-zalous-email-base-height';
  const ACTIVE_ATTR = 'data-zalous-email-active';
  const runtimeRequire = typeof require === 'function' ? require : (typeof window.require === 'function' ? window.require : null);
  const tls = runtimeRequire ? runtimeRequire('tls') : null;
  const net = runtimeRequire ? runtimeRequire('net') : null;
  const BufferRef = runtimeRequire ? runtimeRequire('buffer').Buffer : null;
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
    allowSelfSigned: false
  };
  const state = {
    active: false,
    shell: null,
    main: null,
    mainNodes: null,
    notice: '',
    error: '',
    busy: false,
    folders: [],
    folderMap: {},
    folderCache: {},
    currentFolder: 'INBOX',
    page: 1,
    pageSize: 20,
    query: '',
    selectedUid: '',
    selectedMessage: null,
    connected: false,
    imap: null,
    observer: null,
    removeFns: []
  };

  zalous.registerConfig({
    title: 'Email Prototype Config',
    description: 'Local IMAP/SMTP config cho tab mail. Runtime se doc tu config local cua Zalous.',
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
      { key: 'allowSelfSigned', label: 'Allow self-signed certificate', type: 'checkbox', default: false }
    ]
  });

  function cfg() {
    const next = Object.assign({}, defaults, zalous.getConfig(defaults) || {});
    next.imapPort = Number(next.imapPort) || defaults.imapPort;
    next.smtpPort = Number(next.smtpPort) || defaults.smtpPort;
    next.pageSize = Math.max(5, Math.min(100, Number(next.pageSize) || defaults.pageSize));
    next.previewBytes = Math.max(4096, Math.min(262144, Number(next.previewBytes) || defaults.previewBytes));
    next.imapSsl = next.imapSsl !== false;
    next.smtpSsl = next.smtpSsl !== false;
    next.allowSelfSigned = !!next.allowSelfSigned;
    return next;
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function px(v) {
    if (typeof v !== 'string' || !v.trim().toLowerCase().endsWith('px')) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function dateText(v) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v || '--');
    return new Intl.DateTimeFormat('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  }

  function bytesText(v) {
    const n = Number(v) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  }

  function ensureStyle() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      `#${ITEM_ID}{cursor:pointer;position:absolute;left:0;top:0;width:100%;height:${PINNED_HEIGHT}px;z-index:3;box-sizing:border-box;padding:10px 14px 10px 16px;}`,
      `#${ITEM_ID} .mail-pin{height:100%;padding:10px 14px;border-radius:16px;border:1px solid rgba(37,99,235,.18);background:linear-gradient(135deg,rgba(37,99,235,.14),rgba(14,165,233,.08));display:flex;flex-direction:column;justify-content:center;gap:3px;}`,
      `#${ITEM_ID}[data-active="1"] .mail-pin{background:linear-gradient(135deg,rgba(37,99,235,.24),rgba(14,165,233,.16));border-color:rgba(37,99,235,.34);}`,
      `#${ITEM_ID} .mail-pin-k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;}#${ITEM_ID} .mail-pin-t{font-size:14px;font-weight:700;}#${ITEM_ID} .mail-pin-p{font-size:12px;opacity:.78;}`,
      `.${MAIN_MARKER}{height:100%;padding:16px;box-sizing:border-box;background:linear-gradient(180deg,#f8fbff,#eef4ff);font-family:"Segoe UI",Tahoma,sans-serif;color:#0f172a;}`,
      `.${MAIN_MARKER} *{box-sizing:border-box;} .${MAIN_MARKER} .mail-app{display:grid;grid-template-columns:250px 360px 1fr;gap:14px;height:100%;}`,
      `.${MAIN_MARKER} .mail-card{background:rgba(255,255,255,.92);border:1px solid rgba(148,163,184,.24);border-radius:20px;box-shadow:0 18px 36px rgba(15,23,42,.08);display:flex;flex-direction:column;min-height:0;overflow:hidden;}`,
      `.${MAIN_MARKER} .mail-head{padding:16px 18px 12px;border-bottom:1px solid rgba(148,163,184,.18);display:flex;justify-content:space-between;gap:10px;align-items:flex-start;} .${MAIN_MARKER} .mail-body{padding:14px 16px;overflow:auto;min-height:0;}`,
      `.${MAIN_MARKER} .mail-brand{font-size:20px;font-weight:700;} .${MAIN_MARKER} .mail-muted{color:#64748b;font-size:12px;} .${MAIN_MARKER} .mail-chip{padding:6px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;}`,
      `.${MAIN_MARKER} .mail-chip.err{background:#fee2e2;color:#b91c1c;} .${MAIN_MARKER} .mail-chip.ok{background:#dcfce7;color:#047857;} .${MAIN_MARKER} .mail-tools{display:flex;gap:8px;flex-wrap:wrap;}`,
      `.${MAIN_MARKER} .mail-btn{border:none;border-radius:12px;padding:9px 12px;background:#e2e8f0;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;} .${MAIN_MARKER} .mail-btn.pri{background:#2563eb;color:#fff;} .${MAIN_MARKER} .mail-btn.ghost{background:#fff;border:1px solid rgba(148,163,184,.28);} .${MAIN_MARKER} .mail-btn:disabled{opacity:.55;cursor:wait;}`,
      `.${MAIN_MARKER} .mail-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;} .${MAIN_MARKER} .mail-metric{padding:12px;border-radius:14px;background:#f8fafc;border:1px solid rgba(148,163,184,.16);} .${MAIN_MARKER} .mail-metric strong{display:block;font-size:18px;}`,
      `.${MAIN_MARKER} .mail-folder-list,.${MAIN_MARKER} .mail-list{display:flex;flex-direction:column;gap:8px;} .${MAIN_MARKER} .mail-folder,.${MAIN_MARKER} .mail-row{padding:12px 14px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.18);cursor:pointer;}`,
      `.${MAIN_MARKER} .mail-folder.active,.${MAIN_MARKER} .mail-row.active{background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(14,165,233,.08));border-color:rgba(37,99,235,.34);} .${MAIN_MARKER} .mail-folder{display:flex;justify-content:space-between;gap:8px;align-items:center;} .${MAIN_MARKER} .mail-badge{min-width:26px;height:26px;border-radius:999px;background:#eff6ff;color:#1d4ed8;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}`,
      `.${MAIN_MARKER} .mail-search{width:100%;height:38px;border:1px solid rgba(148,163,184,.3);border-radius:12px;padding:0 12px;background:#fff;margin-bottom:10px;} .${MAIN_MARKER} .mail-row-top{display:flex;justify-content:space-between;gap:10px;} .${MAIN_MARKER} .mail-row-from{font-weight:700;} .${MAIN_MARKER} .mail-row-date,.${MAIN_MARKER} .mail-row-meta{font-size:11px;color:#64748b;}`,
      `.${MAIN_MARKER} .mail-subject{font-size:13px;font-weight:700;margin-top:4px;} .${MAIN_MARKER} .mail-preview{font-size:12px;color:#64748b;margin-top:4px;line-height:1.4;} .${MAIN_MARKER} .mail-pager{padding:12px 16px;border-top:1px solid rgba(148,163,184,.18);display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#475569;}`,
      `.${MAIN_MARKER} .mail-detail-subject{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:12px;} .${MAIN_MARKER} .mail-grid{display:grid;grid-template-columns:110px 1fr;gap:8px 12px;font-size:12px;margin-bottom:16px;} .${MAIN_MARKER} .mail-grid div:nth-child(odd){color:#64748b;}`,
      `.${MAIN_MARKER} .mail-text{white-space:pre-wrap;line-height:1.6;font-size:13px;color:#1e293b;padding:18px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.16);} .${MAIN_MARKER} .mail-empty{padding:32px 18px;color:#64748b;text-align:center;}`,
      `.${MAIN_MARKER} .mail-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;} .${MAIN_MARKER} .mail-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#334155;} .${MAIN_MARKER} .mail-form input{height:38px;border:1px solid rgba(148,163,184,.3);border-radius:12px;padding:0 12px;background:#fff;} .${MAIN_MARKER} .mail-form .full{grid-column:1/-1;} .${MAIN_MARKER} .mail-check{display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;}`,
      `@media (max-width:1150px){.${MAIN_MARKER} .mail-app{grid-template-columns:1fr;}}`
    ].join('');
  }
  function decodeWords(v) {
    if (!v) return '';
    if (!BufferRef) return String(v).replace(/\r?\n\s+/g, ' ').trim();
    return String(v).replace(/\r?\n\s+/g, ' ').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, data) => {
      try {
        const charset = String(cs || '').toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf8';
        if (String(enc).toUpperCase() === 'B') return BufferRef.from(String(data || ''), 'base64').toString(charset);
        const qp = String(data || '').replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
        return BufferRef.from(qp, 'binary').toString(charset);
      } catch (_) { return String(data || ''); }
    }).trim();
  }

  function parseHeaders(raw) {
    const out = {};
    let cur = '';
    String(raw || '').replace(/\r/g, '').split('\n').forEach((line) => {
      if (!line) return;
      if (/^[ \t]/.test(line) && cur) { out[cur] += ` ${line.trim()}`; return; }
      const i = line.indexOf(':');
      if (i <= 0) return;
      cur = line.slice(0, i).trim().toLowerCase();
      const val = line.slice(i + 1).trim();
      out[cur] = out[cur] ? `${out[cur]}, ${val}` : val;
    });
    return out;
  }

  function fmtAddr(v) { return v ? decodeWords(String(v)).replace(/\s*</g, ' <') : '--'; }
  function q(v) { return `"${String(v || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; }

  class ImapClient {
    constructor(conf) { this.conf = conf; this.socket = null; this.buf = ''; this.current = null; this.connected = false; this.seq = 1; }
    connect() {
      if (!runtimeRequire || (!tls && !net)) throw new Error('Runtime hien tai khong co Node bridge de mo IMAP.');
      if (this.connected && this.socket) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const opts = { host: this.conf.imapHost, port: this.conf.imapPort, servername: this.conf.imapHost, rejectUnauthorized: !this.conf.allowSelfSigned };
        this.socket = this.conf.imapSsl ? tls.connect(opts) : net.connect(opts);
        this.socket.on('data', (chunk) => { this.buf += chunk.toString('utf8'); this.pump(); });
        this.socket.on('error', (err) => { if (this.current) { const cur = this.current; this.current = null; cur.reject(err); } });
        this.socket.on('close', () => { this.connected = false; this.socket = null; });
        const timer = setTimeout(() => reject(new Error('IMAP connect timeout')), 15000);
        const bootPump = () => {
          const m = this.buf.match(/^(\* .+?)\r\n/);
          if (!m) return;
          clearTimeout(timer);
          this.buf = this.buf.slice(m[0].length);
          if (!/^\* OK/i.test(m[1])) { reject(new Error(`IMAP greeting failed: ${m[1]}`)); return; }
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
      if (m[1] === 'OK') cur.resolve(raw); else cur.reject(new Error(`${m[1]}${m[2] || ''}`.trim()));
    }
    cmd(text) {
      if (!this.socket || !this.connected) return Promise.reject(new Error('IMAP chua ket noi.'));
      if (this.current) return Promise.reject(new Error('IMAP dang ban.'));
      const tag = `A${String(this.seq++).padStart(4, '0')}`;
      return new Promise((resolve, reject) => {
        this.current = { tag, resolve, reject };
        this.socket.write(`${tag} ${text}\r\n`, 'utf8', (err) => { if (err) { this.current = null; reject(err); } });
      });
    }
    async list() { return parseList(await this.cmd('LIST "" "*"')); }
    async status(name) { return parseStatus(await this.cmd(`STATUS ${q(name)} (MESSAGES UNSEEN RECENT UIDNEXT UIDVALIDITY)`), name); }
    async select(name) { await this.cmd(`SELECT ${q(name)}`); }
    async search() { return parseSearch(await this.cmd('UID SEARCH ALL')); }
    async page(uids) { if (!uids.length) return []; return parseListFetch(await this.cmd(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`)); }
    async message(uid, bytes) { return parseMessage(await this.cmd(`UID FETCH ${uid} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.${bytes}>)`), uid); }
    async close() { if (!this.socket) return; try { if (this.connected) await this.cmd('LOGOUT'); } catch (_) {} try { this.socket.end(); } catch (_) {} this.connected = false; this.socket = null; }
  }

  function parseList(raw) {
    const out = []; let m; const re = /^\* LIST \(([^)]*)\) ("[^"]*"|NIL) (.+)$/gim;
    while ((m = re.exec(raw))) {
      const delimiter = m[2] === 'NIL' ? '' : m[2].slice(1, -1); let name = m[3].trim();
      if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\"/g, '"');
      out.push({ name, delimiter, label: name.split(delimiter || '/').filter(Boolean).pop() || name });
    }
    return out;
  }
  function parseStatus(raw, fallback) {
    const out = { name: fallback, messages: 0, unseen: 0, recent: 0 }; const m = raw.match(/^\* STATUS (.+?) \(([^)]*)\)$/im); if (!m) return out;
    let name = m[1].trim(); if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1).replace(/\\"/g, '"'); out.name = name;
    String(m[2] || '').trim().split(/\s+/).forEach((t, i, arr) => { const n = Number(arr[i + 1]); if (!Number.isFinite(n)) return; if (t.toUpperCase() === 'MESSAGES') out.messages = n; if (t.toUpperCase() === 'UNSEEN') out.unseen = n; if (t.toUpperCase() === 'RECENT') out.recent = n; });
    return out;
  }
  function parseSearch(raw) { const m = raw.match(/^\* SEARCH(.*)$/im); return m ? String(m[1] || '').trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => b - a) : []; }
  function fetchBlocks(raw) { const matches = [...String(raw || '').matchAll(/^\* \d+ FETCH \(/gim)]; if (!matches.length) return []; return matches.map((m, i) => raw.slice(m.index, i + 1 < matches.length ? matches[i + 1].index : raw.lastIndexOf('\r\nA') > m.index ? raw.lastIndexOf('\r\nA') : raw.length).trim()); }
  function parseListFetch(raw) {
    return fetchBlocks(raw).map((block) => {
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
    }).sort((a, b) => Number(b.uid) - Number(a.uid));
  }
  function decodeQuotedPrintable(v) { return String(v || '').replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))); }
  function parseMessage(raw, uid) {
    const block = fetchBlocks(raw)[0] || raw;
    const head = parseHeaders(((block.match(/BODY\[HEADER\.FIELDS[^\]]*\] \{\d+\}\r\n([\s\S]*?)\r\nBODY\[TEXT\]/i) || [])[1]) || '');
    const bodyRaw = ((block.match(/BODY\[TEXT\]<0> \{\d+\}\r\n([\s\S]*?)\r\n\)$/i) || [])[1]) || '';
    const text = /Content-Transfer-Encoding:\s*quoted-printable/i.test(bodyRaw) ? decodeQuotedPrintable(bodyRaw) : bodyRaw;
    return {
      uid: String(uid),
      flags: ((((block.match(/FLAGS \(([^)]*)\)/i) || [])[1]) || '').split(/\s+/).filter(Boolean)),
      size: Number((block.match(/RFC822\.SIZE (\d+)/i) || [])[1] || 0),
      date: head.date || ((block.match(/INTERNALDATE "([^"]+)"/i) || [])[1]) || '',
      from: fmtAddr(head.from), to: fmtAddr(head.to), cc: fmtAddr(head.cc), subject: decodeWords(head.subject) || '(No subject)', messageId: head['message-id'] || '', body: text.replace(/\r/g, '').trim()
    };
  }

  async function ensureImap(reset) {
    const conf = cfg(); state.pageSize = conf.pageSize;
    if (!conf.imapHost || !conf.username || !conf.password) throw new Error('Thieu IMAP host / username / password. Bam Config de nhap thong tin mailbox.');
    if (reset && state.imap) { try { await state.imap.close(); } catch (_) {} state.imap = null; state.connected = false; }
    if (state.imap && state.connected) return state.imap;
    state.imap = new ImapClient(conf); await state.imap.connect(); state.connected = true; return state.imap;
  }

  function cacheFor(folder) { if (!state.folderCache[folder]) state.folderCache[folder] = { uids: [], pages: {}, details: {} }; return state.folderCache[folder]; }
  async function loadFolders(refresh) {
    const client = await ensureImap(refresh); if (state.folders.length && !refresh) return;
    const list = await client.list(); const rich = [];
    for (const f of list) { try { rich.push(Object.assign({}, f, await client.status(f.name))); } catch (_) { rich.push(Object.assign({}, f, { messages: 0, unseen: 0, recent: 0 })); } }
    state.folders = rich; state.folderMap = rich.reduce((a, x) => (a[x.name] = x, a), {}); if (!state.folderMap[state.currentFolder]) state.currentFolder = (rich.find((x) => /inbox/i.test(x.name)) || rich[0] || { name: 'INBOX' }).name;
  }
  async function loadFolder(folder, page, refresh) {
    const client = await ensureImap(false); const name = folder || state.currentFolder; const cache = cacheFor(name); if (refresh) { cache.uids = []; cache.pages = {}; cache.details = {}; }
    await client.select(name); state.currentFolder = name; if (!cache.uids.length) cache.uids = await client.search();
    const totalPages = Math.max(1, Math.ceil(cache.uids.length / state.pageSize)); state.page = Math.max(1, Math.min(totalPages, page || 1));
    const slice = cache.uids.slice((state.page - 1) * state.pageSize, state.page * state.pageSize); if (!cache.pages[state.page]) cache.pages[state.page] = await client.page(slice);
    const rows = cache.pages[state.page]; if (!state.selectedUid || !rows.some((x) => x.uid === state.selectedUid)) state.selectedUid = rows[0] ? rows[0].uid : ''; if (state.selectedUid) await loadMessage(name, state.selectedUid, false); else state.selectedMessage = null;
  }
  async function loadMessage(folder, uid, refresh) { if (!uid) return; const cache = cacheFor(folder || state.currentFolder); if (!cache.details[uid] || refresh) cache.details[uid] = await (await ensureImap(false)).message(uid, cfg().previewBytes); state.selectedUid = uid; state.selectedMessage = cache.details[uid]; }
  function rowList() {
    const rows = (cacheFor(state.currentFolder).pages[state.page] || []); const qv = state.query.trim().toLowerCase();
    return qv ? rows.filter((x) => [x.from, x.subject].join(' ').toLowerCase().includes(qv)) : rows;
  }
  function syncItem() { const item = document.getElementById(ITEM_ID); if (item) item.setAttribute('data-active', state.active ? '1' : '0'); }
  function render(showSettings) {
    if (!state.shell) return;
    const folder = state.folderMap[state.currentFolder] || { label: state.currentFolder, messages: 0, unseen: 0 };
    const cache = cacheFor(state.currentFolder); const total = cache.uids.length || 0; const pages = Math.max(1, Math.ceil(total / state.pageSize) || 1);
    const chip = state.error ? `<span class="mail-chip err">${esc(state.error)}</span>` : state.connected ? '<span class="mail-chip ok">IMAP connected</span>' : '<span class="mail-chip">Chua ket noi</span>';
    const foldersHtml = state.folders.length ? state.folders.map((f) => `<button class="mail-folder ${f.name === state.currentFolder ? 'active' : ''}" data-folder="${esc(f.name)}"><span><div><strong>${esc(f.label || f.name)}</strong></div><div class="mail-muted">${esc(f.name)} � ${Number(f.messages) || 0} mails</div></span><span class="mail-badge">${Number(f.unseen) || 0}</span></button>`).join('') : '<div class="mail-empty">Chua tai duoc folder.</div>';
    const rowsHtml = rowList().length ? rowList().map((m) => `<button class="mail-row ${m.uid === state.selectedUid ? 'active' : ''}" data-uid="${esc(m.uid)}"><div class="mail-row-top"><div class="mail-row-from">${esc(m.from || '--')}</div><div class="mail-row-date">${esc(dateText(m.date))}</div></div><div class="mail-subject">${esc(m.subject || '(No subject)')}</div><div class="mail-preview">To: ${esc(m.to || '--')}</div><div class="mail-row-meta">${m.flags.includes('\\Seen') ? 'Seen' : 'Unread'} � ${esc(bytesText(m.size))} � UID ${esc(m.uid)}</div></button>`).join('') : '<div class="mail-empty">Khong co mail nao trong folder / filter hien tai.</div>';
    const d = state.selectedMessage;
    const detailHtml = showSettings ? `
      <div class="mail-head"><div><div class="mail-brand">Mail Settings</div><div class="mail-muted">Thong tin se luu vao local config cua extension.</div></div><span class="mail-chip">Local config</span></div>
      <div class="mail-body"><div class="mail-form">
        <label>IMAP Host<input data-cfg="imapHost" type="text" value="${esc(cfg().imapHost)}"></label>
        <label>IMAP Port<input data-cfg="imapPort" type="number" value="${esc(cfg().imapPort)}"></label>
        <label>SMTP Host<input data-cfg="smtpHost" type="text" value="${esc(cfg().smtpHost)}"></label>
        <label>SMTP Port<input data-cfg="smtpPort" type="number" value="${esc(cfg().smtpPort)}"></label>
        <label class="full">Username<input data-cfg="username" type="text" value="${esc(cfg().username)}"></label>
        <label class="full">Password<input data-cfg="password" type="password" value="${esc(cfg().password)}"></label>
        <label>Emails per page<input data-cfg="pageSize" type="number" value="${esc(cfg().pageSize)}"></label>
        <label>Body preview bytes<input data-cfg="previewBytes" type="number" value="${esc(cfg().previewBytes)}"></label>
        <label class="mail-check"><input data-cfg-check="imapSsl" type="checkbox" ${cfg().imapSsl ? 'checked' : ''}> IMAP SSL</label>
        <label class="mail-check"><input data-cfg-check="smtpSsl" type="checkbox" ${cfg().smtpSsl ? 'checked' : ''}> SMTP SSL</label>
        <label class="mail-check full"><input data-cfg-check="allowSelfSigned" type="checkbox" ${cfg().allowSelfSigned ? 'checked' : ''}> Allow self-signed certificate</label>
      </div><div class="mail-tools" style="margin-top:14px;justify-content:flex-end"><button class="mail-btn ghost" data-act="close-settings">Dong</button><button class="mail-btn pri" data-act="save-settings">Save local config</button></div></div>` : d ? `
      <div class="mail-head"><div><div class="mail-detail-subject">${esc(d.subject || '(No subject)')}</div><div class="mail-muted">Read-only IMAP detail view</div></div>${chip}</div>
      <div class="mail-body"><div class="mail-grid"><div>From</div><div>${esc(d.from || '--')}</div><div>To</div><div>${esc(d.to || '--')}</div><div>CC</div><div>${esc(d.cc || '--')}</div><div>Date</div><div>${esc(dateText(d.date))}</div><div>Size</div><div>${esc(bytesText(d.size))}</div><div>Message-ID</div><div>${esc(d.messageId || '--')}</div></div><div class="mail-text">${esc(d.body || '(Body preview rong hoac khong parse duoc.)')}</div></div>` : '<div class="mail-empty">Chon mot email de xem noi dung.</div>';
    state.shell.innerHTML = `
      <div class="mail-app">
        <div class="mail-card"><div class="mail-head"><div><div class="mail-brand">Mail Workspace</div><div class="mail-muted">Folder, pagination, read view. Khong co reply/send.</div></div>${chip}</div><div class="mail-body"><div class="mail-tools"><button class="mail-btn pri" data-act="refresh-all" ${state.busy ? 'disabled' : ''}>Refresh mailbox</button><button class="mail-btn ghost" data-act="reconnect" ${state.busy ? 'disabled' : ''}>Reconnect</button><button class="mail-btn ghost" data-act="open-settings">Config</button></div><div class="mail-muted" style="margin-top:10px">${esc(state.notice || (state.busy ? 'Dang dong bo mailbox...' : ''))}</div><div class="mail-metrics"><div class="mail-metric"><strong>${state.folders.length}</strong><span class="mail-muted">Folders</span></div><div class="mail-metric"><strong>${state.folders.reduce((s, x) => s + (Number(x.messages) || 0), 0)}</strong><span class="mail-muted">Total mails</span></div><div class="mail-metric"><strong>${state.folders.filter((x) => Number(x.unseen) > 0).length}</strong><span class="mail-muted">Folders unread</span></div><div class="mail-metric"><strong>${state.pageSize}</strong><span class="mail-muted">Page size</span></div></div><div class="mail-folder-list" style="margin-top:16px">${foldersHtml}</div></div></div>
        <div class="mail-card"><div class="mail-head"><div><div class="mail-brand">${esc(folder.label || folder.name || 'Folder')}</div><div class="mail-muted">${esc(folder.name || state.currentFolder)} � ${total} mails</div></div><div class="mail-tools"><button class="mail-btn ghost" data-act="prev" ${state.busy || state.page <= 1 ? 'disabled' : ''}>Prev</button><button class="mail-btn ghost" data-act="next" ${state.busy || state.page >= pages ? 'disabled' : ''}>Next</button></div></div><div class="mail-body"><input class="mail-search" data-role="search" type="search" placeholder="Loc theo from / subject" value="${esc(state.query)}"><div class="mail-list">${rowsHtml}</div></div><div class="mail-pager"><span>Page ${state.page}/${pages}</span><span>${esc(dateText(new Date().toISOString()))}</span></div></div>
        <div class="mail-card">${detailHtml}</div>
      </div>`;
  }

  function setBusy(on, msg) { state.busy = !!on; if (msg != null) state.notice = msg; render(false); }
  function setErr(msg) { state.error = String(msg || ''); if (state.error) state.notice = ''; render(false); }
  async function refreshAll(reset) { try { setBusy(true, 'Dang ket noi IMAP va tai mailbox...'); await loadFolders(reset); await loadFolder(state.currentFolder, 1, true); state.error = ''; setBusy(false, `Da tai ${state.currentFolder}.`); } catch (e) { state.connected = false; setBusy(false, ''); setErr(e && e.message ? e.message : String(e)); } }
  async function openFolder(name) { try { setBusy(true, `Dang mo folder ${name}...`); await loadFolder(name, 1, false); state.error = ''; setBusy(false, `Dang xem ${name}.`); } catch (e) { setBusy(false, ''); setErr(e && e.message ? e.message : String(e)); } }
  async function openPage(p) { try { setBusy(true, 'Dang doi trang...'); await loadFolder(state.currentFolder, p, false); state.error = ''; setBusy(false, `Page ${state.page}.`); } catch (e) { setBusy(false, ''); setErr(e && e.message ? e.message : String(e)); } }
  async function openMail(uid) { try { setBusy(true, `Dang tai email ${uid}...`); await loadMessage(state.currentFolder, uid, false); state.error = ''; setBusy(false, `Dang doc email UID ${uid}.`); } catch (e) { setBusy(false, ''); setErr(e && e.message ? e.message : String(e)); } }
  function saveSettings() { const next = cfg(); state.shell.querySelectorAll('[data-cfg]').forEach((n) => { next[n.getAttribute('data-cfg')] = n.value; }); state.shell.querySelectorAll('[data-cfg-check]').forEach((n) => { next[n.getAttribute('data-cfg-check')] = !!n.checked; }); next.imapPort = Number(next.imapPort) || defaults.imapPort; next.smtpPort = Number(next.smtpPort) || defaults.smtpPort; next.pageSize = Number(next.pageSize) || defaults.pageSize; next.previewBytes = Number(next.previewBytes) || defaults.previewBytes; zalous.setConfig(next); state.pageSize = next.pageSize; state.folderCache = {}; state.notice = 'Da luu local config. Bam Refresh mailbox de tai lai.'; state.error = ''; render(false); }

  function createItem() {
    const item = document.createElement('div'); item.id = ITEM_ID; item.className = 'msg-item pinned'; item.setAttribute('role', 'button'); item.setAttribute('tabindex', '0'); item.innerHTML = '<div class="mail-pin"><div class="mail-pin-k">Workspace Mail</div><div class="mail-pin-t">Email (IMAP)</div><div class="mail-pin-p">Mo folder, danh sach mail va man hinh doc email trong mot tab rieng</div></div>';
    const go = (e) => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); openView(); };
    item.addEventListener('click', go); item.addEventListener('keydown', go); return item;
  }
  function listContainer() { const first = document.querySelector('.msg-item'); return first && first.parentElement ? first.parentElement : null; }
  function shift(container) { const h = px(container.style.height || ''); if (h != null) { const prev = Number(container.getAttribute(BASE_HEIGHT_ATTR) || ''); const expected = Number.isFinite(prev) ? prev + PINNED_HEIGHT : null; const base = Number.isFinite(prev) && expected !== null && Math.abs(h - expected) <= 0.5 ? prev : h; container.setAttribute(BASE_HEIGHT_ATTR, String(base)); container.style.height = `${base + PINNED_HEIGHT}px`; }
    Array.from(container.children).forEach((el) => { if (!(el instanceof HTMLElement) || el.id === ITEM_ID || !el.classList.contains('msg-item')) return; const top = px(el.style.top || ''); if (top == null) return; const prev = Number(el.getAttribute(BASE_TOP_ATTR) || ''); const expected = Number.isFinite(prev) ? prev + PINNED_HEIGHT : null; const base = Number.isFinite(prev) && expected !== null && Math.abs(top - expected) <= 0.5 ? prev : top; el.setAttribute(BASE_TOP_ATTR, String(base)); el.style.top = `${base + PINNED_HEIGHT}px`; el.setAttribute(SHIFTED_ATTR, '1'); }); }
  function ensureItem() { const container = listContainer(); if (!container) return; let item = document.getElementById(ITEM_ID); if (!item) item = createItem(); if (item.parentElement !== container) container.prepend(item); if (container.firstElementChild !== item) container.prepend(item); shift(container); syncItem(); }
  function mainEl() { return document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.chat-box') || document.querySelector('[id*="main-content"]'); }
  function restore() { if (!state.main || !Array.isArray(state.mainNodes) || !state.active) return; state.main.innerHTML = ''; state.mainNodes.forEach((n) => state.main.appendChild(n.cloneNode(true))); state.main.removeAttribute(ACTIVE_ATTR); state.active = false; state.shell = null; syncItem(); }
  function shouldRestore(t) { return t instanceof Element && !t.closest(`#${ITEM_ID}`) && (t.closest('.msg-item') || t.closest('[role="tab"]')); }
  async function openView() { const main = mainEl(); if (!main) return; if (state.main !== main || !Array.isArray(state.mainNodes)) { state.main = main; state.mainNodes = Array.from(main.childNodes).map((n) => n.cloneNode(true)); } main.innerHTML = ''; main.setAttribute(ACTIVE_ATTR, '1'); const wrap = document.createElement('div'); wrap.className = MAIN_MARKER; main.appendChild(wrap); state.shell = wrap; state.active = true; syncItem(); render(false); try { await loadFolders(false); await loadFolder(state.currentFolder, state.page || 1, false); state.notice = `Da mo ${state.currentFolder}.`; state.error = ''; render(false); } catch (e) { setErr(e && e.message ? e.message : String(e)); } }

  function bind() {
    const onClick = (e) => {
      const t = e.target; if (!(t instanceof Element)) return;
      const act = t.closest('[data-act]'); if (act && state.shell && state.shell.contains(act)) { const a = act.getAttribute('data-act'); if (a === 'refresh-all') refreshAll(false); if (a === 'reconnect') refreshAll(true); if (a === 'open-settings') render(true); if (a === 'close-settings') render(false); if (a === 'save-settings') saveSettings(); if (a === 'prev') openPage(state.page - 1); if (a === 'next') openPage(state.page + 1); return; }
      const folder = t.closest('[data-folder]'); if (folder && state.shell && state.shell.contains(folder)) { openFolder(folder.getAttribute('data-folder') || 'INBOX'); return; }
      const uid = t.closest('[data-uid]'); if (uid && state.shell && state.shell.contains(uid)) { openMail(uid.getAttribute('data-uid') || ''); return; }
      if (shouldRestore(t)) restore();
    };
    const onKey = (e) => { if ((e.key === 'Enter' || e.key === ' ') && shouldRestore(e.target)) restore(); };
    const onInput = (e) => { const t = e.target; if (!(t instanceof Element) || !t.matches('[data-role="search"]')) return; state.query = t.value || ''; render(false); };
    document.addEventListener('click', onClick, true); document.addEventListener('keydown', onKey, true); document.addEventListener('input', onInput, true);
    state.removeFns.push(() => document.removeEventListener('click', onClick, true)); state.removeFns.push(() => document.removeEventListener('keydown', onKey, true)); state.removeFns.push(() => document.removeEventListener('input', onInput, true));
  }

  function observe() { if (state.observer) return; state.observer = new MutationObserver(() => { ensureItem(); if (state.main && !state.main.isConnected) { state.main = null; state.mainNodes = null; } }); state.observer.observe(document.documentElement || document.body, { childList: true, subtree: true }); }
  function cleanup() { state.removeFns.splice(0).forEach((fn) => { try { fn(); } catch (_) {} }); if (state.observer) { try { state.observer.disconnect(); } catch (_) {} state.observer = null; } if (state.imap) { state.imap.close().catch(() => {}); state.imap = null; } state.connected = false; }

  ensureStyle(); ensureItem(); bind(); observe(); window.__zalousEmailPrototypeObserver = state.observer; window.__zalousEmailPrototypeCleanup = cleanup;
})();
