// scene.js — Hubba Hideout spot geometry, environment, and lighting.
//
// Coordinate system:
//   - The viewer approaches from +Z (brick plaza side) looking toward -Z.
//   - Stairs ascend toward -Z. Ground level (lower plaza) is y = 0.
//   - Facing the stairs: LEFT hubba is -X (Koston), RIGHT hubba is +X (Kalis).
//
// All dimensions in meters, reconstructed from reference photos.
// Tweak the constants in MEASURE to adjust proportions.

import * as THREE from 'three';

export const MEASURE = {
  // Stairs (both sets are "oversized" 6-stair sets)
  STEP_RISE: 0.19,
  STEP_RUN: 0.47,
  STEP_COUNT: 6,
  STAIR_WIDTH: 3.66,

  // Hubba ledges (lower set — the famous ones). The top surface is a single
  // unbroken downward angle from the parapet junction to the front face —
  // it never levels off.
  // Cross-section is an upside-down L: the outer face is one flush vertical
  // plane; the cap overhangs INWARD over the stairs/walkway side.
  LEDGE_THICKNESS: 0.5,     // full width of the cap (the ledge top surface)
  LEDGE_WALL_T: 0.35,       // the narrower wall below the cap
  LEDGE_CAP_H: 0.3,         // vertical height of the cap band
  LEDGE_FRONT_OVERHANG: 0.85, // how far the block protrudes past the bottom step
  BLOCK_TOP_Y: 1.32,        // height of the ledge's front top corner above lower plaza
  LEDGE_BACK_EXTEND: 0.68,  // how far the upper ledges continue past their top step
  PARAPET_HEIGHT: 0.75,     // walkway side walls — ledge tops meet these flush

  // Upper (second) stair set ledges — rise straight out of the parapets
  LEDGE_B_TOP_END: 0.6,     // above upper walkway at its top end

  // Site layout
  LANDING_DEPTH: 13.0,      // the walkway between the two stair sets (it's a bridge)
  PLAZA_DEPTH: 14,          // brick plaza in front of the stairs
  PLAZA_WIDTH: 22,
  UPPER_DEPTH: 10,          // walkway on top of the second set

  // The walkway is a pedestrian bridge — a road passes beneath it
  ROAD_Y: -3.2,             // road surface below plaza level
  ABUT_FRONT_SETBACK: 1.2,  // solid ground behind the lower stairs before the drop
  ABUT_BACK_SETBACK: 2.0,   // solid ground in front of the upper stairs
};

const M = MEASURE;
const STAIR_RISE_TOTAL = M.STEP_RISE * M.STEP_COUNT;   // 1.14
const STAIR_RUN_TOTAL = M.STEP_RUN * M.STEP_COUNT;     // 2.82

// Derived z positions (front of bottom step of lower stairs = z 0)
const Z_STAIRS_A_TOP = -STAIR_RUN_TOTAL;
const Z_LANDING_BACK = Z_STAIRS_A_TOP - M.LANDING_DEPTH;
const Z_STAIRS_B_TOP = Z_LANDING_BACK - STAIR_RUN_TOTAL;
const Z_UPPER_BACK = Z_STAIRS_B_TOP - M.UPPER_DEPTH;
const Y_LANDING = STAIR_RISE_TOTAL;
const Y_UPPER = STAIR_RISE_TOTAL * 2;

export const LAYOUT = { Z_STAIRS_A_TOP, Z_LANDING_BACK, Z_STAIRS_B_TOP, Z_UPPER_BACK, Y_LANDING, Y_UPPER };

