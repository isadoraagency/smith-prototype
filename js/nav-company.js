/* =========================================================
   SMITH — Services and Company dropdowns in the main nav (all pages)
   Same look and motion as the Industries dropdown; opening one
   closes the others. Esc and a click outside close it.
   ========================================================= */
(() => {
  const indBtn = document.getElementById('industriesBtn');
  const indMenu = document.getElementById('industriesMenu');
  const hasGsap = typeof gsap !== 'undefined';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drops = [];

  function setup(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;
    const d = { btn, menu, set };
    function set(open) {
      if (open === (btn.getAttribute('aria-expanded') === 'true')) return;
      if (open) {
        if (indMenu && !indMenu.hidden && indBtn) indBtn.click();   // one menu at a time (before we flip our own state)
        drops.forEach((o) => { if (o !== d) o.set(false); });
      }
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
    drops.push(d);
  }

  setup('servicesBtn', 'servicesMenu');
  setup('companyBtn', 'companyMenu');
})();
