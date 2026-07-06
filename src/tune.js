// tune.js — dev match-tuning panel. Open with ?tune=1 (any view) or
// ?snap=<trick-id>&tune=1&ghost=1 to jump straight into a match.
//
// The panel always edits the photo you are currently looking at: it
// polls the matched trick and rebinds its controls whenever you fly to
// a different one (or shows a picker while free-orbiting).
//
// Direct-manipulation controls for the match camera (position, aim, fov)
// and the world-anchored photo plane (position, tilt, size, opacity).
// The readout at the bottom is the exact match{} block for data/tricks.js:
// screenshot it or hit copy, and the values are locked in.
//
// Conventions (same as the scene): x + is the right hubba side, y is up,
// z + is toward the plaza/viewer. The fov slider keeps the photo filling
// the same screen area, so dragging it reads as "the model grows or
// shrinks behind a fixed photo" — telephoto left, wide right.

import * as THREE from 'three';
import { getMatchTune, setPhotoOpacity, orientPhotoPlane } from './tricks.js';
import { TRICKS } from '../data/tricks.js';

const CSS = `
#tune-panel{position:fixed;top:60px;right:12px;z-index:60;width:252px;
  max-height:calc(100vh - 130px);overflow-y:auto;
  background:rgba(12,12,12,.9);border:1px solid rgba(255,255,255,.22);
  border-radius:8px;padding:10px 12px;color:#eee;
  font:11px/1.5 Consolas,'Courier New',monospace}
#tune-panel .tp-title{font-weight:700;letter-spacing:.04em;color:#ffd24d;
  margin-bottom:4px;word-break:break-all}
#tune-panel .tp-sec{margin:8px 0 3px;font-weight:700;color:#8fc7ff;
  letter-spacing:.08em}
#tune-panel .tp-row{display:flex;align-items:center;gap:4px;margin:2px 0}
#tune-panel .tp-label{width:46px;opacity:.75;flex-shrink:0}
#tune-panel .tp-btn{min-width:24px;height:20px;background:#2a2a2a;
  border:1px solid #555;border-radius:4px;color:#eee;cursor:pointer;
  font:inherit;padding:0 4px}
#tune-panel .tp-btn:hover{background:#3d3d3d}
#tune-panel .tp-btn.on{background:#f2f2f2;color:#111}
#tune-panel .tp-val{flex:1;text-align:center;font-variant-numeric:tabular-nums}
#tune-panel input[type=range]{flex:1;min-width:0}
#tune-panel .tp-hint{opacity:.5;margin-left:50px}
#tune-panel .tp-pre{margin-top:8px;padding:8px;background:#000;
  border-radius:6px;white-space:pre;overflow-x:auto;user-select:all;
  color:#b6f0b6;font-size:10.5px;line-height:1.45}
#tune-panel .tp-copy{width:100%;margin-top:6px;padding:5px;background:#2a2a2a;
  border:1px solid #555;border-radius:4px;color:#eee;cursor:pointer;font:inherit}
#tune-panel .tp-copy:hover{background:#3d3d3d}
#tune-panel a{display:block;color:#8fc7ff;margin:4px 0}
`;

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

// click fires once; press-and-hold repeats
function bindHold(btn, fn) {
  let timer = null, repeat = null;
  const stop = () => { clearTimeout(timer); clearInterval(repeat); timer = repeat = null; };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    fn();
    timer = setTimeout(() => { repeat = setInterval(fn, 80); }, 350);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    btn.addEventListener(ev, stop);
  }
}

let panel = null;
let ctxRef = null;
let boundId = null;       // trick id the controls are currently wired to
let currentOpacity = 1;   // survives trick switches
let posStep = 0.05;       // survives trick switches too

