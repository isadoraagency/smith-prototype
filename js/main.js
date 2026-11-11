/* =========================================================
   SMITH — prototype interactions
   GSAP + ScrollTrigger for the animation, Lenis for smooth
   scrolling. No build step.
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------
   1. Smooth scrolling (Lenis drives ScrollTrigger)
   --------------------------------------------------------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------------------------------------------------
   2. Ticker — duplicate the list for a seamless loop,
      hide it as soon as the user starts scrolling
   --------------------------------------------------------- */
const ticker = document.getElementById('ticker');
const tickerList = ticker.querySelector('.ticker__track');
const tickerCopy = tickerList.cloneNode(true);
tickerCopy.setAttribute('aria-hidden', 'true');
tickerList.parentElement.appendChild(tickerCopy);

let tickerHidden = false;
function syncTicker() {
  const hide = window.scrollY > 8;
  if (hide === tickerHidden) return;
  tickerHidden = hide;
  gsap.to(ticker, {
    autoAlpha: hide ? 0 : 1,
    y: hide ? -16 : 0,
    duration: 0.45,
    ease: 'power2.out',
    overwrite: true,
  });
}
window.addEventListener('scroll', syncTicker, { passive: true });

// Nav theme: look at what is directly under the logo; if it belongs to a
// [data-nav="light"] area (beige sections) the logo and Electronics/Solar
// toggle switch to navy, over anything dark they stay light. An inner
// [data-nav="dark"] (e.g. the navy chart card) wins over its light section.
const navHeader = document.querySelector('.header');
let navRaf = 0;
function syncNavTheme() {
  navRaf = 0;
  const logo = navHeader.querySelector('.logo').getBoundingClientRect();
  const x = logo.left + logo.width / 2;
  const y = logo.top + logo.height / 2;
  const under = document.elementsFromPoint(x, y).find((el) => !navHeader.contains(el));
  const zone = under && under.closest('[data-nav]');
  navHeader.classList.toggle('is-on-light', !!zone && zone.dataset.nav === 'light');
}
const queueNavTheme = () => { if (!navRaf) navRaf = requestAnimationFrame(syncNavTheme); };
window.addEventListener('scroll', queueNavTheme, { passive: true });
window.addEventListener('resize', queueNavTheme);
if (lenis) lenis.on('scroll', queueNavTheme);
queueNavTheme();

// solid header once the pinned hero/about stage has scrolled past.
// OFF for now: testing how the transparent nav reads over every section.
// Set to true to bring the cobalt bar back.
const SOLID_NAV_ON_SCROLL = false;
const header = document.querySelector('.header');
if (SOLID_NAV_ON_SCROLL) ScrollTrigger.create({
  trigger: '#insights',
  start: 'top 80px',
  onToggle: (self) => header.classList.toggle('is-solid', self.isActive || self.progress === 1),
  onLeaveBack: () => header.classList.remove('is-solid'),
  end: 'max',
});

/* ---------------------------------------------------------
   2b. Hero intro — same choreography as the Smith Solar hero:
       the headline words rise out of their masks one by one,
       the video settles from a zoom, then the news card,
       ticker, nav and chat button follow.
       (The scroll-driven stage below animates .hero__title and
       .news themselves, so the intro only touches their insides
       / a clip-path, never the same properties.)
   --------------------------------------------------------- */
const heroTitle = document.querySelector('.hero__title');
heroTitle.innerHTML = heroTitle.innerHTML
  .split(/(<br\s*\/?>)/i)
  .map((part) => (/^<br/i.test(part) ? part : part.trim().split(/\s+/)
    .map((w) => `<span class="wm"><span class="wd">${w}</span></span>`).join(' ')))
  .join('');
const heroWords = heroTitle.querySelectorAll('.wd');
const introNav = gsap.utils.toArray('.nav > *, .ticker, .chat');

