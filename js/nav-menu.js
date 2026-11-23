/* =========================================================
   SMITH — full-screen menu behind the header's Menu button
   (Figma sm-nav-desktop v2, state=open)
   · Menu opens it, Close / Esc / a menu link closes it
   · hovering, focusing or clicking a top-level item shows its links
   · the page stops scrolling and focus stays inside while it is open
   ========================================================= */
(() => {
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('siteMenu');
  if (!btn || !menu) return;
  const header = document.querySelector('.header');
  const label = btn.querySelector('.menu-btn__label');
  const items = [...menu.querySelectorAll('.site-menu__item')];
  const panels = [...menu.querySelectorAll('.site-menu__panel')];
  const hasGsap = typeof gsap !== 'undefined';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = () => (typeof lenis !== 'undefined' && lenis) ? lenis : null;   // the page's Lenis instance, if any
  let lastFocus = null;
  // the page re-applies .is-on-light as it scrolls; keep the header dark while the menu is open
  const keepDark = new MutationObserver(() => { if (header.classList.contains('is-on-light')) header.classList.remove('is-on-light'); });

  function show(key) {
    items.forEach((it) => it.classList.toggle('is-active', it.dataset.panel === key));
    panels.forEach((p) => {
      const on = p.dataset.panel === key;
      if (on && p.hidden) {
        p.hidden = false;
        if (hasGsap && !reduce) gsap.fromTo(p.querySelectorAll('.site-menu__title, li'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.025, ease: 'power3.out', overwrite: true });
      } else if (!on) p.hidden = true;
    });
  }

  let isOpen = false;
  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    header.classList.remove('is-on-light');
    keepDark.observe(header, { attributes: true, attributeFilter: ['class'] });
    header.classList.add('is-menu-open');
    // a transformed header would make the fixed menu size to the header, not the screen
    if (hasGsap) { gsap.killTweensOf(header); gsap.set(header, { yPercent: 0, clearProps: 'transform' }); }
    header.style.transform = 'none';
    if (hasGsap) gsap.killTweensOf(menu);
    btn.setAttribute('aria-expanded', 'true');
    label.textContent = 'Close';
    menu.hidden = false;
    document.documentElement.classList.add('menu-lock');
    const s = smooth(); if (s) s.stop();
    const start = items.find((i) => i.classList.contains('is-current')) || items[0];
    show(start.dataset.panel);
    if (hasGsap && !reduce) {
      gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(menu.querySelectorAll('.site-menu__primary > li'), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out', delay: 0.05 });
    }
    setTimeout(() => { if (isOpen) start.focus({ preventScroll: true }); }, 50);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    btn.setAttribute('aria-expanded', 'false');
    label.textContent = 'Menu';
    const done = () => {
      if (isOpen) return;   // reopened before the fade finished
      menu.hidden = true;
      header.classList.remove('is-menu-open');
      header.style.transform = '';
      keepDark.disconnect();
      document.documentElement.classList.remove('menu-lock');
      const s = smooth(); if (s) s.start();
      window.dispatchEvent(new Event('scroll'));   // let the page re-check the header theme
    };
    if (hasGsap && !reduce) gsap.to(menu, { autoAlpha: 0, duration: 0.25, ease: 'power2.in', onComplete: done }); else done();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => (isOpen ? close() : open()));
  items.forEach((it) => {
    it.addEventListener('mouseenter', () => show(it.dataset.panel));
    it.addEventListener('focus', () => show(it.dataset.panel));
    it.addEventListener('click', () => show(it.dataset.panel));
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); return; }
    if (e.key !== 'Tab') return;
    // keep focus inside the header bar + menu while open
    const focusables = [...header.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
