/* Home page video-store wall: tap a cover and it plays.
 *
 * Every cover is already a plain link to a real page, so without this script
 * (or with reduced motion, or a modifier-click) the links just work. With it:
 * the case opens, a VCR slides up from the bottom of the screen, the tape goes
 * in, your screen becomes the TV (static, then a title card), and the page loads.
 * The "⏏ Eject" link on each portfolio page brings you back and the tape pops
 * out of the VCR into its case. Only transforms and opacity animate.
 */
(() => {
  const wall = document.querySelector('.wall');
  if (!wall || !Element.prototype.animate) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
    del: k => { try { sessionStorage.removeItem(k); } catch { /* private mode */ } },
  };
  // First play gets the full ritual; after that it speeds up.
  const speed = () => (Number(store.get('vcr-plays') || 0) > 1 ? 0.6 : 1);
  const wait = n => new Promise(r => setTimeout(r, n * speed()));
  const run = (el, frames, duration, easing = 'cubic-bezier(.45,0,.2,1)') =>
    el.animate(frames, { duration: duration * speed(), easing, fill: 'forwards' }).finished;

  /* ---- the deck ---- */
  const deck = document.createElement('div');
  deck.className = 'vcr-deck';
  deck.setAttribute('aria-hidden', 'true');
  deck.innerHTML = '<div class="vcr-body"><span class="vcr-slot"></span><span class="vcr-clock blink">12:00</span><span class="vcr-btns">⏏ ◀◀ ▶ ▶▶ ■</span></div>';
  document.body.append(deck);
  const clock = deck.querySelector('.vcr-clock');
  const slot = deck.querySelector('.vcr-slot');
  const DOWN = 'translate(-50%, 160%)', UP = 'translate(-50%, 0)';
  const deckUp = () => run(deck, [{ transform: DOWN }, { transform: UP }], 380, 'cubic-bezier(.2,.8,.2,1)');
  const deckDown = () => run(deck, [{ transform: UP }, { transform: DOWN }], 300, 'ease-in');
  const setClock = (text, blink = false) => { clock.textContent = text; clock.classList.toggle('blink', blink); };

  /* ---- the case ---- */
  async function openCase(cover) {
    const front = cover.querySelector('.vhs-front');
    await run(front, [{ transform: 'translateZ(2px) rotateY(0deg)' }, { transform: 'translateZ(2px) rotateY(-90deg)' }], 190, 'ease-in');
    front.classList.add('flipped');
    await run(front, [{ transform: 'translateZ(2px) rotateY(-90deg)' }, { transform: 'translateZ(2px) rotateY(-158deg)' }], 230, 'ease-out');
  }
  async function closeCase(cover) {
    const front = cover.querySelector('.vhs-front');
    await run(front, [{ transform: 'translateZ(2px) rotateY(-158deg)' }, { transform: 'translateZ(2px) rotateY(-90deg)' }], 200, 'ease-in');
    front.classList.remove('flipped');
    await run(front, [{ transform: 'translateZ(2px) rotateY(-90deg)' }, { transform: 'translateZ(2px) rotateY(0deg)' }], 200, 'ease-out');
    front.getAnimations().forEach(a => a.cancel());
  }
  function setOpen(cover) {
    const front = cover.querySelector('.vhs-front');
    front.classList.add('flipped');
    front.animate([{ transform: 'translateZ(2px) rotateY(-158deg)' }], { duration: 0, fill: 'forwards' });
  }

  /* ---- the tape: a fixed-position copy that flies between case and slot ---- */
  function lift(cover) {
    const real = cover.querySelector('.vhs-tape');
    const r = real.getBoundingClientRect();
    const fly = real.cloneNode(true);
    fly.classList.add('flying-tape');
    fly.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    // Keep container-query sizing identical to the cover it came from.
    fly.style.setProperty('--c', getComputedStyle(cover).getPropertyValue('--c'));
    document.body.append(fly);
    real.style.visibility = 'hidden';
    return { fly, real, r };
  }
  // Transforms for the copy, relative to where it started (the tape well).
  // Edge-on, the tape shrinks to exactly the slot's size, so it can slide in
  // and disappear instead of sticking out past the deck.
  function poses(r) {
    const s = slot.getBoundingClientRect(), deckTop = deck.getBoundingClientRect().top;
    const barW = s.width * 0.96, barH = Math.max(10, s.height * 0.9);
    const sa = barH / r.width, sb = barW / r.height;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = s.left + s.width / 2 - cx;
    const pose = (y, fa = 1, fb = 1) => `translate(${dx}px, ${y}px) rotate(-90deg) scale(${sa * fa}, ${sb * fb})`;
    const slotY = s.top + s.height / 2 - cy;
    return { above: pose(deckTop - barH / 2 - 18 - cy), at: pose(slotY), inside: pose(slotY, 0.9, 0.94) };
  }
  async function insert(t) {
    const p = poses(t.r);
    await run(t.fly, [{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.04)', offset: 0.2 }, { transform: p.above }], 560);
    await run(t.fly, [{ transform: p.above, opacity: 1 }, { transform: p.at, opacity: 1, offset: 0.65 }, { transform: p.inside, opacity: 0 }], 300, 'ease-in');
  }
  async function eject(t) {
    const p = poses(t.r);
    await run(t.fly, [{ transform: p.inside, opacity: 0 }, { transform: p.at, opacity: 1, offset: 0.35 }, { transform: p.above, opacity: 1 }], 320, 'cubic-bezier(.2,.8,.2,1)');
    await run(t.fly, [{ transform: p.above }, { transform: 'translateY(-14px) scale(1.04)', offset: 0.8 }, { transform: 'none' }], 540);
    t.real.style.visibility = '';
    t.fly.remove();
  }

  /* ---- your screen is the TV ---- */
  function screen(cover, { quote = false } = {}) {
    const el = document.createElement('div');
    el.className = `vcr-screen${quote ? ' quote' : ''}`;
    el.style.setProperty('--c', getComputedStyle(cover).getPropertyValue('--c'));
    const title = cover.dataset.title || '', tagline = cover.dataset.tagline || '';
    el.innerHTML = `<canvas width="160" height="100"></canvas><div class="vcr-card"></div><span class="vcr-osd tl">▶ PLAY</span><span class="vcr-osd br">SP 0:00:01</span>`;
    const card = el.querySelector('.vcr-card');
    if (quote) {
      card.innerHTML = '<blockquote></blockquote><cite>— Sir Ken Robinson</cite>';
    } else {
      const b = document.createElement('b'); b.textContent = title;
      const s = document.createElement('span'); s.textContent = tagline;
      card.append(b, s);
    }
    document.body.append(el);
    return el;
  }
  function staticNoise(el, ms) {
    const c = el.querySelector('canvas'), x = c.getContext('2d');
    const img = x.createImageData(c.width, c.height);
    const end = performance.now() + ms * speed();
    return new Promise(done => {
      const tick = now => {
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        const band = ((now / 6) % c.height) | 0;
        x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, band, c.width, 9);
        if (now < end) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---- play ---- */
  let busy = false, playing = null;
  async function play(cover) {
    if (busy) return;
    busy = true;
    store.set('vcr-plays', String(Number(store.get('vcr-plays') || 0) + 1));
    const url = cover.getAttribute('href');
    const pre = document.createElement('link');
    pre.rel = 'prefetch'; pre.href = url;
    document.head.append(pre);
    const up = deckUp();
    await openCase(cover);
    const t = lift(cover);
    await up;
    await insert(t);
    setClock('PLAY');
    await wait(160);
    const el = screen(cover);
    await staticNoise(el, 420);
    el.classList.add('card-on');
    await wait(620);
    const flash = document.createElement('div');
    flash.className = 'vcr-flash';
    document.body.append(flash);
    await run(flash, [{ opacity: 0 }, { opacity: 1 }], 170, 'ease-out');
    playing = { cover, t };
    store.set('vcr-last', cover.dataset.tape);
    location.assign(url);
  }

  async function playQuote(cover) {
    if (busy) return;
    busy = true;
    const up = deckUp();
    await openCase(cover);
    const t = lift(cover);
    await up;
    await insert(t);
    setClock('PLAY');
    await wait(160);
    const el = screen(cover, { quote: true });
    await staticNoise(el, 380);
    el.classList.add('card-on');
    const q = el.querySelector('blockquote'), text = cover.dataset.quote || '';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vcr-eject'; btn.textContent = '⏏ Eject';
    el.append(btn);
    let done = false;
    const close = async () => {
      if (done) return;
      done = true;
      removeEventListener('keydown', onKey);
      await run(el, [{ opacity: 1 }, { opacity: 0 }], 200, 'ease-out');
      el.remove();
      setClock('EJCT');
      await eject(t);
      await Promise.all([closeCase(cover), deckDown()]);
      setClock('12:00', true);
      busy = false;
      cover.focus({ preventScroll: true });
    };
    const onKey = ev => { if (ev.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    btn.addEventListener('click', close);
    btn.focus({ preventScroll: true });
    for (let i = 1; i <= text.length; i++) { if (done) break; q.textContent = `“${text.slice(0, i)}`; await new Promise(r => setTimeout(r, calm ? 0 : 22)); }
    if (!done) { q.textContent = `“${text}”`; el.querySelector('cite').classList.add('on'); }
  }

  wall.addEventListener('click', ev => {
    const blank = ev.target.closest('button.vhs.blank');
    if (blank) { playQuote(blank); return; }
    const cover = ev.target.closest('a.vhs');
    if (!cover || calm || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    play(cover);
  });

  // A small tilt toward the pointer on desktop.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !calm) {
    wall.addEventListener('pointermove', ev => {
      const cover = ev.target.closest('.vhs');
      if (!cover || busy) return;
      const r = cover.getBoundingClientRect();
      cover.style.setProperty('--ry', `${((ev.clientX - r.left) / r.width - 0.5) * 14}deg`);
      cover.style.setProperty('--rx', `${(0.5 - (ev.clientY - r.top) / r.height) * 10}deg`);
    });
    wall.addEventListener('pointerout', ev => {
      const cover = ev.target.closest('.vhs');
      if (cover && !cover.contains(ev.relatedTarget)) { cover.style.removeProperty('--rx'); cover.style.removeProperty('--ry'); }
    });
  }

  /* ---- coming back ---- */
  function returning() {
    const ejected = store.get('vcr-return'), last = store.get('vcr-last');
    store.del('vcr-return'); store.del('vcr-last');
    const find = id => id && wall.querySelector(`a.vhs[data-tape="${CSS.escape(id)}"]`);
    if (find(ejected)) return find(ejected);
    // Browser back button: only if we really came from that tape's page.
    const cover = find(last);
    if (cover && document.referrer) {
      try { if (new URL(document.referrer).pathname === new URL(cover.href).pathname) return cover; } catch { /* ignore */ }
    }
    return null;
  }
  function ejectOnReturn(cover) {
    if (!cover || calm) return;
    busy = true;
    const rack = cover.closest('.rack');
    const left = cover.closest('li').offsetLeft - (rack.clientWidth - cover.clientWidth) / 2;
    rack.scrollTo({ left, behavior: 'instant' });
    const seen = new IntersectionObserver(async entries => {
      if (entries[0].intersectionRatio < 0.6) return;
      seen.disconnect();
      setOpen(cover);
      deck.animate([{ transform: UP }], { duration: 0, fill: 'forwards' });
      const t = lift(cover);
      t.fly.animate([{ transform: poses(t.r).inside, opacity: 0 }], { duration: 0, fill: 'forwards' });
      setClock('EJCT');
      await wait(380);
      await eject(t);
      await Promise.all([closeCase(cover), deckDown()]);
      setClock('12:00', true);
      busy = false;
    }, { threshold: [0, 0.6, 1] });
    seen.observe(cover);
  }
  addEventListener('pageshow', ev => {
    if (!ev.persisted) return;
    // Back from the bfcache: clear the takeover and pop the tape back out.
    document.querySelectorAll('.vcr-screen, .vcr-flash').forEach(el => el.remove());
    store.del('vcr-last');
    if (!playing) return;
    const { cover, t } = playing;
    playing = null;
    t.fly.remove();
    t.real.style.visibility = '';
    cover.querySelector('.vhs-front').classList.remove('flipped');
    cover.querySelector('.vhs-front').getAnimations().forEach(a => a.cancel());
    deck.getAnimations().forEach(a => a.cancel());
    setClock('12:00', true);
    busy = false;
    ejectOnReturn(cover);
  });
  ejectOnReturn(returning());
})();
