(() => {
  'use strict';

  const target = document.getElementById('heroServices');
  if (!target) return;

  let finalValue = null;
  let hasAnimated = false;

  const parseValue = (text) => {
    const n = Number(String(text || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const format = (n) => Math.round(n).toLocaleString('es-MX');

  const animate = () => {
    if (hasAnimated || finalValue === null || finalValue <= 0) return;
    hasAnimated = true;

    const duration = 2600;
    const start = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      target.textContent = format(finalValue * easeOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        target.textContent = format(finalValue);
      }
    };

    target.textContent = '0';
    requestAnimationFrame(frame);
  };

  const capture = () => {
    const value = parseValue(target.textContent);
    if (value !== null && value > 0) {
      finalValue = value;
      if (observerEntry?.isIntersecting) animate();
    }
  };

  let observerEntry = null;

  const io = new IntersectionObserver((entries) => {
    observerEntry = entries[0];
    if (observerEntry.isIntersecting) {
      capture();
      animate();
    }
  }, { threshold: 0.35 });

  io.observe(target);

  const mo = new MutationObserver(() => {
    if (!hasAnimated) capture();
  });

  mo.observe(target, { childList: true, characterData: true, subtree: true });

  capture();
})();