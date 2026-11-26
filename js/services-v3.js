/* =========================================================
   SMITH — Services / Procurement v3
   GSAP + ScrollTrigger + Lenis, three.js for one scene. No build.

   01  the page opens on the component-testing photo among six
       capability cards; scrolling flies the camera to each card in
       turn (it fills the centre while its caption is read) and on to
       Todd's portrait, which opens to full screen for his quote
   02  the live clock tilts up out of the dark
   03  a circuit-board assembly (WebGL) turns once per lifecycle
       stage; it plays on its own and follows hover / focus
   04  the background turns to paper; the photo is revealed by a mask
       rising from the bottom and the numbers count up
   05  the quality timeline slides under a fixed centre
   06  the market note and the next steps float out of depth
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const vw = () => document.documentElement.clientWidth;
const vh = () => window.innerHeight;

/* ---------- smooth scrolling ---------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
} else {
  document.documentElement.classList.add('sv-static');
}

/* ---------- canvas scale ---------- */
function fit() {
  const w = vw(), h = vh();
  const root = document.documentElement.style;
  root.setProperty('--s', Math.min(w / 1440, h / 900).toFixed(4));
  root.setProperty('--sw', (w / 1440).toFixed(4));
  root.setProperty('--sy', clamp(h / 900, 0.72, 1.2).toFixed(4));
  // the dial is 497px in the 1440 × 900 frame
  const dial = w <= 900 ? Math.min(w * 0.82, h * 0.5) : 497 * Math.min(w / 1440, h / 900);
  root.setProperty('--dk', (dial / 640).toFixed(4));
}
fit();
window.addEventListener('resize', fit);

/* ---------- header theme follows what is under the logo ---------- */
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