if (!reduceMotion) {
  // hide everything before the first paint so nothing flashes in place
  gsap.set(heroWords, { yPercent: 110 });
  gsap.set('#heroVideo', { scale: 1.22 });
  gsap.set('.news', { clipPath: 'inset(0% 0% 100% 0% round 14px)' });
  gsap.set(introNav, { y: -24, autoAlpha: 0 });

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 } })
      .to(heroWords, { yPercent: 0, stagger: 0.06 }, 0)
      .to('#heroVideo', { scale: 1, duration: 2.4, clearProps: 'scale' }, 0)
      .to(introNav, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 1.2, clearProps: 'transform,opacity,visibility' }, 0.2)
      .to('.news', { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.2, clearProps: 'clipPath' }, 0.55);
  });
}

/* ---------------------------------------------------------
   3. Stage — hero video shrinks into the big circle,
      lines draw in from the left, bubbles pop up,
      statement lights up word by word.
   --------------------------------------------------------- */
const stage     = document.getElementById('stage');
const media     = document.getElementById('heroMedia');
const slot      = document.getElementById('heroSlot');
const statement = document.getElementById('statement');
const bubbles   = gsap.utils.toArray('.bubble');
const bubbleVideos = bubbles.map((b) => b.querySelector('video'));

// make sure the hero video is playing (some browsers ignore autoplay until asked)
document.getElementById('heroVideo').play().catch(() => {});

// split the statement into words
const words = statement.textContent.trim().split(/\s+/);
// words from data-muted-from onward end up beige (two-tone statement in the Figma)
const mutedFrom = words.indexOf(statement.dataset.mutedFrom);
statement.innerHTML = words
  .map((w, i) => `<span class="w${mutedFrom > -1 && i >= mutedFrom ? ' w--muted' : ''}">${w}</span>`)
  .join(' ');
const wordEls = statement.querySelectorAll('.w');

// where the hero video should end up, relative to the stage
function slotBox() {
  const s = slot.getBoundingClientRect();
  const st = stage.getBoundingClientRect();
  return { x: s.left - st.left, y: s.top - st.top, size: s.width };
}

// where the full-screen video ends up: the centred square of the stage,
// clipped to a circle, scaled and moved onto the slot
function heroTarget() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const side = Math.min(W, H);
  const ix = (W - side) / 2, iy = (H - side) / 2;
  const s = slotBox();
  return {
    scale: s.size / side,
    x: s.x + s.size / 2 - W / 2,
    y: s.y + s.size / 2 - H / 2,
    clip: `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${side / 2}px)`,
  };
}

function playBubbles() {
  bubbleVideos.forEach((v) => v.play().catch(() => {}));
}

// Line drawing (same technique as the smithweb.com hero): every path gets
// pathLength="1", so its dash is exactly one path long whatever the SVG is
// scaled to. Drawing is then just the dash offset going 1 → 0.
// The dash is animated as an SVG attribute (attr plugin), not a CSS
// property: GSAP rounds CSS px values to whole pixels, which on a 0–1
// path would snap the line from hidden to fully drawn in one frame.
function prepLine(path) {
  path.setAttribute('pathLength', '1');
  path.setAttribute('stroke-dasharray', '1 1');
  path.setAttribute('stroke-dashoffset', '1');
  return path;
}
const DRAWN = { attr: { 'stroke-dashoffset': 0 } };

const lines = gsap.utils.toArray('.line').map(prepLine);
// markers pop as the drawing line reaches them (x along the 1440-wide motif)
const markerXY = (m) => (m.tagName === 'circle'
  ? { x: +m.getAttribute('cx'), y: +m.getAttribute('cy') }
  : (({ e, f }) => ({ x: e, y: f }))(m.parentNode.transform.baseVal.consolidate().matrix));   // diamonds sit in a translated <g>
