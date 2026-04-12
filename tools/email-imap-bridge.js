const http = require('http');
const tls = require('tls');
const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOST = process.env.ZALOUS_EMAIL_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.ZALOUS_EMAIL_BRIDGE_PORT || 3921);
const SYNC_MS = Math.max(15000, Number(process.env.ZALOUS_EMAIL_BRIDGE_SYNC_MS || 60000));
const MAX_UIDS_PER_FOLDER = Math.max(20, Number(process.env.ZALOUS_EMAIL_CACHE_MAX_UIDS || 120));
const PREVIEW_BYTES = Math.max(4096, Math.min(262144, Number(process.env.ZALOUS_EMAIL_CACHE_PREVIEW_BYTES || 65536)));
const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const ZALOUS_DIR = path.join(APPDATA_DIR, 'Zalous');
const ZALOUS_CONFIG_PATH = path.join(ZALOUS_DIR, 'config.json');
const CACHE_PATH = process.env.ZALOUS_EMAIL_CACHE_PATH || path.join(ZALOUS_DIR, 'email-imap-cache.json');

function json(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      if (buf.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!buf.trim()) return resolve({});
      try {
        resolve(JSON.parse(buf));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function normalizeCharset(charset) {
  const raw = String(charset || '').trim().toLowerCase();
  if (!raw) return 'utf-8';
  if (raw === 'utf8' || raw === 'utf_8') return 'utf-8';
  if (raw === 'iso-8859-1') return 'windows-1252';
  return raw;
}

function decodeBytes(bytes, charset) {
  const label = normalizeCharset(charset);
  if (!bytes || !bytes.length) return '';
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch (_) {}
  try {
    const nodeCharset = label === 'windows-1252' ? 'latin1' : label.replace(/-/g, '');
    return Buffer.from(bytes).toString(nodeCharset);
  } catch (_) {}
  return Array.from(bytes).map((n) => String.fromCharCode(n)).join('');
}

function quotedPrintableToBytes(v, treatUnderscoreAsSpace) {
  const input = String(v || '').replace(/=\r?\n/g, '');
  const out = [];
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(input.slice(i + 1, i + 3))) {
      out.push(parseInt(input.slice(i + 1, i + 3), 16));
      i += 2;
      continue;
    }
    if (treatUnderscoreAsSpace && ch === '_') {
      out.push(0x20);
      continue;
    }
    out.push(ch.charCodeAt(0) & 0xff);
  }
  return Uint8Array.from(out);
}

function decodeWords(v) {
  if (!v) return '';
  return String(v)
    .replace(/\r?\n\s+/g, ' ')
    .replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, data) => {
      try {
        const charset = normalizeCharset(cs);
        const bytes = String(enc).toUpperCase() === 'B'
          ? Uint8Array.from(Buffer.from(String(data || ''), 'base64'))
          : quotedPrintableToBytes(data, true);
        return decodeBytes(bytes, charset);
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
  return m ? String(m[1] || '').trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite).sort((a, b) => b - a) : [];
}

