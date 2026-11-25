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
  const stages = fromTemplate('#svStages');
  const buttons = $$('#svTickerList button');
  const items = buttons.map((b) => b.parentElement);
  const line = $('#svTickerLine');
  const GAP = 24;                                   // extra room under the active stage, for the line
  let on = buttons.findIndex((b) => b.dataset.start !== undefined);
  if (on < 0) on = 0;

  const placeLine = (animate) => {
    items.forEach((li, i) => gsap.to(li, { y: i > on ? GAP : 0, duration: animate ? 0.6 : 0, ease: 'power3.out' }));
    const li = items[on];
    const y = li.offsetTop + li.offsetHeight + 16 + 2;   // halfway into the widened gap
    gsap.to(line, { y, duration: animate ? 0.6 : 0, ease: 'power3.out' });
  };
  const paint = (animate = true) => {
    buttons.forEach((b, i) => { b.classList.toggle('is-on', i === on); b.setAttribute('aria-pressed', String(i === on)); });
    placeLine(animate);
  };

  const comp = buildComponent();
  function go(i) {
    if (i === on) return;
    on = i;
    paint();
    swap(['#svStageTitle', '#svStageText'], () => {
      $('#svStageTitle').textContent = stages[on].title;
      $('#svStageText').textContent = stages[on].text;
    });
  }

  // --- autoplay + hover / focus -----------------------------
  let inView = false, hovering = false, timer = 0;
  const DWELL = 5200;
  const schedule = () => {
    clearTimeout(timer);
    if (!inView || hovering || reduceMotion || document.hidden) return;
    timer = setTimeout(() => { go((on + 1) % stages.length); schedule(); }, DWELL);
  };
  buttons.forEach((b, i) => {
    b.addEventListener('mouseenter', () => go(i));
    b.addEventListener('focus', () => go(i));
    b.addEventListener('click', () => go(i));
  });
  const ticker = $('#svTicker');
  ticker.addEventListener('mouseenter', () => { hovering = true; clearTimeout(timer); });
  ticker.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  ticker.addEventListener('focusout', (e) => { if (!ticker.contains(e.relatedTarget)) schedule(); });
  document.addEventListener('visibilitychange', schedule);

  ScrollTrigger.create({
    trigger: '#lifecycle', start: 'top 60%', end: 'bottom 40%',
    onToggle: (st) => { inView = st.isActive; schedule(); },
  });
  ScrollTrigger.create({
    trigger: '#lifecycle', start: 'top bottom', end: 'bottom top',
    onToggle: (st) => comp.setRunning(st.isActive),
  });
  window.addEventListener('resize', () => { placeLine(false); comp.fit(); });
  if (document.fonts) document.fonts.ready.then(() => placeLine(false));
  paint(false);
}

