/* =========================================================
   SMITH — Services / Procurement v2 (exploration)
   One camera, one story. GSAP + ScrollTrigger + Lenis, no build.

   Act 1+2  hero pulls back into a 3D field of the six capabilities,
            the camera flies through them and lands on Todd's portrait,
            which opens to full screen for his quote
   Act 3    the live clock tilts up out of the dark; the camera flies
            through the dial
   Act 4    the board rises and flattens; each lifecycle stage arrives
            as one large word that fills in letter by letter
   Act 5    the background turns to paper; the numbers count up
   Act 6    back to night; the camera rides a lit track through the
            five quality checkpoints
   Act 7/8  the market note and the next steps float out of depth

   Every act starts animating while it scrolls in (pre-roll) and
   finishes its exit before it leaves, so nothing arrives as a block.
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
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

/* ---------- canvas scale for the CTA frame and the dial ---------- */
function fit() {
  const w = vw(), h = vh();
  document.documentElement.style.setProperty('--s', Math.min(w / 1440, h / 900).toFixed(4));
  document.documentElement.style.setProperty('--sw', (w / 1440).toFixed(4));
  // the dial: fits the canvas on desktop, most of the width on small screens
  document.documentElement.style.setProperty('--dk', (w <= 900 ? Math.min(w * 0.86, 640) / 640 : Math.min(w / 1440, h / 900)).toFixed(4));
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
// letters inside words, so a big word can fill in left to right without breaking mid-word
function splitChars(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const box = document.createElement('span'); box.style.whiteSpace = 'nowrap'; box.style.display = 'inline-block';
    [...w].forEach((c) => { const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c; box.appendChild(ch); });
    el.appendChild(box);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return $$('.ch', el);
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
    gsap.fromTo(els, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
  } });
}
const bg = $('#svBg');
const NAVY = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim() || '#192134';
const PAPER = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#f0f1eb';

/* ---------- live clock data (Act 3) ---------- */
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

/* ---------- metric counters (Act 5) ---------- */
const metrics = $$('.sv-metric b');
function paintMetrics(t) {
  metrics.forEach((b, i) => {
    const to = +b.dataset.to, from = b.dataset.from ? +b.dataset.from : 0;
    const k = clamp(t * 3 - i * 0.6, 0, 1);
    const v = Math.round(lerp(from, to, gsap.parseEase('power2.out')(k)));
    b.textContent = `${b.dataset.pre || ''}${to === 1 ? Math.max(1, v) : v}${b.dataset.post || ''}`;
  });
}