export function initTune(ctx) {
  const params = new URLSearchParams(location.search);
  if (!params.get('tune')) return;
  ctxRef = ctx;
  currentOpacity = params.get('nophoto') ? 0 : params.get('ghost') ? 0.55 : 1;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  panel = el('div');
  panel.id = 'tune-panel';
  document.body.appendChild(panel);

  sync();
  setInterval(sync, 300); // follow whatever trick is matched right now
}

function sync() {
  const matched = getMatchTune();
  const id = matched && matched.plane ? matched.trick.id : null;
  if (id === boundId) return;
  boundId = id;
  panel.innerHTML = '';
  if (matched && matched.plane) buildControls(matched);
  else buildIdle();
}

function buildIdle() {
  panel.appendChild(el('div', 'tp-title', 'MATCH TUNER'));
  panel.appendChild(el('div', null, 'No matched view. Click a trick in the bar, or jump to one:'));
  for (const t of TRICKS.filter(t => t.enabled)) {
    const a = el('a', null, t.id);
    a.href = `?snap=${t.id}&tune=1&ghost=1`;
    panel.appendChild(a);
  }
}

function buildControls({ trick, plane }) {
  const cam = ctxRef.camera;
  const mesh = plane.mesh;

  // ---- live tune state for this trick ----
  const look = new THREE.Vector3(...trick.match.lookAt);
  let tilt = trick.match.photoTilt || 0;
  let H = plane.baseH * mesh.scale.x; // photo world height, m
  setPhotoOpacity(currentOpacity);

  const viewDir = () => look.clone().sub(cam.position).normalize();

  function applyCamera() {
    cam.lookAt(look);
    ctxRef.controls.target.copy(look);
    orientPhotoPlane(mesh, viewDir(), tilt); // keep the film plane parallel
    refresh();
  }

  function applyFov(f) {
    const k = Math.tan(THREE.MathUtils.degToRad(f) / 2) /
              Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    cam.fov = f;
    cam.updateProjectionMatrix();
    H *= k; // photo keeps its screen size; only the model rescales
    mesh.scale.setScalar(H / plane.baseH);
    refresh();
  }

  function applyPhoto() {
    mesh.scale.setScalar(H / plane.baseH);
    orientPhotoPlane(mesh, viewDir(), tilt);
    refresh();
  }

  // + yaw aims right, + pitch aims up; look distance stays fixed
  function rotateAim(yawDeg, pitchDeg) {
    const off = look.clone().sub(cam.position);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta -= THREE.MathUtils.degToRad(yawDeg);
    sph.phi = THREE.MathUtils.clamp(
      sph.phi - THREE.MathUtils.degToRad(pitchDeg), 0.05, Math.PI - 0.05);
    off.setFromSpherical(sph);
    look.copy(cam.position).add(off);
    applyCamera();
  }

  // ---- panel ----
  const updaters = [];

  function stepperRow(label, get, set, stepFn, dec = 3, unit = '') {
    const r = el('div', 'tp-row');
    r.appendChild(el('span', 'tp-label', label));
    const minus = el('button', 'tp-btn', '−');
    const val = el('span', 'tp-val');
    const plus = el('button', 'tp-btn', '+');
    bindHold(minus, () => set(get() - stepFn()));
    bindHold(plus, () => set(get() + stepFn()));
    updaters.push(() => { val.textContent = get().toFixed(dec) + unit; });
    r.append(minus, val, plus);
    panel.appendChild(r);
  }

  function sliderRow(label, min, max, step, get, set, dec, unit) {
    const r = el('div', 'tp-row');
    r.appendChild(el('span', 'tp-label', label));
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = get();
    input.addEventListener('input', () => set(parseFloat(input.value)));
    const val = el('span', 'tp-val');
    val.style.flex = '0 0 44px';
    updaters.push(() => { val.textContent = get().toFixed(dec) + unit; input.value = get(); });
    r.append(input, val);
    panel.appendChild(r);
  }

  panel.appendChild(el('div', 'tp-title', `MATCH TUNER — ${trick.id}`));

  panel.appendChild(el('div', 'tp-sec', 'CAMERA'));
  stepperRow('pos X', () => cam.position.x, v => { cam.position.x = v; applyCamera(); }, () => posStep);
  stepperRow('pos Y', () => cam.position.y, v => { cam.position.y = v; applyCamera(); }, () => posStep);
  stepperRow('pos Z', () => cam.position.z, v => { cam.position.z = v; applyCamera(); }, () => posStep);

  const aim = el('div', 'tp-row');
  aim.appendChild(el('span', 'tp-label', 'aim'));
  for (const [glyph, yaw, pitch] of [['←', -1, 0], ['→', 1, 0], ['↑', 0, 1], ['↓', 0, -1]]) {
    const b = el('button', 'tp-btn', glyph);
    bindHold(b, () => rotateAim(yaw * posStep * 2, pitch * posStep * 2));
    aim.appendChild(b);
  }
  panel.appendChild(aim);

  sliderRow('fov', 8, 80, 0.1, () => cam.fov, applyFov, 1, '°');
  panel.appendChild(el('div', 'tp-hint', 'telephoto ← → wide'));

  panel.appendChild(el('div', 'tp-sec', 'PHOTO'));
  stepperRow('pos X', () => mesh.position.x, v => { mesh.position.x = v; refresh(); }, () => posStep);
  stepperRow('pos Y', () => mesh.position.y, v => { mesh.position.y = v; refresh(); }, () => posStep);
  stepperRow('pos Z', () => mesh.position.z, v => { mesh.position.z = v; refresh(); }, () => posStep);
  // tilt rotates about the photo's center, so small angles barely move
  // pixels — it needs a much coarser step than aim to feel responsive
  stepperRow('tilt', () => tilt, v => { tilt = v; applyPhoto(); }, () => posStep * 10, 2, '°');
  stepperRow('size', () => H, v => { H = Math.max(0.1, v); applyPhoto(); }, () => posStep, 3, 'm');

  sliderRow('opacity', 0, 1, 0.05,
    () => currentOpacity,
    v => { currentOpacity = v; setPhotoOpacity(v); refresh(); }, 2, '');

  const stepRow = el('div', 'tp-row');
  stepRow.appendChild(el('span', 'tp-label', 'step'));
  const stepBtns = [];
  for (const s of [0.01, 0.05, 0.25]) {
    const b = el('button', 'tp-btn' + (s === posStep ? ' on' : ''), String(s));
    b.addEventListener('click', () => {
      posStep = s;
      stepBtns.forEach(x => x.classList.toggle('on', x === b));
    });
    stepBtns.push(b);
    stepRow.appendChild(b);
  }
  panel.appendChild(stepRow);

  const pre = el('pre', 'tp-pre');
  panel.appendChild(pre);
  const copy = el('button', 'tp-copy', 'copy match block');
  copy.addEventListener('click', () => {
    try {
      navigator.clipboard.writeText(pre.textContent);
      copy.textContent = 'copied ✓';
      setTimeout(() => { copy.textContent = 'copy match block'; }, 1200);
    } catch { /* clipboard unavailable — readout is selectable */ }
  });
  panel.appendChild(copy);

  const f = (n, d = 3) => parseFloat(n.toFixed(d));
  function refresh() {
    for (const u of updaters) u();
    pre.textContent =
`match: {
  cameraPos: [${f(cam.position.x)}, ${f(cam.position.y)}, ${f(cam.position.z)}],
  lookAt: [${f(look.x)}, ${f(look.y)}, ${f(look.z)}],
  fov: ${f(cam.fov, 1)},
  photoPos: [${f(mesh.position.x)}, ${f(mesh.position.y)}, ${f(mesh.position.z)}],
  photoHeight: ${f(H)},
  photoTilt: ${f(tilt, 2)},
  photo: '${trick.match.photo}',
  aspect: ${trick.match.aspect},
},`;
  }

  refresh();
}
