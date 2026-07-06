// tricks.js — the trick catalog. Pure data, no logic.
//
// Coordinates use the scene system: viewer approaches from +Z looking
// toward -Z; facing the stairs LEFT hubba = -X, RIGHT = +X; y = 0 is the
// lower plaza.
//
// match = the photographer's camera (position/lookAt/fov) plus the photo.
// The photo is NOT locked to the camera: it hangs in world space at the
// spot.
//   photoPos    — [x, y, z] world position of the plane's center
//   photoHeight — world height of the plane in meters (width = h × aspect)
//   photoTilt   — clockwise hang of the photo plane, degrees
//   (legacy, used only when photoPos is absent: planeDist hangs the plane
//   that far ahead of the camera sized to fill its frustum, adjusted by
//   photoNudge [x, y] and photoScale)
//
// TUNING: open ?snap=<id>&tune=1&ghost=1 — move the camera and photo
// live, then paste the readout block over the match here.
// Other dev params: ?nophoto=1 (camera only), ?ghost=1 (55% photo).
// Until a photo file exists at match.photo, a placeholder card renders.

export const TRICKS = [
  {
    id: 'koston-bs-noseblunt',
    trick: 'Backside Noseblunt Slide',
    skater: 'Eric Koston',
    year: 1998,
    hubba: 'left',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-2, 0.3, 13.95],
      lookAt: [-1.91, 1.71, 0.4],
      fov: 18.9,
      photoPos: [-1.755, 0.904, 7.326],
      photoHeight: 1.792,
      photoTilt: 1.5,
      photo: 'assets/photos/koston-bs-noseblunt.jpeg',
      aspect: 0.672,
    },
    credit: {
      photographer: 'Dave Swift',
      source: '',
    },
  },
  {
    id: 'shipman-fs-blunt',
    trick: 'Frontside Bluntslide',
    skater: 'Carl Shipman',
    year: 1994,
    hubba: 'left',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-1.25, 1.09, 5],
      lookAt: [-2.199, 1.644, -1.492],
      fov: 31.8,
      photoPos: [-1.805, 1.522, 2.04],
      photoHeight: 1.293,
      photoTilt: 0,
      photo: 'assets/photos/shipman-fs-blunt.jpeg',
      aspect: 0.758, // 940x1240 magazine cover scan
    },
    credit: {
      photographer: 'Bryce Kanights',
      source: 'Thrasher, January 1994 cover',
    },
  },
  {
    id: 'gall-sw-5-0',
    trick: 'Switch 5-0',
    skater: 'Fred Gall',
    year: 1995,
    hubba: 'right',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1) — fisheye
    // original, so the center registers and the frame edges drift
    match: {
      cameraPos: [5.07, 1.15, 1.72],
      lookAt: [2.21, 1.628, -1.987],
      fov: 80,
      photoPos: [1.667, 1.595, 0.337],
      photoHeight: 6.285,
      photoTilt: -4.5,
      photo: 'assets/photos/gall-sw-5-0.jpeg',
      aspect: 0.754, // 750x995 magazine cover scan
    },
    credit: {
      photographer: 'Gabe Morford',
      source: 'Thrasher, February 1995 cover',
    },
  },
  {
    id: 'mcbride-fs-smith',
    trick: 'Frontside Smith Grind',
    skater: 'Lavar McBride',
    year: 1997,
    hubba: 'left',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [0.05, 0.39, 7.26],
      lookAt: [-2.283, 2.108, -1.708],
      fov: 36.3,
      photoPos: [-1.658, 1.495, 1.12],
      photoHeight: 3.196,
      photoTilt: -5,
      photo: 'assets/photos/mcbride-fs-smith.jpeg', // note: PNG data inside — browsers don't mind
      aspect: 0.68, // 597x878
    },
    credit: {
      photographer: 'Independent Ad',
      source: 'Independent Trucks ad, 1997',
    },
  },
  {
    id: 'anderson-5050',
    trick: 'Waist-high 50-50',
    skater: 'Brian Anderson',
    year: 1996,
    hubba: 'left', // the flat walkway section, about halfway back
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-4.04, 2.25, 2.62],
      lookAt: [-1.13, 1.6, -10.284],
      fov: 24.7,
      photoPos: [-3.24, 1.864, -0.619],
      photoHeight: 1.752,
      photoTilt: -1,
      photo: 'assets/photos/anderson-5050.jpeg',
      aspect: 0.667, // 1333x2000
    },
    credit: {
      photographer: 'Theo Hand', // from the print's signature — confirm spelling
      source: '',
    },
  },
  {
    id: 'ramondetta-bs-5050',
    trick: 'Backside 50-50, 180 Over Gap',
    skater: 'Peter Ramondetta',
    year: 2010,
    hubba: 'left', // TBD — confirm from the photo
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-18.45, 10.17, -4.64],
      lookAt: [-0.282, 2.845, -1.259],
      fov: 22.1,
      photoPos: [-4.135, 4.334, -1.304],
      photoHeight: 4.336,
      photoTilt: 8.7,
      photo: 'assets/photos/ramondetta-bs-5050.jpeg',
      aspect: 1.484, // 1015x684 landscape
    },
    credit: {
      photographer: 'Gabe Morford',
      source: '',
    },
  },
  {
    id: 'speyer-crooked',
    trick: 'Crooked Grind',
    skater: 'Wade Speyer',
    year: 1991,
    hubba: 'right',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-0.73, 0.24, 15.15],
      lookAt: [2.052, 1.409, -2.014],
      fov: 14.4,
      photoPos: [0.387, 1.006, 7.988],
      photoHeight: 2.084,
      photoTilt: 1.08,
      photo: 'assets/photos/speyer-crooked.jpeg', // note: WebP data inside — browsers don't mind
      aspect: 0.656, // 570x869
    },
    credit: {
      photographer: 'Bryce Kanights', // watermark on the print
      source: '',
    },
  },
  {
    id: 'kalis-sw-bs-tailslide',
    trick: 'Switch Backside Tailslide',
    skater: 'Josh Kalis',
    year: 1999,
    hubba: 'right',
    enabled: true,
    // locked in by hand with the match tuner (?tune=1)
    match: {
      cameraPos: [-2.59, 0.95, 6.29],
      lookAt: [2.633, 1.528, -1.753],
      fov: 27.3,
      photoPos: [2.158, 1.628, -0.811],
      photoHeight: 3.712,
      photoTilt: 3.72,
      photo: 'assets/photos/kalis-sw-bs-tailslide.png',
      aspect: 0.807, // 721x894
    },
    credit: {
      photographer: 'Mike Blabac',
      source: '',
    },
  },
];
