// Where the desktop screen sits in the monitor: the single source of truth for IntroScene.jsx.
// Open the site with ?tune to show the Screen Tuner panel (ScreenTuner.jsx) and adjust it live;
// everyone else just gets DEFAULTS. x/y/z are metres in the computer model's space, tilt is
// radians (negative leans the top back), fit scales the screen to the bezel opening.
//
// While tuning, IntroScene moves, tilts and scales the whole screen group (screen, glass and tube)
// every frame, so nothing else in the scene has to change while you drag the sliders.

export const DEFAULTS = { x: -0.079, y: 0.0759, z: 0.300, tilt: -0.08, fit: 0.955 };

const STORAGE_KEY = 'cola-screen-tuning';
export const tuningEnabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune');

function load() {
  if (!tuningEnabled) return { ...DEFAULTS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Object.keys(DEFAULTS).every(key => typeof saved[key] === 'number')) return { ...DEFAULTS, ...saved };
  } catch { /* storage unavailable: start from the defaults */ }
  return { ...DEFAULTS };
}

let values = load();
let flags = { highlight: false, freeze: false };
const listeners = new Set();
const emit = () => listeners.forEach(listener => listener());

export const tuning = {
  get: () => values,
  flags: () => flags,
  set(patch) {
    values = { ...values, ...patch };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* not saved; still applied */ }
    emit();
  },
  setFlags(patch) { flags = { ...flags, ...patch }; emit(); },
  reset() { this.set({ ...DEFAULTS }); },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
};

// The line to paste over DEFAULTS above to make the tuned position permanent for everyone.
export function tuningCode(v = values) {
  const n = value => Number(value.toFixed(4));
  return `export const DEFAULTS = { x: ${n(v.x)}, y: ${n(v.y)}, z: ${n(v.z)}, tilt: ${n(v.tilt)}, fit: ${n(v.fit)} };`;
}
