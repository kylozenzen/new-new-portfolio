/* ============================================================
   SHOWREEL — a deterministic, seekable 30-second timeline.

   Nothing here runs on its own clock: every frame is a pure function of
   one number, t (seconds). That is what makes play, pause, replay,
   chapter-jumping, resizing mid-reel, and reduced motion all trivial.

   - Timing:  showreelConfig (below). Scene starts + beats, in seconds.
   - Content: showreel.json -> rendered into the page by render-portfolio.mjs.
   - Look:    assets/css/showreel.css.

   Choreography reads like an edit decision list: tl.to(element, at, for, {props}, ease).
   Props: x/y (% of the element), X/Y (fraction of the stage), s, sx, sy,
   r (deg), k (skew deg), o (opacity), b (blur, motion only), clip ([t,r,b,l] %),
   iris (circle %, around an origin). [from, to] pins a starting value.
   ============================================================ */
(() => {
  const root = document.querySelector('[data-reel]');
  if (!root) return;
  const stage = root.querySelector('[data-stage]');
  const controls = root.querySelector('[data-controls]');
  if (!stage || !controls) return;

  // ---------------------------------------------------------------------------
  // TIMING — tune the whole film from here.
  // `show` is when a scene's layer is on screen (transitions overlap scenes).
  // Beats are seconds from that scene's start.
  // ---------------------------------------------------------------------------
  const showreelConfig = {
    duration: 30,
    poster: 3.0,             // the frame shown before the reel plays
    fps: 24,                 // timecode + film-grain cadence
    autoplayAt: 0.55,        // share of the stage visible before autoplay
    scenes: [
      { id: 'who',   label: 'Who',   start: 0,    end: 4,    show: [0, 4],             fill: 'var(--sr-lime-hot)' },
      { id: 'scale', label: 'Scale', start: 4,    end: 11,   show: [4, 11.03],         fill: 'var(--sr-pink)' },
      { id: 'craft', label: 'Craft', start: 11,   end: 16.5, show: [10.76, 16.52],     fill: 'var(--sr-yellow)' },
      { id: 'work',  label: 'Work',  start: 16.5, end: 22.5, show: [16.5, 22.52],      fill: 'var(--sr-cyan)' },
      { id: 'why',   label: 'Why',   start: 22.5, end: 26,   show: [22.48, 26.31],     fill: 'var(--sr-pink-hot)' },
      { id: 'next',  label: 'Next',  start: 26,   end: 30,   show: [25.85, Infinity],  fill: 'var(--sr-lime)' },
    ],
    // Transitions are timed to finish exactly at the next scene's start
    // (punch + 0.33, iris + irisFor, cover + 0.3) — keep those sums in step.
    beats: {
      who:   { chip: 0.15, ink: 0.7, first: 1.0, last: 1.2, tags: 1.85, tagStagger: 0.16, punch: 3.67 },
      scale: { slots: [0, 1.65, 3.3, 4.95], zoom: 6.55, zoomFor: 0.42, iris: 6.76, irisFor: 0.24 },
      craft: { words: [0, 0.85, 1.65, 2.4, 3.05, 3.6, 4.1], band: 4.6, cover: 5.2 },
      work:  { beats: [0, 1.35, 2.7, 4.05], pile: 5.54, cover: 5.7 },
      why:   { lines: [0.1, 0.5, 0.95], hold: [1.15, 2.0], payoff: 2.0, out: 3.32 },
      next:  { name: 0.04, portrait: 0.15, status: 0.7, head: 1.0, actions: 1.3, nudge: 2.4, interactive: 0.7 },
    },
    // How each skill word arrives (by position in showreel.json's skills list).
    craftLooks: [null, null, 'bubble', 'chart', 'stamp', 'rec', 'type'],
  };

  const cfg = showreelConfig;
  const D = cfg.duration;
  const scene = id => cfg.scenes.find(s => s.id === id);

  // ---------------------------------------------------------------------------
  // EASING
  // ---------------------------------------------------------------------------
  const ease = {
    linear: p => p,
    out: p => 1 - (1 - p) ** 3,
    out4: p => 1 - (1 - p) ** 4,
    in3: p => p * p * p,
    inOut: p => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    outExpo: p => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
    inExpo: p => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
    inOutExpo: p => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2),
    back: p => { const c = 1.8, k = c + 1; return 1 + k * (p - 1) ** 3 + c * (p - 1) ** 2; },
    backBig: p => { const c = 3.1, k = c + 1; return 1 + k * (p - 1) ** 3 + c * (p - 1) ** 2; },
    spring: p => (p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(11.5 * p)),
    // These two return to where they started: shakes and nudges.
    shake: p => Math.sin(p * Math.PI * 7) * (1 - p) ** 2,
    pulse: p => Math.sin(p * Math.PI),
  };
  const steps = n => p => (p >= 1 ? 1 : Math.floor(p * n) / n);

  // ---------------------------------------------------------------------------
  // TIMELINE ENGINE
  // ---------------------------------------------------------------------------
  const DEFAULTS = { x: 0, y: 0, X: 0, Y: 0, s: 1, sx: 1, sy: 1, r: 0, k: 0, o: 1, b: 0, clip: [0, 0, 0, 0], iris: 150 };
  const TRANSFORM = ['x', 'y', 'X', 'Y', 's', 'sx', 'sy', 'r', 'k'];
  const lerp = (a, b, p) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * p) : a + (b - a) * p);
  const snap = v => (Math.abs(v - 1) < 0.02 ? 1 : Math.abs(v) < 0.02 ? 0 : v);

  class Timeline {
    constructor(calm) { this.tracks = new Map(); this.fns = []; this.calm = calm; }
    add(el, t, d, props, curve, fx) {
      if (!el || (fx && this.calm)) return this;
      let track = this.tracks.get(el);
      if (!track) { track = { props: {}, cache: {}, origin: null }; this.tracks.set(el, track); }
      for (const [key, value] of Object.entries(props)) {
        const pinned = Array.isArray(value) && (key !== 'clip' || Array.isArray(value[0]));
        (track.props[key] ||= []).push({ t, d, ease: curve, from: pinned ? value[0] : undefined, to: pinned ? value[1] : value });
      }
      return this;
    }
    to(el, t, d, props, curve = 'out') { return this.add(el, t, d, props, typeof curve === 'function' ? curve : ease[curve], false); }
    set(el, t, props) { return this.add(el, t, 0, props, ease.linear, false); }
    /** Effects (shakes, flashes, blur) — dropped entirely for reduced motion. */
    fx(el, t, d, props, curve = 'shake') { return this.add(el, t, d, props, typeof curve === 'function' ? curve : ease[curve], true); }
    origin(el, x, y) { if (el) { this.set(el, 0, {}); this.tracks.get(el).origin = [x, y]; } return this; }
    fn(callback) { this.fns.push(callback); return this; }
    compile() {
      for (const track of this.tracks.values()) {
        for (const [key, list] of Object.entries(track.props)) {
          list.sort((a, b) => a.t - b.t);
          let current = DEFAULTS[key];
          for (const tw of list) {
            if (tw.from === undefined) tw.from = current;
            tw.end = lerp(tw.from, tw.to, snap(tw.ease(1)));
            current = tw.end;
          }
          track.transform ||= TRANSFORM.includes(key);
        }
      }
      return this;
    }
    static value(list, t) {
      let active = null;
      for (const tw of list) { if (tw.t <= t) active = tw; else break; }
      if (!active) return list[0].from;
      if (active.d === 0 || t >= active.t + active.d) return active.end;
      return lerp(active.from, active.to, active.ease((t - active.t) / active.d));
    }
    render(t, W, H) {
      for (const [el, track] of this.tracks) {
        const v = {};
        for (const key in track.props) v[key] = Timeline.value(track.props[key], t);
        const style = {};
        if (track.transform) {
          const g = key => (v[key] === undefined ? DEFAULTS[key] : v[key]);
          let out = '';
          if (g('x') || g('y')) out += `translate(${g('x').toFixed(2)}%,${g('y').toFixed(2)}%) `;
          if (g('X') || g('Y')) out += `translate3d(${(g('X') * W).toFixed(1)}px,${(g('Y') * H).toFixed(1)}px,0) `;
          if (g('r')) out += `rotate(${g('r').toFixed(2)}deg) `;
          if (g('k')) out += `skewX(${g('k').toFixed(2)}deg) `;
          const sx = g('s') * g('sx'), sy = g('s') * g('sy');
          if (sx !== 1 || sy !== 1) out += `scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
          style.transform = out.trim() || 'none';
        }
        if (v.o !== undefined) style.opacity = Math.max(0, Math.min(1, v.o)).toFixed(3);
        if (v.b !== undefined) style.filter = !this.calm && v.b > 0.05 ? `blur(${(v.b * W / 1000).toFixed(1)}px)` : 'none';
        if (v.clip !== undefined) style.clipPath = `inset(${v.clip.map(n => `${Math.max(0, n).toFixed(2)}%`).join(' ')})`;
        if (v.iris !== undefined && track.origin) style.clipPath = `circle(${Math.max(0, v.iris).toFixed(2)}% at ${track.origin[0].toFixed(2)}% ${track.origin[1].toFixed(2)}%)`;
        for (const prop in style) {
          if (track.cache[prop] !== style[prop]) { el.style[prop] = style[prop]; track.cache[prop] = style[prop]; }
        }
      }
      for (const callback of this.fns) callback(t);
    }
  }

  // ---------------------------------------------------------------------------
  // ELEMENTS
  // ---------------------------------------------------------------------------
  const svgNS = 'http://www.w3.org/2000/svg';
  const make = (tag, cls, attrs = {}) => { const el = document.createElement(tag); if (cls) el.className = cls; for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };

  // Per-word treatments for the craft scene, added once.
  stage.querySelectorAll('.sr-cw').forEach((wrap, i) => {
    const look = cfg.craftLooks[i];
    if (!look) return;
    wrap.classList.add(`is-${look}`);
    const box = wrap.querySelector('.sr-cw-box');
    if (look === 'chart') {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'sr-spark'); svg.setAttribute('viewBox', '0 0 100 20'); svg.setAttribute('preserveAspectRatio', 'none');
      svg.dataset.el = `c${i}-spark`;
      const line = document.createElementNS(svgNS, 'polyline');
      line.setAttribute('points', '0,17 11,14 22,15.5 33,10 44,12 56,7 67,9 78,4 89,5.5 100,1');
      svg.append(line); box.append(svg);
    }
    if (look === 'rec') {
      const frame = make('div', 'sr-rec-frame', { 'data-el': `c${i}-rec` });
      frame.innerHTML = '<i></i><i></i><i></i><i></i><b>● REC</b><span data-timecode></span>';
      box.append(frame);
    }
    if (look === 'type') box.append(make('span', 'sr-caret', { 'data-el': `c${i}-caret` }));
  });

  const els = new Map();
  stage.querySelectorAll('[data-el]').forEach(el => els.set(el.dataset.el, el));
  const $ = name => els.get(name);
  const all = prefix => [...els.entries()].filter(([key]) => prefix.test(key)).map(([, el]) => el);
  const sceneEls = cfg.scenes.map(s => ({ ...s, el: stage.querySelector(`[data-scene="${s.id}"]`) }));
  const timecodes = [...stage.querySelectorAll('[data-timecode]')];
  const ctaLayer = stage.querySelector('[data-scene="next"]');

  // Position of an element in the stage, ignoring transforms (FLIP math).
  const rest = el => {
    let x = 0, y = 0, node = el;
    while (node && node !== stage) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  // Scale a box needs to cover the stage from where it sits.
  const coverScale = (box, W, H, pad = 1.1) => {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    return Math.max((2 * Math.max(cx, W - cx)) / box.w, (2 * Math.max(cy, H - cy)) / box.h) * pad;
  };

  // ---------------------------------------------------------------------------
  // CHOREOGRAPHY
  // ---------------------------------------------------------------------------
  function build(W, H, calm) {
    const tl = new Timeline(calm);
    const cam = $('cam'), flash = $('flash');
    const shake = (at, amount = 0.01) => { tl.fx(cam, at, 0.36, { X: [0, amount] }); tl.fx(cam, at, 0.36, { Y: [0, -amount * 0.7] }); };
    const pop = (at, strength = 0.32) => tl.fx(flash, at, 0.18, { o: [strength, 0] }, 'out');
    tl.set(flash, 0, { o: 0 });

    // ---- 01 WHO — the wordmark chip floods the frame, the name hits ---------
    {
      const S = scene('who').start, b = cfg.beats.who;
      const chip = $('a-chip'), ink = $('a-ink');
      const box = rest(chip);
      tl.set(ink, 0, { o: 0, clip: [box.y / H * 100, (W - box.x - box.w) / W * 100, (H - box.y - box.h) / H * 100, box.x / W * 100] });
      tl.set(ink, S + b.ink, { o: 1 });
      tl.to(ink, S + b.ink, 0.34, { clip: [0, 0, 0, 0] }, 'inOutExpo');

      tl.set(chip, 0, { s: 2.6, o: 0, r: -9 });
      tl.to(chip, S + b.chip, 0.34, { s: 1, r: 0 }, 'backBig');
      tl.to(chip, S + b.chip, 0.08, { o: 1 }, 'linear');
      tl.to(chip, S + b.ink + 0.14, 0.12, { o: 0 }, 'linear');
      shake(S + b.chip + 0.2, 0.006);

      tl.set($('a-first'), 0, { y: 112, k: -12 });
      tl.to($('a-first'), S + b.first, 0.5, { y: 0, k: 0 }, 'outExpo');
      tl.set($('a-last'), 0, { X: 0.75, k: -28, o: 0, b: 16 });
      tl.to($('a-last'), S + b.last, 0.5, { X: 0, k: 0, b: 0 }, 'outExpo');
      tl.to($('a-last'), S + b.last, 0.12, { o: 1 }, 'linear');
      shake(S + b.last + 0.16, 0.012);
      tl.to($('a-name'), S + b.last + 0.5, b.punch - b.last - 0.5, { s: 1.045 }, 'linear');

      const rests = [-2.5, 1.5, -1.2];
      const tags = all(/^a-tag\d+$/);
      tags.forEach((tag, i) => {
        tl.set(tag, 0, { y: 190, o: 0, r: rests[i % 3] * 5 });
        tl.to(tag, S + b.tags + i * b.tagStagger, 0.48, { y: 0, r: rests[i % 3] }, 'backBig');
        tl.to(tag, S + b.tags + i * b.tagStagger, 0.1, { o: 1 }, 'linear');
        const x = $(`a-x${i}`);
        if (x) { tl.set(x, 0, { s: 0, r: -180 }); tl.to(x, S + b.tags + (i - 0.5) * b.tagStagger, 0.4, { s: 1, r: 0 }, 'back'); }
      });

      // The SOCIAL tag becomes the next scene: it grows until it is the frame.
      const lead = tags[0];
      if (lead) {
        tl.to($('a-tag0-t'), S + b.punch, 0.07, { o: 0 }, 'linear');
        tl.to(lead, S + b.punch, 0.33, { s: coverScale(rest(lead), W, H, 1.06), r: 0 }, 'inExpo');
        tl.fn(t => lead.classList.toggle('sr-flat', t >= S + b.punch + 0.05));
      }
      tags.slice(1).concat(all(/^a-x\d+$/)).forEach((el, i) => tl.to(el, S + b.punch + i * 0.02, 0.24, { Y: 0.3, o: 0 }, 'in3'));
      tl.to($('a-name'), S + b.punch, 0.28, { Y: -0.25, o: 0 }, 'in3');
    }

    // ---- 02 SCALE — numbers as objects: reels, dots, reactions, bars, a photo ---
    {
      const S = scene('scale').start, b = cfg.beats.scale;
      const panels = all(/^m\d+$/);
      panels.forEach((panel, i) => {
        const at = S + b.slots[i];
        const isPhoto = panel.classList.contains('sr-m-photo');
        if (i > 0 && !isPhoto) {
          tl.set(panel, 0, { X: 1 });
          tl.to(panel, at - 0.02, 0.34, { X: 0 }, 'outExpo');
          tl.to(panels[i - 1], at - 0.02, 0.34, { X: -0.38 }, 'outExpo');
        }
        if (isPhoto) { tl.set(panel, 0, { o: 0 }); tl.set(panel, at, { o: 1 }); }
        const c = at + (i ? 0.08 : 0.02);
        const slotEnd = i + 1 < panels.length ? S + b.slots[i + 1] : S + b.zoom;
        const value = $(`m${i}-value`);
        if (value) { value.style.transformOrigin = '0 60%'; tl.to(value, c + 0.6, slotEnd - c - 0.6, { s: 1.045 }, 'linear'); }

        all(new RegExp(`^m${i}-d\\d+$`)).forEach((col, j) => {
          tl.set(col, 0, { y: 0 });
          tl.to(col, c + j * 0.07, 0.62, { y: -(10 + Number(col.dataset.digit)) * 5 }, 'outExpo');
        });
        all(new RegExp(`^m${i}-g\\d+$`)).forEach((glyph, j) => {
          tl.set(glyph, 0, { s: 0, r: -24 });
          tl.to(glyph, c + 0.3 + j * 0.05, 0.42, { s: 1, r: 0 }, 'backBig');
        });
        tl.set($(`m${i}-label`), 0, { y: 112 });
        tl.to($(`m${i}-label`), c + 0.12, 0.45, { y: 0 }, 'outExpo');
        tl.set($(`m${i}-note`), 0, { o: 0, y: 40 });
        tl.to($(`m${i}-note`), c + 0.3, 0.4, { o: 1, y: 0 }, 'out');

        all(new RegExp(`^m${i}-dot\\d+$`)).forEach((dot, k) => {
          const delay = (Math.floor(k / 10) + (k % 10)) * 0.018;
          tl.set(dot, 0, { s: 0 });
          tl.to(dot, c + 0.04 + delay, 0.5, { s: 1 }, 'spring');
        });
        all(new RegExp(`^m${i}-r\\d+$`)).forEach((chip, k) => {
          tl.set(chip, 0, { s: 0.4, o: 0, Y: 0.08, r: k % 2 ? 4 : -4 });
          tl.to(chip, c + 0.08 + k * 0.07, 0.45, { s: 1, Y: 0, r: k % 2 ? 2 : -2 }, 'backBig');
          tl.to(chip, c + 0.08 + k * 0.07, 0.1, { o: 1 }, 'linear');
          tl.to(chip, c + 0.55 + k * 0.07, slotEnd - c - 0.55, { Y: -0.07 }, 'linear');
        });
        all(new RegExp(`^m${i}-bar\\d+$`)).forEach((bar, k) => {
          tl.set(bar, 0, { sy: 0 });
          tl.to(bar, c + 0.05 + k * 0.045, 0.55, { sy: 1 }, 'spring');
        });

        if (isPhoto) {
          all(new RegExp(`^m${i}-c\\d+$`)).forEach((char, j) => {
            tl.set(char, 0, { y: 108 });
            tl.to(char, at + 0.02 + j * 0.045, 0.45, { y: 0 }, 'outExpo');
          });
          tl.set($(`m${i}-img`), 0, { s: 1.32 });
          tl.to($(`m${i}-img`), at, S + b.zoom - at, { s: 1.04 }, 'linear');
          shake(at + 0.04, 0.008);

          // Dive through the zero. The next scene opens out of the same point.
          const zoom = $(`m${i}-zoom`), zero = panel.querySelector('.sr-zero');
          if (zoom && zero) {
            const z = rest(zero);
            const zx = z.x + z.w / 2, zy = z.y + z.h * 0.52;
            zoom.style.transformOrigin = `${zx}px ${zy}px`;
            tl.to(zoom, S + b.zoom, b.zoomFor, { s: 46 }, 'inExpo');
            tl.to($(`m${i}-label`), S + b.zoom, 0.16, { o: 0 }, 'linear');
            tl.to($(`m${i}-note`), S + b.zoom, 0.16, { o: 0 }, 'linear');
            const craft = sceneEls.find(s => s.id === 'craft').el;
            tl.origin(craft, (zx / W) * 100, (zy / H) * 100);
            tl.set(craft, 0, { iris: 0 });
            tl.to(craft, S + b.iris, b.irisFor, { iris: 150 }, 'inExpo');
          }
        }
      });
      tl.set($('b-foot'), 0, { o: 0, Y: 0.03 });
      tl.to($('b-foot'), S + 0.4, 0.35, { o: 1, Y: 0 }, 'outExpo');
      tl.to($('b-foot'), S + b.zoom, 0.12, { o: 0 }, 'linear');
    }

    // ---- 03 CRAFT — seven words, each arriving its own way, getting faster ----
    {
      const S = scene('craft').start, b = cfg.beats.craft;
      const words = all(/^c\d+$/);
      const at = i => S + b.words[i];
      const nextAt = i => (i + 1 < words.length ? at(i + 1) : S + b.band);
      words.forEach((wrap, i) => {
        const look = cfg.craftLooks[i] || (i === 0 ? 'split' : 'pop');
        const text = $(`c${i}-t`), box = $(`c${i}-box`), tag = $(`c${i}-tag`);
        const enter = at(i), leave = nextAt(i);
        tl.set(wrap, 0, { o: 0 });
        tl.set(wrap, enter - 0.03, { o: 1 });
        tl.set(wrap, leave + 0.42, { o: 0 });
        tl.set(tag, 0, { o: 0, y: 60 });
        tl.to(tag, enter + 0.04, 0.26, { o: 1, y: 0 }, 'outExpo');
        tl.to(tag, leave - 0.06, 0.1, { o: 0 }, 'linear');

        if (look === 'split') {
          tl.set(text, 0, { y: 112 });
          tl.to(text, enter, 0.34, { y: 0 }, 'outExpo');
          tl.to($(`c${i}-top`), leave - 0.06, 0.32, { X: -1.1 }, 'inOutExpo');
          tl.to($(`c${i}-bot`), leave - 0.06, 0.32, { X: 1.1 }, 'inOutExpo');
        } else if (look === 'pop') {
          tl.set(box, 0, { s: 1.22, o: 0 });
          tl.to(box, enter, 0.32, { s: 1 }, 'outExpo');
          tl.to(box, enter, 0.12, { o: 1 }, 'linear');
          tl.to(wrap, leave - 0.04, 0.3, { Y: 0.62, r: 13, o: 0 }, 'in3');
        } else if (look === 'bubble') {
          tl.set(box, 0, { s: 0.2, o: 0, r: -12 });
          tl.to(box, enter, 0.4, { s: 1, r: -2 }, 'backBig');
          tl.to(box, enter, 0.08, { o: 1 }, 'linear');
          tl.to(box, leave - 0.05, 0.15, { s: 0, o: 0 }, 'in3');
        } else if (look === 'chart') {
          tl.set(wrap, 0, { X: 0.5, k: -20 });
          tl.to(wrap, enter, 0.3, { X: 0, k: 0 }, 'outExpo');
          tl.set($(`c${i}-spark`), 0, { clip: [0, 100, 0, 0] });
          tl.to($(`c${i}-spark`), enter + 0.06, 0.32, { clip: [0, 0, 0, 0] }, 'outExpo');
          tl.to(wrap, leave - 0.04, 0.2, { X: -0.55, k: 16, o: 0 }, 'in3');
        } else if (look === 'stamp') {
          tl.set(box, 0, { s: 3, o: 0, r: -24 });
          tl.to(box, enter, 0.22, { s: 1, r: -8 }, 'out4');
          tl.to(box, enter, 0.06, { o: 1 }, 'linear');
          shake(enter + 0.2, 0.012);
          pop(enter + 0.19, 0.22);
          tl.to(wrap, leave - 0.02, 0.06, { o: 0 }, 'linear');
        } else if (look === 'rec') {
          tl.set(box, 0, { clip: [50, 50, 50, 50] });
          tl.to(box, enter, 0.2, { clip: [0, 0, 0, 0] }, 'outExpo');
          tl.set($(`c${i}-rec`), 0, { s: 1.25, o: 0 });
          tl.to($(`c${i}-rec`), enter + 0.03, 0.22, { s: 1, o: 1 }, 'outExpo');
          tl.to(wrap, leave - 0.03, 0.14, { s: 1.3, o: 0 }, 'in3');
        } else if (look === 'type') {
          const letters = (text.textContent || '').length / 2 || 6;
          tl.set(text, 0, { clip: [0, 100, 0, 0] });
          tl.to(text, enter, 0.22, { clip: [0, 0, 0, 0] }, steps(Math.round(letters)));
          const caret = $(`c${i}-caret`);
          if (caret) tl.fn(t => { caret.style.opacity = t >= enter && Math.floor(t * 7) % 2 ? '0' : '1'; });
          tl.to(wrap, S + b.band, 0.08, { o: 0 }, 'linear');
        }
      });

      // The words become the site's ticker, and the ticker swallows the frame.
      const band = $('c-band'), track = $('c-track');
      tl.set(band, 0, { sy: 0 });
      tl.to(band, S + b.band, 0.2, { sy: 1 }, 'outExpo');
      tl.to(track, S + b.band, b.cover - b.band + 0.3, { x: [6, -34] }, 'linear');
      tl.to(band, S + b.cover, 0.3, { sy: (H / rest(band).h) * 1.15 }, 'inExpo');
      tl.to(track, S + b.cover, 0.1, { o: 0 }, 'linear');
    }

    // ---- 04 WORK — a montage of frames, piling up into one sheet of paper ----
    {
      const S = scene('work').start, b = cfg.beats.work;
      tl.to($('d-bg'), S, 3.1, { X: [0.025, -0.03] }, 'linear');
      const frames = all(/^d\d+$/);
      const at = i => S + b.beats[i];
      const pile = S + b.pile;
      frames.forEach((frame, i) => {
        const disc = $(`d${i}-disc`), client = $(`d${i}-client`);
        const leave = i + 1 < frames.length ? at(i + 1) : pile;
        [disc, client].forEach((el, j) => {
          tl.set(el, 0, { y: 112 });
          tl.to(el, at(i) + 0.04 + j * 0.05, 0.42, { y: 0 }, 'outExpo');
          tl.to(el, leave - 0.02 + j * 0.03, 0.22, { y: -112 }, 'in3');
        });

        const type = frame.className;
        if (type.includes('phone')) {
          tl.set(frame, 0, { Y: 1.05, r: 9 });
          tl.to(frame, at(i), 0.55, { Y: 0, r: -3 }, 'outExpo');
          tl.to($(`d${i}-feed`), at(i) + 0.2, 1.05, { y: -40 }, 'inOut');
        } else if (type.includes('vf')) {
          tl.set(frame, 0, { clip: [0, 100, 0, 0], s: 1.08 });
          tl.to(frame, at(i), 0.32, { clip: [0, 0, 0, 0], s: 1 }, 'outExpo');
          const rec = $(`d${i}-rec`);
          if (rec) tl.fn(t => { rec.style.opacity = Math.floor(t * 3) % 2 ? '0.3' : '1'; });
        } else if (type.includes('browser')) {
          tl.set(frame, 0, { Y: -0.95, r: -7 });
          tl.to(frame, at(i), 0.46, { Y: 0, r: -1.5 }, 'back');
          const cursor = $(`d${i}-cursor`), stamp = $(`d${i}-stamp`);
          tl.set(cursor, 0, { X: 0.14, Y: 0.2, o: 0 });
          tl.set(cursor, at(i) + 0.18, { o: 1 });
          tl.to(cursor, at(i) + 0.18, 0.32, { X: 0, Y: 0 }, 'outExpo');
          tl.to(cursor, at(i) + 0.52, 0.14, { s: [1, 0.78] }, 'pulse');
          tl.set(stamp, 0, { s: 2.7, o: 0, r: -22 });
          tl.to(stamp, at(i) + 0.56, 0.22, { s: 1, r: -7 }, 'out4');
          tl.to(stamp, at(i) + 0.56, 0.06, { o: 1 }, 'linear');
          shake(at(i) + 0.74, 0.008);
          pop(at(i) + 0.73, 0.2);
        } else {
          tl.set(frame, 0, { Y: 0.75, r: 10, o: 0 });
          tl.to(frame, at(i), 0.46, { Y: 0, r: 2 }, 'outExpo');
          tl.to(frame, at(i), 0.1, { o: 1 }, 'linear');
        }

        // Earlier frames step back into depth as each new one arrives.
        const depth = [
          { X: -0.17, Y: 0.02, s: 0.78, r: -9, o: 0.55 },
          { X: 0.16, Y: -0.08, s: 0.74, r: 6, o: 0.5 },
          { X: -0.12, Y: 0.12, s: 0.76, r: -6, o: 0.5 },
        ];
        for (let later = i + 1; later < frames.length; later++) {
          const step = later - i - 1;
          const d = depth[i % depth.length];
          const fade = Math.max(0.12, d.o - step * 0.22);
          tl.to(frame, at(later), 0.4, { X: d.X * (1 + step * 0.45), Y: d.Y, s: d.s - step * 0.1, r: d.r * (1 + step * 0.3), o: fade }, 'outExpo');
        }
      });

      // The last frame — a sheet of paper — becomes the next scene.
      const sheet = frames[frames.length - 1];
      frames.slice(0, -1).forEach((frame, i) => tl.to(frame, pile + i * 0.03, 0.3, { X: 0, Y: 0.22, s: 0.45, o: 0 }, 'in3'));
      if (sheet) {
        const box = rest(sheet);
        const cover = S + b.cover;
        const inner = sheet.firstElementChild;
        tl.to(inner, cover, 0.1, { o: 0 }, 'linear');
        tl.to(sheet, cover, 0.3, { X: (W / 2 - (box.x + box.w / 2)) / W, Y: (H / 2 - (box.y + box.h / 2)) / H, s: Math.max(W / box.w, H / box.h) * 1.12, r: 0 }, 'inOutExpo');
        tl.fn(t => sheet.classList.toggle('sr-flat', t >= cover));
      }
    }

    // ---- 05 WHY — the reel literally stops on "stop." ------------------------
    {
      const S = scene('why').start, b = cfg.beats.why;
      const lines = all(/^e\d+$/);
      lines.forEach((line, i) => {
        tl.set(line, 0, { y: 112 });
        tl.to(line, S + b.lines[i], 0.42, { y: 0 }, 'outExpo');
        tl.to(line, S + b.out + i * 0.04, 0.26, { y: -116 }, 'in3');
      });
      const stopAt = S + b.lines[b.lines.length - 1] + 0.1;
      shake(stopAt, 0.014);
      pop(stopAt, 0.18);
      const pay = $('e-pay'), hl = $('e-hl');
      tl.set(pay, 0, { y: 112 });
      tl.to(pay, S + b.payoff, 0.38, { y: 0 }, 'outExpo');
      tl.to(pay, S + b.out + lines.length * 0.04, 0.26, { y: -116 }, 'in3');

      // The highlighter flies to its place under the name in the final frame.
      const from = rest(hl), target = rest($('f-hl'));
      hl.style.transformOrigin = '0 0';
      tl.set(hl, 0, { sx: 0 });
      tl.to(hl, S + b.payoff + 0.08, 0.32, { sx: 1 }, 'outExpo');
      const land = S + b.out + 0.48;
      tl.to(hl, S + b.out + 0.06, 0.42, { X: (target.x - from.x) / W, Y: (target.y - from.y) / H, sx: target.w / from.w, sy: target.h / from.h }, 'inOutExpo');
      tl.set(hl, land, { o: 0 });
      tl.set($('f-hl'), 0, { o: 0 });
      tl.set($('f-hl'), land, { o: 1 });
    }

    // ---- 06 NEXT — the frame that stays: who, what, and how to reach him ----
    {
      const S = scene('next').start, b = cfg.beats.next;
      tl.to($('hud'), S, 0.2, { o: 0 }, 'linear');
      tl.set($('f-eyebrow'), 0, { clip: [0, 100, 0, 0] });
      tl.to($('f-eyebrow'), S, 0.4, { clip: [0, 0, 0, 0] }, 'outExpo');
      all(/^f-[ab]\d+$/).forEach((letter, k) => {
        tl.set(letter, 0, { y: 115 });
        tl.to(letter, S + b.name + k * 0.028, 0.5, { y: 0 }, 'back');
      });
      const portrait = $('f-portrait');
      tl.set(portrait, 0, { Y: 0.32, r: 14, o: 0 });
      tl.to(portrait, S + b.portrait, 0.9, { Y: 0, r: 3 }, 'spring');
      tl.to(portrait, S + b.portrait, 0.16, { o: 1 }, 'linear');
      tl.set($('f-status'), 0, { X: -0.04, o: 0 });
      tl.to($('f-status'), S + b.status, 0.42, { X: 0, o: 1 }, 'outExpo');
      tl.set($('f-head'), 0, { y: 30, o: 0 });
      tl.to($('f-head'), S + b.head, 0.42, { y: 0, o: 1 }, 'outExpo');
      tl.set($('f-primary'), 0, { s: 0.6, o: 0 });
      tl.to($('f-primary'), S + b.actions, 0.6, { s: 1 }, 'spring');
      tl.to($('f-primary'), S + b.actions, 0.12, { o: 1 }, 'linear');
      tl.set($('f-secondary'), 0, { X: -0.02, o: 0 });
      tl.to($('f-secondary'), S + b.actions + 0.1, 0.36, { X: 0, o: 1 }, 'outExpo');
      tl.to($('f-arrow'), S + b.nudge, 0.45, { x: [0, 45], y: [0, -45] }, 'pulse');
      tl.to($('f-arrow'), S + b.nudge + 0.9, 0.45, { x: [0, 45], y: [0, -45] }, 'pulse');
      const dot = $('f-dot');
      if (dot) tl.fn(t => { dot.style.transform = t < S ? 'none' : `scale(${(1 + 0.22 * Math.max(0, Math.sin((t - S) * 6))).toFixed(3)})`; });
      if (ctaLayer) tl.fn(t => { ctaLayer.inert = t < S + b.interactive; });
    }

    // ---- shared: scene layers, timecode, grain --------------------------------
    tl.fn(t => sceneEls.forEach(s => { if (s.el) s.el.style.visibility = t >= s.show[0] && t < s.show[1] ? 'visible' : 'hidden'; }));
    const why = scene('why');
    const hold = [why.start + cfg.beats.why.hold[0], why.start + cfg.beats.why.hold[1]];
    const frozen = t => (t >= hold[0] && t < hold[1] ? hold[0] : t);
    let lastCode = '';
    tl.fn(t => {
      const f = Math.floor(frozen(t) * cfg.fps);
      const code = `00:00:${String(Math.floor(f / cfg.fps)).padStart(2, '0')}:${String(f % cfg.fps).padStart(2, '0')}`;
      if (code !== lastCode) { timecodes.forEach(el => { el.textContent = code; }); lastCode = code; }
    });
    const grain = $('grain');
    if (grain) tl.fn(t => {
      const f = calm ? 0 : Math.floor(frozen(t) * 12);
      grain.style.transform = `translate3d(${-((f * 37) % 23)}%, ${-((f * 53) % 19)}%, 0)`;
    });
    return tl.compile();
  }

  // ---------------------------------------------------------------------------
  // PLAYER
  // ---------------------------------------------------------------------------
  const calmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let calm = calmQuery.matches;
  let tl = null, W = 0, H = 0;
  let t = calm ? D : cfg.poster;
  let playing = false, last = 0, raf = 0;
  let started = false, userPaused = false, resumeOnReturn = false;

  const icons = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h3.6v13H3zM9.4 1.5H13v13H9.4z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2V0L4.4 3.2 8 6.4V4.2a4 4 0 1 1-4 4H2a6 6 0 1 0 6-6z"/></svg>',
  };
  controls.innerHTML = `<button class="sr-ctl" type="button" data-act="toggle"></button>
    <button class="sr-ctl" type="button" data-act="replay">${icons.replay}<span class="sr-ctl-label">Replay</span></button>
    <div class="sr-chapters" role="group" aria-label="Jump to a moment in the reel">${cfg.scenes.map((s, i) => `<button class="sr-chapter" type="button" data-seek="${s.start}" aria-label="Jump to ${s.label}" style="--grow:${(s.end - s.start).toFixed(2)};--fill:${s.fill}"><span class="sr-chapter-fill"></span><span>0${i + 1} ${s.label}</span></button>`).join('')}</div>
    <span class="sr-time" aria-hidden="true"></span>`;
  const toggleBtn = controls.querySelector('[data-act="toggle"]');
  const chapterEls = [...controls.querySelectorAll('.sr-chapter')];
  const timeEl = controls.querySelector('.sr-time');
  let shownState = null;

  function ui() {
    const state = playing ? 'pause' : 'play';
    if (state !== shownState) {
      toggleBtn.innerHTML = `${icons[state]}<span class="sr-ctl-label">${playing ? 'Pause' : t >= D ? 'Play again' : 'Play'}</span>`;
      toggleBtn.setAttribute('aria-label', playing ? 'Pause showreel' : 'Play showreel');
      shownState = state;
    }
    chapterEls.forEach((el, i) => {
      const s = cfg.scenes[i];
      el.style.setProperty('--p', Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start))).toFixed(3));
    });
    timeEl.textContent = `0:${String(Math.min(D, Math.floor(t))).padStart(2, '0')} / 0:${String(D).padStart(2, '0')}`;
  }
  function render() { if (tl) tl.render(t, W, H); ui(); }
  function rebuild() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    W = w; H = h;
    tl = build(W, H, calm);
    render();
  }
  function tick(now) {
    if (!playing) return;
    t = Math.min(D, t + Math.min(0.1, (now - last) / 1000));
    last = now;
    if (t >= D) { playing = false; shownState = null; }
    render();
    if (playing) raf = requestAnimationFrame(tick);
  }
  function play() {
    if (t >= D - 0.001) t = 0;
    started = true; playing = true; userPaused = false;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    ui();
  }
  function pause() { playing = false; cancelAnimationFrame(raf); ui(); }
  function seek(time) { t = Math.max(0, Math.min(D, time)); render(); }

  toggleBtn.addEventListener('click', () => { if (playing) { pause(); userPaused = true; } else play(); });
  controls.querySelector('[data-act="replay"]').addEventListener('click', () => { seek(0); play(); });
  chapterEls.forEach(el => el.addEventListener('click', () => { seek(Number(el.dataset.seek)); if (!playing) play(); }));
  stage.addEventListener('click', event => {
    if (event.target.closest('a, button')) return;
    if (playing) { pause(); userPaused = true; } else play();
  });

  // Autoplay once, when most of the frame is on screen. Never for reduced motion.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      if (entry.intersectionRatio >= cfg.autoplayAt) {
        if (calm || userPaused) return;
        if (!started) { seek(0); play(); } else if (resumeOnReturn) { resumeOnReturn = false; play(); }
      } else if (entry.intersectionRatio < 0.2 && playing) {
        pause(); resumeOnReturn = true;
      }
    }, { threshold: [0, 0.2, cfg.autoplayAt, 1] }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { pause(); resumeOnReturn = true; }
  });
  calmQuery.addEventListener?.('change', event => { calm = event.matches; if (calm && playing) pause(); rebuild(); });

  let pending = 0;
  new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(rebuild); }).observe(stage);

  root.classList.add('sr-live');
  controls.hidden = false;
  rebuild();
  // Type metrics change once the display face loads; re-measure then.
  document.fonts?.ready.then(rebuild);

  // A handle for tuning in the console: showreel.seek(7.2)
  root.showreel = { config: cfg, play, pause, seek, get time() { return t; } };
})();
