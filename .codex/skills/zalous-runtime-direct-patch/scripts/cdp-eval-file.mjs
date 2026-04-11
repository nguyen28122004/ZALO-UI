#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {
    port: 9222,
    targetMatch: 'Zalo',
    filePath: '',
    timeoutMs: 7000
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    switch (token) {
      case '--port':
        out.port = Number(next || out.port);
        i += 1;
        break;
      case '--target-match':
        out.targetMatch = String(next || out.targetMatch);
        i += 1;
        break;
      case '--file':
        out.filePath = String(next || '');
        i += 1;
        break;
      case '--timeout-ms':
        out.timeoutMs = Number(next || out.timeoutMs);
        i += 1;
        break;
      default:
        break;
    }
  }
  return out;
}

function includesCI(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

async function getTarget(port, targetMatch) {
  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!listRes.ok) throw new Error(`Khong doc duoc danh sach target tren port ${port}`);
  const targets = await listRes.json();
  if (!Array.isArray(targets) || !targets.length) throw new Error(`Khong co target nao tren port ${port}`);

  let pages = targets.filter((t) => t && t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pages.length) throw new Error(`Khong tim thay target page co websocket tren port ${port}`);

  if (targetMatch) {
    const filtered = pages.filter((t) => includesCI(t.title, targetMatch) || includesCI(t.url, targetMatch));
    if (filtered.length) pages = filtered;
  }

  const preferred = pages.find((t) => includesCI(t.url, 'pc-dist/index.html'));
  return preferred || pages[0];
}

function connectWebSocket(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      reject(new Error(`Mo websocket timeout sau ${timeoutMs}ms`));
    }, timeoutMs);

    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(ws);
    }, { once: true });

    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Khong the mo websocket CDP'));
    }, { once: true });
  });
}

function makeCdpClient(ws, timeoutMs) {
  let nextId = 1;
  const pending = new Map();

  function settle(id, cbName, payload) {
    const slot = pending.get(id);
    if (!slot) return;
    clearTimeout(slot.timer);
    pending.delete(id);
    slot[cbName](payload);
  }

  ws.addEventListener('message', (event) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : String(event.data || '');
      const msg = JSON.parse(raw);
      if (msg && typeof msg.id === 'number') settle(msg.id, 'resolve', msg);
    } catch (_) {
    }
  });

  ws.addEventListener('close', () => {
    for (const [id] of pending) settle(id, 'reject', new Error(`WebSocket da dong khi cho response id=${id}`));
  });

  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      const payload = { id, method, params };

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Khong nhan duoc response cho ${method} (id=${id}) trong ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try {
          ws.send(JSON.stringify(payload));
        } catch (err) {
          clearTimeout(timer);
          pending.delete(id);
          reject(err);
        }
      });
    }
  };
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.filePath) throw new Error('Thieu --file <path-to-js-file>');

  const fullPath = path.resolve(process.cwd(), opts.filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`Khong tim thay file: ${fullPath}`);

  const source = fs.readFileSync(fullPath, 'utf8');
  if (!String(source || '').trim()) throw new Error(`File rong: ${fullPath}`);

  const target = await getTarget(opts.port, opts.targetMatch);
  const ws = await connectWebSocket(target.webSocketDebuggerUrl, opts.timeoutMs);
  const cdp = makeCdpClient(ws, opts.timeoutMs);

  try {
    await cdp.send('Runtime.enable', {});
    const resp = await cdp.send('Runtime.evaluate', {
      expression: source,
      awaitPromise: true,
      returnByValue: true,
      replMode: false,
      userGesture: true
    });

    if (resp.error) {
      throw new Error(`Runtime.evaluate loi: ${JSON.stringify(resp.error)}`);
    }
    if (resp.result && resp.result.exceptionDetails) {
      throw new Error(`Runtime.evaluate exception: ${JSON.stringify(resp.result.exceptionDetails)}`);
    }

    const out = {
      pass: true,
      injectedAt: new Date().toISOString(),
      target: {
        title: target.title || '',
        url: target.url || ''
      },
      file: fullPath,
      resultType: resp.result && resp.result.result ? (resp.result.result.type || '') : ''
    };
    console.log(JSON.stringify(out, null, 2));
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

run().catch((err) => {
  console.error(`[cdp-eval-file] ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