// For a marker, find the line it sits on and how far along that line it is (0–1),
// so it can pop exactly when the drawing line reaches it.
function markerOnLines(m, paths) {
  const { x, y } = markerXY(m);
  let best = { d: Infinity, line: 0, at: 0 };
  paths.forEach((path, li) => {
    const len = path.getTotalLength();
    for (let l = 0; l <= len; l += 4) {
      const pt = path.getPointAtLength(l);
      const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
      if (d < best.d) best = { d, line: li, at: l / len };
    }
  });
  return best;
}
// Markers grow from their own centre: circles animate their radius (no
// transform at all), diamonds scale around their own middle.
function hideMarker(el) {
  if (el.tagName === 'circle') { el.dataset.r = el.dataset.r || el.getAttribute('r'); el.setAttribute('r', 0); }
  else gsap.set(el, { scale: 0, transformOrigin: '50% 50%' });
}
const popTo = (el) => (el.tagName === 'circle'
  ? { attr: { r: +el.dataset.r } }
  : { scale: 1, transformOrigin: '50% 50%' });

// Red markers don't sit still: each one travels the full length of its line,
// one side of the screen to the other, growing from nothing as it sets off and
// shrinking away before it leaves, then starts again.
function makeFlow(circle, path, duration = 11) {
  const len = path.getTotalLength();
  const r = +circle.dataset.r;
  const head = { t: 0 };
  const place = () => {
    const pt = path.getPointAtLength(head.t * len);
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
  };
  const tl = gsap.timeline({ repeat: -1, paused: true, onUpdate: place })
    .to(head, { t: 1, duration, ease: 'none' }, 0)
    .fromTo(circle, { attr: { r: 0 } }, { attr: { r }, duration: duration * 0.12, ease: 'power2.out' }, 0)
    .to(circle, { attr: { r: 0 }, duration: duration * 0.12, ease: 'power2.in' }, duration * 0.88);
  let pending = null;
  const stop = () => { if (pending) pending.kill(); pending = null; tl.pause(0); circle.setAttribute('r', 0); };
  const start = (delay = 0) => { stop(); pending = gsap.delayedCall(delay, () => { pending = null; tl.play(0); }); };
  stop();
  return { start, stop, tl };
}

const allStageMarkers = gsap.utils.toArray('#flow .marker');
allStageMarkers.forEach(hideMarker);
const stageMarkers = allStageMarkers
  .filter((el) => !el.classList.contains('marker--red'))
  .map((el) => ({ el, ...markerOnLines(el, lines) }));
const stageFlows = allStageMarkers
  .filter((el) => el.classList.contains('marker--red'))
  .map((el, i) => ({ flow: makeFlow(el, lines[markerOnLines(el, lines).line], 11 + i), delay: i * 2.4 }));
gsap.set(bubbles, { scale: 0 });
gsap.set(wordEls, { opacity: 0.18 });

/* Timeline (in timeline units — every step overlaps the next):
   0.0 ─ hero copy out
   0.0 ━━━━━━━━━━━━ 3.2  video shrinks into the circle
   1.1 ━━━━━━━━━━━━━━ 4.3  lines draw in from the left
   3.0 ━━━━ 4.2  small videos pop up
   3.4 ━━━ 4.4  line markers pop in
   3.8 ━━━━━━━━━━━━━━━━━ 7.6  statement in, then word by word        */
const T = {
  shrink:  0,
  lines:   1.1,
  bubbles: 3.0,
  shapes:  3.4,
  text:    3.8,
};

