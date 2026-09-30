(() => {
  'use strict';

  const ids = ['heroServices','statServices','statEvents','statNeighborhoods','statOutreach'];
  const duration = 2600;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const format = (n) => Math.round(n).toLocaleString('es-MX');

  const states = new Map();

  const parseValue = (text) => {
    const n = Number(String(text || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const animate = (el, state) => {
    if (state.animated || state.finalValue === null || state.finalValue < 0) return;
    state.animated = true;

    const start = performance.now();
    el.textContent = '0';

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = format(state.finalValue * easeOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = format(state.finalValue);
      }
    };

    requestAnimationFrame(frame);
  };

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const state = { finalValue: null, animated: false, visible: false };
    states.set(el, state);

    const capture = () => {
      const value = parseValue(el.textContent);
      if (value !== null && value >= 0) {
        state.finalValue = value;
        if (state.visible) animate(el, state);
      }
    };

    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      state.visible = entry.isIntersecting;
      if (state.visible) {
        capture();
        animate(el, state);
      }
    }, { threshold: 0.35 });

    io.observe(el);

    const mo = new MutationObserver(() => {
      if (!state.animated) capture();
    });

    mo.observe(el, { childList: true, characterData: true, subtree: true });

    capture();
  });
})();