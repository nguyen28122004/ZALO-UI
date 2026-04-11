(() => {
  const STYLE_ID = 'zalous-lock-pin-style';

  function isVisible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 6 && r.height > 6;
  }

  function ensureStyle() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      '.zalous-pin-host{display:flex;justify-content:center;align-items:center;width:220px;max-width:82vw;height:40px;margin:0 auto;border:1px solid #b8cfc1;border-radius:12px;background:#fff;box-sizing:border-box;cursor:text;position:relative;z-index:2}',
      '.zalous-pin-dots{display:grid;grid-template-columns:repeat(4,10px);column-gap:14px;align-items:center;justify-items:center;height:10px}',
      '.zalous-pin-dot{width:10px;height:10px;border-radius:999px;background:#c9ddd1;transition:transform .15s ease,background-color .15s ease}',
      '.zalous-pin-dot.filled{background:#14532d;transform:scale(1.14)}',
      '[data-zalous-hide-unlock=\"1\"]{display:none !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}'
    ].join('');
  }

  function hideUnlockControls(scope) {
    const root = scope || document;
    const nodes = root.querySelectorAll('button,[role=\"button\"],input[type=\"submit\"],input[type=\"button\"],[class*=\"unlock\" i],[id*=\"unlock\" i]');
    nodes.forEach((el) => {
      const txt = String((el.textContent || el.value || '')).trim().toLowerCase();
      const cls = String(el.className || '').toLowerCase();
      const id = String(el.id || '').toLowerCase();
      const isUnlock = txt.includes('unlock') || txt.includes('mở khóa') || cls.includes('unlock') || id.includes('unlock');
      if (!isUnlock) return;
      el.setAttribute('data-zalous-hide-unlock', '1');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function restoreInput(input) {
    if (!input) return;
    const host = input.__zalousHost;
    if (host && host.parentElement) host.remove();
    input.__zalousHost = null;
    input.dataset.zalousPinReady = '0';
    input.style.position = '';
    input.style.left = '';
    input.style.top = '';
    input.style.transform = '';
    input.style.width = '';
    input.style.maxWidth = '';
    input.style.height = '';
    input.style.margin = '';
    input.style.opacity = '';
    input.style.pointerEvents = '';
    input.style.zIndex = '';
    if (input.__zalousPinTimer) {
      clearInterval(input.__zalousPinTimer);
      input.__zalousPinTimer = null;
    }
  }

  function pickCandidates() {
    const selectors = [
      '.app-lock__main__input',
      'input#passcode',
      'input[type="password"]',
      'input[placeholder*="mã khóa" i]',
      'input[placeholder*="ma khoa" i]',
      'input[placeholder*="pin" i]',
      'input[name*="pass" i]',
      'input[name*="pin" i]'
    ];
    const set = new Set();
    selectors.forEach((s) => document.querySelectorAll(s).forEach((el) => set.add(el)));
    return [...set].filter((el) => {
      if (!(el instanceof HTMLInputElement)) return false;
      if (el.getAttribute('data-zalous-skip-pin') === '1') return false;
      if (el.closest('.zalous-email-prototype-main')) return false;
      const lockScope = el.closest('.app-lock__main, .app-lock, [class*="app-lock"], [class*="lock-screen"]');
      return !!lockScope;
    });
  }

  function enhance(input) {
    if (!input || input.dataset.zalousPinReady === '1') return;
    const parent = input.parentElement;
    if (!parent) return;

    const hint = ((input.id || '') + ' ' + (input.className || '') + ' ' + (input.placeholder || '') + ' ' + (input.name || '')).toLowerCase();
    const isPin = input.type === 'password' || hint.includes('passcode') || hint.includes('mã khóa') || hint.includes('ma khoa') || hint.includes('pin') || hint.includes('lock');
    if (!isPin) return;
    if (!isVisible(parent) && !isVisible(input)) return;
    hideUnlockControls(parent.closest('.app-lock__main') || parent.closest('[class*="app-lock"]') || parent);

    parent.querySelectorAll('.zalo-lock-pin-host').forEach((el) => el.remove());
    parent.querySelectorAll('.zalous-pin-host').forEach((el) => el.remove());

    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

    const host = document.createElement('div');
    host.className = 'zalous-pin-host';
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'zalous-pin-dots';
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('span');
      d.className = 'zalous-pin-dot';
      dotsWrap.appendChild(d);
    }
    host.appendChild(dotsWrap);
    parent.insertBefore(host, input);
    input.__zalousHost = host;

    if (!isVisible(host)) {
      restoreInput(input);
      return;
    }

    input.style.position = 'absolute';
    input.style.left = '50%';
    input.style.top = '50%';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.width = '220px';
    input.style.maxWidth = '82vw';
    input.style.height = '40px';
    input.style.margin = '0';
    input.style.opacity = '0';
    input.style.pointerEvents = 'auto';
    input.style.zIndex = '3';

    const dots = [...host.querySelectorAll('.zalous-pin-dot')];
    const read = () => {
      const dom = String(input.value || '').replace(/\D/g, '').slice(0, 4);
      const shadow = String(input.dataset.zalousPinShadow || '').replace(/\D/g, '').slice(0, 4);
      return dom.length >= shadow.length ? dom : shadow;
    };
    const write = (v) => {
      input.dataset.zalousPinShadow = String(v || '').replace(/\D/g, '').slice(0, 4);
    };
    const sync = () => {
      if (!input.__zalousHost || !isVisible(input.__zalousHost)) {
        restoreInput(input);
        return;
      }
      const val = read();
      for (let i = 0; i < dots.length; i++) dots[i].classList.toggle('filled', i < val.length);
    };

    host.addEventListener('click', () => { input.focus(); setTimeout(() => input.focus(), 0); });
    host.addEventListener('mousedown', (e) => e.preventDefault());
    input.addEventListener('keydown', (e) => {
      const key = String(e.key || '');
      const prev = read();
      if (/^\d$/.test(key)) write((prev + key).slice(0, 4));
      if (key === 'Backspace' || key === 'Delete') write(prev.slice(0, -1));
      setTimeout(sync, 0);
    }, true);
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    input.addEventListener('paste', (e) => {
      const txt = String((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, '').slice(0, 4);
      if (txt) write(txt);
      setTimeout(sync, 0);
    }, true);

    if (!input.__zalousPinTimer) input.__zalousPinTimer = setInterval(sync, 180);
    input.dataset.zalousPinReady = '1';
    sync();
  }

  function scan() {
    ensureStyle();
    hideUnlockControls(document);
    pickCandidates().forEach((input) => {
      const host = input.__zalousHost || (input.parentElement && input.parentElement.querySelector('.zalous-pin-host'));
      if (input.dataset.zalousPinReady === '1' && (!host || !isVisible(host))) {
        restoreInput(input);
      }
    });
    pickCandidates().forEach((input) => enhance(input));
  }

  scan();
  if (!window.__zalousPinObs) {
    window.__zalousPinObs = new MutationObserver(scan);
    window.__zalousPinObs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }
})();
