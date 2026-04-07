(() => {
  const STYLE_ID = 'zalo-runtime-mod-style';

  function ensureStyleTag() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    return tag;
  }

  function apply(cssText) {
    const tag = ensureStyleTag();
    tag.textContent = String(cssText || '');
    return tag;
  }

  function append(cssText) {
    const tag = ensureStyleTag();
    tag.textContent += '\n' + String(cssText || '');
    return tag;
  }

  function clear() {
    const tag = document.getElementById(STYLE_ID);
    if (tag) tag.remove();
  }

  function setVar(name, value, priority = 'important') {
    if (!name || !String(name).startsWith('--')) {
      throw new Error('name phai la CSS custom property, vd --accent');
    }
    document.documentElement.style.setProperty(name, String(value), priority);
  }

  function inspectRootVars() {
    const cs = getComputedStyle(document.documentElement);
    return [...cs]
      .filter((n) => n.startsWith('--'))
      .sort()
      .map((n) => ({ name: n, value: cs.getPropertyValue(n).trim() }));
  }

  window.zaloMod = { apply, append, clear, setVar, inspectRootVars };
  console.log('zaloMod ready:', Object.keys(window.zaloMod));
})();
