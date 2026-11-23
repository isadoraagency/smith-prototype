/* =========================================================
   SMITH — Company / About interactions
   GSAP + ScrollTrigger + Lenis, no build step. Motion language
   matches the homepage and the Aerospace & Defense page:
   headlines rise word by word, section titles light up word by
   word with the scroll, pinned scenes step through their content,
   lines draw with the pathLength=1 dash technique.
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------------------------------------------------------
   1. Smooth scrolling
   --------------------------------------------------------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.2 }) : window.scrollTo({ top: y, behavior: 'smooth' }));

/* ---------------------------------------------------------
   2. Canvas scaling — pinned scenes fit 1440 × 900 into the
      viewport (--s); regular modules scale to the page width (--sw)
   --------------------------------------------------------- */
function fit() {
  const w = document.documentElement.clientWidth, h = window.innerHeight;
  document.documentElement.style.setProperty('--s', Math.min(w / 1440, h / 900).toFixed(4));
  document.documentElement.style.setProperty('--sw', (w / 1440).toFixed(4));
}
fit();
window.addEventListener('resize', fit);
const S = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;

/* ---------------------------------------------------------
   3. Header: nav theme follows the section under the logo
   --------------------------------------------------------- */
const navHeader = $('.header');
let navRaf = 0;
function syncNavTheme() {
  navRaf = 0;
  const logo = $('.logo', navHeader).getBoundingClientRect();
  const under = document.elementsFromPoint(logo.left + logo.width / 2, logo.top + logo.height / 2).find((el) => !navHeader.contains(el));
  const zone = under && under.closest('[data-nav]');
  navHeader.classList.toggle('is-on-light', !!zone && zone.dataset.nav === 'light');
}
const queueNavTheme = () => { if (!navRaf) navRaf = requestAnimationFrame(syncNavTheme); };
window.addEventListener('scroll', queueNavTheme, { passive: true });
window.addEventListener('resize', queueNavTheme);
if (lenis) lenis.on('scroll', queueNavTheme);
queueNavTheme();

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
function prepLine(el) {
  el.setAttribute('pathLength', '1');
  el.setAttribute('stroke-dasharray', '1 1');
  el.setAttribute('stroke-dashoffset', '1');
  return el;
}
const DRAWN = { attr: { 'stroke-dashoffset': 0 } };
// split a title into words; `mask` wraps each in an overflow box so it can rise
function splitWords(el, mask = false) {
  // keeps authored <br> line breaks: split per line, then per word
  const tmp = document.createElement('div');
  const lines = el.innerHTML.split(/<br\s*\/?>/i).map((h) => { tmp.innerHTML = h; return tmp.textContent.trim().split(/\s+/).filter(Boolean); });
  el.textContent = '';
  lines.forEach((words, l) => {
    if (l) el.appendChild(document.createElement('br'));
    words.forEach((w, i) => {
      const wd = document.createElement('span'); wd.className = 'wd'; wd.textContent = w;
      if (mask) { const wm = document.createElement('span'); wm.className = 'wm'; wm.appendChild(wd); el.appendChild(wm); } else el.appendChild(wd);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });
  return $$('.wd', el);
}
// section title that lights up word by word as it scrolls into view (A&D / homepage pattern)
function lightUp(el, start = 'top 85%', end = 'top 35%') {
  const words = splitWords(el);
  if (reduceMotion) return words;
  gsap.fromTo(words, { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start, end, scrub: true } });
  return words;
}
// swap the text of a detail block with a short crossfade
function swap(els, apply) {
  if (reduceMotion) return apply();
  gsap.to(els, { autoAlpha: 0, y: -8, duration: 0.18, ease: 'power1.in', overwrite: true, onComplete: () => {
    apply();
    gsap.fromTo(els, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
  } });
}
// scroll to the point of a pinned ScrollTrigger where step i of n is centred
const scrollToStep = (st, from, i, n) => scrollToY(st.start + (st.end - st.start) * (from + (1 - from) * (i + 0.5) / n));

/* ---------------------------------------------------------
   4a. Hero — headline words rise, the lead follows, the photo
       opens from a sliver and eases back as the page scrolls
   --------------------------------------------------------- */
const heroTitle = $('#heroTitle');
const heroWords = splitWords(heroTitle, true);
// keep the authored line break: splitWords works per line already
gsap.set(heroTitle, { visibility: 'visible' });
if (!reduceMotion) {
  gsap.timeline({ delay: 0.15 })
    .from(heroWords, { yPercent: 110, duration: 1.1, stagger: 0.05, ease: 'expo.out' })
    .from('.about-hero__lead', { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out' }, 0.45)
    .fromTo('.about-hero__media', { clipPath: 'inset(0 0 100% 0 round 24px)' }, { clipPath: 'inset(0 0 0% 0 round 24px)', duration: 1.4, ease: 'expo.inOut' }, 0.1)
    .from('.about-hero__media img', { scale: 1.3, duration: 1.8, ease: 'expo.out' }, 0.3);
  gsap.to('.about-hero__media img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.about-hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------------------------------------------------------
   4b. At a glance — the stat cards rise in turn and count up;
       the fact sheet slides in from the right
   --------------------------------------------------------- */
lightUp($('#glanceTitle'));
const fmt = (n, dec) => dec ? n.toFixed(dec) : Math.round(n).toString();
$$('.stat__value').forEach((el) => {
  const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
  const pre = el.dataset.pre, post = el.dataset.post;
  const paint = (v) => { el.innerHTML = pre + fmt(v, dec) + (post === '+' ? '<b>+</b>' : post); };
  if (reduceMotion) return;
  const from = to >= 1000 ? to - 60 : 0;   // the year rolls up from 1924, the rest from 0
  const o = { v: from };
  paint(from);
  ScrollTrigger.create({ trigger: '.glance', start: 'top 70%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'expo.out', onUpdate: () => paint(o.v) }) });
});
if (!reduceMotion) {
  gsap.from('.stat', { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.glance', start: 'top 70%' } });
  gsap.from('.factsheet', { x: 60, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.glance', start: 'top 65%' } });
}

/* ---------------------------------------------------------
   4c. People business — the film frame grows from a card to
       full width as it scrolls in; the play button pings
   --------------------------------------------------------- */
lightUp($('#peopleTitle'));
if (!reduceMotion) {
  gsap.from('.people__text', { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.people', start: 'top 70%' } });
  gsap.fromTo('.people__video', { scale: 0.82, borderRadius: 48 }, { scale: 1, borderRadius: 24, ease: 'none', scrollTrigger: { trigger: '.people__video', start: 'top bottom', end: 'top 30%', scrub: true } });
  gsap.fromTo('.people__video > img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.people__video', start: 'top bottom', end: 'bottom top', scrub: true } });
}
$('.people__play').addEventListener('click', (e) => {
  if (!reduceMotion) gsap.fromTo(e.currentTarget, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .4)' });
});

/* ---------------------------------------------------------
   4d. Built differently — each rule draws across, the dot pops,
       the pillar name and line slide in
   --------------------------------------------------------- */
lightUp($('#builtTitle'));
if (!reduceMotion) {
  $$('.pillar').forEach((row, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%' } });
    tl.fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'expo.inOut' })
      .from(row.querySelector('.pillar__dot'), { scale: 0, duration: 0.6, ease: 'back.out(3)' }, 0.1)
      .from(row.querySelectorAll('.pillar__title, .pillar__text'), { x: -24, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.1);
  });
}

/* ---------------------------------------------------------
   4. Timeline as a depth slider (pinned). The photos ride a 3D
      drum: the one in focus faces you, the rest tilt away and dim
      as they roll over the top or under the bottom. Scroll or drag
      rolls the drum and it settles on a year; the year rolls like
      an odometer, the milestone crossfades, the index follows.
      Arrows, the index and ←/→ jump to any year.
   --------------------------------------------------------- */
const tl = $('#timeline');
const stage = $('#dpStage');
const slides = $$('.dp-slide', tl);
const idxItems = $$('.dp-index__item', tl);
const texts = $$('template[data-i]', tl).map((t) => t.innerHTML);
const yearCols = $$('#dpYear .odo__strip', tl);
const textEl = $('#dpText');
const nowEl = $('#tlNow');
const prevBtn = $('#tlPrev');
const nextBtn = $('#tlNext');
const N = slides.length;
const YEARS = idxItems.map((li) => li.textContent.trim());

// drum geometry, in canvas px / degrees
const STEP = 42;      // degrees between neighbouring photos
const R = 600;        // drum radius
const DIGIT = 168;    // odometer digit height

function render(c) {
  slides.forEach((s, i) => {
    const d = i - c;
    const th = d * STEP;
    const a = Math.abs(th);
    if (a > 95) { s.style.visibility = 'hidden'; return; }
    s.style.visibility = 'visible';
    const rad = th * Math.PI / 180;
    const y = Math.sin(rad) * R;
    const z = (Math.cos(rad) - 1) * R;
    s.style.transform = `translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${(-th).toFixed(2)}deg)`;
    s.style.opacity = Math.max(0, 1 - Math.max(0, a - 42) / 50).toFixed(3);
    s.style.setProperty('--shade', Math.min(0.8, a / 60).toFixed(3));
    s.style.zIndex = String(100 - Math.round(a));
  });
}

let active = -1;
function setActive(i, instant) {
  i = clamp(i, 0, N - 1);
  if (i === active) return;
  const from = active;
  active = i;
  idxItems.forEach((li, k) => li.classList.toggle('is-active', k === i));
  nowEl.textContent = String(i + 1).padStart(2, '0');
  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === N - 1;
  // odometer: each digit column rolls to its new digit (the change reads left to right)
  YEARS[i].split('').forEach((dg, k) => {
    gsap.to(yearCols[k], { y: -dg * DIGIT, duration: instant || reduceMotion ? 0 : 0.9, delay: instant ? 0 : k * 0.05, ease: 'expo.out', overwrite: true });
  });
  if (instant || reduceMotion || from < 0) { textEl.innerHTML = texts[i]; return; }
  const dir = i > from ? 1 : -1;
  gsap.to(textEl, { autoAlpha: 0, y: -12 * dir, duration: 0.18, ease: 'power1.in', overwrite: true, onComplete: () => {
    textEl.innerHTML = texts[i];
    gsap.fromTo(textEl, { autoAlpha: 0, y: 14 * dir }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  } });
}

const drum = { c: 0 };      // driven by the scroll
const intro = { o: 0 };     // the entrance swing, added on top
const draw = () => render(drum.c + intro.o);
render(0);
setActive(0, true);

let tlSt = null;
if (!reduceMotion) {
  // intro: the title rises word by word, the drum swings up from below
  const words = splitWords($('#tlTitle'), true);
  gsap.timeline({ scrollTrigger: { trigger: tl, start: 'top 75%' } })
    .from(words, { yPercent: 110, duration: 1.1, stagger: 0.06, ease: 'expo.out' })
    .from(intro, { o: -1.4, duration: 1.6, ease: 'expo.out', onUpdate: draw }, 0.1)
    .from('.dp__info > *, .dp-index li', { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.03, ease: 'power3.out' }, 0.4);

  const roll = gsap.to(drum, { c: N - 1, ease: 'none', onUpdate: () => { draw(); setActive(Math.round(drum.c)); } });
  tlSt = ScrollTrigger.create({
    trigger: tl, start: 'top top', end: () => '+=' + Math.round((N - 1) * window.innerHeight * 0.6),
    pin: true, scrub: 0.8, animation: roll, invalidateOnRefresh: true,
  });
}

// jump to year i: scroll to its point of the pin
const yFor = (i) => tlSt.start + (i / (N - 1)) * (tlSt.end - tlSt.start);
function goTo(i) {
  i = clamp(i, 0, N - 1);
  if (!tlSt) { render(i); return setActive(i); }
  scrollToY(yFor(i) + 1);
}
prevBtn.addEventListener('click', () => goTo(active - 1));
nextBtn.addEventListener('click', () => goTo(active + 1));
idxItems.forEach((li, i) => li.querySelector('button').addEventListener('click', () => goTo(i)));
document.addEventListener('keydown', (e) => {
  if (!tlSt || !tlSt.isActive || (e.target.closest && e.target.closest('input, textarea'))) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
});

// when scrolling stops inside the pin, settle on the nearest year
// (no momentum: it always lands on the year closest to where you stopped)
if (tlSt) {
  ScrollTrigger.addEventListener('scrollEnd', () => {
    if (!tlSt.isActive || stage.classList.contains('is-dragging')) return;
    const p = (window.scrollY - tlSt.start) / (tlSt.end - tlSt.start);
    const near = Math.round(clamp(p, 0, 1) * (N - 1));
    if (Math.abs(window.scrollY - yFor(near)) > 4) scrollToY(yFor(near) + 1);
  });
}

// drag the drum: pull up to move forward in time, release to settle on a year
if (tlSt) {
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    drag = { y: e.clientY, scroll: window.scrollY, moved: 0 };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = drag.y - e.clientY;
    drag.moved = Math.max(drag.moved, Math.abs(dy));
    // one photo per ~380 screen px of drag
    const perSlide = (tlSt.end - tlSt.start) / (N - 1);
    const y = clamp(drag.scroll + dy * (perSlide / (380 * S())), tlSt.start, tlSt.end);
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    stage.classList.remove('is-dragging');
    const p = (window.scrollY - tlSt.start) / (tlSt.end - tlSt.start);
    goTo(Math.round(clamp(p, 0, 1) * (N - 1)));
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
}

/* ---------------------------------------------------------
   5. Franchises — the logo tiles rise in a wave
   --------------------------------------------------------- */
lightUp($('#franTitle'));
if (!reduceMotion) {
  gsap.from('.logo-tile', { y: 32, autoAlpha: 0, duration: 0.8, stagger: { each: 0.06, grid: [2, 4], from: 'start' }, ease: 'power3.out', scrollTrigger: { trigger: '.logo-grid', start: 'top 80%' } });
}

/* ---------------------------------------------------------
   6. Recognition — cards rise in turn, each icon spins in
   --------------------------------------------------------- */
lightUp($('#recogTitle'));
if (!reduceMotion) {
  const rt = gsap.timeline({ scrollTrigger: { trigger: '.awards', start: 'top 80%' } });
  rt.from('.award', { y: 60, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' })
    .from('.award__icon', { rotate: -120, scale: 0.4, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, 0.15)
    .from('.recog__all', { autoAlpha: 0, x: 20, duration: 0.6, ease: 'power2.out' }, 0);
}

/* ---------------------------------------------------------
   7. Experience — 40+ counts up, the Explore links slide in
   --------------------------------------------------------- */
lightUp($('#expTitle'));
if (!reduceMotion) {
  const n = { v: 0 }, numEl = $('#expNum');
  numEl.textContent = '0';
  ScrollTrigger.create({ trigger: '.exp__stat', start: 'top 85%', once: true, onEnter: () => gsap.to(n, { v: 40, duration: 1.6, ease: 'expo.out', onUpdate: () => { numEl.textContent = Math.round(n.v); } }) });
  gsap.from('.exp__text', { autoAlpha: 0, y: 24, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.exp', start: 'top 70%' } });
  gsap.from('.explore__list li', { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.explore', start: 'top 80%' } });
}

/* ---------------------------------------------------------
   13. Footer circuit + chat lift (from the homepage)
   --------------------------------------------------------- */
const footLine = $('.footer__circuit-line');
if (footLine) {
  prepLine(footLine);
  const markers = $$('.footer__circuit .marker');
  markers.forEach((m) => (m.tagName === 'circle'
    ? (m.dataset.r = m.getAttribute('r'), m.setAttribute('r', 0))
    : gsap.set(m, { scale: 0, transformOrigin: '50% 50%' })));
  gsap.timeline({ scrollTrigger: { trigger: '.footer__circuit', start: 'top 90%', toggleActions: 'play none none reverse' } })
    .to(footLine, { ...DRAWN, duration: 2.5, ease: 'power2.out' })
    .to(markers, { attr: { r: (i, m) => +(m.dataset.r || 0) }, scale: 1, duration: 0.45, stagger: 0.25, ease: 'back.out(2.2)' }, 1);
}
const chatEl = $('#chatBtn');
ScrollTrigger.create({
  trigger: '.footer__meta', start: 'top bottom', end: 'max',
  onUpdate: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
  onRefresh: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
});

/* ---------------------------------------------------------
   14. Overlays — Industries dropdown, chat panel
   --------------------------------------------------------- */
function reveal(el, from) {
  el.hidden = false;
  gsap.fromTo(el, from, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' });
}
function conceal(el, to, done) {
  gsap.to(el, { ...to, autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { el.hidden = true; done && done(); } });
}
const indBtn = $('#industriesBtn');
const indMenu = $('#industriesMenu');
function setDropdown(open) {
  if (open === (indBtn.getAttribute('aria-expanded') === 'true')) return;
  indBtn.setAttribute('aria-expanded', String(open));
  if (open) reveal(indMenu, { autoAlpha: 0, y: -8 }); else conceal(indMenu, { y: -8 });
}
if (indBtn) indBtn.addEventListener('click', (e) => { e.stopPropagation(); setDropdown(indBtn.getAttribute('aria-expanded') !== 'true'); });
if (indMenu) document.addEventListener('click', (e) => { if (!indMenu.hidden && !indMenu.contains(e.target)) setDropdown(false); });
const selfLink = $('.nav__menu a[aria-current="page"]');
if (selfLink) selfLink.addEventListener('click', (e) => { e.preventDefault(); scrollToY(0); });

const chatBtn = $('#chatBtn');
const chatPanel = $('#chatPanel');
const chatThread = $('#chatThread');
const chatInput = $('#chatInput');
function setChat(open) {
  chatBtn.setAttribute('aria-expanded', String(open));
  if (open) { reveal(chatPanel, { autoAlpha: 0, y: 24, scale: 0.96 }); setTimeout(() => chatInput.focus(), 200); }
  else conceal(chatPanel, { y: 24, scale: 0.96 }, () => chatBtn.focus());
}
chatBtn.addEventListener('click', () => setChat(true));
$('#chatClose').addEventListener('click', () => setChat(false));
function sendChat(text) {
  if (!text.trim()) return;
  const msg = document.createElement('p');
  msg.className = 'msg msg--me';
  msg.textContent = text.trim();
  chatThread.appendChild(msg);
  gsap.from(msg, { y: 12, autoAlpha: 0, duration: 0.3, ease: 'power2.out' });
  chatThread.scrollTop = chatThread.scrollHeight;
}
$('#chatQuick').addEventListener('click', (e) => { if (e.target.closest('button')) sendChat(e.target.closest('button').textContent); });
$('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendChat(chatInput.value); chatInput.value = ''; });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!chatPanel.hidden) return setChat(false);
  if (indMenu && !indMenu.hidden) { setDropdown(false); indBtn.focus(); }
});

// in-page anchors glide with Lenis
$$('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute('href');
  if (id.length < 2 || !document.querySelector(id)) return;
  a.addEventListener('click', (e) => { e.preventDefault(); if (lenis) lenis.scrollTo(id, { duration: 1.4 }); else document.querySelector(id).scrollIntoView({ behavior: 'smooth' }); });
});

/* ---------------------------------------------------------
   15. Electronics / Solar switch — fade out, then go
   --------------------------------------------------------- */
$$('[data-site-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = link.href; }, reduceMotion ? 0 : 350);
  });
});
window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

/* ---------------------------------------------------------
   Header hides while scrolling down and slides back in on the
   way up (stays near the top and while the menu is open)
   --------------------------------------------------------- */
(() => {
  const bar = $('.header');
  const menu = $('#industriesMenu');
  let lastY = window.scrollY, hidden = false;
  const setHidden = (h) => {
    if (h === hidden) return;
    hidden = h;
    gsap.to(bar, { yPercent: h ? -130 : 0, duration: h ? 0.45 : 0.6, ease: h ? 'power2.in' : 'expo.out', overwrite: 'auto' });
  };
  const onScroll = () => {
    const y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 4) return;
    lastY = y;
    if (y < 120 || (menu && !menu.hidden)) return setHidden(false);
    setHidden(dy > 0);
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', () => setHidden(false));
})();

window.addEventListener('resize', () => ScrollTrigger.refresh());
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