const stageTl = gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: {
    trigger: stage,
    start: 'top top',
    end: '+=220%',          // how long the stage stays pinned
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

stageTl
  // hero copy leaves
  .to('.hero__title', { y: -70, autoAlpha: 0, duration: 1.1, ease: 'power1.in' }, 0)
  .to('.news',        { y: 40,  autoAlpha: 0, duration: 1,   ease: 'power1.in' }, 0)
  .to('#heroShade',   { opacity: 0, duration: 1.6 }, 0.3)

  // full-screen video → circle
  // (GPU-friendly: the box never changes size — a clip-path crops it to a
  // centred circle while a transform scales and moves it onto the slot)
  .fromTo(media,
    { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px 0px 0px round 0px)' },
    {
      x:     () => heroTarget().x,
      y:     () => heroTarget().y,
      scale: () => heroTarget().scale,
      clipPath: () => heroTarget().clip,
      duration: 3.2,
      ease: 'power2.inOut',
    }, T.shrink)

  // line motif draws in from the left while the video is still landing
  .to(lines, { ...DRAWN, duration: 3, stagger: 0.2, ease: 'none' }, T.lines)

  // the two smaller videos pop up and start playing
  .call(playBubbles, null, T.bubbles)
  .to(bubbles, { scale: 1, duration: 0.8, stagger: 0.35, ease: 'back.out(1.6)' }, T.bubbles)


  // statement fades in dim, then lights up word by word
  .fromTo(statement, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, T.text)
  .to(wordEls, { opacity: 1, duration: 0.6, stagger: 0.17, ease: 'power1.out' }, T.text + 0.4);

// each marker pops the moment its line's drawing head reaches it
// (lines draw linearly over 3 units, the second one starting 0.2 later)
stageMarkers.forEach(({ el, line, at }) => {
  stageTl.to(el, { ...popTo(el), duration: 0.45, ease: 'back.out(2.2)' }, T.lines + line * 0.2 + 3 * at - 0.05);
});

// the red ones set off once both lines are fully drawn, and stop (hidden)
// if you scroll back above that point
const LINES_DONE = T.lines + 0.2 + 3;
let stageFlowing = false;
stageTl.eventCallback('onUpdate', () => {
  const ready = stageTl.time() >= LINES_DONE;
  if (ready === stageFlowing) return;
  stageFlowing = ready;
  stageFlows.forEach(({ flow, delay }) => (ready ? flow.start(delay) : flow.stop()));
});

/* ---------------------------------------------------------
   4. Latest market insights — cards rise from the bottom,
      then the section pins and the row travels sideways
      until the last card reaches the right gutter.
   --------------------------------------------------------- */
const insights = document.getElementById('insights');
const track    = document.getElementById('track');
const cards    = gsap.utils.toArray('.card');

function travel() {
  // the title's left offset = the page gutter in px
  const gutter = parseFloat(getComputedStyle(document.querySelector('.insights__title')).left) || 48;
  return Math.max(0, track.offsetWidth - (window.innerWidth - gutter));
}

// explicit from/to values so a ScrollTrigger refresh can't capture
// the offset position as the "resting" one
gsap.fromTo(cards, { y: 220, autoAlpha: 0 }, {
  y: 0,
  autoAlpha: 1,
  duration: 1.1,
  stagger: 0.09,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: insights,
    start: 'top 70%',
    toggleActions: 'play none none reverse',
  },
});

