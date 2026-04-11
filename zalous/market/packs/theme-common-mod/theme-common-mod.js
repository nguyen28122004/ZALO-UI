(() => {
  const STYLE_ID = 'zalous-common-theme-mod';
  const HIDE_ATTR = 'data-zalous-hide-unlock';
  const UNLOCK_TRANSLATE_SELECTOR = '[data-translate-inner="STR_APP_UNLOCK"]';
  const LIST_REPAIR_ATTR = 'data-zalous-list-repaired';

  function loadCss() {
    try {
      const embedded = window.__ZALOUS_EMBEDDED__ || {};
      const themes = embedded.themes || {};
      if (themes['zalo-common.css']) return themes['zalo-common.css'];
    } catch (_) {}

    try {
      if (typeof require !== 'function') return '';
      const fs = require('fs');
      const path = require('path');
      const appData = process.env.APPDATA;
      if (!appData) return '';
      const p = path.join(appData, 'Zalous', 'themes', 'zalo-common.css');
      if (!fs.existsSync(p)) return '';
      return fs.readFileSync(p, 'utf8');
    } catch (_) {
      return '';
    }
  }

  function hideUnlockByTranslate(scope) {
    const root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    const nodes = root.querySelectorAll(UNLOCK_TRANSLATE_SELECTOR);
    nodes.forEach((node) => {
      const target = node.closest('button,[role="button"],input[type="button"],input[type="submit"]') || node;
      if (!target || target.getAttribute(HIDE_ATTR) === '1') return;
      target.setAttribute(HIDE_ATTR, '1');
      target.style.setProperty('display', 'none', 'important');
      target.style.setProperty('visibility', 'hidden', 'important');
      target.style.setProperty('opacity', '0', 'important');
      target.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function px(value) {
    if (typeof value !== 'string') return null;
    const t = value.trim().toLowerCase();
    if (!t.endsWith('px')) return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }

  function shouldRepairContainer(container) {
    if (!(container instanceof HTMLElement)) return false;
    const rows = Array.from(container.children).filter((el) => el instanceof HTMLElement && el.classList.contains('msg-item'));
    if (rows.length < 3) return false;

    const h = px(container.style.height || '');
    const allTop = rows.map((row) => px(row.style.top || '')).filter((v) => v != null);
    const uniqTop = new Set(allTop);
    const rowHeight = px(rows[0].style.height || '') || 78;
    if (rowHeight <= 0) return false;

    const zeroOrCollapsed = (h == null || h <= rowHeight);
    const stacked = uniqTop.size <= 1;
    return zeroOrCollapsed && stacked;
  }

  function repairContainer(container) {
    const rows = Array.from(container.children).filter((el) => el instanceof HTMLElement && el.classList.contains('msg-item'));
    if (!rows.length) return false;
    const rowHeight = px(rows[0].style.height || '') || 78;
    rows.forEach((row, idx) => {
      row.style.top = `${idx * rowHeight}px`;
      row.style.left = row.style.left || '0px';
      row.style.width = row.style.width || '100%';
      row.style.position = 'absolute';
    });
    container.style.height = `${rows.length * rowHeight}px`;
    container.setAttribute(LIST_REPAIR_ATTR, String(Date.now()));
    return true;
  }

  function repairConversationList(scope) {
    const root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    const containers = root.querySelectorAll('.ReactVirtualized__Grid__innerScrollContainer');
    containers.forEach((container) => {
      if (shouldRepairContainer(container)) repairContainer(container);
    });
  }

  const css = loadCss();
  const forceHideCss = [
    '.app-lock__main__input.disableBtn{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}',
    '[data-translate-inner="STR_APP_UNLOCK"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}',
    '[data-zalous-hide-unlock="1"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}'
  ].join('');

  const marketAndMailCss = [
    '#zalous-market-modal.zalous-market-overlay, #zalous-ext-config-modal.zalous-config-overlay {',
    '  --zm-accent: var(--button-primary-normal, var(--accent-blue-bg, #60a5fa));',
    '  --zm-accent-soft: var(--button-primary-tonal-normal, rgba(96,165,250,.2));',
    '  --zm-text: var(--text-primary, #e5e7eb);',
    '  --zm-muted: var(--text-secondary, #9ca3af);',
    '  --zm-border: var(--border, rgba(148,163,184,.32));',
    '  --zm-surface: var(--layer-background, #111827);',
    '  --zm-surface-1: var(--surface-background, #111827);',
    '  --zm-surface-2: var(--layer-background-subtle, #1f2937);',
    '  --zm-surface-3: var(--layer-background-hover, #374151);',
    '  --zm-hover: var(--layer-background-selected, rgba(96,165,250,.16));',
    '}',
    '.zalous-email-prototype-main {',
    '  --zmail-accent: var(--button-primary-normal, var(--accent-blue-bg, #2563eb));',
    '  --zmail-accent-soft: var(--button-primary-tonal-normal, rgba(37,99,235,.2));',
    '  --zmail-bg-a: var(--surface-background, #f8fbff);',
    '  --zmail-bg-b: var(--layer-background-subtle, #eef4ff);',
    '  --zmail-surface: var(--layer-background, #ffffff);',
    '  --zmail-surface-2: var(--surface-background-subtle, #f8fafc);',
    '  --zmail-text: var(--text-primary, #0f172a);',
    '  --zmail-text-muted: var(--text-secondary, #64748b);',
    '  --zmail-border: var(--border-subtle, rgba(148,163,184,.24));',
    '}'
  ].join('');

  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = (css || '') + forceHideCss + marketAndMailCss;

  hideUnlockByTranslate(document);
  repairConversationList(document);
  if (!window.__zalousCommonUnlockObserver) {
    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === 'childList') {
          rec.addedNodes.forEach((node) => {
            if (node && node.nodeType === 1) {
              hideUnlockByTranslate(node);
              repairConversationList(node);
            }
          });
        }
        if (rec.type === 'attributes' && rec.target && rec.target.nodeType === 1) {
          hideUnlockByTranslate(rec.target);
          repairConversationList(rec.target);
        }
      }
      hideUnlockByTranslate(document);
      repairConversationList(document);
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-translate-inner']
    });
    window.__zalousCommonUnlockObserver = observer;
  }
})();
