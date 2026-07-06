// ui.js — DOM layer: the bottom trick bar and the matched-view chrome
// (caption + back button). The photo itself is a 3D plane in tricks.js.

const trickButtons = new Map(); // trick id -> button element

export function initTrickBar(tricks, { onSelect }) {
  const bar = document.getElementById('trick-bar');
  const byYear = [...tricks].sort((a, b) => a.year - b.year);
  for (const t of byYear) {
    const b = document.createElement('button');
    b.className = 'trick' + (t.enabled ? '' : ' disabled');
    const photog =
      t.credit && t.credit.photographer && t.credit.photographer !== 'TBD'
        ? `<span class="t-photog">photo: ${t.credit.photographer}</span>`
        : '';
    b.innerHTML =
      `<span class="t-name">${t.trick}</span>` +
      `<span class="t-meta">${t.skater} — ${t.year}</span>` +
      photog;
    if (t.enabled) {
      b.addEventListener('click', () => onSelect(t.id));
    } else {
      b.title = 'Coming soon';
    }
    trickButtons.set(t.id, b);
    bar.appendChild(b);
  }
}

// mark which trick is being viewed (null = none)
export function setActiveTrick(id) {
  for (const [tid, b] of trickButtons) {
    b.classList.toggle('active', tid === id);
  }
}

// Placeholder "photo" so the pipeline works before real scans are dropped in
export function placeholderPhotoCanvas(t) {
  const w = 900;
  const h = Math.round(w / t.match.aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#585858');
  g.addColorStop(0.55, '#3a3a3a');
  g.addColorStop(1, '#242424');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // film grain
  for (let i = 0; i < 26000; i++) {
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},0.05)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ddd';
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(w * 0.045)}px Helvetica, Arial, sans-serif`;
  ctx.fillText('PHOTO PLACEHOLDER', w / 2, h * 0.42);
  ctx.font = `${Math.round(w * 0.026)}px Helvetica, Arial, sans-serif`;
  ctx.fillText(`${t.skater} — ${t.trick} (${t.year})`, w / 2, h * 0.48);
  ctx.fillStyle = '#999';
  ctx.font = `${Math.round(w * 0.022)}px Helvetica, Arial, sans-serif`;
  ctx.fillText(`drop the real scan at ${t.match.photo}`, w / 2, h * 0.54);
  return c;
}

// matched-view chrome is just the Back button now — the highlighted
// trick button in the bar carries the caption info
export function showMatchOverlay() {
  document.body.classList.add('matched');
}

export function hideMatchOverlay() {
  document.body.classList.remove('matched');
}