gsap.to(track, {
  x: () => -travel(),
  ease: 'none',
  scrollTrigger: {
    trigger: insights,
    start: 'top top',
    end: () => `+=${travel()}`,
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

/* ---------------------------------------------------------
   5. Fade-up reveals for headings and copy blocks
   --------------------------------------------------------- */
gsap.utils.toArray('.reveal').forEach((el) => {
  gsap.fromTo(el, { y: 48, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
  });
});

/* ---------------------------------------------------------
   6. Market chart — lines draw left → right, then the
      end-of-line markers + labels pop in
   --------------------------------------------------------- */
const chartSvg = document.querySelector('.chart__svg');
const chartLabels = document.getElementById('chartLabels');
const chartPaths = gsap.utils.toArray('.chart__glow');

// one label per series, created once and re-positioned on resize
const chartLabelEls = chartPaths.map((path) => {
  const label = document.createElement('span');
  label.className = 'chart__label';
  label.textContent = path.parentNode.dataset.label;
  chartLabels.appendChild(label);
  return label;
});
function placeChartLabels() {
  const vb = chartSvg.viewBox.baseVal;
  const box = chartSvg.getBoundingClientRect();
  chartPaths.forEach((path, i) => {
    const end = path.getPointAtLength(path.getTotalLength());
    chartLabelEls[i].style.left = `${((end.x - vb.x) / vb.width) * box.width}px`;
    chartLabelEls[i].style.top = `${((end.y - vb.y) / vb.height) * box.height}px`;
  });
}

placeChartLabels();
gsap.set(chartLabelEls, { autoAlpha: 0, x: -8 });

gsap.timeline({
  scrollTrigger: { trigger: '.chart', start: 'top 70%', toggleActions: 'play none none reverse' },
})
  // the lines are revealed left → right by a growing clip rect, so the thin
  // (non-scaling) strokes stay crisp at every size and never stutter
  .fromTo('#chartRevealRect', { attr: { width: 0 } }, { attr: { width: 1170 }, duration: 2.2, ease: 'power2.inOut' })
  .to(chartLabelEls, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, '-=0.4');

// keep the labels pinned to the line ends when the chart resizes
new ResizeObserver(placeChartLabels).observe(chartSvg);

/* ---------------------------------------------------------
   7. Impact cards + product cards rise in, staggered
   --------------------------------------------------------- */
[['.tech__row', '.product'], ['.cta-section__stack', '.cta-card']].forEach(([wrap, item]) => {
  gsap.fromTo(`${wrap} ${item}`, { y: 120, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: wrap, start: 'top 80%', toggleActions: 'play none none reverse' },
  });
});

// Impact cards: one even row; on desktop they rise in with the scroll, each
// travelling further than the one before so they arrive one after another
const impactMM = gsap.matchMedia();
impactMM.add('(min-width: 721px)', () => {
  gsap.fromTo('.impact__cards .svc-card',
    { y: (i) => 160 + i * 140, autoAlpha: 0 },
    {
      y: 0, autoAlpha: 1, ease: 'power2.out', stagger: 0.08,
      scrollTrigger: { trigger: '.impact__cards', start: 'top 95%', end: 'top 30%', scrub: 1 },
    });
});
impactMM.add('(max-width: 720px)', () => {
  gsap.fromTo('.impact__cards .svc-card', { y: 80, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.impact__cards', start: 'top 85%', toggleActions: 'play none none reverse' },
  });
});

// slow parallax on the full-bleed photos
gsap.utils.toArray('.photo-bg, .industries__media').forEach((bg) => {
  gsap.fromTo(bg, { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: bg.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true },
  });
});

// CTA: the robotic arm reaches in as the section scrolls into view —
// it slides in from the right, settles from a close-up and comes into focus
gsap.fromTo('.cta-section__img',
  { xPercent: 10, scale: 1.2, opacity: 0.2, filter: 'blur(8px)' },
  {
    xPercent: 0, scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power2.out',
    scrollTrigger: { trigger: '.cta-section', start: 'top bottom', end: 'top 10%', scrub: 1 },
  });

/* ---------------------------------------------------------
   8. Global reach — stats count up; the globe iframe sizes
      itself to its content and hands wheel scrolling back
   --------------------------------------------------------- */
gsap.utils.toArray('.stat b[data-count]').forEach((el) => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const n = { v: 0 };
  gsap.to(n, {
    v: target, duration: 1.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.stats', start: 'top 80%', once: true },
    onUpdate: () => { el.innerHTML = Math.round(n.v).toLocaleString('en-US') + suffix.replace('+', '<span class="plus">+</span>'); },
  });
});

const globeFrame = document.getElementById('globeFrame');
function fitGlobe() {
  try {
    const doc = globeFrame.contentDocument;
    const h = doc && doc.querySelector('.stage') ? doc.querySelector('.stage').scrollHeight : 0;
    if (h) { globeFrame.style.height = `${h}px`; ScrollTrigger.refresh(); }
  } catch (e) { /* file:// or cross-origin — keep the CSS height */ }
}
globeFrame.addEventListener('load', () => {
  fitGlobe();
  try { new ResizeObserver(fitGlobe).observe(globeFrame.contentDocument.body); } catch (e) {}
});
window.addEventListener('message', (e) => {
  if (e.source !== globeFrame.contentWindow || typeof e.data?.smithWheel !== 'number') return;
  if (lenis) lenis.scrollTo(lenis.targetScroll + e.data.smithWheel);
  else window.scrollBy(0, e.data.smithWheel);
});

