  ensureStyle();
  ensureItem();
  bind();
  observe();

  window.__zalousEmailPrototypeObserver = state.observer;
  window.__zalousEmailPrototypeCleanup = cleanup;
})();
