(() => {
  const key = 'data-zalous-theme-pack';
  const root = document.documentElement;
  const body = document.body;
  const prev = root.getAttribute(key);
  const prevRootScheme = root.style.getPropertyValue('color-scheme');
  const prevBodyScheme = body ? body.style.getPropertyValue('color-scheme') : '';
  const prevRootDark = root.classList.contains('dark');
  const prevRootLight = root.classList.contains('light');
  const prevBodyDark = body ? body.classList.contains('dark') : false;
  const prevBodyLight = body ? body.classList.contains('light') : false;

  root.setAttribute(key, 'console-minimal');
  root.classList.add('dark');
  root.classList.remove('light');
  root.style.setProperty('color-scheme', 'dark', 'important');

  if (body) {
    body.classList.add('dark');
    body.classList.remove('light');
    body.style.setProperty('color-scheme', 'dark', 'important');
  }

  return () => {
    if (prev === null) root.removeAttribute(key);
    else root.setAttribute(key, prev);

    root.classList.toggle('dark', prevRootDark);
    root.classList.toggle('light', prevRootLight);
    if (prevRootScheme) root.style.setProperty('color-scheme', prevRootScheme);
    else root.style.removeProperty('color-scheme');

    if (body) {
      body.classList.toggle('dark', prevBodyDark);
      body.classList.toggle('light', prevBodyLight);
      if (prevBodyScheme) body.style.setProperty('color-scheme', prevBodyScheme);
      else body.style.removeProperty('color-scheme');
    }
  };
})();