/* ---------------------------------------------------------
   9. Industries — same interaction as the Smith Solar
      "product categories" section: hover / focus / tap an
      industry and its photo zooms in over the last one, the
      red dot slides to it and a line draws out underneath,
      pushing the rest of the list down. Touch screens cycle
      through the list on their own while it is in view.
   --------------------------------------------------------- */
const indSection = document.getElementById('industries');
const indItems = gsap.utils.toArray('[data-ind]');
const indLayers = gsap.utils.toArray('[data-ind-layer]');
const indDot = document.querySelector('[data-ind-dot]');
const indLine = document.querySelector('[data-ind-line]');
const indPath = indLine.querySelector('path');
let indActive = -1;
prepLine(indPath);

function placeIndustry(i, instant) {
  const btn = indItems[i];
  const li = btn.parentElement;
  const dotY = li.offsetTop + btn.offsetHeight / 2 - indDot.offsetHeight / 2;
  gsap.to(indDot, { y: dotY, duration: instant ? 0 : 0.8, ease: 'expo.out' });
  gsap.set(indLine, { y: li.offsetTop + btn.offsetHeight + 8 });
  gsap.fromTo(indPath, { attr: { 'stroke-dashoffset': 1 } }, {
    ...DRAWN, duration: instant ? 0 : 1.1, ease: 'expo.out', delay: instant ? 0 : 0.12,
  });
}

function setIndustry(i, instant = false) {
  if (i === indActive) return;
  const prev = indLayers[indActive];
  const next = indLayers[i];
  indActive = i;
  indItems.forEach((b, k) => {
    b.classList.toggle('is-active', k === i);
    b.classList.toggle('is-after', k > i);
    b.setAttribute('aria-pressed', k === i ? 'true' : 'false');
  });
  // stop every photo tween, so an older fade can never finish late and hide the new photo
  gsap.killTweensOf(indLayers);
  indLayers.forEach((l) => {
    l.style.zIndex = l === next ? 2 : l === prev ? 1 : 0;
    if (l !== next && l !== prev) gsap.set(l, { opacity: 0 });
  });
  if (instant || reduceMotion) {
    indLayers.forEach((l) => gsap.set(l, { opacity: l === next ? 1 : 0, scale: 1 }));
  } else {
    gsap.fromTo(next, { opacity: 0, scale: 1.1 }, {
      opacity: 1, scale: 1, duration: 1.3, ease: 'expo.out',
      onComplete: () => indLayers.forEach((l, k) => k !== indActive && gsap.set(l, { opacity: 0 })),
    });
    if (prev) gsap.to(prev, { scale: 1.04, duration: 1.3, ease: 'expo.out' });
  }
  // the CSS shifts later items down; measure on the next frame
  requestAnimationFrame(() => placeIndustry(i, instant));
}

// Hover is read from real pointer movement only. Rows slide when the active
// industry changes, and the browser would otherwise report a "hover" for
// whatever row slides under a still cursor, making the list chatter.
// A short settle time after each change lets the rows finish moving first.
const indList = document.getElementById('industryList');
let indSettle = 0;
function industryAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const btn = el && el.closest('[data-ind]');
  return btn ? indItems.indexOf(btn) : -1;
}
indList.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || performance.now() < indSettle) return;
  const i = industryAt(e.clientX, e.clientY);
  if (i > -1 && i !== indActive) { setIndustry(i); indSettle = performance.now() + 220; }
});
indItems.forEach((b, i) => {
  b.addEventListener('focus', () => setIndustry(i));
  b.addEventListener('click', () => setIndustry(i));
});
setIndustry(indItems.findIndex((b) => b.textContent.trim() === 'Automotive'), true);
window.addEventListener('resize', () => placeIndustry(indActive, true));

