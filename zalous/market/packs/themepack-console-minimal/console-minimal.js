(() => {
  const key = 'data-zalous-theme-pack';
  const prev = document.documentElement.getAttribute(key);
  document.documentElement.setAttribute(key, 'console-minimal');

  return () => {
    if (prev === null) document.documentElement.removeAttribute(key);
    else document.documentElement.setAttribute(key, prev);
  };
})();
