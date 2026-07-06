// tricks.js — trick selection and the fly-to-photographer camera match.
//
// One-step interaction: click a trick in the bottom bar → the camera flies
// to the photographer's position and the original photo lands 1:1 over
// the model. Back button returns to free orbit.
//
// Modes: 'free' (orbit) → 'flying' (tween to match) → 'matched' (photo
// overlay up, controls locked) → 'returning' (tween home) → 'free'.

import * as THREE from 'three';
import { initTrickBar, setActiveTrick, showMatchOverlay, hideMatchOverlay, placeholderPhotoCanvas } from './ui.js';
import { TRICKS } from '../data/tricks.js';

const state = {
  mode: 'free',
  tricks: [],
  tween: null,
  saved: null, // camera state to restore on back
  roll: 0,
  ctx: null,
  planes: new Map(), // trick id -> { mesh, mat, baseH }
  activePlane: null, // the plane currently fading toward visible
  fading: [],        // planes on their way out after a trick switch
  matchedTrick: null, // the trick the camera is (or is flying) matched to
  ghost: false,
  opacityOverride: null, // tune tool's photo opacity slider
};

// Orient a photo plane like the photographer's film: parallel to the
// match camera's sensor (normal pointing back along the view axis),
// then hung clockwise by tiltDeg. Exported for the tune tool.
export function orientPhotoPlane(mesh, viewDir, tiltDeg) {
  const helper = new THREE.Object3D();
  helper.lookAt(viewDir.clone().negate());
  mesh.quaternion.copy(helper.quaternion);
  mesh.rotateZ(-((tiltDeg || 0) * Math.PI) / 180);
}

// The photo is NOT locked to the camera: it hangs in world space at the
// spot. Placement comes from match.photoPos/photoHeight when present
// (the tune tool emits these); otherwise the legacy form — the plane
// hangs planeDist ahead of the match camera, sized to exactly fill its
// frustum, with photoNudge/photoScale adjustments.
function getPhotoPlane(trick, ctx) {
  if (state.planes.has(trick.id)) return state.planes.get(trick.id);

  const m = trick.match;
  const C = new THREE.Vector3(...m.cameraPos);
  const L = new THREE.Vector3(...m.lookAt);
  const dir = L.clone().sub(C).normalize();
  const D = m.planeDist ?? 6;

  const pos = m.photoPos
    ? new THREE.Vector3(...m.photoPos)
    : C.clone().addScaledVector(dir, D);
  const h = m.photoHeight ?? 2 * D * Math.tan(THREE.MathUtils.degToRad(m.fov) / 2);
  const w = h * m.aspect;

  const placeholder = new THREE.CanvasTexture(placeholderPhotoCanvas(trick));
  placeholder.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: placeholder,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  new THREE.TextureLoader().load(
    m.photo,
    tex => { tex.colorSpace = THREE.SRGBColorSpace; mat.map = tex; mat.needsUpdate = true; },
    undefined,
    () => {} // 404 → keep placeholder card
  );

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.copy(pos);
  orientPhotoPlane(mesh, dir, m.photoTilt);
  const nudge = m.photoNudge || [0, 0];
  mesh.translateX(nudge[0]);
  mesh.translateY(nudge[1]);
  mesh.scale.setScalar(m.photoScale ?? 1);
  mesh.renderOrder = 100; // draws over the scene, but lives in the world
  mesh.visible = false;
  ctx.scene.add(mesh);

  const plane = { mesh, mat, baseH: h };
  state.planes.set(trick.id, plane);
  return plane;
}

const easeInOut = t => t * t * (3 - 2 * t);

function byId(id) {
  return state.tricks.find(t => t.id === id);
}

function startTween(toPos, toTarget, toFov, toRoll, dur, doneMode, onDone) {
  const { camera, controls } = state.ctx;
  state.tween = {
    start: performance.now(),
    dur,
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromFov: camera.fov,
    fromRoll: state.roll || 0,
    toPos, toTarget, toFov, toRoll,
    doneMode, onDone,
  };
}

// Fly to a trick's match from wherever we are — free orbit, another
// matched view, or even mid-flight (clicking trick to trick just
// retargets the camera and crossfades the photos).
function flyTo(trick) {
  if (state.matchedTrick === trick &&
      (state.mode === 'matched' || state.mode === 'flying')) return;
  const { controls, camera } = state.ctx;
  if (state.mode === 'free') {
    // remember the orbit to restore on Back — but only the true orbit,
    // not an intermediate matched position during trick-to-trick hops
    state.saved = {
      pos: camera.position.clone(),
      target: controls.target.clone(),
      fov: camera.fov,
    };
  }
  hideMatchOverlay();
  controls.enabled = false;
  state.mode = 'flying';
  state.matchedTrick = trick;
  document.body.classList.add('flying');
  setActiveTrick(trick.id);
  const plane = getPhotoPlane(trick, state.ctx);
  if (state.activePlane && state.activePlane !== plane) {
    state.fading.push(state.activePlane); // old photo fades out en route
    state.activePlane = null;
  }
  state.fading = state.fading.filter(p => p !== plane);
  plane.mesh.visible = true;
  state.activePlane = plane;
  startTween(
    new THREE.Vector3(...trick.match.cameraPos),
    new THREE.Vector3(...trick.match.lookAt),
    trick.match.fov,
    ((trick.match.roll || 0) * Math.PI) / 180,
    1700,
    'matched',
    () => showMatchOverlay(trick)
  );
}

