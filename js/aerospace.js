/* =========================================================
   SMITH — Industries / Aerospace & Defense interactions
   GSAP + ScrollTrigger + Lenis, no build step.
   Shared shell (smooth scroll, nav theme, dropdown,
   chat, footer circuit, site switch) mirrors js/main.js.
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

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

/* ---------------------------------------------------------
   2. Canvas scaling — pinned scenes are the 1440×900 Figma
      frame, scaled to fit the viewport.
   --------------------------------------------------------- */
function fitCanvas() {
  const s = Math.min(window.innerWidth / 1440, window.innerHeight / 900);
  document.documentElement.style.setProperty('--s', s.toFixed(4));
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

/* ---------------------------------------------------------
   3. Header: nav theme follows the section under the logo
   --------------------------------------------------------- */
// (no market ticker on this page)

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
   Line helpers (same technique as the homepage): pathLength=1,
   the dash offset is tweened as an SVG attribute.
   --------------------------------------------------------- */
function prepLine(path) {
  path.setAttribute('pathLength', '1');
  path.setAttribute('stroke-dasharray', '1 1');
  path.setAttribute('stroke-dashoffset', '1');
  return path;
}
const DRAWN = { attr: { 'stroke-dashoffset': 0 } };

/* ---------------------------------------------------------
   4. Hero intro — headline words rise, the photo settles,
      the nav, callout and chat follow
   --------------------------------------------------------- */
const heroTitle = $('#heroTitle');
heroTitle.innerHTML = heroTitle.innerHTML
  .split(/(<br\s*\/?>)/i)
  .map((part) => (/^<br/i.test(part) ? part : part.trim().split(/\s+/)
    .map((w) => `<span class="wm"><span class="wd">${w}</span></span>`).join(' ')))
  .join('');
const heroWords = $$('.wd', heroTitle);
const introNav = gsap.utils.toArray('.nav > *, .chat');
const heroImg = $('#heroMedia img');
if (reduceMotion) gsap.set('#heroTitle, #heroCopy .btn', { visibility: 'visible' });

if (!reduceMotion) {
  gsap.set(heroWords, { yPercent: 110 });
  gsap.set(heroTitle, { visibility: 'visible' });   // hidden by CSS until split (no flash of the full headline)
  gsap.set(heroImg, { scale: 1.18 });
  gsap.set('#heroCopy .btn', { autoAlpha: 0, y: 16 });
  gsap.set(introNav, { y: -24, autoAlpha: 0 });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 } })
      .to(heroWords, { yPercent: 0, stagger: 0.06 }, 0)
      .to(heroImg, { scale: 1, duration: 2.4 }, 0)
      .to(introNav, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 1.2, clearProps: 'transform,opacity,visibility' }, 0.2)
      .to('#heroCopy .btn', { autoAlpha: 1, y: 0, duration: 1 }, 0.6)
  });
}

/* ---------------------------------------------------------
   5. Stage — the head-on aircraft photo shrinks into the
      overview circle (camera stays on the plane), the cyan line
      draws in, the marker pops, the statement lights up word by
      word and the #1 card arrives.
   --------------------------------------------------------- */
const stage = $('#stage');
const heroMedia = $('#heroMedia');
const slot = $('#ovSlot');
const ovPath = prepLine($('.ov__path'));
const statement = $('#ovStatement');
statement.innerHTML = statement.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
const words = $$('.w', statement);

// the full-screen box is cropped to its centred circle, then scaled and
// moved onto the slot; inside, the photo is zoomed so the plane is centred
function circleTarget() {
  const b = stage.getBoundingClientRect();
  const s = slot.getBoundingClientRect();
  const d = Math.min(b.width, b.height);
  const k = s.width / d;
  return {
    clip: `circle(${d / 2}px at 50% 50%)`,
    x: s.left + s.width / 2 - (b.left + b.width / 2),
    y: s.top + s.height / 2 - (b.top + b.height / 2),
    scale: k,
  };
}
gsap.set(heroMedia, { clipPath: () => `circle(${Math.hypot(innerWidth, innerHeight)}px at 50% 50%)` });
gsap.set('#ovCard', { autoAlpha: 0, y: 40 });
gsap.set(statement, { autoAlpha: 0 });
gsap.set('.ov__marker', { scale: 0, rotate: 45 });

const stageTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: stage, start: 'top top', end: '+=200%', pin: true, scrub: 1, invalidateOnRefresh: true },
});
stageTl
  .to('#heroCopy', { autoAlpha: 0, y: -60, duration: 0.8 }, 0)
  .to(heroMedia, { clipPath: () => circleTarget().clip, duration: 1.6, ease: 'power1.inOut' }, 0)
  .to(heroMedia, { x: () => circleTarget().x, y: () => circleTarget().y, scale: () => circleTarget().scale, duration: 2.2, ease: 'power2.inOut' }, 0.6)
  // keep the plane in the middle of the circle as it shrinks
  .to(heroImg, { xPercent: -22, yPercent: 17, scale: 1.25, duration: 2.2, ease: 'power2.inOut' }, 0.6)
  .to(ovPath, { ...DRAWN, duration: 2.4 }, 1.2)
  .to('.ov__marker', { scale: 1, rotate: 45, duration: 0.4, ease: 'back.out(2.5)' }, 3.1)
  .to(statement, { autoAlpha: 1, duration: 0.4 }, 2.4)
  .to(words, { opacity: 1, stagger: 0.05, duration: 0.3 }, 2.6)
  .to('#ovCard', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 3.4)
  .to({}, { duration: 0.6 });

/* ---------------------------------------------------------
   6. Applications — intro title → tabs, panel and aircraft;
      categories light up the matching part of the aircraft
      on hover / focus.
   --------------------------------------------------------- */
const apps = $('#apps');
const tabs = $$('.apps__tab');
const panels = $$('.apps__panel');
const visuals = $$('.apps__visual');
const highlights = $$('.hl');
let activeTab = 0;
let activeTag = 0;
let appsReady = false;

gsap.set('.apps__ui, .apps__visual[data-visual="0"]', { autoAlpha: 0 });
visuals[0].classList.add('is-active');
$$('.apps__draw path').forEach(prepLine);