/* ------------------------------------------------------------------ */
/* Procedural textures (canvas-based, no external assets)              */
/* ------------------------------------------------------------------ */

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Small deterministic PRNG so textures/trees don't reshuffle every reload
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeConcreteTexture({
  base = [183, 179, 172],
  speckle = 9000,
  stains = 26,
  drips = 0,
  cracks = 0,
  scored = false,
  seed = 7,
} = {}) {
  const rng = mulberry32(seed);
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < speckle; i++) {
      const v = -30 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v - 4},${0.1 + rng() * 0.18})`;
      ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 1.5, 1 + rng() * 1.5);
    }
    for (let i = 0; i < stains; i++) {
      const x = rng() * s, y = rng() * s;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 30 + rng() * 80);
      const dark = rng() > 0.35;
      g.addColorStop(0, dark ? 'rgba(80,78,72,0.10)' : 'rgba(225,222,214,0.08)');
      g.addColorStop(1, 'rgba(90,88,82,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    // vertical water drips
    for (let i = 0; i < drips; i++) {
      const x = rng() * s, w = 2 + rng() * 6, top = rng() * s * 0.4;
      const g = ctx.createLinearGradient(0, top, 0, s);
      g.addColorStop(0, 'rgba(70,68,62,0.14)');
      g.addColorStop(1, 'rgba(70,68,62,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, w, s - top);
    }
    // hairline cracks
    ctx.strokeStyle = 'rgba(60,58,52,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < cracks; i++) {
      let x = rng() * s, y = rng() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 5 + Math.floor(rng() * 6);
      for (let k = 0; k < steps; k++) {
        x += (rng() - 0.5) * 46;
        y += rng() * 34;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // expansion-joint scoring (2x2 panels per tile)
    if (scored) {
      ctx.strokeStyle = 'rgba(70,66,60,0.55)';
      ctx.lineWidth = 3;
      for (const p of [0, s / 2]) {
        ctx.beginPath(); ctx.moveTo(p + 1, 0); ctx.lineTo(p + 1, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p + 1); ctx.lineTo(s, p + 1); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(235,232,224,0.35)';
      ctx.lineWidth = 1;
      for (const p of [0, s / 2]) {
        ctx.beginPath(); ctx.moveTo(p + 3, 0); ctx.lineTo(p + 3, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p + 3); ctx.lineTo(s, p + 3); ctx.stroke();
      }
    }
  });
}

// Riser face for stair steps: darker than the treads, with a soft
// shadow band under the tread lip above and grime settling at the
// base — the tonal break is what makes each step read as a step.
// Curbs reuse it with a lighter base and gentler bands (no tread
// overhangs a curb, so a heavy lip shadow reads wrong).
function makeRiserTexture(seed = 19, { base = [163, 159, 151], lip = 0.45, grime = 0.3 } = {}) {
  const rng = mulberry32(seed);
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 7000; i++) {
      const v = -28 + Math.floor(rng() * 56);
      ctx.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v - 4},${0.1 + rng() * 0.16})`;
      ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 1.5, 1 + rng() * 1.5);
    }
    // shadow cast by the lip overhead
    let g = ctx.createLinearGradient(0, 0, 0, s * 0.34);
    g.addColorStop(0, `rgba(40,38,34,${lip})`);
    g.addColorStop(1, 'rgba(40,38,34,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s * 0.34);
    // grime at the base
    g = ctx.createLinearGradient(0, s * 0.8, 0, s);
    g.addColorStop(0, 'rgba(60,57,50,0)');
    g.addColorStop(1, `rgba(60,57,50,${grime})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, s * 0.8, s, s * 0.2);
  });
}

function makeBrickTexture() {
  const rng = mulberry32(41);
  return canvasTexture(512, (ctx, s) => {
    const rows = 16, bw = s / 6, bh = s / rows;
    ctx.fillStyle = '#6f665c'; // mortar
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw / 2);
      for (let cix = -1; cix < 7; cix++) {
        const roll = rng();
        let shade = 0.78 + rng() * 0.36;
        if (roll > 0.93) shade = 0.5 + rng() * 0.15;   // scattered dark bricks
        else if (roll < 0.05) shade = 1.18 + rng() * 0.1; // scattered pale ones
        ctx.fillStyle = `rgb(${Math.floor(128 * shade)},${Math.floor(76 * shade)},${Math.floor(62 * shade)})`;
        ctx.fillRect(cix * bw + offset + 2, r * bh + 2, bw - 4, bh - 4);
        // subtle per-brick mottling
        for (let d = 0; d < 7; d++) {
          const v = shade * (0.85 + rng() * 0.3);
          ctx.fillStyle = `rgba(${Math.floor(120 * v)},${Math.floor(72 * v)},${Math.floor(58 * v)},0.5)`;
          ctx.fillRect(cix * bw + offset + 3 + rng() * (bw - 8), r * bh + 3 + rng() * (bh - 8), 2.5, 2);
        }
      }
    }
  });
}

function makeAsphaltTexture() {
  const rng = mulberry32(97);
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#3d3f43';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 14000; i++) {
      const v = 45 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.15 + rng() * 0.3})`;
      ctx.fillRect(rng() * s, rng() * s, 1 + rng(), 1 + rng());
    }
    // patches and wear
    for (let i = 0; i < 10; i++) {
      const x = rng() * s, y = rng() * s;
      const g = ctx.createRadialGradient(x, y, 6, x, y, 40 + rng() * 60);
      g.addColorStop(0, rng() > 0.5 ? 'rgba(25,26,28,0.25)' : 'rgba(90,92,96,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    ctx.strokeStyle = 'rgba(20,21,23,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      let x = rng() * s, y = rng() * s;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += (rng() - 0.5) * 60; y += rng() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });
}

function makeBarkTexture() {
  const rng = mulberry32(23);
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#7a6a52';
    ctx.fillRect(0, 0, s, s);
    // vertical bark striations (eucalyptus: pale, peeling) — soft contrast
    for (let i = 0; i < 46; i++) {
      const x = rng() * s, w = 6 + rng() * 16, tone = rng();
      ctx.fillStyle = tone > 0.6
        ? `rgba(${138 + rng() * 26},${124 + rng() * 22},${102 + rng() * 18},0.28)`
        : `rgba(${82 + rng() * 24},${70 + rng() * 20},${54 + rng() * 16},0.26)`;
      ctx.fillRect(x, 0, w, s);
    }
    // horizontal breakup so the stripes don't read as a barber pole
    for (let i = 0; i < 26; i++) {
      const y = rng() * s, h = 4 + rng() * 14;
      ctx.fillStyle = `rgba(${96 + rng() * 40},${84 + rng() * 32},${66 + rng() * 24},0.16)`;
      ctx.fillRect(0, y, s, h);
    }
  });
}

