// main.js — renderer, camera, and the clamped free-orbit.
//
// Orbit is clamped to a ~90° arc facing the stairs (azimuth ±45° around
// the +Z approach axis), with polar/distance limits so the user can't go
// underground, behind the spot, or into the stratosphere.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildScene } from './scene.js';
import { initTricks, updateTricks } from './tricks.js';
import { initTune } from './tune.js';
import { initHistory } from './history.js';

// dev: surface uncaught errors on-page (headless screenshots can't read console)
function showError(msg) {
  let el = document.getElementById('err-badge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'err-badge';
    el.style.cssText =
      'position:fixed;top:60px;right:12px;z-index:99;max-width:46vw;' +
      'background:#7a1111;color:#fff;font:12px/1.5 monospace;' +
      'padding:10px 12px;border-radius:6px;white-space:pre-wrap;';
    document.body.appendChild(el);
  }
  el.textContent += msg + '\n';
}
window.addEventListener('error', e => showError(`${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', e => showError(`Promise: ${e.reason}`));

const canvas = document.getElementById('scene-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = buildScene();

// dev: ?notrees=1 hides all trees — occluded angles are easier to tune
if (new URLSearchParams(location.search).get('notrees')) {
  scene.traverse(o => { if (o.userData.tree) o.visible = false; });
}

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(3.8, 2.6, 9.0);

// Debug/dev: ?cam=x,y,z&look=x,y,z to position the camera (also the basis
// for photo camera-matching later)
const params = new URLSearchParams(location.search);
const camParam = params.get('cam');
const lookParam = params.get('look');
if (camParam) camera.position.fromArray(camParam.split(',').map(Number));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, -1.0);       // roughly the heart of the lower hubbas
if (lookParam) controls.target.fromArray(lookParam.split(',').map(Number));
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;

// The 90° viewing arc: azimuth 0 = straight-on from the plaza (+Z side)
controls.minAzimuthAngle = -Math.PI / 4;  // -45°
controls.maxAzimuthAngle = Math.PI / 4;   // +45°

// Keep the camera above ground and below bird's-eye
controls.minPolarAngle = 0.55;            // ~31° from vertical (no top-down)
controls.maxPolarAngle = 1.58;            // ~90.5° — can dip just below level

controls.minDistance = 4.5;
controls.maxDistance = 13;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ctx = { scene, camera, controls, renderer };
initTricks(ctx);
initTune(ctx); // dev match-tuning panel, only activates with ?tune=1
initHistory();

// paint the first frame synchronously so the canvas is never blank at
// the load event (matters for screenshots and perceived startup)
if (controls.enabled) controls.update();
updateTricks();
renderer.render(scene, camera);

renderer.setAnimationLoop(() => {
  if (controls.enabled) controls.update();
  updateTricks();
  renderer.render(scene, camera);
});