function showHighlight(j) {
  highlights.forEach((h, i) => {
    const on = activeTab === 0 && i === j;
    gsap.to(h, { autoAlpha: on ? 1 : 0, duration: on ? 0.6 : 0.3, ease: 'power2.out', overwrite: true });
    if (on) gsap.fromTo($$('.hl__detail, .hl__label', h), { scale: 0.92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.6)', delay: 0.15, overwrite: true });
  });
  const dim = activeTab === 0 && highlights[j] && highlights[j].dataset.dim === '1';
  visuals[0].classList.toggle('is-dim', !!dim);
  // the rest of the aircraft drops to 30% while a part is highlighted, so the
  // cutaway and its label stand out (tweened, so a tab-switch entrance can't
  // leave an inline opacity of 1 behind)
  gsap.to('.apps__plane', { opacity: dim ? 0.3 : 1, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
}
function setTag(j) {
  activeTag = j;
  const tags = $$('.apps__tag', panels[activeTab]);
  tags.forEach((t, i) => t.classList.toggle('is-on', i === j));
  showHighlight(j);
}
function setTab(i) {
  if (i === activeTab) return;
  activeTab = i;
  tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
  panels.forEach((p, k) => {
    const on = k === i;
    p.classList.toggle('is-active', on);
    if (on) gsap.fromTo(p, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', overwrite: true });
    else gsap.set(p, { autoAlpha: 0, overwrite: true });
  });
  visuals.forEach((v, k) => {
    const on = k === i;
    v.classList.toggle('is-active', on);
    gsap.set(v, { autoAlpha: on ? 1 : 0 });
    if (on) {
      const img = $('img.apps__plane, img.apps__jet', v);
      if (img) gsap.fromTo(img, { autoAlpha: 0, x: 60, y: -30, scale: 0.94 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 1.2, ease: 'expo.out' });
      const paths = $$('path', v);
      if (paths.length) gsap.fromTo(paths, { attr: { 'stroke-dashoffset': 1 } }, { ...DRAWN, duration: 1.2, stagger: 0.08, ease: 'power2.out' });
    }
  });
  setTag(-1);
}
tabs.forEach((t, i) => t.addEventListener('click', () => setTab(i)));
panels.forEach((p) => {
  $$('.apps__tag', p).forEach((tag, j) => {
    // hover / focus shows that part of the aircraft; a tap (touch) does the same
    // (pointermove too: if the list arrives under a resting cursor, the first
    // nudge of the mouse lights the part up without leaving and re-entering)
    const show = () => { if (activeTag !== j || !tag.classList.contains('is-on')) setTag(j); };
    tag.addEventListener('pointerenter', show);
    tag.addEventListener('pointermove', show);
    tag.addEventListener('focus', show);
    tag.addEventListener('click', show);
  });
  // leaving the list puts the whole aircraft back
  p.addEventListener('mouseleave', () => setTag(-1));
  p.addEventListener('focusout', (e) => { if (!p.contains(e.relatedTarget)) setTag(-1); });
});
highlights.forEach((h) => gsap.set(h, { autoAlpha: 0 }));

// intro: the top-view aircraft flies in from above and grows as the section
// scrolls up into view; the title words rise out of their masks
const appsIntro = $('.apps__intro');
appsIntro.innerHTML = appsIntro.innerHTML
  .split(/(<br\s*\/?>)/i)
  .map((part) => (/^<br/i.test(part) ? part : part.trim().split(/\s+/)
    .map((w) => `<span class="wm"><span class="wd">${w}</span></span>`).join(' ')))
  .join('');
if (!reduceMotion) {
  gsap.fromTo('.apps__topwrap', { y: -760, scale: 0.42 }, {
    y: 0, scale: 1, ease: 'power2.out',
    scrollTrigger: { trigger: apps, start: 'top bottom', end: 'top top', scrub: 1 },
  });
  gsap.fromTo('.apps__intro .wd', { yPercent: 110 }, {
    yPercent: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out',
    scrollTrigger: { trigger: apps, start: 'top 35%', toggleActions: 'play none none reverse' },
  });
}

const appsTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: {
    // the pin only covers the reveal; the list is explored by hovering it
    trigger: apps, start: 'top top', end: '+=170%', pin: true, scrub: 1,
    onUpdate: (st) => {
      const ready = appsTl.duration() * st.progress > 2.7;
      if (ready !== appsReady) {
        appsReady = ready;
        if (!ready) { setTag(-1); return; }
        // the list just finished arriving: honour an item already under the cursor
        const hovered = $$('.apps__tag', panels[activeTab]).findIndex((t) => t.matches(':hover'));
        if (hovered > -1) setTag(hovered);
      }
    },
  },
});
appsTl
  .fromTo('.apps__intro', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -60, duration: 1 }, 0.4)
  .fromTo('.apps__top', { autoAlpha: 0.55, scale: 1, rotate: 0 }, { autoAlpha: 0, scale: 0.7, rotate: 18, duration: 1.4, ease: 'power2.in' }, 0.3)
  .fromTo('.apps__visual[data-visual="0"]', { autoAlpha: 0, scale: 1.15, x: 80 }, { autoAlpha: 1, scale: 1, x: 0, duration: 1.4, ease: 'power2.out' }, 1.1)
  .fromTo('.apps__ui', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' }, 1.6)
  .to({}, { duration: 0.6 });                  // 3.0: revealed, held briefly
// keep the visual's own transform free for the scrubbed entrance
gsap.set('.apps__visual[data-visual="0"]', { transformOrigin: '70% 50%' });

/* ---------------------------------------------------------
   7. Realities — title over the nose wireframe, then the four
      sm-realities-cards rise in side by side (Figma 2555:4677);
      the last card grows into the Quality background.
   --------------------------------------------------------- */
const rcards = $$('.rcard');
const rseps = $$('.real__track .board-dots');
gsap.set(rcards, { '--c': 1 });
gsap.set('.real__track, .real__cta', { autoAlpha: 0 });

// Realities intro title: words (the muted half keeps its beige) that light up
// one by one with the scroll once the section is pinned, like the overview
// statement under the hero
gsap.set('.real__nosewrap', { xPercent: -50, yPercent: -50 });
const realTitle = $('.real__title');
const wrapWords = (text, cls = '') => text.trim().split(/\s+/).filter(Boolean)
  .map((w) => `<span class="wd${cls}">${w}</span>`).join(' ');
realTitle.innerHTML = Array.from(realTitle.childNodes).map((n) => (n.nodeType === 3
  ? wrapWords(n.textContent.replace(/&/g, '&amp;'))
  : wrapWords(n.textContent.replace(/&/g, '&amp;'), ' wd--muted'))).join(' ');

const realTl = gsap.timeline({
  defaults: { ease: 'power2.inOut' },
  scrollTrigger: {
    trigger: '#realities', start: 'top top', end: '+=420%', pin: true, scrub: 1, invalidateOnRefresh: true,
  },
});
realTl
  .fromTo('.real__title .wd', { opacity: 0.15 }, {
    opacity: 1, color: '#ffffff',   // every word ends fully white
    stagger: 0.12, duration: 0.4, ease: 'none',
  }, 0)
  .fromTo('.real__title', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.8 }, 1.6)
  .fromTo('.real__nose', { opacity: 0.2, scale: 1 }, { opacity: 0.12, scale: 1.06, duration: 1.4 }, 1.6)
  // the four cards rise in one after another, the board-dots draw between them
  .set('.real__track', { autoAlpha: 1 }, 2.2)
  .fromTo(rcards, { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.18, ease: 'power3.out' }, 2.2)
  .fromTo(rseps, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.6, stagger: 0.18, ease: 'power2.out' }, 2.5)
  .fromTo('.real__cta', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 2.9)
  .to({}, { duration: 1.2 });   // all four cards held, readable