/* ---------- helpers ---------- */
function splitWords(el, mask = false) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const wd = document.createElement('span'); wd.className = 'wd'; wd.textContent = w;
    if (mask) { const wm = document.createElement('span'); wm.className = 'wm'; wm.appendChild(wd); el.appendChild(wm); } else el.appendChild(wd);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return $$('.wd', el);
}
function prepLine(el) {
  el.setAttribute('pathLength', '1');
  el.setAttribute('stroke-dasharray', '1 1');
  el.setAttribute('stroke-dashoffset', '1');
  return el;
}
// crossfade a text block to new content
function swap(els, apply) {
  gsap.to(els, { autoAlpha: 0, y: -8, duration: 0.16, ease: 'power1.in', overwrite: true, onComplete: () => {
    apply();
    gsap.fromTo(els, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
  } });
}
const fromTemplate = (id) => $$('li', $(id).content).map((li) => ({ title: $('b', li).textContent, text: $('span', li).textContent }));
const bg = $('#svBg');
const NAVY = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim() || '#00253e';
const PAPER = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f0f1eb';

/* ---------- live clock data (02) ---------- */
const tzSec = $('#time-zones');
const offices = $$('.tz-office', tzSec);
const arcs = $$('.tz__hours', tzSec);
const hand = $('#tzHand');
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
function paintText(st) {
  $('#tzUtc').textContent = `${st.utc} UTC`;
  $('#tzDesks').textContent = `${st.desks.filter((x) => x.open).length} of 6 desks open`;
  st.desks.forEach((x, i) => {
    offices[i].classList.toggle('is-open', x.open);
    $('time', offices[i]).textContent = x.time;
    arcs[i].classList.toggle('is-closed', !x.open);
  });
}
const tzNow = clockState();
paintText(tzNow);
tzNow.desks.forEach((x, i) => {
  const a = arcs[i], r = +a.getAttribute('r'), C = 2 * Math.PI * r;
  a.dataset.len = (10 / 24) * C; a.dataset.c = C;
  a.setAttribute('transform', `rotate(${(x.startUtc / 24) * 360 - 90} 320 320)`);
  a.setAttribute('stroke-dasharray', `${reduceMotion ? a.dataset.len : 0} ${C}`);
});
hand.setAttribute('transform', `rotate(${handAngle(tzNow.utcH) - (reduceMotion ? 0 : 140)} 320 320)`);
setInterval(() => paintText(clockState()), 30000);

/* ---------- metric counters (04) ---------- */
const metrics = $$('.sv-metric b');
function paintMetrics(t) {
  metrics.forEach((b, i) => {
    const to = +b.dataset.to, from = b.dataset.from ? +b.dataset.from : 0;
    const k = clamp(t * 2.2 - i * 0.45, 0, 1);
    const v = Math.round(lerp(from, to, gsap.parseEase('power2.out')(k)));
    b.textContent = `${b.dataset.pre || ''}${to === 1 ? Math.max(1, v) : v}${b.dataset.post || ''}`;
  });
}

/* =========================================================
   03 — the component (layered renders in CSS 3D, as on the
   Homepage R3 prototype): the assembled shot crossfades into
   its three layers, which open out in depth, then it just
   floats. The stages (autoplay + hover / focus on the ticker)
   only change the copy, so the eye stays on the text.
   ========================================================= */
// set up after the pinned scenes above it, so its triggers include their pin spacing
function initCycle() {
  const comp = buildComponent();
  // the stage crossing the middle of the screen gets the red marker
  $$('.sv-cycle__item').forEach((li) => ScrollTrigger.create({ trigger: li, start: 'top 55%', end: 'bottom 55%', toggleClass: 'is-on' }));
  ScrollTrigger.create({
    trigger: '#lifecycle', start: 'top bottom', end: 'bottom top',
    onToggle: (st) => comp.setRunning(st.isActive),
  });
  window.addEventListener('resize', comp.fit);
}

function buildComponent() {
  const world = $('#svCompWorld');
  const asm = $('#svCompAsm');
  const shadow = $('#svCompShadow');
  const layers = $$('.sv-comp__layer', world).map((el) => ({ el, cx: +el.dataset.cx, cy: +el.dataset.cy, cz: +el.dataset.cz }));
  const E = (x) => x * x * (3 - 2 * x);

  // one fixed pose; cin: arrival, sw: assembled shot → layers, ex: layers open out
  const s = { cin: 0, sw: 0, ex: 0, rx: 4, ry: -10, rz: 5 };

  // the component spans about 1000 × 620 of its 1440 × 900 stage: fit that to its box
  const box = $('#svComp');
  function fit() {
    const k = Math.min(box.clientWidth / 1000, box.clientHeight / 620);
    world.style.setProperty('--cs', Math.max(0.2, k).toFixed(4));
  }
  fit();

  function paint(t = 0) {
    const cin = E(s.cin), ex = E(s.ex), sw = s.sw;
    // floating: a slow bob with a little sway
    const float = Math.sin(t * 0.9) * 8;
    const sway = Math.sin(t * 0.45) * 1.5;
    const sc = (0.78 + 0.22 * cin) * (1 + 0.06 * ex);
    const rx = s.rx + 14 * (1 - cin) + sway * 0.5 * cin;
    const ry = s.ry + 16 * (1 - cin) + sway * cin;
    const rz = s.rz - 6 * (1 - cin);
    const ty = 70 * (1 - cin) + float * cin;
    world.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    world.style.opacity = cin.toFixed(3);
    asm.style.opacity = (1 - sw).toFixed(3);
    shadow.style.opacity = (1 - 0.75 * ex).toFixed(3);
    shadow.style.transform = `scale(${(1 + 0.6 * ex).toFixed(3)}, ${(1 - 0.3 * ex).toFixed(3)})`;
    layers.forEach(({ el, cx, cy, cz }) => {
      const dx = (724 - cx) * 0.94 * (1 - ex) + (cx - 709) * 0.22 * ex;
      const dy = (466 - cy) * 0.94 * (1 - ex) + (cy - 423) * 0.22 * ex;
      el.style.opacity = sw.toFixed(3);
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, ${(cz * ex * 1.6).toFixed(1)}px)`;
    });
  }

  // scroll: it rises in assembled, then opens into its layers as the section settles
  if (!reduceMotion) {
    gsap.timeline({ scrollTrigger: { trigger: '#lifecycle', start: 'top 85%', end: 'top 0%', scrub: 0.8 } })
      .fromTo(s, { cin: 0 }, { cin: 1, duration: 0.55, ease: 'none' }, 0)
      .fromTo(s, { sw: 0 }, { sw: 1, duration: 0.25, ease: 'none' }, 0.5)
      .fromTo(s, { ex: 0 }, { ex: 1, duration: 0.45, ease: 'none' }, 0.55);
  } else { s.cin = 1; s.sw = 1; s.ex = 1; }

  let running = false;
  const t0 = performance.now();
  const tick = () => paint(reduceMotion ? 0 : (performance.now() - t0) / 1000);
  function setRunning(v) {
    if (v === running) return;
    running = v;
    if (v) gsap.ticker.add(tick); else gsap.ticker.remove(tick);
  }
  paint();
  return { setRunning, fit };
}

if (!reduceMotion) {
  /* =======================================================
     01 — the field → each capability → Todd
     ======================================================= */
  const intro = $('#top');
  const world = $('#svWorld');
  const cards = $$('.sv-card', world);
  const hero = $('.sv-card--hero');
  const endCard = $('.sv-card--end');
  const capCards = cards.filter((c) => c.dataset.cap !== undefined);
  const caps = $$('#svCaps li').map((li) => ({ title: $('b', li).textContent, text: $('span', li).textContent }));
  const sets = $$('.sv-set', intro);
  const slots = $$('.sv-set__slot', intro);                 // one per capability, in order
  const titleWords = splitWords($('#svTitle'), true);
  const voice = $('#leader');
  const quoteWords = splitWords($('#svQuote'));

  /* geometry, measured from the Figma frame (1440 × 900):
     a card's width there gives its depth (perspective P), its centre
     gives its place in the world */
  const P = 1000, HERO_W = 438, END_W = 300;
  const depthFor = (screenW) => P * (1 - HERO_W / screenW);  // z where a HERO_W card looks screenW wide
  const SET_Z = [1200, 5200];                                 // camera depth for each set of three
  let G = {};
  function measure() {
    const W = vw(), H = vh();
    const small = W < 720;
    const sx = small ? W / 820 : W / 1440, sy = H / 900;
    const s = small ? sx : Math.min(sx, sy);
    G.w0 = HERO_W * s;
    world.style.setProperty('--w0', `${G.w0}px`);
    cards.forEach((c) => {
      const fw = +c.dataset.fw, k = fw / HERO_W;
      c._z = c === hero ? 0 : P * (1 - 1 / k);
      c._x = ((+c.dataset.fx - 720) * sx) / k;
      c._y = ((+c.dataset.fy - 450) * sy) / k;
      c.style.transform = `translate3d(${c._x.toFixed(1)}px, ${c._y.toFixed(1)}px, ${c._z.toFixed(1)}px)`;
    });
    // where each capability card lines up: its slot in the set layout, from the screen centre
    const ir = intro.getBoundingClientRect();
    G.slots = slots.map((el) => {
      const r = el.getBoundingClientRect();
      return { X: r.left - ir.left + r.width / 2 - ir.width / 2, Y: r.top - ir.top + r.height / 2 - ir.height / 2, k: r.width / G.w0 };
    });
    const endEff = depthFor(END_W);
    // camera stops: 0 = the field, 1 = capabilities 01–03, 2 = 04–06, 3 = Todd
    G.stops = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: SET_Z[0] }, { x: 0, y: 0, z: SET_Z[1] },
      { x: endCard._x, y: endCard._y, z: endEff - endCard._z }];
    G.endW = HERO_W * s * (P / (P - endEff));
  }
  measure();

  /* scroll drives everything (cam.f 0 → 3): the camera pushes into the
     field, and at each set its three cards leave their places in the
     field and line up in a row over their copy, then rejoin the field
     as the camera moves on */
  const cam = { f: 0, reveal: 0, introZ: -2600 };
  function camAt(f) {
    const i = clamp(Math.floor(f), 0, G.stops.length - 2);
    const u = clamp((f - i - 0.16) / 0.68, 0, 1);            // dwell at each stop
    const tz = smoother(u), txy = smoother(clamp(u / 0.62, 0, 1));
    const a = G.stops[i], b = G.stops[i + 1];
    return { x: lerp(a.x, b.x, txy), y: lerp(a.y, b.y, txy), z: lerp(a.z, b.z, tz) };
  }
  const lineup = (f, k) => smoother(clamp((1 - Math.abs(f - (k + 1))) / 0.6, 0, 1));   // 1 within ±0.4 of the stop
  function paintWorld() {
    const c = camAt(cam.f);
    const z = c.z + cam.introZ;
    world.style.transform = `translate3d(${(-c.x).toFixed(1)}px, ${(-c.y).toFixed(1)}px, ${z.toFixed(1)}px)`;
    const bs = [lineup(cam.f, 0), lineup(cam.f, 1)];
    const bMax = Math.max(bs[0], bs[1]);
    cards.forEach((card) => {
      const cap = card.dataset.cap === undefined ? -1 : +card.dataset.cap;
      const b = cap < 0 ? 0 : bs[cap < 3 ? 0 : 1];
      let x = card._x, y = card._y, cz = card._z;
      if (b > 0) {
        // the world position that shows the card in its slot from where the camera is now
        const sl = G.slots[cap], eff = P * (1 - 1 / sl.k);
        x = lerp(x, sl.X / sl.k + c.x, b); y = lerp(y, sl.Y / sl.k + c.y, b); cz = lerp(cz, eff - z, b);
      }
      if (cap >= 0) card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${cz.toFixed(1)}px)`;
      const eff = cz + z;                                         // > 0: in front of the screen plane
      let o = clamp((eff + 15000) / 3000, 0, 1);                  // out of the distance
      o *= clamp((760 - eff) / 360, 0, 1);                        // gone before it reaches the camera
      if (card !== hero && card !== endCard) o *= cam.reveal;
      o *= 1 - 0.9 * Math.max(0, bMax - b);                       // the rest of the field steps back
      if (card === endCard && cam.f > 2.995) o = 0;               // the portrait layer has taken over from it
      card.style.opacity = o.toFixed(3);
      card.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    });
    // each set's copy reads while its cards are lined up
    sets.forEach((el, k) => {
      const d = cam.f - (k + 1);
      const o = clamp((0.32 - Math.abs(d)) / 0.14, 0, 1);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.setProperty('--ty', `${(-d * 90).toFixed(1)}px`);
    });
  }

  // where Todd's card sits when the camera stops: the voice layer starts exactly there
  const endBox = () => { const w = G.endW, h = w * 1.25; return { left: (vw() - w) / 2, top: (vh() - h) / 2, width: w, height: h }; };
  // where it settles: the landscape portrait of sv2 / 04, read from the css layout
  const toddBox = () => {
    const m = $('#svVoiceMedia'), keep = ['left', 'top', 'width', 'height'].map((k) => m.style[k]);
    m.style.left = m.style.top = m.style.width = m.style.height = '';
    const b = { left: m.offsetLeft, top: m.offsetTop, width: m.offsetWidth, height: m.offsetHeight };
    ['left', 'top', 'width', 'height'].forEach((k, i) => { m.style[k] = keep[i]; });
    return b;
  };

  // arrival: the field drifts in out of depth, the headline rises
  gsap.to(cam, { introZ: 0, reveal: 1, duration: 2.4, ease: 'expo.out', delay: 0.1, onUpdate: paintWorld });
  gsap.from(titleWords, { yPercent: 110, duration: 1.1, stagger: 0.035, ease: 'expo.out', delay: 0.5 });
  paintWorld();

  // field → 01–03 → 04–06 → Todd, each set held while it is read
  const LEG = 1.25, HOLD = 1.1, FLY = 3 * LEG + 2 * HOLD;
  const t1 = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: intro, start: 'top top', end: '+=1050%', pin: true, scrub: 0.6, invalidateOnRefresh: true, onRefresh: () => { measure(); paintWorld(); } },
  });
  t1
    .to('#svTitle', { autoAlpha: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 0)
    .to(cam, { f: 1, duration: LEG, onUpdate: paintWorld }, 0.2)
    .to(cam, { f: 2, duration: LEG, onUpdate: paintWorld }, 0.2 + LEG + HOLD)
    .to(cam, { f: 3, duration: LEG, onUpdate: paintWorld }, 0.2 + 2 * (LEG + HOLD))
    // Todd's card opens out of the field into the landscape portrait, left of the quote
    .set(voice, { autoAlpha: 1 }, 0.2 + FLY)
    .fromTo('#svVoiceMedia', {
      left: () => endBox().left, top: () => endBox().top, width: () => endBox().width, height: () => endBox().height,
    }, { left: () => toddBox().left, top: () => toddBox().top, width: () => toddBox().width, height: () => toddBox().height, duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 0.2 + FLY)
    .fromTo('#svVoiceMedia img', { objectPosition: '50% 50%' }, { objectPosition: '50% 33%', duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 0.2 + FLY)
    .fromTo('#svVoiceShade', { opacity: 0 }, { opacity: 1, duration: 1, immediateRender: false }, 0.7 + FLY)
    .fromTo('#svQuote', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, immediateRender: false }, 1.0 + FLY)
    .fromTo(quoteWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.06, duration: 0.3, immediateRender: false }, 1.3 + FLY)
    .fromTo('#svVoiceContent figcaption, .sv-pill', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.5, immediateRender: false }, 2.9 + FLY)
    // quote and portrait lift away into the night for the clock
    .to('#svVoiceContent', { autoAlpha: 0, y: -60, duration: 0.7, ease: 'power2.in' }, 4.1 + FLY)
    .to('#svVoiceMedia', { autoAlpha: 0, y: -80, duration: 0.8, ease: 'power2.in' }, 4.2 + FLY)
    .to({}, { duration: 0.2 });
  gsap.set('#svVoiceContent figcaption, .sv-pill, #svQuote', { autoAlpha: 0 });
  gsap.set(quoteWords, { opacity: 0.12 });

  /* =======================================================
     02 — the live clock
     ======================================================= */
  const dial = $('#svDialWrap');
  const rings = $$('.tz__ring', tzSec).map(prepLine);
  const tzTitle = splitWords($('#tzTitle'));
  const checks = $$('.sv-checks li', tzSec);
  gsap.set(dial, { rotateX: 58, scale: 0.72, z: -300, autoAlpha: 0, transformOrigin: '50% 60%' });
  gsap.set(['.tz__readout', '.tz__hour'], { autoAlpha: 0 });
  gsap.set([...offices, ...checks], { autoAlpha: 0, y: 24 });
  gsap.timeline({ scrollTrigger: { trigger: tzSec, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .fromTo(tzTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.3)
    // explicit from/to values on both timelines: they share the dial, so neither may
    // record its start from whatever the other left behind (that left it squashed)
    .fromTo(dial, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false }, 0.3)
    .fromTo(dial, { rotateX: 58, scale: 0.72, z: -300 }, { rotateX: 30, scale: 0.86, z: -120, duration: 0.7, ease: 'none', immediateRender: false }, 0.3)
    .to(offices, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.4 }, 0.6);
  const rot = { a: handAngle(tzNow.utcH) - 140 };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: tzSec, start: 'top top', end: '+=220%', pin: true, scrub: 0.6 } })
    .fromTo(dial, { rotateX: 30, scale: 0.86, z: -120, autoAlpha: 1 }, { rotateX: 0, scale: 1, z: 0, autoAlpha: 1, duration: 1, ease: 'power2.out', immediateRender: false }, 0)
    .to(rings, { attr: { 'stroke-dashoffset': 0 }, stagger: 0.08, duration: 0.8 }, 0)
    .to(arcs, { attr: { 'stroke-dasharray': (i, a) => `${a.dataset.len} ${a.dataset.c}` }, stagger: 0.1, duration: 0.7 }, 0.6)
    .to(rot, { a: handAngle(tzNow.utcH), duration: 1.2, ease: 'power3.out', onUpdate: () => hand.setAttribute('transform', `rotate(${rot.a} 320 320)`) }, 0.7)
    .to(['.tz__readout', '.tz__hour'], { autoAlpha: 1, stagger: 0.05, duration: 0.4 }, 1)
    .to(checks, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.5 }, 1.1)
    .to({}, { duration: 0.8 })
    // fly through the dial into the board
    .to(['.sv-clock__title', '.sv-offices', '.sv-checks'], { autoAlpha: 0, y: -50, duration: 0.6, ease: 'power2.in' }, 2.7)
    .fromTo(dial, { scale: 1, autoAlpha: 1 }, { scale: 3.4, autoAlpha: 0, duration: 1, ease: 'power2.in', immediateRender: false }, 2.7);

  /* =======================================================
     03 — lifecycle copy rises in with the board
     ======================================================= */
  gsap.fromTo('#svCycleTitle', { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1, y: 0, ease: 'power2.out',
    scrollTrigger: { trigger: '#lifecycle', start: 'top 70%', end: 'top 20%', scrub: 0.6 },
  });
  // each stage rises in once as it reaches the screen, then stays put to be read
  $$('.sv-cycle__item').forEach((li) => gsap.fromTo(li, { autoAlpha: 0, y: 48 }, {
    autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 90%', once: true },
  }));

  /* =======================================================
     04 — proof on paper: the video rises in full screen (mask from
     the bottom), then masks down into its place left of the metrics
     ======================================================= */
  const proof = $('#business');
  const bizTitle = splitWords($('#bizTitle'));
  const proofMedia = $('#svProofMedia');
  const proofSlot = $('#svProofSlot');
  const proofInner = $('.sv-proof__inner', proof);
  const metricRows = $$('.sv-metric', proof);
  proof.classList.add('is-fly');
  const fullBox = () => ({ left: 0, top: 0, width: proofInner.clientWidth, height: proofInner.clientHeight });
  const slotBox = () => ({ left: proofSlot.offsetLeft, top: proofSlot.offsetTop, width: proofSlot.offsetWidth, height: proofSlot.offsetHeight });
  gsap.set(metricRows, { autoAlpha: 0, y: 40 });
  gsap.set(bizTitle, { opacity: 0.12 });
  paintMetrics(0);
  gsap.fromTo(bg, { backgroundColor: NAVY }, { backgroundColor: PAPER, ease: 'none', immediateRender: false, scrollTrigger: { trigger: proof, start: 'top 90%', end: 'top 30%', scrub: true } });
  gsap.timeline({ scrollTrigger: { trigger: proof, start: 'top 75%', end: 'top top', scrub: 0.6 } })
    .fromTo(proofMedia, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.out' }, 0)
    .fromTo('#svProofMedia video', { scale: 1.3, yPercent: 8 }, { scale: 1, yPercent: 0, duration: 1.2, ease: 'power2.out' }, 0);
  const mc = { t: 0 };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: proof, start: 'top top', end: '+=230%', pin: true, scrub: 0.6, invalidateOnRefresh: true } })
    // a beat of full-screen video, then it masks down into the slot on the left
    .fromTo(proofMedia, {
      left: () => fullBox().left, top: () => fullBox().top, width: () => fullBox().width, height: () => fullBox().height, borderRadius: 0,
    }, {
      left: () => slotBox().left, top: () => slotBox().top, width: () => slotBox().width, height: () => slotBox().height, borderRadius: 16,
      duration: 1.2, ease: 'power2.inOut', immediateRender: false,
    }, 0.35)
    .fromTo('#svProofMedia video', { objectPosition: '50% 50%' }, { objectPosition: '62% 50%', duration: 1.2, ease: 'power2.inOut', immediateRender: false }, 0.35)
    .to(bizTitle, { opacity: 1, stagger: 0.08, duration: 0.5 }, 1.05)
    .to(metricRows, { autoAlpha: 1, y: 0, stagger: 0.25, duration: 0.5, ease: 'power2.out' }, 1.4)
    .to(mc, { t: 1, duration: 1.4, onUpdate: () => paintMetrics(mc.t) }, 1.4)
    .to({}, { duration: 0.5 })
    .to(proofInner, { autoAlpha: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 3.3);

  /* =======================================================
     05 — confidence: the timeline slides under a fixed centre
     ======================================================= */
  const q = $('#quality');
  const confTitle = splitWords($('#confTitle'));
  const track = $('#svTrack');
  const lit = $('#svTrackLit');
  const stepEls = $$('.sv-step', q);
  const steps = fromTemplate('#svSteps');
  const stepText = $('#svStepText');
  const GAP = () => clamp(vw() * 0.34, 260, 500);
  stepEls.forEach((el, i) => el.style.setProperty('--i', i));
  const setGap = () => track.style.setProperty('--gap', `${GAP()}px`);
  setGap(); window.addEventListener('resize', setGap);
  const xFor = (p) => vw() / 2 - p * GAP();               // track x that puts step p at the centre
  let stepOn = -1;
  function alignText(i) {
    const em = $('em', stepEls[i]);
    const left = vw() / 2 - em.offsetWidth / 2;
    stepText.style.left = `${Math.max(24, Math.min(left, vw() - stepText.offsetWidth - 24))}px`;
  }
  function paintTrack() {
    const x = gsap.getProperty(track, 'x');
    const p = (vw() / 2 - x) / GAP();                     // which step sits at the centre (fractional)
    // the lit line runs from the screen's left edge (or the first step) to the centre
    const from = Math.max(-x, 0);                        // in track units: screen edge or step 1
    lit.style.left = `${from}px`;
    lit.style.width = `${Math.max(0, vw() / 2 - x - from)}px`;
    const k = clamp(Math.round(p), 0, stepEls.length - 1);
    stepEls.forEach((el, i) => { el.classList.toggle('is-on', i === k); el.classList.toggle('is-past', i < k); });
    if (k !== stepOn) {
      const first = stepOn < 0; stepOn = k;
      const apply = () => { stepText.textContent = steps[stepOn].text; alignText(stepOn); };
      if (first) apply(); else swap([stepText], apply);
    }
  }
  gsap.set(track, { x: () => xFor(0) });
  gsap.set(['.sv-line', stepText, '#svQualityBtn'], { autoAlpha: 0 });
  gsap.fromTo(bg, { backgroundColor: PAPER }, { backgroundColor: NAVY, ease: 'none', immediateRender: false, scrollTrigger: { trigger: q, start: 'top 95%', end: 'top 35%', scrub: true } });
  gsap.timeline({ scrollTrigger: { trigger: q, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .fromTo(confTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.4)
    .to('.sv-line', { autoAlpha: 1, duration: 0.4 }, 0.6)
    .fromTo(track, { x: () => xFor(-1.2) }, { x: () => xFor(0), duration: 0.6, ease: 'power2.out', onUpdate: paintTrack, immediateRender: false }, 0.5)
    .to([stepText, '#svQualityBtn'], { autoAlpha: 1, stagger: 0.1, duration: 0.3 }, 0.8);
  // step to step with a pause at each, so every step reads at the centre
  const qt = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: q, start: 'top top', end: '+=420%', pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  for (let i = 1; i < stepEls.length; i++) {
    qt.to({}, { duration: 0.35 })
      .to(track, { x: () => xFor(i), duration: 0.65, ease: 'power2.inOut', onUpdate: paintTrack });
  }
  qt.to({}, { duration: 0.5 });
  paintTrack();
  window.addEventListener('resize', () => stepOn >= 0 && alignText(stepOn));

  /* =======================================================
     06 + 07 — the market note and next steps come forward
     ======================================================= */
  const watch = $('#watching');
  const watchTitle = splitWords($('#watchTitle'));
  gsap.fromTo('#svWatchMedia', { clipPath: 'inset(18% 14% 18% 14% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: watch, start: 'top bottom', end: 'top top', scrub: true } });
  gsap.fromTo('#svWatchMedia img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: watch, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo(watchTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: watch, start: 'top 40%', end: 'top -10%', scrub: true } });
  gsap.fromTo('#svByte', { rotateX: 32, z: -400, y: 160, autoAlpha: 0 }, { rotateX: 0, z: 0, y: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: watch, start: 'top 30%', end: 'top -30%', scrub: 0.6 } });
  $$('.sv-cta .cta__card').forEach((card, i) => {
    gsap.fromTo(card, { rotateX: 28, y: 140, z: -300, autoAlpha: 0, transformOrigin: '50% 100%' }, { rotateX: 0, y: 0, z: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: '#contact', start: `top ${95 - i * 6}%`, end: `top ${45 - i * 6}%`, scrub: 0.6 } });
  });
  gsap.fromTo('.sv-cta .cta__dots', { autoAlpha: 0 }, { autoAlpha: 1, scrollTrigger: { trigger: '#contact', start: 'top 60%', end: 'top 40%', scrub: true } });
} else {
  paintMetrics(1);
}
initCycle();

/* ---------- chat lifts above the footer ---------- */
const chatEl = $('#chatBtn');
ScrollTrigger.create({
  trigger: '.footer__meta', start: 'top bottom', end: 'max',
  onUpdate: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
  onRefresh: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
});

/* ---------- chat panel ---------- */
function reveal(el, from) { el.hidden = false; gsap.fromTo(el, from, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' }); }
function conceal(el, to, done) { gsap.to(el, { ...to, autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { el.hidden = true; done && done(); } }); }
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chatPanel.hidden) setChat(false); });

/* ---------- in-page anchors glide with Lenis ---------- */
$$('a[href^="#"]').forEach((a) => {
  const id = a.getAttribute('href');
  if (id.length < 2 || !document.querySelector(id)) return;
  a.addEventListener('click', (e) => { e.preventDefault(); if (lenis) lenis.scrollTo(id, { duration: 1.6 }); else document.querySelector(id).scrollIntoView({ behavior: 'smooth' }); });
});

/* ---------- Electronics / Solar switch ---------- */
$$('[data-site-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = link.href; }, reduceMotion ? 0 : 350);
  });
});
window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

/* ---------- header hides on the way down, returns on the way up ---------- */
(() => {
  const bar = $('.header');
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
    if (y < 120) return setHidden(false);
    setHidden(dy > 0);
  };
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', () => setHidden(false));
})();

window.addEventListener('resize', () => ScrollTrigger.refresh());
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