// touch screens: gentle auto-cycle while the section is in view
if (window.matchMedia('(hover: none)').matches && !reduceMotion) {
  let indTimer = null;
  const stopCycle = () => indTimer && clearInterval(indTimer);
  const startCycle = () => { stopCycle(); indTimer = setInterval(() => setIndustry((indActive + 1) % indItems.length), 3200); };
  ScrollTrigger.create({
    trigger: indSection, start: 'top 60%', end: 'bottom 40%',
    onToggle: (st) => (st.isActive ? startCycle() : stopCycle()),
  });
  indItems.forEach((b) => b.addEventListener('click', startCycle));
}

// entrance: list rows rise in one by one, then the dot pops
gsap.from(indItems.map((b) => b.parentElement), {
  y: 16, autoAlpha: 0, stagger: 0.06, duration: 1,
  scrollTrigger: { trigger: indSection, start: 'top 60%', toggleActions: 'play none none reverse' },
});
gsap.from(indDot, {
  scale: 0, duration: 0.8, delay: 0.5, ease: 'back.out(3)',
  scrollTrigger: { trigger: indSection, start: 'top 60%', toggleActions: 'play none none reverse' },
});

/* ---------------------------------------------------------
   9b. Footer — the circuit line draws in and its markers pop;
       the floating chat button lifts so it never covers the
       credits row at the very bottom of the page.
   --------------------------------------------------------- */
const footCircuit = prepLine(document.querySelector('.footer__circuit-line'));
const allFootMarkers = gsap.utils.toArray('.footer__circuit .marker');
allFootMarkers.forEach(hideMarker);
const footMarkers = allFootMarkers.filter((el) => !el.classList.contains('marker--red'));
const footFlows = allFootMarkers.filter((el) => el.classList.contains('marker--red')).map((el) => makeFlow(el, footCircuit, 9));
const footTl = gsap.timeline({
  paused: true,
  scrollTrigger: { trigger: '.footer__circuit', start: 'top 90%', toggleActions: 'play none none reverse' },
});
// draws with an ease-out like the smithweb.com hero (2.5s, fast start, soft landing)
footTl.to(footCircuit, { ...DRAWN, duration: 2.5, ease: 'power2.out' });
// markers pop as the line head reaches them: invert power2.out (p = 1 − (1 − t)²)
// to find when the head passes each marker's share of the line
footMarkers.forEach((m) => {
  const p = markerOnLines(m, [footCircuit]).at;
  footTl.to(m, { ...popTo(m), duration: 0.45, ease: 'back.out(2.2)' }, 2.5 * (1 - Math.sqrt(1 - p)) - 0.05);
});
// the red one starts travelling once the line is drawn; stops if it un-draws
footTl.eventCallback('onComplete', () => footFlows.forEach((f) => f.start(0.2)));
footTl.eventCallback('onReverseComplete', () => footFlows.forEach((f) => f.stop()));
footTl.eventCallback('onUpdate', () => { if (footTl.reversed()) footFlows.forEach((f) => f.stop()); });

const chatEl = document.getElementById('chatBtn');
ScrollTrigger.create({
  trigger: '.footer__meta',
  start: 'top bottom',          // credits row has entered the screen
  end: 'max',
  // progress stays 1 at the very bottom of the page, where isActive is already false
  onUpdate: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
  onRefresh: (st) => chatEl.classList.toggle('is-lifted', st.progress > 0),
});

/* ---------------------------------------------------------
   11. Overlays — Industries dropdown, chat panel, Market
       Insight modal. Esc closes whichever is open.
   --------------------------------------------------------- */