function makeHedgeTexture() {
  const rng = mulberry32(59);
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#2f4a28';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const g = 55 + Math.floor(rng() * 50);
      ctx.fillStyle = `rgba(${g * 0.55},${g},${g * 0.5},${0.3 + rng() * 0.4})`;
      const x = rng() * s, y = rng() * s, r = 2 + rng() * 4;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.6, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeWindowsTexture() {
  const rng = mulberry32(83);
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#8f8a80';
    ctx.fillRect(0, 0, s, s);
    const cell = s / 8;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = 88 + Math.floor(rng() * 30);
        ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
        ctx.fillRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
      }
    }
  });
}

function makeFacadeTexture() {
  // One Maritime Plaza: dark bronze glass with white diamond (X) lattice bracing
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#3a3630';
    ctx.fillRect(0, 0, s, s);
    // window mullion grid
    ctx.strokeStyle = 'rgba(190,180,160,0.25)';
    ctx.lineWidth = 1;
    const cell = s / 16;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(s, i * cell); ctx.stroke();
    }
    // glass reflections
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(120,130,140,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(Math.floor(Math.random() * 16) * cell, Math.floor(Math.random() * 16) * cell, cell, cell);
    }
    // diamond cross-bracing (the icon)
    ctx.strokeStyle = '#ddd8cc';
    ctx.lineWidth = 10;
    const half = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(half, s); ctx.lineTo(s, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s); ctx.lineTo(half, 0); ctx.lineTo(s, s);
    ctx.stroke();
    // border columns
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(3, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s - 3, 0); ctx.lineTo(s - 3, s); ctx.stroke();
  });
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

function buildStairs(mat, { baseY, zFront, width }) {
  const group = new THREE.Group();
  for (let i = 0; i < M.STEP_COUNT; i++) {
    const topY = baseY + (i + 1) * M.STEP_RISE;
    const geo = new THREE.BoxGeometry(width, topY, M.STEP_RUN);
    const step = new THREE.Mesh(geo, mat);
    step.position.set(0, topY / 2, zFront - i * M.STEP_RUN - M.STEP_RUN / 2);
    step.castShadow = step.receiveShadow = true;
    group.add(step);
  }
  return group;
}

