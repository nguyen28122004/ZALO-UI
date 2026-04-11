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
