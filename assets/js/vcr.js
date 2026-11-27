/* Home page VCR. A three.js TV cabinet where each tape plays a portfolio page.
 *
 * Progressive enhancement only: the HTML inside [data-vcr] already holds every
 * link. This file draws the 3D cabinet over it, keeps those links as the
 * keyboard / screen-reader layer, and falls back silently if WebGL, the module
 * import, or anything else fails.
 *
 * Mobile notes: three.js loads only when the cabinet is near the viewport; the
 * scene renders on demand (a frame per change, plus a 1 Hz VCR clock blink
 * while visible), pixel ratio is capped at 2, and every texture is a small
 * canvas drawn once.
 */
const stage = document.querySelector('[data-vcr]');
const dataEl = document.getElementById('vcr-data');
if (stage && dataEl) start();

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function start() {
  if (!hasWebGL()) return;
  await new Promise(resolve => {
    if (!('IntersectionObserver' in window)) return resolve();
    const io = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { io.disconnect(); resolve(); }
    }, { rootMargin: '500px 0px' });
    io.observe(stage);
  });
  let THREE;
  try { THREE = await import('/assets/vendor/three.module.min.js'); } catch { return; }
  try {
    await Promise.race([
      Promise.all(['400 40px "Archivo Black"', '400 40px "Permanent Marker"', '700 20px "Space Grotesk"'].map(f => document.fonts.load(f))),
      wait(2500),
    ]);
  } catch { /* draw with fallbacks */ }
  try { boot(THREE, JSON.parse(dataEl.textContent)); }
  catch (err) { console.warn('VCR stayed on the HTML fallback:', err); }
}