function buildComponent() {
  const world = $('#svCompWorld');
  const asm = $('#svCompAsm');
  const shadow = $('#svCompShadow');
  const layers = $$('.sv-comp__layer', world).map((el) => ({ el, cx: +el.dataset.cx, cy: +el.dataset.cy, cz: +el.dataset.cz }));
  const E = (x) => x * x * (3 - 2 * x);

  // one fixed pose; cin: arrival, sw: assembled shot → layers, ex: layers open out
  const s = { cin: 0, sw: 0, ex: 0, rx: 4, ry: -10, rz: 5 };

  function fit() {
    const w = vw(), h = vh();
    const k = w < 720 ? w / 900 : Math.min(w / 1440, h / 900);
    world.style.setProperty('--cs', k.toFixed(4));
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
  const caption = $('#svCaption');
  const progress = $('#svProgress');
  const ticks = $$('#svTicks button');
  const titleWords = splitWords($('#svTitle'), true);
  const voice = $('#leader');
  const quoteWords = splitWords($('#svQuote'));

  /* geometry, measured from the Figma frame (1440 × 900):
     a card's width there gives its depth (perspective P), its centre
     gives its place in the world */
  const P = 1000, HERO_W = 438, ACTIVE_W = 526, END_W = 300;
  const depthFor = (screenW) => P * (1 - HERO_W / screenW);  // z where a HERO_W card looks screenW wide
  let G = {};
  function measure() {
    const W = vw(), H = vh();
    const small = W < 720;
    const sx = small ? W / 820 : W / 1440, sy = H / 900;
    const s = small ? sx : Math.min(sx, sy);
    world.style.setProperty('--w0', `${HERO_W * s}px`);
    cards.forEach((c) => {
      const fw = +c.dataset.fw, k = fw / HERO_W;
      c._z = c === hero ? 0 : P * (1 - 1 / k);
      c._x = ((+c.dataset.fx - 720) * sx) / k;
      c._y = ((+c.dataset.fy - 450) * sy) / k;
      c.style.transform = `translate3d(${c._x.toFixed(1)}px, ${c._y.toFixed(1)}px, ${c._z.toFixed(1)}px)`;
    });
    const activeEff = depthFor(ACTIVE_W), endEff = depthFor(END_W);
    // camera stops: 0 = the field, 1..6 = each capability, 7 = Todd
    G.stops = [{ x: 0, y: 0, z: 0 }]
      .concat(capCards.map((c) => ({ x: c._x, y: c._y, z: activeEff - c._z })))
      .concat([{ x: endCard._x, y: endCard._y, z: endEff - endCard._z }]);
    G.endW = HERO_W * s * (P / (P - endEff));
  }
  measure();

  /* camera: scroll moves it field → capability → Todd (cam.f 0 → 1 → 2);
     which capability it holds on is chosen with the ticks, and a click
     flies the camera from where it is to that card (nav.u 0 → 1) */
  const cam = { f: 0, reveal: 0, introZ: -2600 };
  const nav = { from: null, to: 0, u: 1 };
  let sel = 0, capOn = -1;
  // turn toward the next point first, then travel to it
  function travel(a, b, u) {
    const tz = smoother(u), txy = smoother(clamp(u / 0.62, 0, 1));
    return { x: lerp(a.x, b.x, txy), y: lerp(a.y, b.y, txy), z: lerp(a.z, b.z, tz) };
  }
  const capPoint = () => (nav.from ? travel(nav.from, G.stops[nav.to + 1], nav.u) : G.stops[nav.to + 1]);
  function camAt(f) {
    const leg = f <= 1 ? 0 : 1;
    const u = clamp((f - leg - 0.16) / 0.68, 0, 1);            // dwell at each end
    return leg === 0 ? travel(G.stops[0], capPoint(), u) : travel(capPoint(), G.stops[G.stops.length - 1], u);
  }
  function showCap(i) {
    $('#svCapN').textContent = String(i + 1).padStart(2, '0');
    $('#svCapTitle').textContent = caps[i].title;
    $('#svCapText').textContent = caps[i].text;
  }
  function paintWorld() {
    const c = camAt(cam.f);
    const z = c.z + cam.introZ;
    world.style.transform = `translate3d(${(-c.x).toFixed(1)}px, ${(-c.y).toFixed(1)}px, ${z.toFixed(1)}px)`;
    cards.forEach((card) => {
      const eff = card._z + z;                                   // > 0: in front of the screen plane
      let o = clamp((eff + 15000) / 3000, 0, 1);                 // out of the distance
      o *= clamp((760 - eff) / 360, 0, 1);                       // gone before it reaches the camera
      if (card !== hero && card !== endCard) o *= cam.reveal;
      card.style.opacity = o.toFixed(3);
      card.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    });
    // caption + ticks while the camera holds on the capabilities
    const best = Math.abs(cam.f - 1) < 0.24 ? sel : -1;
    if ((best < 0) !== (capOn < 0)) {
      if (best < 0) { gsap.to([caption, progress], { autoAlpha: 0, duration: 0.3, overwrite: true }); stopAuto(); }
      else {
        showCap(best); startAuto();
        gsap.fromTo(caption, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, overwrite: true });
        gsap.to(progress, { autoAlpha: 1, duration: 0.4, overwrite: true });
      }
    }
    capOn = best;
  }

  // a tick: fly from where the camera is (it may be mid-flight) to that card
  let flight = null;
  function goCap(i) {
    if (i === sel) return;
    nav.from = capPoint(); nav.to = i; nav.u = 0;
    sel = i;
    ticks.forEach((tk, k) => { if (k === sel) tk.setAttribute('aria-current', 'step'); else tk.removeAttribute('aria-current'); });
    if (flight) flight.kill();
    const dist = Math.hypot(G.stops[i + 1].x - nav.from.x, G.stops[i + 1].y - nav.from.y, G.stops[i + 1].z - nav.from.z);
    flight = gsap.to(nav, { u: 1, duration: clamp(1 + dist / 3000, 1.2, 2.2), ease: 'none', onUpdate: paintWorld,
      onComplete: () => { nav.from = null; } });
    $('#svCapN').textContent = String(i + 1).padStart(2, '0');
    swap(['#svCapTitle', '#svCapText'], () => showCap(sel));
    if (capOn >= 0) startAuto();
  }
  /* autoplay: while the camera holds on the capabilities it moves on by
     itself; the active tick fills red to show the time left. Hovering or
     focusing the ticks pauses it, a click picks up from that capability. */
  const DWELL = 5;
  let auto = null, held = false;
  function stopAuto() { if (auto) auto.kill(); auto = null; ticks.forEach((tk) => tk.style.setProperty('--p', 0)); }
  function startAuto() {
    stopAuto();
    const tk = ticks[sel];
    auto = gsap.fromTo(tk, { '--p': 0 }, { '--p': 1, duration: DWELL, ease: 'none', paused: held,
      onComplete: () => { tk.style.setProperty('--p', 0); goCap((sel + 1) % ticks.length); } });
  }
  const hold = (v) => { held = v; if (auto) (v ? auto.pause() : auto.resume()); };
  progress.addEventListener('pointerenter', () => hold(true));
  progress.addEventListener('pointerleave', () => hold(progress.contains(document.activeElement)));
  progress.addEventListener('focusin', () => hold(true));
  progress.addEventListener('focusout', (e) => { if (!progress.contains(e.relatedTarget)) hold(progress.matches(':hover')); });

  ticks.forEach((tk, i) => tk.addEventListener('click', () => goCap(i)));
  progress.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = clamp(sel + d, 0, ticks.length - 1);
    goCap(i); ticks[i].focus();
  });

  // where Todd's card sits when the camera stops: the voice layer starts exactly there
  const endBox = () => { const w = G.endW, h = w * 1.25; return { left: (vw() - w) / 2, top: (vh() - h) / 2, width: w, height: h }; };

  // arrival: the field drifts in out of depth, the headline rises
  gsap.set([caption, progress], { autoAlpha: 0 });
  gsap.to(cam, { introZ: 0, reveal: 1, duration: 2.4, ease: 'expo.out', delay: 0.1, onUpdate: paintWorld });
  gsap.from(titleWords, { yPercent: 110, duration: 1.1, stagger: 0.035, ease: 'expo.out', delay: 0.5 });
  paintWorld();

  // field → capability 01 (scroll), hold while the ticks drive, → Todd (scroll)
  const LEG = 1.25, HOLD = 1.6, FLY = 2 * LEG + HOLD;
  const t1 = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: intro, start: 'top top', end: '+=900%', pin: true, scrub: 0.6, invalidateOnRefresh: true, onRefresh: () => { measure(); paintWorld(); } },
  });
  t1
    .to('#svTitle', { autoAlpha: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 0)
    .to(cam, { f: 1, duration: LEG, onUpdate: paintWorld }, 0.2)
    .to(cam, { f: 2, duration: LEG, onUpdate: paintWorld }, 0.2 + LEG + HOLD)
    // Todd's card opens to the full screen and becomes the quote's backdrop
    .set(voice, { autoAlpha: 1 }, 0.2 + FLY)
    // the card grows into the full screen; the photo keeps its framing and only widens
    // to make room for the quote (no zoom or jump into a crop)
    .fromTo('#svVoiceMedia', {
      left: () => endBox().left, top: () => endBox().top, width: () => endBox().width, height: () => endBox().height, borderRadius: 16,
    }, { left: 0, top: 0, width: () => vw(), height: () => vh(), borderRadius: 0, duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 0.2 + FLY)
    .fromTo('#svVoiceMedia img', { width: '100%', left: '0%', objectPosition: '50% 50%' },
      { width: () => (vw() < 720 ? '100%' : '125%'), left: () => (vw() < 720 ? '0%' : '-25%'), objectPosition: '50% 30%', duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 0.2 + FLY)
    .fromTo('#svVoiceShade', { opacity: 0 }, { opacity: 0.66, duration: 1, immediateRender: false }, 0.7 + FLY)
    .fromTo('#svQuote', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, immediateRender: false }, 1.0 + FLY)
    .fromTo(quoteWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.06, duration: 0.3, immediateRender: false }, 1.3 + FLY)
    .fromTo('#svVoiceContent figcaption, .sv-pill', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.5, immediateRender: false }, 2.9 + FLY)
    // the photo sinks into the night for the clock
    .to('#svVoiceContent', { autoAlpha: 0, y: -60, duration: 0.7, ease: 'power2.in' }, 4.1 + FLY)
    .to('#svVoiceShade', { opacity: 1, duration: 0.9 }, 4.2 + FLY)
    .to('#svVoiceMedia img', { scale: 1.06, duration: 0.9 }, 4.2 + FLY)
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
  gsap.fromTo(['#svStageTitle', '#svStageText', '#svTicker'], { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1, y: 0, stagger: 0.08, ease: 'power2.out',
    scrollTrigger: { trigger: '#lifecycle', start: 'top 55%', end: 'top 10%', scrub: 0.6 },
  });

  /* =======================================================
     04 — proof on paper: mask reveal from the bottom
     ======================================================= */
  const proof = $('#business');
  const bizTitle = splitWords($('#bizTitle'));
  const proofMedia = $('#svProofMedia');
  const metricRows = $$('.sv-metric', proof);
  gsap.set(metricRows, { autoAlpha: 0, y: 40 });
  paintMetrics(0);
  gsap.fromTo(bg, { backgroundColor: NAVY }, { backgroundColor: PAPER, ease: 'none', immediateRender: false, scrollTrigger: { trigger: proof, start: 'top 90%', end: 'top 30%', scrub: true } });
  gsap.timeline({ scrollTrigger: { trigger: proof, start: 'top 75%', end: 'top top', scrub: 0.6 } })
    .fromTo(proofMedia, { clipPath: 'inset(100% 0% 0% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1, ease: 'power2.out' }, 0)
    .fromTo('#svProofMedia video', { scale: 1.3, yPercent: 8 }, { scale: 1, yPercent: 0, duration: 1.2, ease: 'power2.out' }, 0)
    .fromTo(bizTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.08, ease: 'none', duration: 0.8 }, 0.3);
  const mc = { t: 0 };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: proof, start: 'top top', end: '+=160%', pin: true, scrub: 0.6 } })
    .to(metricRows, { autoAlpha: 1, y: 0, stagger: 0.25, duration: 0.5, ease: 'power2.out' }, 0)
    .to(mc, { t: 1, duration: 1.4, onUpdate: () => paintMetrics(mc.t) }, 0)
    .to({}, { duration: 0.5 })
    .to('.sv-proof__inner', { autoAlpha: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 1.9);

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