// last step: the front card's colour expands to fill the scene and becomes the
// Quality section's background (same --paper), so the next section arrives
// without a seam. The card's rect is computed from the 1440×900 canvas maths.
const realScene2 = $('#realities');
const realFill = $('.real__fill');
const lastCard = rcards[rcards.length - 1];
// the last card's rect inside the pinned scene, measured live
const cardClip = () => {
  const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
  const c = lastCard.getBoundingClientRect(), m = realScene2.getBoundingClientRect();
  return `inset(${c.top - m.top}px ${m.right - c.right}px ${m.bottom - c.bottom}px ${c.left - m.left}px round ${24 * s}px)`;
};
realTl
  // the other cards step back so the last one carries the move alone
  .to([...rcards.slice(0, -1), ...rseps], { autoAlpha: 0, y: -24, duration: 0.5, stagger: 0.05, ease: 'power1.in' })
  // the card's paper grows into the whole scene while its text dissolves
  // (through a custom property, so the cards' own opacity is never
  // overridden); the Quality section rises over it during the last screen
  // of the pin, its elements revealing on their own scroll triggers
  .set(realFill, { autoAlpha: 1 }, '>')
  .fromTo(realFill, { clipPath: cardClip }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'power3.inOut', immediateRender: false }, '<')
  .fromTo(lastCard, { '--c': 1 }, { '--c': 0, duration: 0.5, ease: 'power1.in', immediateRender: false }, '<')
  .fromTo($$('.rcard__dot, h3, p', lastCard), { filter: 'blur(0px)' }, { filter: 'blur(6px)', duration: 0.5, ease: 'power1.in', immediateRender: false }, '<')
  .to(lastCard, { boxShadow: '0 30px 60px rgba(0, 10, 20, 0)', duration: 0.4 }, '<')
  .to('.real__cta', { autoAlpha: 0, duration: 0.4 }, '<')
  .to({}, { duration: 0.9 });

/* ---------------------------------------------------------
   7b. Applications → Realities: one continuous zoom. As the
       Applications scene scrolls away the camera pushes in on the
       aircraft's cockpit; the Realities close-up (same heading,
       nose to the lower left) arrives from further out and settles,
       so it reads as flying into the nose.
   --------------------------------------------------------- */