// A hubba ledge: two extrusions sharing one longitudinal profile —
// a narrow wall below and a full-width cap band on top, so the
// cross-section is an upside-down L (cap overhangs the inner side only;
// the outer face is flush). Profiles drawn in local XY (x = distance from
// front face going back, y = height), extruded along local Z, then rotated
// to run alongside the stairs.
function buildLedge(mat, {
  zFront,        // world z of the block's front face
  baseY,         // ground level the block front face rises from
  blockTopY,     // absolute y of the front face's top corner
  topEndY,       // absolute y of the ledge top at its uphill end
  zBackEnd,      // world z where the ledge ends (back face)
  landingY,      // absolute y of the ground at the back end
  xOuterEdge,    // world x of the flush outer face
  side,          // -1 = left of stairs, +1 = right
}) {
  const len = zFront - zBackEnd;
  const capH = M.LEDGE_CAP_H;
  const group = new THREE.Group();

  // wall: full profile minus the top cap band
  const wall = new THREE.Shape();
  wall.moveTo(0, baseY);
  wall.lineTo(0, blockTopY - capH);
  wall.lineTo(len, topEndY - capH);
  wall.lineTo(len, landingY);
  wall.lineTo(len, baseY); // buried below landing — hidden
  wall.lineTo(0, baseY);

  // cap: the top band, same slope — one continuous line, no level-off
  const cap = new THREE.Shape();
  cap.moveTo(0, blockTopY - capH);
  cap.lineTo(0, blockTopY);
  cap.lineTo(len, topEndY);
  cap.lineTo(len, topEndY - capH);
  cap.lineTo(0, blockTopY - capH);

  for (const [shape, depth] of [
    [wall, M.LEDGE_WALL_T],
    [cap, M.LEDGE_THICKNESS],
  ]) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    // local +X (profile run) → world -Z ; local +Z (thickness) → world +X.
    // Extrusion grows toward +X: align every piece's outer face flush.
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(side < 0 ? xOuterEdge : xOuterEdge - depth, 0, zFront);
    group.add(mesh);
  }
  return group;
}

let barkTexShared = null;

function jitteredBlobGeometry(radius, rng, detail = 1) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const f = 0.9 + rng() * 0.22;
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f * 0.85, pos.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}

// `lush: true` = hero trees near the camera: smoother blobs, denser
// canopy, extra branches. Background trees stay cheap.
function buildTree(x, y, z, { height = 7, foliage = 2.2, tint = 0x3d5732, lush = false } = {}) {
  // deterministic per-position randomness so the grove is stable
  const rng = mulberry32(Math.abs(Math.floor(x * 73 + z * 131 + height * 7)) + 1);
  const group = new THREE.Group();
  group.userData.tree = true; // dev: ?notrees=1 hides trees for match tuning

  if (!barkTexShared) barkTexShared = makeBarkTexture();
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTexShared, roughness: 0.95 });

  const trunkH = height * 0.55;
  const lean = (rng() - 0.5) * 0.14;
  const leanDir = rng() * Math.PI * 2;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09 + height * 0.006, 0.16 + height * 0.012, trunkH, 7),
    barkMat
  );
  trunk.position.y = trunkH / 2;
  trunk.rotation.set(Math.cos(leanDir) * lean, 0, Math.sin(leanDir) * lean);
  trunk.castShadow = true;
  group.add(trunk);

  const detail = lush ? 2 : 1;

  // a few branches reaching up into the canopy
  const branches = (lush ? 4 : 2) + Math.floor(rng() * 2);
  for (let i = 0; i < branches; i++) {
    const bLen = trunkH * (0.3 + rng() * 0.25);
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.06, bLen, 5),
      barkMat
    );
    const ang = rng() * Math.PI * 2;
    const tiltZ = 0.5 + rng() * 0.5; // lean out 30–60°
    branch.position.set(
      Math.cos(ang) * bLen * 0.32,
      trunkH * (0.72 + rng() * 0.2),
      Math.sin(ang) * bLen * 0.32
    );
    branch.rotation.set(Math.sin(ang) * tiltZ, 0, -Math.cos(ang) * tiltZ);
    branch.castShadow = true;
    group.add(branch);
  }

  // canopy: irregular blobs in three green tones, wider than tall
  const baseCol = new THREE.Color(tint);
  const tones = [
    new THREE.MeshStandardMaterial({ color: baseCol.clone().multiplyScalar(0.82), roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.92, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: baseCol.clone().multiplyScalar(1.18), roughness: 0.9, flatShading: true }),
  ];

  const canopyY = trunkH + foliage * 0.35;
  const crown = new THREE.Mesh(jitteredBlobGeometry(foliage * 1.1, rng, detail), tones[1]);
  crown.position.set(Math.sin(leanDir) * lean * trunkH, canopyY + foliage * 0.5, Math.cos(leanDir) * lean * trunkH);
  crown.rotation.y = rng() * Math.PI;
  crown.castShadow = true;
  group.add(crown);

  const ringBlobs = (lush ? 8 : 4) + Math.floor(rng() * 3);
  for (let i = 0; i < ringBlobs; i++) {
    const ang = (i / ringBlobs) * Math.PI * 2 + rng() * 0.8;
    const dist = foliage * (0.55 + rng() * 0.55);
    const r = foliage * ((lush ? 0.42 : 0.5) + rng() * 0.4);
    // darker tones hang low, lighter tones ride high
    const yOff = (rng() - 0.35) * foliage * 0.8;
    const mat = tones[yOff > foliage * 0.18 ? 2 : yOff < -foliage * 0.12 ? 0 : 1];
    const blob = new THREE.Mesh(jitteredBlobGeometry(r, rng, detail), mat);
    blob.position.set(
      Math.cos(ang) * dist + Math.sin(leanDir) * lean * trunkH,
      canopyY + foliage * 0.3 + yOff,
      Math.sin(ang) * dist + Math.cos(leanDir) * lean * trunkH
    );
    blob.rotation.y = rng() * Math.PI;
    blob.castShadow = true;
    group.add(blob);
  }

  // lush trees get small filler tufts tucked into the canopy gaps
  if (lush) {
    const tufts = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < tufts; i++) {
      const ang = rng() * Math.PI * 2;
      const dist = foliage * (0.3 + rng() * 0.75);
      const r = foliage * (0.22 + rng() * 0.2);
      const yOff = (rng() - 0.2) * foliage * 1.1;
      const mat = tones[Math.floor(rng() * 3)];
      const tuft = new THREE.Mesh(jitteredBlobGeometry(r, rng, detail), mat);
      tuft.position.set(
        Math.cos(ang) * dist + Math.sin(leanDir) * lean * trunkH,
        canopyY + foliage * 0.45 + yOff,
        Math.sin(ang) * dist + Math.cos(leanDir) * lean * trunkH
      );
      tuft.castShadow = true;
      group.add(tuft);
    }
  }

  group.position.set(x, y, z);
  group.rotation.y = rng() * Math.PI * 2;
  return group;
}