function fetchBlocks(raw) {
  const matches = [...String(raw || '').matchAll(/^\* \d+ FETCH \(/gim)];
  if (!matches.length) return [];
  return matches.map((m, i) => {
    const endAt = i + 1 < matches.length ? matches[i + 1].index : (raw.lastIndexOf('\r\nA') > m.index ? raw.lastIndexOf('\r\nA') : raw.length);
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

function decodeQuotedPrintable(v, charset) {
  return decodeBytes(quotedPrintableToBytes(v, false), charset);
}

function decodeBase64(v, charset) {
  const raw = String(v || '').replace(/\s+/g, '');
  if (!raw) return '';
  try {
    return decodeBytes(Uint8Array.from(Buffer.from(raw, 'base64')), charset);
  } catch (_) {
    return '';
  }
}

function decodeTransferBody(content, headers, charset) {
  const enc = String((headers && headers['content-transfer-encoding']) || '').toLowerCase();
  if (enc.includes('quoted-printable')) return decodeQuotedPrintable(content, charset);
  if (enc.includes('base64')) return decodeBase64(content, charset);
  return decodeBytes(quotedPrintableToBytes(content, false), charset);
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
  const transferDecoded = decodeTransferBody(node.body || '', node.headers, contentType.params.charset).trim();

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
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function parseMessageBlock(block, uid) {
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

function parseMessageBatch(raw) {
  return fetchBlocks(raw).map((block) => {
    const uid = String(Number((block.match(/UID (\d+)/i) || [])[1] || 0));
    return parseMessageBlock(block, uid);
  }).filter((m) => Number(m.uid) > 0);
}

class RawImapClient {
  constructor(conf) {
    this.conf = conf;
    this.socket = null;
    this.buf = '';
    this.current = null;
    this.connected = false;
    this.seq = 1;
  }

  connect() {
    if (this.connected && this.socket) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const opts = {
        host: this.conf.host,
        port: Number(this.conf.port) || 993,
        servername: this.conf.host,
        rejectUnauthorized: !this.conf.allowSelfSigned
      };
      this.socket = this.conf.ssl ? tls.connect(opts) : net.connect(opts);
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
    if (!this.socket || !this.connected) return Promise.reject(new Error('IMAP not connected.'));
    if (this.current) return Promise.reject(new Error('IMAP busy.'));
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

  async close() {
    if (!this.socket) return;
    try { if (this.connected) await this.cmd('LOGOUT'); } catch (_) {}
    try { this.socket.end(); } catch (_) {}
    this.connected = false;
    this.socket = null;
  }
}

async function withImap(auth, work) {
  const conf = auth || {};
  if (!conf.host || !conf.username || !conf.password) throw new Error('Missing IMAP auth fields.');
  const client = new RawImapClient({
    host: String(conf.host || ''),
    port: Number(conf.port) || 993,
    ssl: conf.ssl !== false,
    username: String(conf.username || ''),
    password: String(conf.password || ''),
    allowSelfSigned: !!conf.allowSelfSigned
  });
  try {
    await client.connect();
    return await work(client);
  } finally {
    await client.close().catch(() => {});
  }
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function readAppConfig() {
  if (!fs.existsSync(ZALOUS_CONFIG_PATH)) return null;
  try {
    return readJsonFile(ZALOUS_CONFIG_PATH);
  } catch (err) {
    console.error('[email-bridge] read config failed:', err && err.message ? err.message : err);
    return null;
  }
}

function getEmailExtConfig(appCfg) {
  const ext = appCfg && appCfg.extensionConfigs ? appCfg.extensionConfigs['email-prototype.js'] : null;
  return (ext && typeof ext === 'object') ? ext : null;
}

function resolveAuthFromConfig(extCfg) {
  const cfg = extCfg || {};
  return {
    host: String(cfg.imapHost || ''),
    port: Number(cfg.imapPort) || 993,
    ssl: cfg.imapSsl !== false,
    username: String(cfg.username || ''),
    password: String(cfg.password || ''),
    allowSelfSigned: !!cfg.allowSelfSigned
  };
}

function toFileUrl(winPath) {
  const abs = path.resolve(winPath).replace(/\\/g, '/');
  return `file:///${abs.replace(/^\/+/, '')}`;
}

async function buildCache(auth, extCfg) {
  const pageSize = Math.max(5, Math.min(200, Number((extCfg && extCfg.pageSize) || 20)));
  const previewBytes = Math.max(4096, Math.min(262144, Number((extCfg && extCfg.previewBytes) || PREVIEW_BYTES)));
  const maxUids = Math.max(pageSize * 6, MAX_UIDS_PER_FOLDER);

  return withImap(auth, async (client) => {
    const list = parseList(await client.cmd('LIST "" "*"'));
    const folders = [];
    const byFolder = {};

    for (const f of list) {
      let status = { name: f.name, messages: 0, unseen: 0, recent: 0 };
      try {
        status = parseStatus(await client.cmd(`STATUS ${q(f.name)} (MESSAGES UNSEEN RECENT UIDNEXT UIDVALIDITY)`), f.name);
      } catch (_) {}
      folders.push({ ...f, ...status });
    }

    for (const folder of folders) {
      try {
        await client.cmd(`SELECT ${q(folder.name)}`);
        const uidsAll = parseSearch(await client.cmd('UID SEARCH ALL'));
        const uids = uidsAll.slice(0, maxUids);
        const rows = {};
        const messages = {};

        for (let i = 0; i < uids.length; i += 40) {
          const chunk = uids.slice(i, i + 40);
          if (!chunk.length) continue;
          const uidCsv = chunk.join(',');
          const rowRaw = await client.cmd(`UID FETCH ${uidCsv} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`);
          parseListFetch(rowRaw).forEach((row) => { rows[String(row.uid)] = row; });
          const msgRaw = await client.cmd(`UID FETCH ${uidCsv} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.${previewBytes}>)`);
          parseMessageBatch(msgRaw).forEach((msg) => { messages[String(msg.uid)] = msg; });
        }

        byFolder[folder.name] = {
          uids,
          rows,
          messages
        };
      } catch (err) {
        byFolder[folder.name] = {
          uids: [],
          rows: {},
          messages: {},
          error: err && err.message ? err.message : String(err)
        };
      }
    }

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      source: 'imap-cache-sync',
      folders,
      byFolder
    };
  });
}

async function syncCacheFromAppConfig() {
  const appCfg = readAppConfig();
  const extCfg = getEmailExtConfig(appCfg);
  if (!extCfg) throw new Error('Missing extensionConfigs.email-prototype.js in config.json');
  const auth = resolveAuthFromConfig(extCfg);
  if (!auth.host || !auth.username || !auth.password) {
    throw new Error('Missing IMAP credentials in config.json extensionConfigs.email-prototype.js');
  }

  const cache = await buildCache(auth, extCfg);
  const next = {
    ...cache,
    cachePath: CACHE_PATH,
    cacheUrl: toFileUrl(CACHE_PATH)
  };
  const tmp = `${CACHE_PATH}.tmp`;
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(tmp, CACHE_PATH);
  return next;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.end();
    return;
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await parseBody(req);
    const authRaw = body.auth || {};
    const auth = {
      host: authRaw.host,
      port: authRaw.port,
      ssl: authRaw.ssl !== false,
      username: authRaw.username,
      password: authRaw.password,
      allowSelfSigned: !!body.allowSelfSigned
    };

    if (req.url === '/imap/ping') {
      await withImap(auth, async () => true);
      return json(res, 200, { ok: true });
    }

    if (req.url === '/imap/folders') {
      const folders = await withImap(auth, async (client) => {
        const list = parseList(await client.cmd('LIST "" "*"'));
        const out = [];
        for (const f of list) {
          try {
            const st = parseStatus(await client.cmd(`STATUS ${q(f.name)} (MESSAGES UNSEEN RECENT UIDNEXT UIDVALIDITY)`), f.name);
            out.push({ ...f, ...st });
          } catch (_) {
            out.push({ ...f, messages: 0, unseen: 0, recent: 0 });
          }
        }
        return out;
      });
      return json(res, 200, { ok: true, folders });
    }

    if (req.url === '/imap/search') {
      const folder = String(body.folder || 'INBOX');
      const uids = await withImap(auth, async (client) => {
        await client.cmd(`SELECT ${q(folder)}`);
        return parseSearch(await client.cmd('UID SEARCH ALL'));
      });
      return json(res, 200, { ok: true, uids });
    }

    if (req.url === '/imap/page') {
      const folder = String(body.folder || 'INBOX');
      const uids = Array.isArray(body.uids) ? body.uids.map(Number).filter(Number.isFinite) : [];
      if (!uids.length) return json(res, 200, { ok: true, rows: [] });
      const rows = await withImap(auth, async (client) => {
        await client.cmd(`SELECT ${q(folder)}`);
        return parseListFetch(await client.cmd(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`));
      });
      return json(res, 200, { ok: true, rows });
    }

    if (req.url === '/imap/message') {
      const folder = String(body.folder || 'INBOX');
      const uid = String(body.uid || '');
      const previewBytes = Math.max(4096, Math.min(262144, Number(body.previewBytes) || 65536));
      if (!uid) return json(res, 400, { ok: false, error: 'Missing uid' });
      const message = await withImap(auth, async (client) => {
        await client.cmd(`SELECT ${q(folder)}`);
        return parseMessage(await client.cmd(`UID FETCH ${uid} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.${previewBytes}>)`), uid);
      });
      return json(res, 200, { ok: true, message });
    }

    if (req.url === '/imap/cache') {
      if (!fs.existsSync(CACHE_PATH)) return json(res, 404, { ok: false, error: 'Cache file not found' });
      const cache = readJsonFile(CACHE_PATH);
      return json(res, 200, { ok: true, generatedAt: cache.generatedAt || '', cachePath: CACHE_PATH, cacheUrl: cache.cacheUrl || toFileUrl(CACHE_PATH) });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : String(err) });
  }
});

let syncBusy = false;

async function runSync(label) {
  if (syncBusy) return;
  syncBusy = true;
  try {
    const out = await syncCacheFromAppConfig();
    console.log(`[email-bridge] sync ok (${label}) at ${out.generatedAt} -> ${out.cachePath}`);
  } catch (err) {
    console.error(`[email-bridge] sync failed (${label}):`, err && err.message ? err.message : err);
  } finally {
    syncBusy = false;
  }
}

server.listen(PORT, HOST, () => {
  console.log(`[email-bridge] listening on http://${HOST}:${PORT}`);
  runSync('startup').catch(() => {});
  setInterval(() => {
    runSync('interval').catch(() => {});
  }, SYNC_MS);
});