function reveal(el, from) {
  el.hidden = false;
  gsap.fromTo(el, from, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' });
}
function conceal(el, to, done) {
  gsap.to(el, { ...to, autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { el.hidden = true; done && done(); } });
}

// Industries dropdown
const indBtn = document.getElementById('industriesBtn');
const indMenu = document.getElementById('industriesMenu');
function setDropdown(open) {
  if (open === (indBtn.getAttribute('aria-expanded') === 'true')) return;
  indBtn.setAttribute('aria-expanded', String(open));
  if (open) reveal(indMenu, { autoAlpha: 0, y: -8 });
  else conceal(indMenu, { y: -8 });
}
indBtn.addEventListener('click', (e) => { e.stopPropagation(); setDropdown(indBtn.getAttribute('aria-expanded') !== 'true'); });
document.addEventListener('click', (e) => { if (!indMenu.hidden && !indMenu.contains(e.target)) setDropdown(false); });
indMenu.querySelector('.dropdown__all').addEventListener('click', () => setDropdown(false));

// Chat panel
const chatBtn = document.getElementById('chatBtn');
const chatPanel = document.getElementById('chatPanel');
const chatThread = document.getElementById('chatThread');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
function setChat(open) {
  chatBtn.setAttribute('aria-expanded', String(open));
  if (open) { reveal(chatPanel, { autoAlpha: 0, y: 24, scale: 0.96 }); setTimeout(() => chatInput.focus(), 200); }
  else conceal(chatPanel, { y: 24, scale: 0.96 }, () => chatBtn.focus());
}
chatBtn.addEventListener('click', () => setChat(true));
document.getElementById('chatClose').addEventListener('click', () => setChat(false));
function sendChat(text) {
  if (!text.trim()) return;
  const msg = document.createElement('p');
  msg.className = 'msg msg--me';
  msg.textContent = text.trim();
  chatThread.appendChild(msg);
  gsap.from(msg, { y: 12, autoAlpha: 0, duration: 0.3, ease: 'power2.out' });
  chatThread.scrollTop = chatThread.scrollHeight;
}
document.getElementById('chatQuick').addEventListener('click', (e) => {
  if (e.target.closest('button')) sendChat(e.target.closest('button').textContent);
});
chatForm.addEventListener('submit', (e) => { e.preventDefault(); sendChat(chatInput.value); chatInput.value = ''; });

// Market Insight modal
let modalOpener = null;
function openModal(id, opener) {
  const modal = document.getElementById(id);
  modalOpener = opener;
  document.documentElement.classList.add('is-locked');
  if (lenis) lenis.stop();
  modal.scrollTop = 0;
  reveal(modal, { autoAlpha: 0, y: 40 });
  gsap.from(modal.querySelectorAll('.modal__content > *'), { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.1 });
  modal.querySelector('.modal__back').focus({ preventScroll: true });
}
function closeModal(modal) {
  conceal(modal, { y: 40 }, () => {
    document.documentElement.classList.remove('is-locked');
    if (lenis) lenis.start();
    if (modalOpener) modalOpener.focus({ preventScroll: true });
  });
}
document.querySelectorAll('[data-modal-open]').forEach((el) => {
  el.addEventListener('click', (e) => { e.preventDefault(); openModal(el.dataset.modalOpen, el); });
});
document.querySelectorAll('.modal [data-modal-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.querySelector('.modal:not([hidden])');
  if (modal) return closeModal(modal);
  if (!chatPanel.hidden) return setChat(false);
  if (!indMenu.hidden) { setDropdown(false); indBtn.focus(); }
});

/* ---------------------------------------------------------
   12. Electronics / Solar switch — the Solar site lives in
       solar/ (the Smith Solar prototype). Fade out, then go.
   --------------------------------------------------------- */
document.querySelectorAll('[data-site-switch]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // let "open in new tab" work
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = link.href; }, reduceMotion ? 0 : 350);
  });
});
// coming back with the browser's Back button restores the page from cache
window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

/* ---------------------------------------------------------
   10. Re-measure once web fonts have loaded (text widths change)
   --------------------------------------------------------- */
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
