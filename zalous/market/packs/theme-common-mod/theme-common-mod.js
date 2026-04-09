(() => {
  const STYLE_ID = 'zalous-common-theme-mod';
  const HIDE_ATTR = 'data-zalous-hide-unlock';
  const UNLOCK_TRANSLATE_SELECTOR = '[data-translate-inner="STR_APP_UNLOCK"]';

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

  const css = loadCss();
  const forceHideCss = [
    '.app-lock__main__input.disableBtn{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}',
    '[data-translate-inner="STR_APP_UNLOCK"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}',
    '[data-zalous-hide-unlock="1"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}'
  ].join('');

  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = (css || '') + forceHideCss;

  hideUnlockByTranslate(document);
  if (!window.__zalousCommonUnlockObserver) {
    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === 'childList') {
          rec.addedNodes.forEach((node) => {
            if (node && node.nodeType === 1) hideUnlockByTranslate(node);
          });
        }
        if (rec.type === 'attributes' && rec.target && rec.target.nodeType === 1) {
          hideUnlockByTranslate(rec.target);
        }
      }
      hideUnlockByTranslate(document);
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