function goBack() {
  if (state.mode !== 'matched') return;
  hideMatchOverlay();
  setActiveTrick(null);
  state.mode = 'returning';
  state.matchedTrick = null;
  startTween(
    state.saved.pos,
    state.saved.target,
    state.saved.fov,
    0,
    1400,
    'free',
    () => {
      state.ctx.controls.enabled = true;
      document.body.classList.remove('flying', 'snap');
    }
  );
}

export function initTricks(ctx) {
  state.ctx = ctx;
  state.tricks = TRICKS;
  state.ghost = !!new URLSearchParams(location.search).get('ghost');

  initTrickBar(state.tricks, {
    onSelect: id => { const t = byId(id); if (t) flyTo(t); },
  });

  document.getElementById('back-btn').addEventListener('click', goBack);

  // dev helpers: ?fly=<trick-id> runs the photo-match flight,
  // ?snap=<trick-id> jumps to the matched view instantly (no tween)
  const params = new URLSearchParams(location.search);
  if (params.get('fly')) {
    const t = byId(params.get('fly'));
    if (t) flyTo(t);
  }
  if (params.get('snap')) {
    const t = byId(params.get('snap'));
    if (t) {
      const { camera, controls } = ctx;
      state.saved = { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov };
      controls.enabled = false;
      camera.position.set(...t.match.cameraPos);
      controls.target.set(...t.match.lookAt);
      camera.fov = t.match.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      state.roll = ((t.match.roll || 0) * Math.PI) / 180;
      if (state.roll) camera.rotateZ(state.roll);
      const plane = getPhotoPlane(t, ctx);
      plane.mesh.visible = true;
      // ?nophoto=1 → match camera only, no photo (for A/B alignment shots)
      const nophoto = !!params.get('nophoto');
      plane.mat.opacity = nophoto ? 0 : state.ghost ? 0.55 : 1;
      state.activePlane = nophoto ? null : plane;
      state.matchedTrick = t;
      state.mode = 'matched';
      setActiveTrick(t.id);
      document.body.classList.add('flying', 'snap');
      showMatchOverlay(t);
    }
  }
}

// ---- hooks for the dev tune tool (src/tune.js) ----

// The trick currently matched and its photo plane. Null while flying,
// returning, or free — the tune panel rebinds when this changes.
export function getMatchTune() {
  const t = state.matchedTrick;
  if (!t || state.mode !== 'matched') return null;
  return { trick: t, plane: state.planes.get(t.id) || null };
}

// Override the matched-view photo opacity (tune tool's slider). Also
// re-arms the plane if ?nophoto suppressed it, so the slider still works.
export function setPhotoOpacity(v) {
  state.opacityOverride = v;
  if (!state.activePlane && state.matchedTrick) {
    const plane = state.planes.get(state.matchedTrick.id);
    if (plane) {
      plane.mesh.visible = true;
      state.activePlane = plane;
    }
  }
}

export function updateTricks() {
  const ctx = state.ctx;
  if (!ctx) return;
  const { camera, controls } = ctx;

  // photos displaced by a trick-to-trick switch fade out on their own
  for (let i = state.fading.length - 1; i >= 0; i--) {
    const p = state.fading[i];
    p.mat.opacity += (0 - p.mat.opacity) * 0.12;
    if (p.mat.opacity < 0.02) {
      p.mat.opacity = 0;
      p.mesh.visible = false;
      state.fading.splice(i, 1);
    }
  }

  // fade the active photo plane toward its mode-appropriate opacity.
  // On the way in, the photo holds invisible until the camera is nearly
  // settled (last ~10% of the flight) so the fade-in reads on arrival
  // instead of finishing mid-flight.
  if (state.activePlane) {
    const mat = state.activePlane.mat;
    const shown = state.opacityOverride ?? (state.ghost ? 0.55 : 1);
    let target = 0;
    if (state.mode === 'matched') {
      target = shown;
    } else if (state.mode === 'flying' && state.tween) {
      const t = (performance.now() - state.tween.start) / state.tween.dur;
      if (t >= 0.9) target = shown;
    }
    mat.opacity += (target - mat.opacity) * 0.07;
    // tear down only when the photo is on its way out (Back to the
    // spot), never during the pre-arrival hold of a fly-in
    const fadingOut = state.mode !== 'matched' && state.mode !== 'flying';
    if (fadingOut && mat.opacity < 0.02) {
      mat.opacity = 0;
      state.activePlane.mesh.visible = false;
      state.activePlane = null;
    }
  }

  if (!state.tween) return;
  const tw = state.tween;
  const t = Math.min(1, (performance.now() - tw.start) / tw.dur);
  const k = easeInOut(t);
  camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
  controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
  camera.fov = tw.fromFov + (tw.toFov - tw.fromFov) * k;
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  state.roll = tw.fromRoll + (tw.toRoll - tw.fromRoll) * k;
  if (state.roll) camera.rotateZ(state.roll);
  if (t >= 1) {
    state.mode = tw.doneMode;
    const done = tw.onDone;
    state.tween = null;
    if (done) done();
  }
}
