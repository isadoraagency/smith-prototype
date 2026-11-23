/* =========================================================
   SMITH — Services / Procurement interactions
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
   4. Hero — headline words rise, the photo settles, the nav
      and actions follow; the photo drifts as the page moves on
   --------------------------------------------------------- */
const heroTitle = $('#heroTitle');
const heroWords = splitWords(heroTitle, true);
const heroImg = $('#heroMedia img');
const introNav = gsap.utils.toArray('.nav > *, .chat');
if (reduceMotion) gsap.set('.svc-hero__title, .svc-hero__actions', { visibility: 'visible' });
else {
  gsap.set(heroWords, { yPercent: 110 });
  gsap.set('.svc-hero__title, .svc-hero__actions', { visibility: 'visible' });
  gsap.set(heroImg, { scale: 1.18 });
  gsap.set('.svc-hero__actions > *', { autoAlpha: 0, y: 16 });
  gsap.set(introNav, { y: -24, autoAlpha: 0 });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 } })
      .to(heroWords, { yPercent: 0, stagger: 0.06 }, 0)
      .to(heroImg, { scale: 1, duration: 2.4 }, 0)
      .to(introNav, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 1.2, clearProps: 'transform,opacity,visibility' }, 0.2)
      .to('.svc-hero__actions > *', { autoAlpha: 1, y: 0, stagger: 0.1, duration: 1 }, 0.6);
  });
  gsap.to('#heroMedia', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.svc-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.svc-hero .canvas', { autoAlpha: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '.svc-hero', start: 'top top', end: '60% top', scrub: true } });
}

/* ---------------------------------------------------------
   5. Leader quote (pinned) — the quote lights up word by word,
      then the portrait card opens to the full screen; once it
      fills the screen the pin releases and the page carries on
      with the photo scrolling away into the next section
   --------------------------------------------------------- */
const lq = $('#leader');
const lqMedia = $('#lqMedia');
const lqWords = splitWords($('#lqQuote'));
// the card's box (Figma: 48, 130, 560 × 640, radius 16) in screen pixels
const cardBox = () => {
  const s = S(), W = lq.clientWidth, H = lq.clientHeight;
  return { left: (W - 1440 * s) / 2 + 48 * s, top: (H - 900 * s) / 2 + 130 * s, width: 560 * s, height: 640 * s, borderRadius: 16 * s };
};
const setCard = () => gsap.set(lqMedia, cardBox());
setCard();
if (!reduceMotion) {
  const lqTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: lq, start: 'top top', end: '+=240%', pin: true, scrub: 1, invalidateOnRefresh: true },
  });
  lqTl
    .fromTo(lqWords, { opacity: 0.15 }, { opacity: 1, stagger: 0.06, duration: 0.4 }, 0)
    .fromTo('.lq__content figcaption', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 1.9)
    .to({}, { duration: 0.3 })
    // the quote steps aside first, then the portrait opens to the whole screen
    .to('.lq__content', { autoAlpha: 0, x: 80, duration: 0.5, ease: 'power2.in' }, '>')
    .to('.lq__video', { autoAlpha: 0, y: 20, duration: 0.4 }, '<')
    .fromTo(lqMedia, { left: () => cardBox().left, top: () => cardBox().top, width: () => cardBox().width, height: () => cardBox().height, borderRadius: () => cardBox().borderRadius },
      { left: 0, top: 0, width: () => lq.clientWidth, height: () => lq.clientHeight, borderRadius: 0, duration: 1.4, ease: 'power2.inOut', immediateRender: false }, '-=0.15')
    .fromTo('#lqMedia img', { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'power2.inOut' }, '<')
    .to({}, { duration: 0.4 });
  // the card rises into place on the way in
  gsap.from(lqMedia, { y: 80, ease: 'none', scrollTrigger: { trigger: lq, start: 'top bottom', end: 'top top', scrub: true } });
  window.addEventListener('resize', () => { if (!lqTl.scrollTrigger.isActive && lqTl.scrollTrigger.progress === 0) setCard(); });
} else gsap.set(lqWords, { opacity: 1 });

/* ---------------------------------------------------------
   6. Capability hub (pinned) — the diagram draws in, then the
      scroll walks the six capabilities: active pill, red
      connector, detail card swaps; clicking a pill jumps to it
   --------------------------------------------------------- */