if (!reduceMotion) {
  // One camera move, no overlap: the Applications aircraft is pushed in on its
  // cockpit and slid onto the spot where the Realities close-up has its cockpit;
  // it is gone before the close-up resolves out of the same point and keeps
  // pushing in. Both are held still on screen (y cancels the scroll), so the
  // section edge is never seen.
  const handoff = { trigger: '#realities', start: 'top bottom', end: 'top top', scrub: 1, invalidateOnRefresh: true };
  const realScene = $('#realities');
  const canvasScale = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
  // where each cockpit sits on screen (px), once both sections are in place
  const appsCockpit = () => {
    const s = canvasScale();
    return { x: window.innerWidth / 2 + (702 - 720) * s, y: window.innerHeight / 2 + (630 - 450) * s };
  };
  const realCockpit = () => {
    const w = Math.min(window.innerWidth * 1.08, window.innerHeight * 1.62), h = w / 1.5;
    return { x: (window.innerWidth - w) / 2 + 0.407 * w, y: (window.innerHeight - h) / 2 + 0.398 * h };
  };
  const shift = (axis) => (realCockpit()[axis] - appsCockpit()[axis]) / canvasScale();

  gsap.set('.apps__zoom', { transformOrigin: '702px 630px' });
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      ...handoff,
      onToggle: (st) => { apps.classList.toggle('is-handoff', st.isActive); realScene.classList.toggle('is-handoff', st.isActive); },
    },
  })
    // Applications: hold on screen, glide the cockpit onto the close-up's, push in, vanish by 55%
    .to('.apps__zoom', { y: () => window.innerHeight / canvasScale() + shift('y'), duration: 1 }, 0)
    .to('.apps__zoom', { x: () => shift('x'), duration: 0.55, ease: 'power1.inOut' }, 0)
    .to('.apps__zoom', { scale: 2.25, duration: 0.55, ease: 'power2.in' }, 0)
    .to('.apps__zoom', { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, 0.3)
    .to('.apps__tabs, .apps__panels', { autoAlpha: 0, y: -40, duration: 0.3 }, 0)
    // Realities: held on screen the whole time, appears only after the first plane is gone
    .fromTo('.real__nosewrap', { xPercent: -50, yPercent: -50, y: () => -window.innerHeight }, { y: 0, duration: 1 }, 0)
    .fromTo('.real__nosewrap', { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.5)
    .fromTo('.real__nose', { filter: 'blur(10px)' }, { filter: 'blur(0px)', duration: 0.45, ease: 'power1.out' }, 0.5);
}

/* ---------------------------------------------------------
   8. Quality — standards fade up in turn; the red node walks
      down the list
   --------------------------------------------------------- */
$$('.reveal').forEach((el) => {
  gsap.from(el, { y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' } });
});
const stds = $$('.std');
// Quality standards: a still list. Each standard shows its title; hovering,
// focusing or tapping one reveals its description and turns its node red.
const stdList = $('.quality__list');
const quality = $('#quality');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
stds.forEach((n) => {
  n.tabIndex = 0;
  const on = () => stds.forEach((m) => m.classList.toggle('is-on', m === n));
  n.addEventListener('mouseenter', on);
  n.addEventListener('focus', on);
  n.addEventListener('click', () => (n.classList.contains('is-on') ? n.classList.remove('is-on') : on()));
});
stdList.addEventListener('mouseleave', () => stds.forEach((m) => m.classList.remove('is-on')));
stdList.addEventListener('focusout', (e) => { if (!stdList.contains(e.relatedTarget)) stds.forEach((m) => m.classList.remove('is-on')); });
// from the moment it reaches the top the section carries its own paper (until
// then its first screen is see-through over the Realities fill)
ScrollTrigger.create({ trigger: quality, start: 'top top', end: 'max', toggleClass: { targets: quality, className: 'is-solid' } });
let qualityPin = null;
if (!reduceMotion && window.innerWidth >= 1100) {
  // a short hold on the module, then the exit:
  const argusCard = $('.argus');
  const qFill = $('.quality__fill');
  const cardClipQ = () => {
    const c = argusCard.getBoundingClientRect(), q = quality.getBoundingClientRect();
    const r = 24 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1);
    return `inset(${c.top - q.top}px ${q.right - c.right}px ${q.bottom - c.bottom}px ${c.left - q.left}px round ${r}px)`;
  };
  const exitTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
    .to($$('.argus > *'), { autoAlpha: 0, filter: 'blur(6px)', duration: 0.35, stagger: 0.04, ease: 'power1.in' }, 0)
    .to('.quality__head, .quality__list', { autoAlpha: 0, duration: 0.35 }, 0.1)
    .set(qFill, { autoAlpha: 1 }, 0.2)
    .fromTo(qFill, { clipPath: cardClipQ }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.8, ease: 'power3.inOut', immediateRender: false }, 0.2)
    // once covered, the section itself turns navy so no paper edge can show at the hand-over
    .to(quality, { backgroundColor: '#00253e', duration: 0.01 }, 0.99);
  const HOLD_PART = 0.6, EXIT_PART = 1.1;   // in screen heights
  const HOLD_FRAC = HOLD_PART / (HOLD_PART + EXIT_PART);
  qualityPin = ScrollTrigger.create({
    trigger: quality, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (HOLD_PART + EXIT_PART)),
    pin: true, anticipatePin: 1,
    onRefresh: () => exitTl.invalidate(),
    onUpdate: (st) => exitTl.progress(clamp((st.progress - HOLD_FRAC) / (1 - HOLD_FRAC), 0, 1)),
  });
}