if (!reduceMotion) {
  /* =======================================================
     ACT 1 + 2 — hero → 3D field → Todd
     ======================================================= */
  const intro = $('#top');
  const world = $('#svWorld');
  const hero = $('#svHero');
  const cards = $$('.sv-card[data-z]');
  const endCard = $('.sv-card--end');
  const capCards = cards.filter((c) => c !== endCard);
  cards.forEach((c) => c.style.setProperty('--z', c.dataset.z));
  const caps = $$('#svCaps li').map((li) => ({ title: $('b', li).textContent, text: $('span', li).textContent }));
  const caption = $('#svCaption');
  const ticks = $$('#svTicks li');
  const statementWords = splitWords($('#svStatement'));
  const titleWords = splitWords($('#svTitle'), true);
  const voice = $('#leader');
  const quoteWords = splitWords($('#svQuote'));

  // headline rises in on load
  gsap.set(['#svStatement', '#svCaption', '#svTicks'], { autoAlpha: 0 });
  gsap.from(titleWords, { yPercent: 110, duration: 1.1, stagger: 0.035, ease: 'expo.out', delay: 0.15 });
  gsap.from('.sv-hero-copy__actions', { autoAlpha: 0, y: 16, duration: 0.8, ease: 'power3.out', delay: 0.7 });

  const cam = { z: 0, reveal: 0 };
  let capOn = -1;
  const cardW = () => clamp(vw() * 0.24, 220, 380);
  const endW = () => clamp(vw() * 0.26, 240, 420);
  // where the end card sits on screen when the camera stops (for the clip-path hand-off)
  const CAM_END = 7000, P = 1000;
  const endInset = () => {
    const k = P / (P - (+endCard.dataset.z + CAM_END));
    const w = endW() * k, h = endW() * 1.25 * k;
    const x = (vw() - w) / 2, y = (vh() - h) / 2;
    return `inset(${y}px ${x}px ${y}px ${x}px round 16px)`;
  };

  function paintWorld() {
    world.style.transform = `translateZ(${cam.z}px)`;
    let best = -1, bestEff = -Infinity;
    cards.forEach((c, i) => {
      const eff = +c.dataset.z + cam.z;             // < 0: still ahead of the screen plane
      let o = clamp((eff + 8200) / 3200, 0, 1);       // fades in out of the distance
      o *= clamp((420 - eff) / 520, 0, 1);            // fades out as it passes the camera
      if (c !== endCard) o *= cam.reveal;
      c.style.opacity = o.toFixed(3);
      c.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      if (c !== endCard && eff < -420 && eff > -2400 && eff > bestEff) { bestEff = eff; best = i; }
    });
    const showCap = cam.z > 500 && cam.z < CAM_END - 250;
    if (!showCap) best = -1;
    if (best !== capOn) {
      const was = capOn; capOn = best;
      ticks.forEach((t, k) => t.classList.toggle('is-on', k === best));
      if (best < 0) gsap.to([caption, '#svTicks'], { autoAlpha: 0, duration: 0.3, overwrite: true });
      else {
        const apply = () => {
          $('#svCapN').textContent = String(best + 1).padStart(2, '0');
          $('#svCapTitle').textContent = caps[best].title;
          $('#svCapText').textContent = caps[best].text;
        };
        if (was < 0) { apply(); gsap.to([caption, '#svTicks'], { autoAlpha: 1, duration: 0.4, overwrite: true }); }
        else swap(['#svCapN', '#svCapTitle', '#svCapText'], apply);
      }
    }
  }
  paintWorld();

  const t1 = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: intro, start: 'top top', end: '+=1050%', pin: true, scrub: 0.6, invalidateOnRefresh: true },
  });
  t1
    // pull back: the hero becomes one card among many
    .to('#svHeroCopy', { autoAlpha: 0, y: -60, duration: 0.8, ease: 'power2.in' }, 0)
    .to(hero, { width: () => cardW() * 1.15, height: () => cardW() * 1.15 * 1.25, borderRadius: 16, '--z': -450, duration: 1.8, ease: 'power2.inOut' }, 0.15)
    .to('#svHeroShade', { opacity: 0.15, duration: 1.4 }, 0.4)
    .to(cam, { reveal: 1, duration: 1.4, ease: 'power1.inOut', onUpdate: paintWorld }, 0.7)
    // the statement lights up over the field
    .to('#svStatement', { autoAlpha: 1, duration: 0.3 }, 1.2)
    .fromTo(statementWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.12, duration: 0.4 }, 1.2)
    .to('#svStatement', { autoAlpha: 0, y: -40, duration: 0.5, ease: 'power2.in' }, 2.9)
    // fly through the six capabilities to Todd
    .to(cam, { z: CAM_END, duration: 6.2, ease: 'power1.inOut', onUpdate: paintWorld }, 2.9)
    // Todd's card opens to the full screen and becomes the quote's backdrop
    .set(voice, { autoAlpha: 1 }, 8.9)
    .fromTo('#svVoiceMedia', { clipPath: endInset }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'power2.inOut', immediateRender: false }, 8.9)
    .fromTo('#svVoiceMedia img', { scale: 1.15, x: () => vw() * 0.15, y: () => vh() * 0.3 }, { scale: 1, x: 0, y: 0, duration: 1.4, ease: 'power2.inOut', immediateRender: false }, 8.9)
    .fromTo('#svVoiceShade', { opacity: 0 }, { opacity: 0.66, duration: 1, immediateRender: false }, 9.4)
    .fromTo('#svQuote', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, immediateRender: false }, 9.7)
    .fromTo(quoteWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.06, duration: 0.3, immediateRender: false }, 10)
    .fromTo('#svVoiceContent figcaption, .sv-pill', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.5, immediateRender: false }, 11.6)
    // the photo sinks into the night for the clock
    .to('#svVoiceContent', { autoAlpha: 0, y: -60, duration: 0.7, ease: 'power2.in' }, 12.8)
    .to('#svVoiceShade', { opacity: 1, duration: 0.9 }, 12.9)
    .to('#svVoiceMedia img', { scale: 1.08, duration: 0.9 }, 12.9)
    .to({}, { duration: 0.2 });
  gsap.set('#svVoiceContent figcaption, .sv-pill, #svQuote', { autoAlpha: 0 });
  gsap.set(quoteWords, { opacity: 0.12 });

  /* =======================================================
     ACT 3 — the live clock
     ======================================================= */
  const dial = $('#svDialWrap');
  const rings = $$('.tz__ring', tzSec).map(prepLine);
  const tzTitle = splitWords($('#tzTitle'));
  const checks = $$('.sv-checks li', tzSec);
  gsap.set(dial, { rotateX: 58, scale: 0.72, z: -300, autoAlpha: 0, transformOrigin: '50% 60%' });
  gsap.set(['.tz__readout', '.tz__hour'], { autoAlpha: 0 });
  gsap.set([...offices, ...checks], { autoAlpha: 0, y: 24 });
  // pre-roll while it scrolls in
  gsap.timeline({ scrollTrigger: { trigger: tzSec, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .fromTo(tzTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.3)
    .to(dial, { autoAlpha: 1, duration: 0.6 }, 0.3)
    .to(dial, { rotateX: 30, scale: 0.86, z: -120, duration: 0.7, ease: 'none' }, 0.3);
  const rot = { a: handAngle(tzNow.utcH) - 140 };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: tzSec, start: 'top top', end: '+=240%', pin: true, scrub: 0.6 } })
    .to(dial, { rotateX: 0, scale: 1, z: 0, duration: 1, ease: 'power2.out' }, 0)
    .to(rings, { attr: { 'stroke-dashoffset': 0 }, stagger: 0.08, duration: 0.8 }, 0)
    .to(arcs, { attr: { 'stroke-dasharray': (i, a) => `${a.dataset.len} ${a.dataset.c}` }, stagger: 0.1, duration: 0.7 }, 0.6)
    .to(rot, { a: handAngle(tzNow.utcH), duration: 1.2, ease: 'power3.out', onUpdate: () => hand.setAttribute('transform', `rotate(${rot.a} 320 320)`) }, 0.7)
    .to(['.tz__readout', '.tz__hour'], { autoAlpha: 1, stagger: 0.05, duration: 0.4 }, 1)
    .to(offices, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.5 }, 0.5)
    .to(checks, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.5 }, 1.2)
    .to({}, { duration: 0.8 })
    // fly through the dial
    .to(['.sv-clock__title', '.sv-clock__side'], { autoAlpha: 0, y: -50, duration: 0.6, ease: 'power2.in' }, 2.8)
    .to(dial, { scale: 3.4, autoAlpha: 0, duration: 1, ease: 'power2.in' }, 2.8);

  /* =======================================================
     ACT 4 — lifecycle in big words
     ======================================================= */
  const cyc = $('#lifecycle');
  const plane = $('#svPlane');
  const lcTitle = splitWords($('#lcTitle'));
  const stages = $$('.sv-stage', cyc);
  const idx = $$('#svStageIndex li');
  gsap.set(plane, { rotateX: 42, rotateZ: -6, scale: 0.5, y: '12vh', autoAlpha: 0 });
  gsap.set('#svStageIndex', { autoAlpha: 0 });
  gsap.timeline({ scrollTrigger: { trigger: cyc, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .to(plane, { autoAlpha: 1, duration: 0.5 }, 0.2)
    .to(plane, { rotateX: 22, rotateZ: -3, scale: 0.7, y: '4vh', duration: 0.8, ease: 'none' }, 0.2)
    .fromTo(lcTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.4);
  const STAGE = 1.6, S0 = 1.4;
  const t4 = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: cyc, start: 'top top', end: '+=560%', pin: true, scrub: 0.6,
    onUpdate: () => { const k = clamp(Math.floor((t4.time() - S0) / STAGE), -1, 4); idx.forEach((li, i) => li.classList.toggle('is-on', i === k)); } } });
  t4.to(plane, { rotateX: 0, rotateZ: 0, scale: 0.92, y: 0, duration: 1.1, ease: 'power2.out' }, 0)
    .to('#lcTitle', { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, 1)
    .fromTo('#svStageIndex', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, 1.2)
    .to(plane, { rotateY: 7, scale: 1.12, duration: STAGE * 5, ease: 'sine.inOut' }, S0);
  stages.forEach((st, i) => {
    const t = S0 + i * STAGE;
    const chars = splitChars($('.sv-stage__word', st));
    gsap.set(st, { autoAlpha: 0 });
    t4.set(st, { autoAlpha: 1 }, t)
      .fromTo(chars, { opacity: 0.08 }, { opacity: 1, stagger: 0.03, duration: 0.25 }, t)
      .fromTo($('.sv-stage__word', st), { scale: 1.12, transformOrigin: '0% 100%' }, { scale: 1, duration: 0.8, ease: 'power2.out' }, t)
      .fromTo([$('.sv-stage__n', st), $('p', st)], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.4 }, t + 0.35);
    if (i < stages.length - 1) t4.to(st, { autoAlpha: 0, y: -60, duration: 0.35, ease: 'power2.in' }, t + STAGE - 0.35).set(st, { y: 0 }, t + STAGE);
  });
  const tEnd = S0 + STAGE * 5;
  t4.to([stages[stages.length - 1], '#svStageIndex'], { autoAlpha: 0, y: -50, duration: 0.5, ease: 'power2.in' }, tEnd)
    .to(plane, { scale: 2.4, autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, tEnd);

  /* =======================================================
     ACT 5 — proof on paper
     ======================================================= */
  const proof = $('#business');
  const bizTitle = splitWords($('#bizTitle'));
  const proofMedia = $('#svProofMedia');
  const metricRows = $$('.sv-metric', proof);
  gsap.set(proofMedia, { rotateY: -38, x: '-12vw', z: -420, autoAlpha: 0 });
  gsap.set(metricRows, { autoAlpha: 0, y: 40 });
  paintMetrics(0);
  gsap.fromTo(bg, { backgroundColor: NAVY }, { backgroundColor: PAPER, ease: 'none', immediateRender: false, scrollTrigger: { trigger: proof, start: 'top 90%', end: 'top 30%', scrub: true } });
  gsap.timeline({ scrollTrigger: { trigger: proof, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .to(proofMedia, { autoAlpha: 1, duration: 0.4 }, 0.3)
    .to(proofMedia, { rotateY: -18, x: '-5vw', z: -180, duration: 0.7, ease: 'none' }, 0.3)
    .fromTo(bizTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.4);
  const mc = { t: 0 };
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: proof, start: 'top top', end: '+=200%', pin: true, scrub: 0.6 } })
    .to(proofMedia, { rotateY: 0, x: 0, z: 0, duration: 1, ease: 'power2.out' }, 0)
    .to(metricRows, { autoAlpha: 1, y: 0, stagger: 0.25, duration: 0.5, ease: 'power2.out' }, 0.2)
    .to(mc, { t: 1, duration: 1.4, onUpdate: () => paintMetrics(mc.t) }, 0.2)
    .to({}, { duration: 0.6 })
    .to('.sv-proof__inner', { autoAlpha: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 2.2);

  /* =======================================================
     ACT 6 — confidence: ride the track
     ======================================================= */
  const q = $('#quality');
  const confTitle = splitWords($('#confTitle'));
  const track = $('#svTrack');
  const lit = $('#svTrackLit');
  const nodes = $$('.sv-node', q);
  const steps = $$('li', $('#svSteps').content).map((li) => ({ title: $('b', li).textContent, text: $('span', li).textContent }));
  const NODE_P = nodes.map((n) => parseFloat(n.style.getPropertyValue('--p')));
  const trackW = () => vw() * 4;
  const trackX = (p) => vw() / 2 - p * trackW();
  let stepOn = 0;
  function paintTrack() {
    const x = gsap.getProperty(track, 'x');
    const center = clamp((vw() / 2 - x) / trackW(), 0, 1);
    lit.setAttribute('x2', (center * 4000).toFixed(1));
    let k = 0; NODE_P.forEach((p, i) => { if (center >= p - 0.1) k = i; });
    nodes.forEach((n, i) => { n.classList.toggle('is-on', i === k); n.classList.toggle('is-past', i < k); });
    if (k !== stepOn) {
      stepOn = k;
      swap(['#svStepN', '#svStepTitle', '#svStepText'], () => {
        $('#svStepN').textContent = String(k + 1).padStart(2, '0');
        $('#svStepTitle').textContent = steps[k].title;
        $('#svStepText').textContent = steps[k].text;
      });
    }
  }
  gsap.set(track, { x: () => trackX(NODE_P[0]) });
  gsap.set(['.sv-floor-wrap', '#svStep'], { autoAlpha: 0 });
  gsap.fromTo(bg, { backgroundColor: PAPER }, { backgroundColor: NAVY, ease: 'none', immediateRender: false, scrollTrigger: { trigger: q, start: 'top 95%', end: 'top 35%', scrub: true } });
  gsap.timeline({ scrollTrigger: { trigger: q, start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .fromTo(confTitle, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.4)
    .fromTo('#confLede', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: 'none' }, 0.6);
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: q, start: 'top top', end: '+=460%', pin: true, scrub: 0.6, invalidateOnRefresh: true } })
    .to('.sv-floor-wrap', { autoAlpha: 1, duration: 0.5 }, 0)
    .fromTo('.sv-floor', { rotateX: 80 }, { rotateX: 58, duration: 0.8, ease: 'power2.out' }, 0)
    .to('#svStep', { autoAlpha: 1, duration: 0.4 }, 0.4)
    .to('.sv-quality__intro p', { autoAlpha: 0, duration: 0.4 }, 0.8)
    .fromTo(track, { x: () => trackX(NODE_P[0]) }, { x: () => trackX(NODE_P[NODE_P.length - 1]), duration: 4, ease: 'power1.inOut', onUpdate: paintTrack, immediateRender: false }, 0.8)
    .to({}, { duration: 0.4 });
  paintTrack();

  /* =======================================================
     ACT 7 + 8 — the market note and next steps come forward
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