function buildGlobeLamp(x, z, baseY = 0) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 3.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.6, metalness: 0.5 })
  );
  pole.position.y = 1.55;
  pole.castShadow = true;
  group.add(pole);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f2e6, emissive: 0x555044, roughness: 0.4 })
  );
  globe.position.y = 3.25;
  group.add(globe);
  group.position.set(x, baseY, z);
  return group;
}

/* ------------------------------------------------------------------ */
/* Scene assembly                                                      */
/* ------------------------------------------------------------------ */

export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8dde2);
  scene.fog = new THREE.Fog(0xd8dde2, 55, 170);

  /* Materials */
  // small elements: stairs, curbs — raw weathered concrete
  const concreteTex = makeConcreteTexture({ stains: 20, cracks: 3, seed: 7 });
  const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.93 });

  // stair steps: per-face materials so treads and risers separate —
  // order matches BoxGeometry faces [+x, -x, +y, -y, +z, -z]
  const treadTex = makeConcreteTexture({ base: [191, 187, 180], stains: 14, seed: 21 });
  const treadMat = new THREE.MeshStandardMaterial({ map: treadTex, roughness: 0.95 });
  const riserMat = new THREE.MeshStandardMaterial({ map: makeRiserTexture(), roughness: 0.97 });
  const stepMats = [concreteMat, concreteMat, treadMat, concreteMat, riserMat, concreteMat];

  // large ground slabs — scored sidewalk panels
  const pavingTex = makeConcreteTexture({ scored: true, stains: 30, cracks: 5, seed: 11 });
  pavingTex.repeat.set(22, 22);
  const pavingMat = new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.94 });

  // mid-size flats: bridge deck, upper podium
  const deckTex = makeConcreteTexture({ scored: true, stains: 24, cracks: 4, seed: 13 });
  deckTex.repeat.set(3, 3);
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.94 });

  // the ledges/parapets — painted white concrete, weathered with drips
  const ledgeTex = makeConcreteTexture({
    base: [222, 217, 207], speckle: 6000, stains: 14, drips: 6, cracks: 2, seed: 5,
  });
  const ledgeMat = new THREE.MeshStandardMaterial({ map: ledgeTex, roughness: 0.9 });

  // parapets are long boxes (UVs stretch 0..1 per face) — tile their texture
  // to match the ledges' per-meter density so the junction doesn't seam
  const parapetTex = makeConcreteTexture({
    base: [222, 217, 207], speckle: 6000, stains: 14, drips: 6, cracks: 2, seed: 5,
  });
  parapetTex.repeat.set(12, 1);
  const parapetMat = new THREE.MeshStandardMaterial({ map: parapetTex, roughness: 0.9 });

  const brickTex = makeBrickTexture();
  brickTex.repeat.set(8, 8);
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 });

  const facadeTex = makeFacadeTexture();
  facadeTex.repeat.set(2, 5);
  const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.55, metalness: 0.25 });

  const hedgeTex = makeHedgeTexture();
  hedgeTex.repeat.set(3, 2);
  const hedgeMat = new THREE.MeshStandardMaterial({ map: hedgeTex, roughness: 0.95 });

  const wallTex = makeConcreteTexture({ base: [201, 197, 188], drips: 4, cracks: 2, seed: 9 });
  wallTex.repeat.set(2, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 });

  const halfW = M.STAIR_WIDTH / 2;

  /* Brick plaza (foreground) */
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(M.PLAZA_WIDTH, 0.1, M.PLAZA_DEPTH), brickMat);
  plaza.position.set(0, -0.05, M.PLAZA_DEPTH / 2);
  plaza.receiveShadow = true;
  scene.add(plaza);

  /* Ground. The site splits in three: solid ground under the plaza and
     lower stairs, a sunken road corridor crossing beneath the bridge,
     and a raised mass carrying the upper stairs and podium. */
  const zAbutFront = Z_STAIRS_A_TOP - M.ABUT_FRONT_SETBACK;
  const zAbutBack = Z_LANDING_BACK + M.ABUT_BACK_SETBACK;

  const frontGround = new THREE.Mesh(
    new THREE.BoxGeometry(90, 0.1, 53 - zAbutFront),
    pavingMat
  );
  frontGround.position.set(0, -0.07, (53 + zAbutFront) / 2);
  frontGround.receiveShadow = true;
  scene.add(frontGround);

  const backMass = new THREE.Mesh(
    new THREE.BoxGeometry(90, Y_LANDING - M.ROAD_Y, 50),
    pavingMat
  );
  backMass.position.set(0, (Y_LANDING + M.ROAD_Y) / 2, zAbutBack - 25);
  backMass.receiveShadow = true;
  scene.add(backMass);

  /* The road under the bridge */
  const asphaltTex = makeAsphaltTexture();
  asphaltTex.repeat.set(16, 3);
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.98 });
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(90, 0.24, zAbutFront - zAbutBack),
    asphaltMat
  );
  road.position.set(0, M.ROAD_Y - 0.12, (zAbutFront + zAbutBack) / 2);
  road.receiveShadow = true;
  scene.add(road);

  const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.8 });
  for (let i = 0; i < 16; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 0.14), dashMat);
    dash.position.set(-36 + i * 4.8, M.ROAD_Y + 0.01, (zAbutFront + zAbutBack) / 2);
    scene.add(dash);
  }

  for (const [zc, h] of [
    [zAbutFront - 0.7, 0.4],
    [zAbutBack + 0.7, 0.4],
  ]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(90, h, 1.4), wallMat);
    walk.position.set(0, M.ROAD_Y + h / 2 - 0.12, zc);
    walk.receiveShadow = true;
    scene.add(walk);
  }

  /* Abutment retaining walls at the corridor edges */
  const abutFront = new THREE.Mesh(new THREE.BoxGeometry(90, 0 - M.ROAD_Y, 0.45), wallMat);
  abutFront.position.set(0, M.ROAD_Y / 2, zAbutFront + 0.2);
  abutFront.receiveShadow = true;
  scene.add(abutFront);

  const abutBack = new THREE.Mesh(
    new THREE.BoxGeometry(90, Y_LANDING - M.ROAD_Y, 0.45),
    wallMat
  );
  abutBack.position.set(0, (Y_LANDING + M.ROAD_Y) / 2, zAbutBack - 0.2);
  abutBack.receiveShadow = true;
  scene.add(abutBack);

  /* Lower stairs (the famous set). Treads run under the cap overhang
     to meet the recessed wall faces. */
  const stairW = M.STAIR_WIDTH + 2 * (M.LEDGE_THICKNESS - M.LEDGE_WALL_T);
  scene.add(buildStairs(stepMats, { baseY: 0, zFront: 0, width: stairW }));

  /* The walkway between the two sets — a true bridge deck spanning the
     road, same width as the stairs, with continuous parapet walls */
  const landing = new THREE.Mesh(
    new THREE.BoxGeometry(M.STAIR_WIDTH + M.LEDGE_THICKNESS * 2, 0.5, M.LANDING_DEPTH),
    deckMat
  );
  landing.position.set(0, Y_LANDING - 0.25, Z_STAIRS_A_TOP - M.LANDING_DEPTH / 2);
  landing.receiveShadow = landing.castShadow = true;
  scene.add(landing);

  for (const side of [-1, 1]) {
    // same upside-down-L cross-section as the ledges: flush outer face,
    // cap overhanging inward over the deck
    const wallH = M.PARAPET_HEIGHT - M.LEDGE_CAP_H;
    const pWall = new THREE.Mesh(
      new THREE.BoxGeometry(M.LEDGE_WALL_T, wallH, M.LANDING_DEPTH),
      parapetMat
    );
    pWall.position.set(
      side * (halfW + M.LEDGE_THICKNESS - M.LEDGE_WALL_T / 2),
      Y_LANDING + wallH / 2,
      Z_STAIRS_A_TOP - M.LANDING_DEPTH / 2
    );
    pWall.castShadow = pWall.receiveShadow = true;
    scene.add(pWall);

    const pCap = new THREE.Mesh(
      new THREE.BoxGeometry(M.LEDGE_THICKNESS, M.LEDGE_CAP_H, M.LANDING_DEPTH),
      parapetMat
    );
    pCap.position.set(
      side * (halfW + M.LEDGE_THICKNESS / 2),
      Y_LANDING + wallH + M.LEDGE_CAP_H / 2,
      Z_STAIRS_A_TOP - M.LANDING_DEPTH / 2
    );
    pCap.castShadow = pCap.receiveShadow = true;
    scene.add(pCap);
  }

  /* Upper stairs */
  scene.add(buildStairs(stepMats, { baseY: Y_LANDING, zFront: Z_LANDING_BACK, width: stairW }));

  /* Upper walkway */
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(M.STAIR_WIDTH + M.LEDGE_THICKNESS * 2 + 10, Y_UPPER, M.UPPER_DEPTH),
    deckMat
  );
  upper.position.set(0, Y_UPPER / 2, Z_STAIRS_B_TOP - M.UPPER_DEPTH / 2);
  upper.receiveShadow = true;
  scene.add(upper);

  /* The hubbas (lower set) — LEFT (-X) = Koston, RIGHT (+X) = Kalis */
  for (const side of [-1, 1]) {
    scene.add(buildLedge(ledgeMat, {
      zFront: M.LEDGE_FRONT_OVERHANG,
      baseY: 0,
      blockTopY: M.BLOCK_TOP_Y,
      topEndY: Y_LANDING + M.PARAPET_HEIGHT, // meets the parapet dead flush
      zBackEnd: Z_STAIRS_A_TOP,
      landingY: Y_LANDING,
      xOuterEdge: side * (halfW + M.LEDGE_THICKNESS),
      side,
    }));
  }

  /* Upper set ledges — no block: they rise straight out of the parapets
     so the whole ledge line is connected from plaza to top */
  for (const side of [-1, 1]) {
    scene.add(buildLedge(ledgeMat, {
      zFront: Z_LANDING_BACK,
      baseY: Y_LANDING,
      blockTopY: Y_LANDING + M.PARAPET_HEIGHT, // continues the parapet line
      topEndY: Y_UPPER + M.LEDGE_B_TOP_END,
      zBackEnd: Z_STAIRS_B_TOP - M.LEDGE_BACK_EXTEND,
      landingY: Y_UPPER,
      xOuterEdge: side * (halfW + M.LEDGE_THICKNESS),
      side,
    }));
  }

  /* Curbs around the brick plaza (both sides) — same tread/riser
     treatment as the stairs so their edges read: worn top, shadowed
     vertical faces */
  const curbFaceMat = new THREE.MeshStandardMaterial({
    map: makeRiserTexture(23, { base: [173, 169, 161], lip: 0.2, grime: 0.22 }),
    roughness: 0.96,
    // faked bounce light off the bricks so the shade-side face isn't
    // crushed to black while the plaza next to it is in full sun
    emissive: 0x3a3733,
  });
  const curbSideMats = [curbFaceMat, curbFaceMat, treadMat, concreteMat, concreteMat, concreteMat];
  const curbBackMats = [concreteMat, concreteMat, treadMat, concreteMat, curbFaceMat, curbFaceMat];
  for (const side of [-1, 1]) {
    // continuous curb around the brick plaza: one run along the side edge,
    // a hard 90° corner, then straight along the back edge into the hubba
    // block's front corner
    const CURB_H = 0.5, CURB_W = 0.4;
    const curbX = M.PLAZA_WIDTH / 2 - 1.5;   // side run centerline
    const curbZ = 0.7;                        // back run centerline

    const sideRun = new THREE.Mesh(
      new THREE.BoxGeometry(CURB_W, CURB_H, 11 - (curbZ - CURB_W / 2)),
      curbSideMats
    );
    sideRun.position.set(side * curbX, CURB_H / 2, (11 + curbZ - CURB_W / 2) / 2);
    sideRun.castShadow = sideRun.receiveShadow = true;
    scene.add(sideRun);

    const backLen = (curbX + CURB_W / 2) - (halfW + M.LEDGE_THICKNESS - 0.1);
    const backRun = new THREE.Mesh(new THREE.BoxGeometry(backLen, CURB_H, CURB_W), curbBackMats);
    backRun.position.set(
      side * ((curbX + CURB_W / 2) - backLen / 2),
      CURB_H / 2,
      curbZ
    );
    backRun.castShadow = backRun.receiveShadow = true;
    scene.add(backRun);
  }

  /* Trees — tall eucalyptus flanking (pushed out so they don't overhang
     the stairs), smaller row on the upper level */
  scene.add(buildTree(-8.2, 0, -2.0, { height: 12, foliage: 2.4, tint: 0x44583a, lush: true }));
  scene.add(buildTree(8.0, 0, -2.6, { height: 13, foliage: 2.2, tint: 0x3d5732, lush: true }));
  scene.add(buildTree(-8.6, Y_LANDING, -14.8, { height: 10, foliage: 2.0, lush: true }));
  scene.add(buildTree(9.0, Y_LANDING, -15.4, { height: 11, foliage: 2.2, tint: 0x475c38, lush: true }));
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue; // keep the walkway path clear
    const tx = -6 + i * 3;
    scene.add(buildTree(tx, Y_UPPER, Z_STAIRS_B_TOP - 1.2, { height: 3.4, foliage: 1.15, tint: 0x3a5a30 }));
  }

  /* Dense greenery flanking the upper stairs (photo: hedges swallow the
     sides of the second set) */
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(2.6, Y_UPPER - Y_LANDING + 0.7, STAIR_RUN_TOTAL + 1.5), hedgeMat);
    bank.position.set(
      side * (halfW + M.LEDGE_THICKNESS + 1.3),
      Y_LANDING + (Y_UPPER - Y_LANDING + 0.7) / 2,
      Z_LANDING_BACK - STAIR_RUN_TOTAL / 2
    );
    bank.castShadow = true;
    scene.add(bank);
  }

  /* Globe lamps on the upper podium flanking the walkway mouth */
  scene.add(buildGlobeLamp(-5.2, Z_STAIRS_B_TOP - 1.6, Y_UPPER));
  scene.add(buildGlobeLamp(5.2, Z_STAIRS_B_TOP - 2.2, Y_UPPER));

  /* One Maritime Plaza — the diamond-lattice tower behind the spot */
  const tower = new THREE.Mesh(new THREE.BoxGeometry(26, 58, 22), facadeMat);
  tower.position.set(-6, 29 + Y_LANDING, Z_UPPER_BACK - 34);
  scene.add(tower);

  // second, plainer tower to the right for skyline mass
  const windowsTex = makeWindowsTexture();
  windowsTex.repeat.set(2, 7);
  const tower2 = new THREE.Mesh(
    new THREE.BoxGeometry(16, 42, 16),
    new THREE.MeshStandardMaterial({ map: windowsTex, roughness: 0.8 })
  );
  tower2.position.set(20, 21 + Y_LANDING, Z_UPPER_BACK - 42);
  scene.add(tower2);

  /* Lighting */
  const hemi = new THREE.HemisphereLight(0xcdd6e0, 0x6d6659, 0.9);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
  sun.position.set(16, 26, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  return scene;
}