function boot(THREE, items) {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
    del: k => { try { sessionStorage.removeItem(k); } catch { /* private mode */ } },
  };
  // The first tape gets the full show; after that the ritual speeds up.
  let speed = calm ? 0.01 : Number(store.get('vcr-plays') || 0) > 0 ? 0.6 : 1;

  /* ---------- renderer, camera, lights ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'vcr-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2c4, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-7, 24, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 20, bottom: -2, near: 1, far: 60 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  /* ---------- material + geometry helpers ---------- */
  const gradient = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const toon = (color, map = null) => new THREE.MeshToonMaterial({ color: map ? 0xffffff : color, map, gradientMap: gradient });
  const INK = new THREE.MeshBasicMaterial({ color: 0x151515, side: THREE.BackSide });
  const LINE = 0.055;
  // Every object is a box with an inverted-hull outline: the site's heavy black borders, in 3D.
  function block(w, h, d, mats, { line = LINE, cast = true } = {}) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    body.castShadow = cast;
    body.receiveShadow = true;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(w + line * 2, h + line * 2, d + line * 2), INK);
    g.add(body, hull);
    g.userData.body = body;
    return g;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function fit(ctx, text, maxW, size, family, weight = '400') {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 8);
  }
  const MARKER = '"Permanent Marker", "Archivo Black", sans-serif';
  const BLACK = '"Archivo Black", "Space Grotesk", sans-serif';
  const GROTESK = '"Space Grotesk", Arial, sans-serif';

  /* ---------- tape textures ---------- */
  function spineTex(item, { pick = false, horizontal = false } = {}) {
    const [w, h] = horizontal ? [512, 124] : [pick ? 156 : 124, 512];
    return canvasTex(w, h, (x) => {
      if (horizontal) { x.translate(0, h); x.rotate(-Math.PI / 2); }
      const W = horizontal ? h : w, H = horizontal ? w : h;
      if (pick) {
        // Rental clamshell: white plastic, printed spine art, store stickers.
        x.fillStyle = '#f3f0e6'; x.fillRect(0, 0, W, H);
        x.fillStyle = item.color; x.fillRect(12, 12, W - 24, H - 24);
        x.fillStyle = '#151515'; x.fillRect(12, 12, W - 24, 6); x.fillRect(12, H - 18, W - 24, 6);
        x.save(); x.translate(W / 2, H / 2 + 14); x.rotate(Math.PI / 2);
        fit(x, item.label, H - 190, 46, BLACK); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(item.label, 0, -8);
        x.font = `700 15px ${GROTESK}`; x.fillText(item.note.toUpperCase(), 0, 26);
        x.restore();
        // STAFF PICK sticker
        x.fillStyle = '#facc15'; x.beginPath(); x.arc(W / 2, 62, 38, 0, Math.PI * 2); x.fill();
        x.lineWidth = 4; x.strokeStyle = '#151515'; x.stroke();
        x.fillStyle = '#151515'; x.textAlign = 'center'; x.font = `400 15px ${BLACK}`; x.fillText('STAFF', W / 2, 60); x.fillText('PICK', W / 2, 77);
        // BE KIND REWIND sticker
        x.fillStyle = '#e11d48'; x.fillRect(16, H - 76, W - 32, 48);
        x.fillStyle = '#fff'; x.font = `700 13px ${GROTESK}`; x.fillText('BE KIND', W / 2, H - 56); x.fillText('REWIND', W / 2, H - 40);
        return;
      }
      // Black cassette spine with a paper label.
      x.fillStyle = '#18181b'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#26262b'; for (let y = 6; y < H; y += 9) x.fillRect(0, y, W, 1);
      const lx = 12, ly = 30, lw = W - 24, lh = H - 60;
      x.fillStyle = item.color; x.fillRect(lx, ly, lw, lh);
      x.fillStyle = 'rgba(0,0,0,.12)'; for (let y = ly + 20; y < ly + lh; y += 22) x.fillRect(lx + 6, y, lw - 12, 1.5);
      x.save(); x.translate(W / 2, H / 2); x.rotate(Math.PI / 2);
      x.fillStyle = '#151515'; x.textAlign = 'center'; x.textBaseline = 'middle';
      fit(x, item.label, lh - 70, 56, MARKER); x.fillText(item.label, 0, -10);
      x.font = `700 13px ${GROTESK}`; x.fillText(item.note.toUpperCase(), 0, 30);
      x.font = `700 12px ${GROTESK}`; x.textAlign = 'left'; x.fillText('T-120', -lh / 2 + 10, -34);
      x.restore();
    });
  }
  const cassetteTop = canvasTex(256, 420, (x, w, h) => {
    x.fillStyle = '#1b1b1f'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f3f0e6'; x.fillRect(28, 26, w - 56, 130);
    x.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 52; y < 150; y += 20) x.fillRect(40, y, w - 80, 2);
    x.fillStyle = '#0c0c0e'; x.fillRect(46, 196, w - 92, 170);
    x.strokeStyle = '#3a3a40'; x.lineWidth = 4; x.strokeRect(46, 196, w - 92, 170);
    for (const cy of [246, 318]) {
      x.fillStyle = '#5a4535'; x.beginPath(); x.arc(w / 2, cy, 30, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ddd'; x.beginPath(); x.arc(w / 2, cy, 12, 0, Math.PI * 2); x.fill();
    }
  });
  const cassetteMat = toon(0x1b1b1f);
  const clamMat = toon(0xf3f0e6);

  /* ---------- the cabinet ---------- */
  const W = 10, DEP = 4.2, SIDE = 0.34, PL = 0.28, PLINTH = 0.42, SHELF = 3.45, CUBBY = 1.72;
  const shelf2 = PLINTH;                 // floor of the staff-picks shelf
  const shelf1 = shelf2 + SHELF + PL;    // floor of the new-releases shelf
  const cubby = shelf1 + SHELF + PL;     // floor of the VCR cubby
  const cabTop = cubby + CUBBY + PL;
  const FRONT = DEP / 2;
  const cabinet = new THREE.Group();
  scene.add(cabinet);
  const wood = toon(0xfacc15), back = toon(0xffe9c9);
  const put = (obj, x, y, z) => { obj.position.set(x, y, z); cabinet.add(obj); return obj; };
  put(block(W, PLINTH, DEP, wood), 0, PLINTH / 2, 0);
  put(block(SIDE, cabTop - PLINTH, DEP, wood), -W / 2 + SIDE / 2, PLINTH + (cabTop - PLINTH) / 2, 0);
  put(block(SIDE, cabTop - PLINTH, DEP, wood), W / 2 - SIDE / 2, PLINTH + (cabTop - PLINTH) / 2, 0);
  for (const y of [shelf1 - PL, cubby - PL]) put(block(W - SIDE * 2, PL, DEP, wood), 0, y + PL / 2, 0);
  put(block(W + 0.3, PL, DEP + 0.2, wood), 0, cabTop - PL / 2, 0);
  put(block(W - SIDE * 2, cabTop - PLINTH - PL, 0.12, back, { cast: false }), 0, PLINTH + (cabTop - PLINTH - PL) / 2, -DEP / 2 + 0.06);

  // Shelf talkers
  const tag = (text, y) => {
    const t = canvasTex(400, 80, (x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#151515'; x.textAlign = 'center'; x.textBaseline = 'middle'; fit(x, text, w - 30, 40, BLACK); x.fillText(text, w / 2, h / 2 + 2);
    });
    const g = block(2.3, 0.46, 0.05, [toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0xffffff), toon(0, t), toon(0xffffff)], { line: 0.04 });
    return put(g, -W / 2 + SIDE + 1.45, y, FRONT + 0.06);
  };
  tag('NEW RELEASES', shelf1 - PL / 2 - 0.02);
  tag('STAFF PICKS', PLINTH / 2);

  // The colored hard shadow from the site's cards, behind the furniture.
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
  const cabShadow = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, cabTop), shadowMat);
  cabShadow.position.set(0.6, cabTop / 2 - 0.6, -DEP / 2 - 0.08);
  scene.add(cabShadow);

  /* ---------- VCR ---------- */
  const VW = 8.3, VH = 1.28, VD = 3.4;
  const vcrY = cubby + VH / 2 + 0.1, vcrZ = FRONT - VD / 2 - 0.12;
  const SLOT_U = 0.27, SLOT_W = 3.3, SLOT_H = 0.82;
  const vcrCanvas = document.createElement('canvas');
  vcrCanvas.width = 1024; vcrCanvas.height = 158;
  const vcrTex = new THREE.CanvasTexture(vcrCanvas);
  vcrTex.colorSpace = THREE.SRGBColorSpace;
  let vcrText = '12:00', blinkOn = true;
  function drawVCR() {
    const x = vcrCanvas.getContext('2d'), w = vcrCanvas.width, h = vcrCanvas.height;
    x.fillStyle = '#1e1d22'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2a2930'; x.fillRect(0, h - 26, w, 26);
    const sw = w * (SLOT_W / VW), sx = w * SLOT_U - sw / 2, sh = h * (SLOT_H / VH), sy = h / 2 - sh / 2 - 6;
    x.fillStyle = '#060607'; x.fillRect(sx - 8, sy - 8, sw + 16, sh + 16);
    x.fillStyle = '#9b9aa3'; x.font = `700 15px ${GROTESK}`; x.textAlign = 'left'; x.fillText('4-HEAD HI-FI STEREO', 26, h - 8);
    // display
    const dx = w * 0.6, dw = w * 0.2;
    x.fillStyle = '#071612'; x.fillRect(dx, 34, dw, 70);
    x.fillStyle = '#5eead4'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 44px ui-monospace, "SFMono-Regular", Menlo, monospace`;
    if (vcrText !== '12:00' || blinkOn) x.fillText(vcrText, dx + dw / 2, 70);
    // buttons
    const labels = ['⏏', '◀◀', '▶', '▶▶', '■'];
    labels.forEach((l, i) => {
      const bx = w * 0.825 + i * 34, by = 46;
      x.fillStyle = '#3a3942'; x.fillRect(bx, by, 28, 44);
      x.fillStyle = '#cfcfd6'; x.font = `700 13px ${GROTESK}`; x.fillText(l, bx + 14, by + 22);
    });
    vcrTex.needsUpdate = true;
  }
  drawVCR();
  const vcrBodyMat = toon(0x1e1d22);
  const vcr = block(VW, VH, VD, [vcrBodyMat, vcrBodyMat, vcrBodyMat, vcrBodyMat, toon(0, vcrTex), vcrBodyMat]);
  put(vcr, 0, vcrY, vcrZ);
  const slot = new THREE.Vector3(-VW / 2 + VW * SLOT_U, vcrY - 0.04, vcrZ + VD / 2);
  const flapPivot = new THREE.Group();
  flapPivot.position.set(slot.x, slot.y + SLOT_H / 2, slot.z + 0.03);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(SLOT_W, SLOT_H, 0.04), toon(0x0b0b0d));
  flap.position.y = -SLOT_H / 2;
  flapPivot.add(flap);
  cabinet.add(flapPivot);

  /* ---------- TV ---------- */
  const TW = 8.4, TH = 5.05, TD = 4.0;
  const tvY = cabTop + TH / 2;
  const tvFront = canvasTex(512, 308, (x, w, h) => {
    x.fillStyle = '#ece4cf'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#d9cfb5'; for (let y = 40; y < h - 60; y += 12) x.fillRect(w - 92, y, 64, 5);
    x.fillStyle = '#151515'; x.font = `400 18px ${BLACK}`; x.textAlign = 'center'; x.fillText('NOBODY', w - 60, h - 26);
  });
  const beige = toon(0xece4cf);
  put(block(TW, TH, TD, [beige, beige, beige, beige, toon(0, tvFront), beige]), 0, tvY, -0.1);
  const SCR_W = 6.0, SCR_H = 4.15, SCR_X = -0.75;
  put(block(SCR_W + 0.36, SCR_H + 0.36, 0.14, toon(0x232228), { line: 0.04 }), SCR_X, tvY + 0.05, -0.1 + TD / 2 + 0.05);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512; screenCanvas.height = 354;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenGeo = new THREE.PlaneGeometry(SCR_W, SCR_H, 16, 12);
  const pos = screenGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (SCR_W / 2), v = pos.getY(i) / (SCR_H / 2);
    pos.setZ(i, 0.16 * (1 - u * u * 0.9) * (1 - v * v * 0.9)); // a little CRT bulge
  }
  screenGeo.computeVertexNormals();
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
  put(screen, SCR_X, tvY + 0.05, -0.1 + TD / 2 + 0.13);
  for (const [y, c] of [[0.95, 0xd946ef], [-0.05, 0x22d3ee]]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), toon(c));
    knob.rotation.x = Math.PI / 2;
    put(knob, TW / 2 - 0.95, tvY + y, -0.1 + TD / 2 + 0.1);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 20), INK);
    ring.rotation.x = Math.PI / 2;
    put(ring, TW / 2 - 0.95, tvY + y, -0.1 + TD / 2 + 0.09);
  }
  const tvShadow = new THREE.Mesh(new THREE.PlaneGeometry(TW, TH), shadowMat);
  tvShadow.position.set(0.5, tvY - 0.5, -0.1 - TD / 2 - 0.08);
  scene.add(tvShadow);
  // rabbit ears
  put(block(1.3, 0.3, 0.9, toon(0x232228), { line: 0.04 }), 0.4, cabTop + TH + 0.15, -0.4);
  for (const side of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8), new THREE.MeshBasicMaterial({ color: 0x151515 }));
    rod.position.set(0.4 + side * 0.62, cabTop + TH + 1.1, -0.4);
    rod.rotation.z = -side * 0.55;
    cabinet.add(rod);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x151515 }));
    tip.position.set(0.4 + side * 1.2, cabTop + TH + 2.0, -0.4);
    cabinet.add(tip);
  }

  /* ---------- screen drawing ---------- */
  const sctx = screenCanvas.getContext('2d');
  const SW = screenCanvas.width, SH = screenCanvas.height;
  function crt() {
    sctx.fillStyle = 'rgba(0,0,0,.13)';
    for (let y = 0; y < SH; y += 3) sctx.fillRect(0, y, SW, 1);
    const g = sctx.createRadialGradient(SW / 2, SH / 2, SH * 0.35, SW / 2, SH / 2, SW * 0.68);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    sctx.fillStyle = g; sctx.fillRect(0, 0, SW, SH);
    screenTex.needsUpdate = true;
  }
  function osd(text, x, y, align = 'left') {
    sctx.font = `700 22px ui-monospace, Menlo, monospace`; sctx.textAlign = align; sctx.textBaseline = 'top';
    sctx.fillStyle = '#000'; sctx.fillText(text, x + 2, y + 2);
    sctx.fillStyle = '#fff'; sctx.fillText(text, x, y);
  }
  function wrap(text, maxW, font) {
    sctx.font = font;
    const words = text.split(' '), lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (sctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawIdle() {
    sctx.fillStyle = '#2440c4'; sctx.fillRect(0, 0, SW, SH);
    osd('VIDEO 1', 28, 24);
    sctx.fillStyle = '#fff'; sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
    sctx.font = `400 46px ${BLACK}`; sctx.fillText('PICK A TAPE', SW / 2, SH / 2 - 8);
    sctx.font = `700 19px ${GROTESK}`; sctx.fillText('▼  from the shelf below', SW / 2, SH / 2 + 38);
    crt();
  }
  function drawTitle(item) {
    sctx.fillStyle = item.color; sctx.fillRect(0, 0, SW, SH);
    sctx.fillStyle = '#151515'; sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
    fit(sctx, item.title.toUpperCase(), SW - 80, 54, BLACK);
    sctx.fillText(item.title.toUpperCase(), SW / 2, SH / 2 - 40);
    const lines = wrap(item.headline, SW - 100, `700 22px ${GROTESK}`);
    lines.slice(0, 3).forEach((l, i) => sctx.fillText(l, SW / 2, SH / 2 + 14 + i * 28));
    osd('▶ PLAY', 28, 24);
    osd('SP  0:00:01', SW - 28, SH - 48, 'right');
    crt();
  }
  function drawStatic(t) {
    const img = noise.getContext('2d').createImageData(128, 88);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    noise.getContext('2d').putImageData(img, 0, 0);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(noise, 0, 0, SW, SH);
    const band = (t * 1.7 % 1) * SH;
    sctx.fillStyle = 'rgba(255,255,255,.22)'; sctx.fillRect(0, band, SW, 26);
    crt();
  }
  const noise = document.createElement('canvas');
  noise.width = 128; noise.height = 88;
  function drawQuote(item, k) {
    sctx.fillStyle = '#0b0b0d'; sctx.fillRect(0, 0, SW, SH);
    const text = item.headline.slice(0, Math.round(item.headline.length * k));
    const lines = wrap(`“${text}${k >= 1 ? '”' : ''}`, SW - 90, `700 27px ${GROTESK}`);
    sctx.fillStyle = '#fff'; sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
    const top = SH / 2 - (lines.length * 34) / 2 - 12;
    lines.forEach((l, i) => sctx.fillText(l, SW / 2, top + i * 34));
    if (k >= 1) { sctx.font = `700 18px ${GROTESK}`; sctx.fillStyle = '#facc15'; sctx.fillText('— Sir Ken Robinson', SW / 2, top + lines.length * 34 + 16); }
    osd('▶ PLAY', 28, 24);
    crt();
  }
  drawIdle();

  /* ---------- tapes ---------- */
  const TAPE = { T: 0.7, H: 2.85, D: 1.8 }, CASE = { T: 0.9, H: 3.0, D: 1.95 };
  const objects = [];
  const pickables = [];
  let x1 = -W / 2 + SIDE + 0.32, x2 = x1;
  for (const item of items) {
    let g, size;
    if (item.kind === 'card') {
      const cardTex = canvasTex(512, 322, (x, w, h) => {
        x.fillStyle = '#facc15'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#151515'; x.fillRect(0, 0, w, 70);
        x.fillStyle = '#facc15'; x.font = `400 34px ${BLACK}`; x.textBaseline = 'middle'; x.fillText('MEMBERSHIP', 26, 37);
        x.fillStyle = '#151515'; x.font = `400 40px ${BLACK}`; x.fillText('BEN CAMPBELL', 26, 122);
        x.font = `700 24px ${GROTESK}`; x.fillText('Résumé + contact  →', 26, 172);
        x.font = `700 17px ${GROTESK}`; x.fillText('NO LATE FEES', 26, 286);
        for (let i = 0; i < 46; i++) if (Math.sin(i * 12.9) > -0.2) x.fillRect(250 + i * 5, 222, i % 3 ? 2 : 4, 74);
      });
      const white = toon(0xfacc15);
      g = block(2.75, 1.74, 0.07, [white, white, white, white, toon(0, cardTex), white], { line: 0.04 });
      g.rotation.x = -0.1;
      const stand = block(1.2, 0.32, 0.62, toon(0x232228), { line: 0.04 });
      stand.position.set(W / 2 - SIDE - 1.75, shelf1 + 0.16, FRONT - 0.85);
      cabinet.add(stand);
      g.position.set(W / 2 - SIDE - 1.75, shelf1 + 0.32 + 0.82, FRONT - 0.85);
      size = { T: 2.75, H: 1.74, D: 0.07 };
    } else {
      const pick = item.kind === 'pick';
      size = pick ? CASE : TAPE;
      const spine = toon(0, spineTex(item, { pick }));
      const side = pick ? clamMat : toon(0, cassetteTop);
      const mats = [side, side, pick ? clamMat : cassetteMat, pick ? clamMat : cassetteMat, spine, pick ? clamMat : cassetteMat];
      g = block(size.T, size.H, size.D, mats);
      const floor = item.shelf === 1 ? shelf1 : shelf2;
      const xs = item.shelf === 1 ? x1 : x2;
      g.position.set(xs + size.T / 2, floor + size.H / 2 + 0.01, FRONT - size.D / 2 - 0.22);
      if (item.kind === 'quote') { g.rotation.z = 0.12; g.position.x += 0.2; g.position.y -= 0.02; }
      if (item.shelf === 1) x1 += size.T + 0.1; else x2 += size.T + 0.12;
    }
    cabinet.add(g);
    g.userData.body.userData.item = item;
    pickables.push(g.userData.body);
    objects.push({ item, g, size, home: { p: g.position.clone(), q: g.quaternion.clone() }, out: 0 });
  }
  // A few blank tapes lying on the staff-picks shelf, just for the room.
  ['TAPED OFF TV', 'CARTOONS', "DON'T ERASE"].forEach((label, i) => {
    const tex = spineTex({ label, note: 'SP', color: ['#ffffff', '#fde68a', '#bae6fd'][i] }, { horizontal: true });
    const m = toon(0, tex);
    const g = block(TAPE.H, TAPE.T, TAPE.D, [cassetteMat, cassetteMat, toon(0, cassetteTop), cassetteMat, m, cassetteMat]);
    g.position.set(W / 2 - SIDE - TAPE.H / 2 - 0.35 + (i === 1 ? -0.12 : 0), shelf2 + TAPE.T / 2 + i * (TAPE.T + 0.11) + 0.01, FRONT - TAPE.D / 2 - 0.3);
    g.rotation.y = i === 1 ? 0.05 : -0.03;
    cabinet.add(g);
  });

  /* ---------- camera fit + render loop ---------- */
  const BOX = { x0: -W / 2 - 0.2, x1: W / 2 + 0.7, y0: -0.6, y1: cabTop + TH + 2.15 };
  const center = new THREE.Vector3((BOX.x0 + BOX.x1) / 2, (BOX.y0 + BOX.y1) / 2, 0);
  function layout() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((BOX.y1 - BOX.y0) / 2 / t, (BOX.x1 - BOX.x0) / 2 / (t * camera.aspect)) * 1.02 + FRONT;
    camera.position.set(center.x - 0.4, center.y + 2.2, dist);
    camera.lookAt(center.x, center.y - 0.1, 0);
    camera.updateProjectionMatrix();
    sun.target.position.copy(center);
    render();
  }
  let frame = 0;
  const tweens = new Set();
  let staticUntil = 0;
  function render() { renderer.render(scene, camera); }
  function kick() { if (!frame) frame = requestAnimationFrame(loop); }
  function loop(now) {
    frame = 0;
    for (const tw of [...tweens]) {
      const p = Math.min(1, (now - tw.t0) / tw.ms);
      tw.fn(tw.ease(p));
      if (p >= 1) { tweens.delete(tw); tw.done(); }
    }
    if (now < staticUntil) drawStatic(now / 1000);
    render();
    if (tweens.size || now < staticUntil) kick();
  }
  const ease = {
    out: p => 1 - (1 - p) ** 3,
    in: p => p ** 3,
    inOut: p => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  };
  const tween = (ms, fn, e = ease.inOut) => new Promise(done => {
    const duration = Math.max(1, ms * speed);
    tweens.add({ t0: performance.now(), ms: duration, fn, ease: e, done });
    kick();
  });
  const pause = ms => new Promise(r => setTimeout(r, ms * speed));
  new ResizeObserver(layout).observe(stage);
  layout();

  /* ---------- states ---------- */
  let busy = false, playing = null, hovered = null, visible = true;
  const byId = Object.fromEntries(objects.map(o => [o.item.id, o]));
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  const frontOfSlot = o => new THREE.Vector3(slot.x, slot.y, slot.z + o.size.D / 2 + 0.45);
  const insideSlot = o => new THREE.Vector3(slot.x, slot.y, slot.z - o.size.D / 2 - 0.2);

  function setHover(o) {
    if (busy || hovered === o) return;
    const prev = hovered;
    hovered = o;
    stage.classList.toggle('is-hover', !!o);
    if (prev && prev.item.kind !== 'card') tween(160, k => { prev.out = prev.out * (1 - k); prev.g.position.z = prev.home.p.z + prev.out; }, ease.out);
    if (o && o.item.kind !== 'card') { const start = o.out; tween(160, k => { o.out = start + (0.42 - start) * k; o.g.position.z = o.home.p.z + o.out; }, ease.out); }
  }
  const flapTo = (angle, ms) => { const a0 = flapPivot.rotation.x; return tween(ms, k => { flapPivot.rotation.x = a0 + (angle - a0) * k; }); };
  const setVCR = text => { vcrText = text; drawVCR(); kick(); };

  async function insert(o) {
    const g = o.g;
    const p0 = g.position.clone();
    await tween(190, k => { g.position.z = p0.z + 1.4 * k; }, ease.out);
    const p1 = g.position.clone(), q1 = g.quaternion.clone(), target = frontOfSlot(o);
    await tween(560, k => {
      g.position.lerpVectors(p1, target, k);
      g.position.y += Math.sin(k * Math.PI) * 1.1;
      g.quaternion.slerpQuaternions(q1, qFlat, k);
    });
    const p2 = g.position.clone(), inside = insideSlot(o);
    flapTo(-1.35, 160);
    await tween(330, k => g.position.lerpVectors(p2, inside, k), ease.in);
    g.visible = false;
    flapTo(0, 160);
    setVCR('PLAY');
  }
  async function eject(o) {
    busy = true;
    const g = o.g;
    g.quaternion.copy(qFlat);
    g.position.copy(insideSlot(o));
    g.visible = true;
    setVCR('EJCT');
    await flapTo(-1.35, 140);
    const p0 = g.position.clone(), front = frontOfSlot(o);
    await tween(300, k => g.position.lerpVectors(p0, front, k), ease.out);
    flapTo(0, 160);
    const p1 = g.position.clone(), lifted = o.home.p.clone().add(new THREE.Vector3(0, 0, 1.4));
    await tween(540, k => {
      g.position.lerpVectors(p1, lifted, k);
      g.position.y += Math.sin(k * Math.PI) * 1.1;
      g.quaternion.slerpQuaternions(qFlat, o.home.q, k);
    });
    const p2 = g.position.clone();
    await tween(200, k => g.position.lerpVectors(p2, o.home.p, k), ease.out);
    o.out = 0;
    drawIdle();
    setVCR('12:00');
    playing = null;
    busy = false;
  }
  function screenRect() {
    const r = canvas.getBoundingClientRect();
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const v = new THREE.Vector3(SCR_X + sx * SCR_W / 2, tvY + 0.05 + sy * SCR_H / 2, -0.1 + TD / 2 + 0.13).project(camera);
      return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
    });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  async function takeover(item) {
    const rect = screenRect();
    const ov = document.createElement('div');
    ov.className = 'vcr-takeover';
    const copy = document.createElement('canvas');
    copy.width = SW; copy.height = SH;
    copy.getContext('2d').drawImage(screenCanvas, 0, 0);
    ov.append(copy);
    document.body.append(ov);
    const from = `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / innerWidth}, ${rect.height / innerHeight})`;
    await ov.animate([{ transform: from, borderRadius: '24px' }, { transform: 'none', borderRadius: '0px' }], { duration: 460 * speed, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' }).finished;
    ov.classList.add('flash');
    await pause(170);
    location.assign(item.url);
  }
  const ejectBtn = stage.querySelector('.vcr-eject');

  async function play(o) {
    if (busy) return;
    const item = o.item;
    if (calm && item.kind !== 'quote' && item.kind !== 'card') { location.assign(item.url); return; }
    busy = true;
    hovered = null;
    stage.classList.remove('is-hover');
    if (item.kind === 'card') {
      const y0 = o.g.position.y;
      await tween(320, k => { o.g.position.y = y0 + Math.sin(k * Math.PI) * 0.6; o.g.rotation.y = Math.sin(k * Math.PI * 2) * 0.25; });
      busy = false;
      document.getElementById('contact')?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
      return;
    }
    playing = o;
    store.set('vcr-plays', String(Number(store.get('vcr-plays') || 0) + 1));
    if (item.kind !== 'quote') {
      const pre = document.createElement('link');
      pre.rel = 'prefetch'; pre.href = item.url;
      document.head.append(pre);
    }
    await insert(o);
    staticUntil = performance.now() + 380 * speed;
    kick();
    await pause(400);
    if (item.kind === 'quote') {
      await tween(1500, k => drawQuote(item, k), p => p);
      ejectBtn.hidden = false;
      ejectBtn.focus({ preventScroll: true });
      busy = false;
      return;
    }
    drawTitle(item);
    kick();
    await pause(480);
    store.set('vcr-last', item.id);
    await takeover(item);
  }

  /* ---------- input ---------- */
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? byId[hit.object.userData.item.id] : null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', ev => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', ev => {
    if (!down) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y), quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 10 || !quick) return;
    if (playing && playing.item.kind === 'quote' && !busy) { ejectQuote(); return; }
    const o = pick(ev);
    if (o) play(o);
  });
  canvas.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') setHover(pick(ev)); });
  canvas.addEventListener('pointerleave', () => setHover(null));
  function ejectQuote() {
    ejectBtn.hidden = true;
    const o = playing;
    eject(o).then(() => stage.querySelector(`[data-id="${o.item.id}"]`)?.focus({ preventScroll: true }));
  }
  ejectBtn.addEventListener('click', ejectQuote);
  // The HTML links are still the keyboard layer: focus pulls a tape out, Enter plays it.
  stage.querySelectorAll('.tape-link').forEach(link => {
    const o = byId[link.dataset.id];
    if (!o) return;
    link.addEventListener('focus', () => setHover(o));
    link.addEventListener('blur', () => setHover(null));
    link.addEventListener('click', ev => { ev.preventDefault(); play(o); });
  });

  // Pause the clock when the cabinet is off screen.
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(stage);
  setInterval(() => {
    if (!visible || busy || playing || document.hidden) return;
    blinkOn = !blinkOn;
    drawVCR();
    kick();
  }, 1000);

  /* ---------- coming back from a page ---------- */
  function returning() {
    const ejected = store.get('vcr-return');
    const last = store.get('vcr-last');
    store.del('vcr-return');
    store.del('vcr-last');
    if (ejected && byId[ejected]) return byId[ejected];
    // Browser back button: only eject if we really came from that tape's page.
    if (last && byId[last] && document.referrer) {
      try { if (new URL(document.referrer).pathname === new URL(byId[last].item.url, location.href).pathname) return byId[last]; } catch { /* ignore */ }
    }
    return null;
  }
  function ejectOnReturn(o) {
    if (!o || o.item.kind === 'card' || o.item.kind === 'quote') return;
    busy = true;
    o.g.visible = false;
    drawTitle(o.item);
    setVCR('PLAY');
    render();
    // Wait until the cabinet is actually on screen (the #tv jump may still be scrolling).
    const go = () => setTimeout(() => eject(o), calm ? 0 : 350);
    const seen = new IntersectionObserver(entries => {
      if (entries[0].intersectionRatio >= 0.45) { seen.disconnect(); go(); }
    }, { threshold: [0, 0.45, 1] });
    seen.observe(stage);
  }
  window.addEventListener('pageshow', ev => {
    if (!ev.persisted) return;
    document.querySelectorAll('.vcr-takeover').forEach(el => el.remove());
    const o = playing;
    store.del('vcr-last');
    if (o) { playing = null; busy = false; ejectOnReturn(o); }
  });

  stage.classList.add('is-3d');
  render();
  ejectOnReturn(returning());
}
