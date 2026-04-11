(() => {
  const ITEM_ID = 'zalous-email-prototype-item';
  const STYLE_ID = 'zalous-email-prototype-style';
  const MAIN_MARKER = 'zalous-email-prototype-main';
  const PINNED_HEIGHT = 78;
  const BASE_TOP_ATTR = 'data-zalous-email-base-top';
  const SHIFTED_ATTR = 'data-zalous-email-shifted';
  const BASE_HEIGHT_ATTR = 'data-zalous-email-base-height';

  function parsePx(value) {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    if (!v.endsWith('px')) return null;
    const n = Number.parseFloat(v.slice(0, -2));
    return Number.isFinite(n) ? n : null;
  }

  function ensureStyle() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      `#${ITEM_ID}{cursor:pointer;position:absolute;left:0;top:0;width:100%;height:${PINNED_HEIGHT}px;z-index:3;}`,
      `#${ITEM_ID} .zalous-email-title{font-weight:600;}`,
      `#${ITEM_ID} .zalous-email-preview{opacity:.72;font-size:12px;margin-top:2px;}`,
      `.${MAIN_MARKER}{display:flex;align-items:center;justify-content:center;height:100%;min-height:220px;padding:24px;box-sizing:border-box;}`,
      `.${MAIN_MARKER} .zalous-email-card{max-width:520px;width:100%;padding:20px;border-radius:12px;border:1px solid rgba(0,0,0,.14);background:rgba(255,255,255,.92);}`,
      `.${MAIN_MARKER} .zalous-email-card h2{margin:0 0 8px;font-size:20px;}`,
      `.${MAIN_MARKER} .zalous-email-card p{margin:0;opacity:.75;}`
    ].join('');
  }

  function createPinnedItem() {
    const item = document.createElement('div');
    item.id = ITEM_ID;
    item.className = 'msg-item pinned';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.innerHTML = [
      '<div class="conv-item-title">',
      '<div class="zalous-email-title">Email (IMAP)</div>',
      '</div>',
      '<div class="zalous-email-preview">Bam vao day de mo man hinh Email demo</div>'
    ].join('');

    const handleActivate = (event) => {
      if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      replaceMainContent();
    };

    item.addEventListener('click', handleActivate);
    item.addEventListener('keydown', handleActivate);
    return item;
  }

  function findListContainer() {
    const firstMsgItem = document.querySelector('.msg-item');
    if (firstMsgItem && firstMsgItem.parentElement) return firstMsgItem.parentElement;
    return null;
  }

  function shiftContainerHeight(container) {
    const currentHeight = parsePx(container.style.height || '');
    if (currentHeight === null) return;

    const prevBase = Number.parseFloat(container.getAttribute(BASE_HEIGHT_ATTR) || '');
    const expected = Number.isFinite(prevBase) ? prevBase + PINNED_HEIGHT : null;

    let baseHeight = prevBase;
    if (!Number.isFinite(prevBase) || expected === null || Math.abs(currentHeight - expected) > 0.5) {
      baseHeight = currentHeight;
      container.setAttribute(BASE_HEIGHT_ATTR, String(baseHeight));
    }

    const nextHeight = baseHeight + PINNED_HEIGHT;
    container.style.height = `${nextHeight}px`;
  }

  function shiftSiblingItems(container) {
    const children = Array.from(container.children);
    for (const child of children) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.id === ITEM_ID) continue;
      if (!child.classList.contains('msg-item')) continue;

      const currentTop = parsePx(child.style.top || '');
      if (currentTop === null) continue;

      const prevBase = Number.parseFloat(child.getAttribute(BASE_TOP_ATTR) || '');
      const shifted = child.getAttribute(SHIFTED_ATTR) === '1';
      const expected = Number.isFinite(prevBase) ? prevBase + PINNED_HEIGHT : null;

      let baseTop = prevBase;
      if (!Number.isFinite(prevBase) || !shifted || expected === null || Math.abs(currentTop - expected) > 0.5) {
        baseTop = currentTop;
        child.setAttribute(BASE_TOP_ATTR, String(baseTop));
      }

      child.style.top = `${baseTop + PINNED_HEIGHT}px`;
      child.setAttribute(SHIFTED_ATTR, '1');
    }
  }

  function ensurePinnedItem() {
    const container = findListContainer();
    if (!container) return false;

    let item = document.getElementById(ITEM_ID);
    if (!item) item = createPinnedItem();
    if (item.parentElement !== container) container.prepend(item);
    if (container.firstElementChild !== item) container.prepend(item);

    shiftContainerHeight(container);
    shiftSiblingItems(container);
    return true;
  }

  function findMainContainer() {
    return (
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('.chat-box') ||
      document.querySelector('[id*="main-content"]')
    );
  }

  function replaceMainContent() {
    const main = findMainContainer();
    if (!main) return;

    main.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = MAIN_MARKER;
    wrapper.innerHTML = [
      '<div class="zalous-email-card">',
      '<h2>Email View Placeholder</h2>',
      '<p>Da clear the main thanh cong. Cho data IMAP ban gui tiep.</p>',
      '</div>'
    ].join('');
    main.appendChild(wrapper);
  }

  ensureStyle();
  ensurePinnedItem();

  if (!window.__zalousEmailPrototypeObserver) {
    const observer = new MutationObserver(() => {
      ensurePinnedItem();
    });
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
    window.__zalousEmailPrototypeObserver = observer;
  }
})();