/* ---------------------------------------------------------
   9. ARGUS — the scan line sweeps the reel, flags pop as it
      passes them, the counters count up
   --------------------------------------------------------- */
const scan = $('#argusScan');
const scanLine = $('.argus__line', scan);
const flags = $$('.argus__flag', scan);
const scanTl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.4 });
scanTl.fromTo(scanLine, { x: 0 }, { x: () => scan.clientWidth - 2, duration: 4.2, ease: 'none' }, 0);
flags.forEach((f) => {
  const at = 4.2 * (+f.dataset.at);
  scanTl.fromTo(f, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, at);
});
scanTl.to(flags, { autoAlpha: 0, duration: 0.3 }, 4.4);
ScrollTrigger.create({
  trigger: quality, start: 'top 85%',
  end: () => (qualityPin ? qualityPin.end + window.innerHeight * 0.9 : 'bottom 10%'),
  onToggle: (st) => (st.isActive ? scanTl.play() : scanTl.pause()),
});
$$('[data-count]').forEach((b) => {
  const obj = { v: 0 };
  gsap.to(obj, {
    v: +b.dataset.count, duration: 1.6, ease: 'power2.out',
    onUpdate: () => { b.textContent = Math.round(obj.v); },
    scrollTrigger: { trigger: b, start: 'top 90%', toggleActions: 'play none none reverse' },
  });
});

/* ---------------------------------------------------------
   10. Market intelligence — title over the aircraft photo, then
       the cards travel in from the right (homepage insights pattern)
   --------------------------------------------------------- */
const market = $('#market');
const track = $('#marketTrack');
// the rail lives on the scaled 1440 × 900 canvas: work in canvas units, with
// the visible right edge of the screen at 720 + half the screen width / --s
const canvasS = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
const screenRight = () => 720 + window.innerWidth / (2 * canvasS());
const travel = () => Math.min(0, screenRight() - 48 - track.scrollWidth);
gsap.set('.market__actions', { autoAlpha: 0, y: 20 });

// title: words that light up one by one with the scroll (like the Realities title)
const marketTitle = $('.market__title');
marketTitle.innerHTML = Array.from(marketTitle.childNodes).map((n) => (n.nodeType === 3
  ? wrapWords(n.textContent.replace(/&/g, '&amp;'))
  : wrapWords(n.textContent.replace(/&/g, '&amp;'), ' wd--muted'))).join(' ');

// the airliner: a 40-frame image sequence on the 1440 × 900 Figma frame,
// drawn "cover" like the sky behind it
const planeCanvas = $('#marketPlane');
const pctx = planeCanvas.getContext('2d');
const PLANE_N = 72;
const planeFrames = Array.from({ length: PLANE_N }, (_, i) => {
  const img = new Image();
  img.decoding = 'async';
  img.src = `../../assets/img/ad/flyout/f${String(i).padStart(2, '0')}.webp`;
  return img;
});
const planeState = { f: 0 };
let planeDrawn = -1;
function drawPlane(force) {
  const i = clamp(Math.round(planeState.f), 0, PLANE_N - 1);
  const img = planeFrames[i];
  if ((!force && i === planeDrawn) || !img.complete || !img.naturalWidth) return;
  planeDrawn = i;
  const w = planeCanvas.width, h = planeCanvas.height;
  const k = Math.max(w / 1440, h / 900);
  pctx.clearRect(0, 0, w, h);
  pctx.drawImage(img, (w - 1440 * k) / 2, (h - 900 * k) / 2, 1440 * k, 900 * k);
}
function sizePlane() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  planeCanvas.width = Math.round(planeCanvas.clientWidth * dpr);
  planeCanvas.height = Math.round(planeCanvas.clientHeight * dpr);
  drawPlane(true);
}
planeFrames[0].addEventListener('load', () => drawPlane(true));
planeFrames.forEach((img) => img.addEventListener('load', () => { if (planeDrawn === -1) drawPlane(true); }));
window.addEventListener('resize', sizePlane);
sizePlane();


const marketTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: market, start: 'top top', end: '+=600%', pin: true, scrub: 1, invalidateOnRefresh: true },
});
marketTl
  .fromTo('.market__cover', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.7, ease: 'power1.inOut' }, 0)
  .fromTo('.market__bg', { scale: 1.08 }, { scale: 1, duration: 2.4 }, 0)
  .fromTo('.market__title .wd', { opacity: 0.15 }, {
    opacity: 1, color: '#ffffff',   // every word ends fully white
    stagger: 0.14, duration: 0.4,
  }, 0.4)
  // the airliner pulls away out of frame, then the cards arrive, featured first
  .to(planeState, { f: PLANE_N - 1, duration: 2.4, ease: 'sine.inOut', onUpdate: () => drawPlane() }, 1.9)
  .fromTo(track, { x: () => screenRight() }, { x: 0, duration: 1.4, ease: 'power2.out' }, 3.0)
  .to('.market__actions', { autoAlpha: 1, y: 0, duration: 0.5 }, 4.1)
  // the cards rest as in Figma: featured card fully in view, the rest running off the right
  .to({}, { duration: 1.5 });
// last screen of the pin (1 of 6): Conversion slides up over the scene,
// which only darkens a little beneath it
marketTl.to('.market__shade', { opacity: 0.4, duration: marketTl.duration() / 5, ease: 'power1.in' });

/* ---------------------------------------------------------
   10b. Conversion — slides up over the Market scene; its content
        animates in as it arrives: the gripper settles, the title
        and the specialist row rise in, the avatar pops
   --------------------------------------------------------- */
const convert = $('#contact');
const convertTitle = $('.convert__title');
convertTitle.innerHTML = wrapWords(convertTitle.textContent.replace(/&/g, '&amp;'));
if (!reduceMotion) {
  // the gripper photo is there from the start and slowly zooms in with the
  // scroll, from the moment the section starts sliding up until it leaves
  gsap.fromTo('.convert__bg', { scale: 1 }, {
    scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: convert, start: 'top bottom', end: 'bottom top', scrub: true },
  });
  const convIn = gsap.timeline({ paused: true })
    .fromTo('.convert__title .wd', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.04, ease: 'expo.out' }, 0.1)
    .fromTo('.convert__row', { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.35)
    .fromTo('.convert__avatar', { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'back.out(2)' }, 0.5);
  ScrollTrigger.create({
    trigger: convert, start: 'top 55%',
    onEnter: () => convIn.play(),
    onLeaveBack: () => convIn.reverse(),
  });
}

/* ---------------------------------------------------------
   11. Footer circuit + chat lift (from the homepage)
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
   12. Overlays — Industries dropdown, chat panel
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
// already on this page: close the menu and glide to the top
const selfLink = indMenu && indMenu.querySelector('a[aria-current="page"]');
if (selfLink) selfLink.addEventListener('click', (e) => {
  e.preventDefault(); setDropdown(false);
  if (lenis) lenis.scrollTo(0, { duration: 1.4 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
   13. Electronics / Solar switch — fade out, then go
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
   Header hides while scrolling down and slides back in as
   soon as the user scrolls up (stays put near the top and
   while the Industries menu is open)
   --------------------------------------------------------- */
(() => {
  const bar = document.querySelector('.header');
  const menu = document.getElementById('industriesMenu');
  let lastY = window.scrollY;
  let hidden = false;
  const setHidden = (h) => {
    if (h === hidden) return;
    hidden = h;
    gsap.to(bar, { yPercent: h ? -130 : 0, duration: h ? 0.45 : 0.6, ease: h ? 'power2.in' : 'expo.out', overwrite: 'auto' });
  };
  const onScroll = () => {
    const y = window.scrollY;
    const dy = y - lastY;
    if (Math.abs(dy) < 4) return;            // ignore tiny jitter
    lastY = y;
    if (y < 120 || (menu && !menu.hidden)) return setHidden(false);
    setHidden(dy > 0);
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  // keyboard users: bring it back when focus moves into the header
  bar.addEventListener('focusin', () => setHidden(false));
})();

if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

/* ---------------------------------------------------------
   Lift the chat button above the realities CTA cards while
   they are on screen (they sit 48px from the bottom edge)
   --------------------------------------------------------- */
(() => {
  const cta = document.querySelector('.real__cta');
  const chat = document.getElementById('chatBtn');
  if (!cta || !chat) return;
  let on = false;
  gsap.ticker.add(() => {
    const v = cta.style.visibility !== 'hidden' && parseFloat(cta.style.opacity || '0') > 0.05;
    if (v !== on) { on = v; chat.classList.toggle('is-raised', on); }
  });
})();
