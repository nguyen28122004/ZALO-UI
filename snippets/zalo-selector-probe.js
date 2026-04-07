(() => {
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return null;
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && path.length < 6) {
      let part = node.nodeName.toLowerCase();
      if (node.id) {
        part += `#${CSS.escape(node.id)}`;
        path.unshift(part);
        break;
      }
      const stableAttrs = ['data-testid', 'data-id', 'aria-label', 'role', 'name'];
      for (const attr of stableAttrs) {
        const v = node.getAttribute(attr);
        if (v) {
          part += `[${attr}="${CSS.escape(v)}"]`;
          break;
        }
      }
      if (!part.includes('[') && node.classList.length) {
        const c = [...node.classList].find((x) => x.length < 28 && /^[a-zA-Z0-9_-]+$/.test(x));
        if (c) part += `.${CSS.escape(c)}`;
      }
      path.unshift(part);
      node = node.parentElement;
    }
    return path.join(' > ');
  }

  function pick() {
    const q = (s) => document.querySelector(s);
    return {
      appRoot: q('#app, body > div[id], [class*="app"]'),
      sidebar: q('[role="navigation"], nav, [class*="sidebar"]'),
      threadList: q('[aria-label*="conversation" i], [class*="conversation"], [class*="thread-list"]'),
      chatHeader: q('header, [class*="chat-header"], [class*="conversation-header"]'),
      messagePane: q('[role="log"], [class*="message-pane"], [class*="chat-content"]'),
      composer: q('textarea, [contenteditable="true"], [class*="composer"]'),
      sendBtn: q('button[aria-label*="send" i], button[type="submit"], [class*="send"]')
    };
  }

  function run() {
    const mapped = pick();
    const rows = Object.entries(mapped).map(([key, el]) => ({
      element: key,
      found: !!el,
      selectorHint: cssPath(el)
    }));
    console.table(rows);
    return { mapped, rows };
  }

  window.zaloProbe = { run, cssPath };
  console.log('zaloProbe ready: run `zaloProbe.run()`');
})();
