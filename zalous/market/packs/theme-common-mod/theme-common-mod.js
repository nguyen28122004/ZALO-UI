(() => {
  const STYLE_ID = 'zalous-common-theme-mod';

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

  const css = loadCss();
  if (!css) return;

  let tag = document.getElementById(STYLE_ID);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
})();
