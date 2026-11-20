/* =========================================================
   SMITH — Company dropdown in the main nav (all pages)
   Same look and motion as the Industries dropdown; opening one
   closes the other. Esc and a click outside close it.
   ========================================================= */
(() => {
  const btn = document.getElementById('companyBtn');
  const menu = document.getElementById('companyMenu');
  if (!btn || !menu) return;
  const indBtn = document.getElementById('industriesBtn');
  const indMenu = document.getElementById('industriesMenu');
  const hasGsap = typeof gsap !== 'undefined';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function set(open) {
    if (open === (btn.getAttribute('aria-expanded') === 'true')) return;
    if (open && indMenu && !indMenu.hidden && indBtn) indBtn.click();   // one menu at a time (before we flip our own state)
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      menu.hidden = false;
      if (hasGsap && !reduce) gsap.fromTo(menu, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out', clearProps: 'transform' });
    } else if (hasGsap && !reduce) {
      gsap.to(menu, { autoAlpha: 0, y: -8, duration: 0.2, ease: 'power2.in', onComplete: () => { menu.hidden = true; } });
    } else {
      menu.hidden = true;
    }
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(btn.getAttribute('aria-expanded') !== 'true'); });
  if (indBtn) indBtn.addEventListener('click', () => set(false));
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
})();