const hub = $('#capabilities');
const hubNodes = $$('.hub__node', hub);
const hubLines = $$('.hub__line', hub);
const hubCore = $('.hub__core', hub);
const hubDetail = $('.hub__detail', hub);
const hubData = $$('template[data-cap]', hub).map((t) => ({ title: $('b', t.content).innerHTML, text: $('span', t.content).innerHTML }));
lightUp($('#hubTitle'), 'top 95%', 'top 40%');
let hubOn = 0;
function setCap(i) {
  if (i === hubOn) return;
  hubOn = i;
  hubNodes.forEach((n, k) => { n.classList.toggle('is-on', k === i); n.setAttribute('aria-pressed', String(k === i)); });
  hubLines.forEach((l, k) => l.classList.toggle('is-on', k === i));
  hubCore.classList.remove('is-pulse'); void hubCore.offsetWidth; hubCore.classList.add('is-pulse');
  swap($$('.hub__detail > *', hub), () => {
    $('.hub__detail-title', hub).innerHTML = hubData[i].title;
    $('.hub__detail-text', hub).innerHTML = hubData[i].text;
    $('.hub__detail-pos', hub).textContent = `${String(i + 1).padStart(2, '0')} / 06`;
  });
}
hubLines[0].classList.add('is-on');
gsap.set(hubNodes, { xPercent: -50 });   // pills are placed by their centre (GSAP owns the transform)
let hubSt = null;
const HUB_FROM = 0.12;   // first stretch of the pin: the diagram settles before the walk starts
if (!reduceMotion) {
  hubLines.forEach(prepLine);
  gsap.set(hubCore, { scale: 0.6, autoAlpha: 0 });
  gsap.set(hubNodes, { scale: 0.7, autoAlpha: 0 });
  gsap.set(hubDetail, { autoAlpha: 0, x: 40 });
  gsap.timeline({ scrollTrigger: { trigger: hub, start: 'top 55%', toggleActions: 'play none none reverse' } })
    .to(hubCore, { scale: 1, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.6)' }, 0)
    .to(hubLines, { ...DRAWN, duration: 0.9, stagger: 0.08, ease: 'power2.out' }, 0.2)
    .to(hubNodes, { scale: 1, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(2)' }, 0.5)
    .to(hubDetail, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power3.out' }, 0.7);
  hubSt = ScrollTrigger.create({
    trigger: hub, start: 'top top', end: '+=300%', pin: true,
    onUpdate: (st) => setCap(clamp(Math.floor(((st.progress - HUB_FROM) / (1 - HUB_FROM)) * 6), 0, 5)),
  });
}
hubNodes.forEach((n, i) => n.addEventListener('click', () => (hubSt ? scrollToStep(hubSt, HUB_FROM, i, 6) : setCap(i))));

/* ---------------------------------------------------------
   7. Time zones — live: the red hand shows UTC now, each ring's
      arc is that desk's business hours (08:00–18:00 local, on
      weekdays), blue while the desk is open
   --------------------------------------------------------- */
const tz = $('#time-zones');
const offices = $$('.tz-office', tz);
const arcs = $$('.tz__hours', tz);
const hand = $('#tzHand');
lightUp($('#tzTitle'));
const tzParts = (zone, d) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { h: +p.hour, m: +p.minute, wd: p.weekday };
};
function clockState(d = new Date()) {
  const utcH = d.getUTCHours() + d.getUTCMinutes() / 60;
  const desks = offices.map((o) => {
    const { h, m, wd } = tzParts(o.dataset.tz, d);
    let off = (h + m / 60) - utcH; if (off > 12) off -= 24; if (off < -12) off += 24;
    const open = !['Sat', 'Sun'].includes(wd) && h >= 8 && h < 18;
    return { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, open, startUtc: (8 - off + 24) % 24 };
  });
  return { utcH, utc: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`, desks };
}
const handAngle = (utcH) => (utcH / 24) * 360;
function paintClock(st, animate) {
  $('#tzUtc').textContent = `${st.utc} UTC`;
  const n = st.desks.filter((x) => x.open).length;
  $('#tzDesks').textContent = `${n} of 6 desks open`;
  st.desks.forEach((x, i) => {
    offices[i].classList.toggle('is-open', x.open);
    $('time', offices[i]).textContent = x.time;
    const arc = arcs[i], r = +arc.getAttribute('r'), C = 2 * Math.PI * r, len = (10 / 24) * C;
    arc.setAttribute('transform', `rotate(${(x.startUtc / 24) * 360 - 90} 320 320)`);
    arc.classList.toggle('is-closed', !x.open);
    arc.dataset.len = len; arc.dataset.c = C;
    if (!animate) arc.setAttribute('stroke-dasharray', `${len} ${C}`);
  });
  if (!animate) gsap.set(hand, { attr: { transform: `rotate(${handAngle(st.utcH)} 320 320)` } });
}
const tzNow = clockState();
paintClock(tzNow, !reduceMotion);
if (!reduceMotion) {
  const rings = $$('.tz__ring', tz).map(prepLine);
  arcs.forEach((a) => a.setAttribute('stroke-dasharray', `0 ${a.dataset.c}`));
  gsap.set(hand, { attr: { transform: `rotate(${handAngle(tzNow.utcH) - 120} 320 320)` } });
  gsap.set('.tz__readout, .tz__hour', { autoAlpha: 0 });
  gsap.set([...offices, ...$$('.tz__statements li', tz)], { autoAlpha: 0, y: 24 });
  const rot = { a: handAngle(tzNow.utcH) - 120 };
  gsap.timeline({ scrollTrigger: { trigger: '.tz__clock', start: 'top 75%', toggleActions: 'play none none reverse' } })
    .to(rings, { ...DRAWN, duration: 1.4, stagger: 0.08, ease: 'power2.inOut' }, 0)
    .to(arcs, { attr: { 'stroke-dasharray': (i, a) => `${a.dataset.len} ${a.dataset.c}` }, duration: 1.2, stagger: 0.1, ease: 'power3.out' }, 0.6)
    .to(rot, { a: handAngle(tzNow.utcH), duration: 1.6, ease: 'expo.out', onUpdate: () => hand.setAttribute('transform', `rotate(${rot.a} 320 320)`) }, 0.8)
    .to('.tz__readout, .tz__hour', { autoAlpha: 1, duration: 0.6, stagger: 0.05 }, 1)
    .to(offices, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, 0.4)
    .to($$('.tz__statements li', tz), { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, 0.9);
}
setInterval(() => {   // keep it live
  const st = clockState();
  paintClock(st, false);
}, 30000);

/* ---------------------------------------------------------
   8. Lifecycle (pinned) — title lights up, the panel rises,
      then the scroll opens one stage at a time
   --------------------------------------------------------- */
const lc = $('#lifecycle');
const accItems = $$('.acc__item', lc);
let accOn = 0;
function openStage(i) {
  if (i === accOn) return;
  accOn = i;
  accItems.forEach((it, k) => {
    const open = k === i, body = $('.acc__body', it);
    it.classList.toggle('is-open', open);
    $('.acc__head', it).setAttribute('aria-expanded', String(open));
    if (reduceMotion) { body.style.height = open ? 'auto' : '0px'; return; }
    gsap.to(body, { height: open ? 'auto' : 0, duration: 0.55, ease: 'power3.inOut', overwrite: true });
  });
}
let lcSt = null;
const LC_FROM = 0.3;
const lcWords = splitWords($('#lcTitle'));
if (!reduceMotion) {
  const lcTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: lc, start: 'top top', end: '+=360%', pin: true, scrub: 1,
      onUpdate: (st) => openStage(clamp(Math.floor(((st.progress - LC_FROM) / (1 - LC_FROM)) * 5), 0, 4)),
    },
  });
  lcSt = lcTl.scrollTrigger;
  lcTl
    .fromTo('.lc__media img', { scale: 1.15 }, { scale: 1, duration: 10 }, 0)
    // the words light up across 0 → 2.2 and the panel rises across 0.6 → 2.2,
    // so the last word turns white as the panel lands
    .fromTo(lcWords, { opacity: 0.15 }, { opacity: 1, stagger: 1.4 / Math.max(1, lcWords.length - 1), duration: 0.8 }, 0)
    .fromTo('.lc__panel', { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 0.6);
} else gsap.set(lcWords, { opacity: 1 });
accItems.forEach((it, i) => $('.acc__head', it).addEventListener('click', () => (lcSt ? scrollToStep(lcSt, LC_FROM, i, 5) : openStage(i))));

/* ---------------------------------------------------------
   9. Business — the photo wipes in, the title rises, the
      metric rules draw and the numbers count up
   --------------------------------------------------------- */
const biz = $('#business');
const bizWords = splitWords($('#bizTitle'), true);
const metrics = $$('.metric', biz);
if (!reduceMotion) {
  gsap.timeline({ scrollTrigger: { trigger: biz, start: 'top 70%', toggleActions: 'play none none reverse' } })
    .fromTo('.biz__media', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' }, 0)
    .fromTo('.biz__media img', { scale: 1.25 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0.2)
    .fromTo(bizWords, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'expo.out' }, 0.3);
  metrics.forEach((m, i) => {
    const v = $('.metric__value', m);
    const tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 85%', toggleActions: 'play none none reverse' } })
      .fromTo(m, { '--rule': '0%' }, { '--rule': '100%', duration: 1.1, ease: 'power2.inOut' }, 0)
      .fromTo([v, $('.metric__text', m)], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.15);
    if (v.dataset.count) {
      const to = +v.dataset.count, from = to > 1000 ? to - 40 : 0, suffix = v.textContent.replace(/[0-9]/g, ''), o = { n: from };
      tl.fromTo(o, { n: from }, { n: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { v.textContent = Math.round(o.n) + suffix; } }, 0.15);
    }
  });
}

/* ---------------------------------------------------------
   10. Confidence (pinned) — title lights up, the panel rises,
       then the scroll walks Source → Deliver: the red line fills
       to the open step and only that step's detail shows
   --------------------------------------------------------- */
const conf = $('#quality');
const cSteps = $$('.cstep', conf);
const cLines = $$('.cstep__line span', conf);
const cData = $$('template[data-step]', conf).map((t) => ({ title: $('b', t.content).innerHTML, text: $('span', t.content).innerHTML }));
let stepOn = -1;
function setStep(i) {
  if (i === stepOn) return;
  const first = stepOn === -1;
  stepOn = i;
  cSteps.forEach((s, k) => { s.classList.toggle('is-done', k < i); s.classList.toggle('is-on', k === i); });
  cLines.forEach((l, k) => gsap.to(l, { scaleX: k < i ? 1 : 0, duration: 0.5, ease: 'power2.inOut', overwrite: true }));
  const apply = () => {
    $('.conf__num', conf).textContent = String(i + 1).padStart(2, '0');
    $('.conf__step-title', conf).innerHTML = cData[i].title;
    $('.conf__step-text', conf).innerHTML = cData[i].text;
  };
  if (first) apply(); else swap([$('.conf__num', conf), $('.conf__step-title', conf), $('.conf__step-text', conf)], apply);
}
setStep(0);
let confSt = null;
const CONF_FROM = 0.25;
const confWords = splitWords($('#confTitle'));
if (!reduceMotion) {
  const confTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: conf, start: 'top top', end: '+=380%', pin: true, scrub: 1,
      onUpdate: (st) => setStep(clamp(Math.floor(((st.progress - CONF_FROM) / (1 - CONF_FROM)) * 5), 0, 4)),
    },
  });
  confSt = confTl.scrollTrigger;
  confTl
    .fromTo(confWords, { opacity: 0.15 }, { opacity: 1, stagger: 0.2, duration: 0.8 }, 0)
    .fromTo('.conf__intro p', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.6)
    .fromTo('.conf__panel', { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0.9)
    .to({}, { duration: 6 });
} else gsap.set(confWords, { opacity: 1 });
cSteps.forEach((s, i) => s.addEventListener('click', () => (confSt ? scrollToStep(confSt, CONF_FROM, i, 5) : setStep(i))));

/* ---------------------------------------------------------
   11. Watching — the photo eases back as the section passes,
       the title lights up, the card slides in and its signal
       icon ripples out from the centre
   --------------------------------------------------------- */
const watch = $('#watching');
const watchWords = splitWords($('#watchTitle'));
if (!reduceMotion) {
  gsap.fromTo('.watch__media img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: watch, start: 'top bottom', end: 'bottom top', scrub: true } });
  const card = $('.mbyte', watch);
  // one scrubbed range: the title lights up word by word while the card slides
  // in, and the last word turns white as the card settles
  const content = $$('.mbyte__content > *', card);
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: watch, start: 'top 75%', end: 'top 10%', scrub: 1 } })
    .fromTo(watchWords, { opacity: 0.15 }, { opacity: 1, stagger: 1.2 / Math.max(1, watchWords.length - 1), duration: 0.8 }, 0)
    .fromTo(card, { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 1.4, ease: 'power2.out' }, 0.4)
    .fromTo(content, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, 2.0 - 0.6 - 0.1 * (content.length - 1));
  // the signal icon (an <img>): a slow breathing ripple
  gsap.to('.mbyte__icon', { scale: 1.08, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 50%' });
}

/* ---------------------------------------------------------
   12. CTA — the two cards rise in turn, the board dots light up
   --------------------------------------------------------- */
if (!reduceMotion) {
  gsap.timeline({ scrollTrigger: { trigger: '#contact', start: 'top 75%', toggleActions: 'play none none reverse' } })
    .fromTo('.cta__card', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.15, ease: 'expo.out' }, 0)
    .fromTo('.cta__dots i', { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(3)' }, 0.5);
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
