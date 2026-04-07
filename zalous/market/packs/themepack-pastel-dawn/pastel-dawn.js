(() => {
  const attr = 'data-zalous-theme-pack';
  const prev = document.documentElement.getAttribute(attr);
  document.documentElement.setAttribute(attr, 'pastel-dawn');

  return () => {
    if (prev === null) document.documentElement.removeAttribute(attr);
    else document.documentElement.setAttribute(attr, prev);
  };
})();
