// history.js — the auto-opening history popup and its ⓘ button.
//
// Opens once for first-time visitors (localStorage remembers a
// dismissal), and any time via the History button. Never auto-opens on
// dev URLs (?snap/?fly/?tune/...) so tuning and screenshots stay clear.

const SEEN_KEY = 'hubba-history-seen';

export function initHistory() {
  const modal = document.getElementById('history-modal');

  const open = () => {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
  };
  const close = () => {
    modal.classList.remove('open');
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
    setTimeout(() => { modal.hidden = true; }, 250); // let the fade finish
  };

  document.getElementById('info-btn').addEventListener('click', open);
  document.getElementById('history-close').addEventListener('click', close);
  document.getElementById('history-scrim').addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  const params = new URLSearchParams(location.search);
  const dev = ['snap', 'fly', 'tune', 'cam', 'nophoto', 'notrees', 'ghost']
    .some(k => params.get(k));
  let seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* private mode */ }
  if (!dev && !seen) open();
}
