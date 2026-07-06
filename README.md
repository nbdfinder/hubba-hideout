# NBD: Hubba Hideout

Interactive 3D tribute to Hubba Hideout, the demolished San Francisco skate
spot (RIP January 2011). Eight photo-matched tricks, 1991–2010: free-orbit the
reconstructed spot, click a trick, and the camera flies to the original
photographer's position while the actual photo materializes 1:1 over the model.

Vanilla JS + Three.js r160 (vendored, ES modules via import map, **no build
step**). Ships as hubba.nbdfinder.com.

## Run locally

ES modules require a web server (opening index.html directly won't work):

```powershell
powershell -ExecutionPolicy Bypass -File dev-server.ps1
```

Then open http://localhost:8741/
(Any static server works — the PowerShell one is just zero-dependency.)

## Deploy

Everything is static and every path is relative — deploy = copy these to the
subdomain's document root (or any subfolder):

```
index.html  styles.css  src/  data/  vendor/  assets/
```

No server config needed beyond ordinary static hosting.

## Layout

- `index.html` / `styles.css` — page shell: header, trick bar, back/info
  buttons, history modal
- `src/scene.js` — spot geometry + environment + lighting. All real-world
  measurements are constants in `MEASURE` at the top.
- `src/main.js` — renderer and the 90°-clamped orbit camera
- `src/tricks.js` — trick selection, fly-to-photographer camera match, and
  the world-space photo planes (photos hang at the spot, not on the camera)
- `src/ui.js` — DOM: trick bar (sorted by year) + matched-view chrome
- `src/history.js` — auto-opening history popup (ⓘ History reopens it)
- `src/tune.js` — dev match tuner; only activates with `?tune=1`
- `data/tricks.js` — the trick catalog: camera matches, photos, credits
- `vendor/` — Three.js r160 + OrbitControls, pinned locally
- `assets/photos/` — the scans, at the paths named in `data/tricks.js`
  (a placeholder card renders for any missing file)

## Adding a trick

1. Add an entry to `data/tricks.js` (copy an existing one; rough camera guess
   is fine) and drop the photo at the path it names.
2. Open `?snap=<trick-id>&tune=1&ghost=1` and move the camera/photo until the
   ghost registers with the model.
3. Paste the panel's match block over the entry's `match`. Done — the bar,
   sorting, credits, and fly-in all pick it up from the data.

## Dev URL params

- `?tune=1` — match tuner panel (add to any view; picker if nothing matched)
- `?snap=<trick-id>` — jump to a matched view instantly (no tween)
- `?fly=<trick-id>` — run the full photo-match flight
- `?ghost=1` — photo at 55% opacity for alignment work
- `?nophoto=1` — match camera only, photo hidden
- `?notrees=1` — hide all trees (tuning angles the grove occludes)
- `?cam=x,y,z&look=x,y,z` — position the free camera

Dev params also suppress the history popup's auto-open.

## Coordinates

Viewer approaches from +Z looking toward -Z; stairs ascend toward -Z; y=0 is
the lower plaza. Facing the stairs: LEFT hubba = -X, RIGHT = +X. One unit =
one meter.
