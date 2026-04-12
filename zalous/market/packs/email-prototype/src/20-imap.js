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
          body: 'Runtime does not expose Node IMAP sockets in this build. Demo mailbox is enabled so UI remains usable.',
          html: '<html><body><h3>Welcome to Zalous Mail</h3><p>Runtime does not expose Node IMAP sockets in this build. Demo mailbox is enabled so UI remains usable.</p></body></html>',
          attachments: [{ name: 'onboarding.pdf', size: 92311, type: 'application/pdf' }]
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
          body: 'Market and email surfaces are synced with active theme variables.',
          html: '<html><body><p>Market and email surfaces are synced with active theme variables.</p></body></html>',
          attachments: []
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
          body: 'After validating UI through CDP, run commit + tag + publish.',
          html: '<html><body><p>After validating UI through CDP, run commit + tag + publish.</p></body></html>',
          attachments: [{ name: 'release-checklist.xlsx', size: 40960, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
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
        body: row.body || '',
        text: row.body || '',
        html: row.html || '',
        attachments: Array.isArray(row.attachments) ? row.attachments : []
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
        body: String(m.body || ''),
        text: String(m.text || ''),
        html: String(m.html || ''),
        attachments: Array.isArray(m.attachments) ? m.attachments : []
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
        body: String(m.body || ''),
        text: String(m.text || ''),
        html: String(m.html || ''),
        attachments: Array.isArray(m.attachments) ? m.attachments : []
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

  function decodeBase64(v) {
    const raw = String(v || '').replace(/\s+/g, '');
    if (!raw) return '';
    try {
      if (BufferRef) return BufferRef.from(raw, 'base64').toString('utf8');
    } catch (_) {}
    try {
      return decodeURIComponent(escape(atob(raw)));
    } catch (_) {
      try { return atob(raw); } catch (_) { return ''; }
    }
  }

  function decodeTransferBody(content, headers) {
    const enc = String((headers && headers['content-transfer-encoding']) || '').toLowerCase();
    if (enc.includes('quoted-printable')) return decodeQuotedPrintable(content);
    if (enc.includes('base64')) return decodeBase64(content);
    return String(content || '');
  }

  function parseContentType(v) {
    const raw = String(v || '');
    const parts = raw.split(';').map((x) => x.trim()).filter(Boolean);
    const mime = String(parts.shift() || 'text/plain').toLowerCase();
    const params = {};
    parts.forEach((p) => {
      const i = p.indexOf('=');
      if (i <= 0) return;
      const k = p.slice(0, i).trim().toLowerCase();
      let val = p.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      params[k] = val;
    });
    return { mime, params };
  }

  function splitMimeEntity(raw) {
    const source = String(raw || '');
    const idx = source.search(/\r?\n\r?\n/);
    if (idx < 0) return { headers: parseHeaders(''), body: source };
    const headRaw = source.slice(0, idx);
    const body = source.slice(idx).replace(/^\r?\n\r?\n/, '');
    return { headers: parseHeaders(headRaw), body };
  }

  function extractMimeSections(body, boundary) {
    const source = String(body || '');
    const marker = `--${boundary}`;
    const rawParts = source.split(marker).slice(1);
    const parts = [];
    rawParts.forEach((chunk) => {
      const cleaned = String(chunk || '').replace(/^\r?\n/, '');
      if (cleaned.startsWith('--')) return;
      const payload = cleaned.replace(/\r?\n$/, '');
      if (payload.trim()) parts.push(payload);
    });
    return parts;
  }

  function parseMimeEntity(raw) {
    const node = splitMimeEntity(raw);
    const contentType = parseContentType(node.headers['content-type'] || '');
    const dispo = parseContentType(node.headers['content-disposition'] || '');
    const transferDecoded = decodeTransferBody(node.body || '', node.headers).trim();

    if (contentType.mime.startsWith('multipart/') && contentType.params.boundary) {
      const sections = extractMimeSections(node.body, contentType.params.boundary);
      return sections.reduce((acc, partRaw) => {
        const part = parseMimeEntity(partRaw);
        if (!acc.html && part.html) acc.html = part.html;
        if (!acc.text && part.text) acc.text = part.text;
        acc.attachments.push(...part.attachments);
        return acc;
      }, { text: '', html: '', attachments: [] });
    }

    const nameGuess = decodeWords(
      String(
        dispo.params.filename
        || contentType.params.filename
        || contentType.params.name
        || ''
      )
    ).trim();
    const isAttachment = dispo.mime.includes('attachment') || (!!nameGuess && !contentType.mime.startsWith('text/'));

    if (isAttachment) {
      return {
        text: '',
        html: '',
        attachments: [{
          name: nameGuess || 'attachment',
          size: Math.max(0, transferDecoded.length),
          type: contentType.mime || ''
        }]
      };
    }

    if (contentType.mime === 'text/html') {
      return { text: '', html: transferDecoded, attachments: [] };
    }
    if (contentType.mime === 'text/plain' || !contentType.mime) {
      return { text: transferDecoded, html: '', attachments: [] };
    }
    if (/<html[\s\S]*<\/html>/i.test(transferDecoded) || /<body[\s\S]*<\/body>/i.test(transferDecoded)) {
      return { text: '', html: transferDecoded, attachments: [] };
    }
    return { text: transferDecoded, html: '', attachments: [] };
  }

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function extractFetchHeader(block) {
    const m = String(block || '').match(/BODY\[HEADER\.FIELDS[^\]]*\]\s*\{\d+\}\r\n([\s\S]*?)(?=\r\nBODY\[TEXT\]|\r\n[A-Z0-9]+\s(?:OK|NO|BAD)|\r\n\))/i);
    return (m && m[1]) ? m[1] : '';
  }

  function extractFetchBodyText(block) {
    const m = String(block || '').match(/BODY\[TEXT\][^\r\n]*\{\d+\}\r\n([\s\S]*?)(?=\r\n\)|\r\n[A-Z0-9]+\s(?:OK|NO|BAD)|$)/i);
    return (m && m[1]) ? m[1] : '';
  }

  function parseMessage(raw, uid) {
    const block = fetchBlocks(raw)[0] || raw;
    const head = parseHeaders(extractFetchHeader(block));
    const bodyRaw = extractFetchBodyText(block);
    const parsed = parseMimeEntity(bodyRaw);
    const html = String(parsed.html || '').trim();
    const text = String(parsed.text || '').trim();
    const attachmentMap = new Map();
    (parsed.attachments || []).forEach((it) => {
      const k = `${it.name}|${it.type}|${it.size}`;
      if (!attachmentMap.has(k)) attachmentMap.set(k, it);
    });
    const attachments = Array.from(attachmentMap.values());
    const snippet = String(text || stripHtml(html) || '').replace(/\r/g, '').replace(/\n{2,}/g, '\n').trim();
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
      body: snippet,
      text,
      html,
      attachments
    };
  }
