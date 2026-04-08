#!/usr/bin/env node

function parseArgs(argv) {
  const out = {
    port: 9222,
    targetMatch: 'Zalo',
    expectedActiveTheme: '',
    expectedThemePackAttr: '',
    selector: '',
    mustIncludeCss: '',
    mustExcludeCss: '',
    skipRequireZalous: false,
    timeoutMs: 7000
  };

  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    const next = argv[i + 1];
    switch (t) {
      case '--port':
        out.port = Number(next || out.port);
        i += 1;
        break;
      case '--target-match':
        out.targetMatch = String(next || '');
        i += 1;
        break;
      case '--expected-active-theme':
        out.expectedActiveTheme = String(next || '');
        i += 1;
        break;
      case '--expected-theme-pack-attr':
        out.expectedThemePackAttr = String(next || '');
        i += 1;
        break;
      case '--selector':
        out.selector = String(next || '');
        i += 1;
        break;
      case '--must-include-css':
        out.mustIncludeCss = String(next || '');
        i += 1;
        break;
      case '--must-exclude-css':
        out.mustExcludeCss = String(next || '');
        i += 1;
        break;
      case '--timeout-ms':
        out.timeoutMs = Number(next || out.timeoutMs);
        i += 1;
        break;
      case '--skip-require-zalous':
        out.skipRequireZalous = true;
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
  let versionRes;
  try {
    versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
  } catch (err) {
    throw new Error(`CDP chua san sang tren http://127.0.0.1:${port}`);
  }
  if (!versionRes.ok) {
    throw new Error(`CDP chua san sang tren http://127.0.0.1:${port}`);
  }

  const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!listRes.ok) {
    throw new Error(`Khong doc duoc danh sach target tren port ${port}`);
  }
  const targets = await listRes.json();
  if (!Array.isArray(targets) || !targets.length) {
    throw new Error(`Khong co target nao tren port ${port}`);
  }

  let candidates = targets.filter((t) => t && t.type === 'page' && t.webSocketDebuggerUrl);
  if (!candidates.length) {
    throw new Error(`Khong tim thay target page co websocket tren port ${port}`);
  }

  if (targetMatch) {
    const filtered = candidates.filter((t) => includesCI(t.title, targetMatch) || includesCI(t.url, targetMatch));
    if (filtered.length) candidates = filtered;
  }

  const preferred = candidates.find((t) => includesCI(t.url, 'pc-dist/index.html'));
  return preferred || candidates[0];
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
      if (msg && typeof msg.id === 'number') {
        settle(msg.id, 'resolve', msg);
      }
    } catch (_) {
    }
  });

  ws.addEventListener('close', () => {
    for (const [id] of pending) {
      settle(id, 'reject', new Error(`WebSocket da dong khi cho response id=${id}`));
    }
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
  const target = await getTarget(opts.port, opts.targetMatch);
  const ws = await connectWebSocket(target.webSocketDebuggerUrl, opts.timeoutMs);
  const cdp = makeCdpClient(ws, opts.timeoutMs);

  try {
    await cdp.send('Runtime.enable', {});

    const payload = {
      selector: opts.selector,
      mustIncludeCss: opts.mustIncludeCss,
      mustExcludeCss: opts.mustExcludeCss
    };
    const expression = `
(() => {
  const input = ${JSON.stringify(payload)};
  const selector = String(input.selector || '');
  const mustInclude = String(input.mustIncludeCss || '');
  const mustExclude = String(input.mustExcludeCss || '');
  const state = window.zalous && typeof window.zalous.getState === 'function' ? window.zalous.getState() : null;
  const styleEl = document.getElementById('zalous-theme-style');
  const styleText = styleEl && styleEl.textContent ? styleEl.textContent : '';
  const el = selector ? document.querySelector(selector) : null;
  const cs = el ? getComputedStyle(el) : null;
  return {
    hasZalous: !!window.zalous,
    source: window.zalous && window.zalous.source ? window.zalous.source : '',
    hasWatcher: !!window.__zalousHotReloadWatcher,
    activeTheme: state && state.config ? (state.config.activeTheme || '') : '',
    patchEnabled: !!(state && state.config && state.config.patchEnabled),
    hotReloadToken: state && state.config && state.config.hotReload ? (state.config.hotReload.token || '') : '',
    htmlThemePack: document.documentElement.getAttribute('data-zalous-theme-pack') || '',
    styleLength: styleText.length,
    cssIncludesExpected: mustInclude ? styleText.includes(mustInclude) : null,
    cssExcludesExpected: mustExclude ? !styleText.includes(mustExclude) : null,
    selectorFound: !!el,
    selectorBorder: cs ? cs.border : '',
    selectorFilter: cs ? cs.filter : ''
  };
})()
`;

    const evalResp = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    if (evalResp.error) {
      throw new Error(`Runtime.evaluate loi: ${JSON.stringify(evalResp.error)}`);
    }
    if (evalResp.result && evalResp.result.exceptionDetails) {
      throw new Error(`Runtime.evaluate exception: ${JSON.stringify(evalResp.result.exceptionDetails)}`);
    }

    const runtime = (evalResp.result && evalResp.result.result && evalResp.result.result.value)
      ? evalResp.result.result.value
      : {};
    const errors = [];

    if (!opts.skipRequireZalous && !runtime.hasZalous) {
      errors.push('window.zalous khong ton tai trong runtime');
    }
    if (opts.expectedActiveTheme && runtime.activeTheme !== opts.expectedActiveTheme) {
      errors.push(`activeTheme mismatch. expected='${opts.expectedActiveTheme}' actual='${runtime.activeTheme || ''}'`);
    }
    if (opts.expectedThemePackAttr && runtime.htmlThemePack !== opts.expectedThemePackAttr) {
      errors.push(`data-zalous-theme-pack mismatch. expected='${opts.expectedThemePackAttr}' actual='${runtime.htmlThemePack || ''}'`);
    }
    if (opts.selector && !runtime.selectorFound) {
      errors.push(`Selector khong tim thay: ${opts.selector}`);
    }
    if (opts.mustIncludeCss && runtime.cssIncludesExpected !== true) {
      errors.push('CSS khong chua chuoi bat buoc (MustIncludeCss)');
    }
    if (opts.mustExcludeCss && runtime.cssExcludesExpected !== true) {
      errors.push('CSS van con chuoi cam (MustExcludeCss)');
    }

    const report = {
      pass: errors.length === 0,
      checkedAt: new Date().toISOString(),
      target: {
        title: target.title || '',
        url: target.url || '',
        webSocketDebuggerUrl: target.webSocketDebuggerUrl || ''
      },
      runtime,
      errors
    };

    console.log(JSON.stringify(report, null, 2));
    process.exit(errors.length ? 2 : 0);
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

run().catch((err) => {
  console.error(`[cdp-verify] ${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
