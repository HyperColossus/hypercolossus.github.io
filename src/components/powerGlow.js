// The power button's standby "breathing" glow: nothing for the first few seconds on the site, then a
// slow, smooth pulse that eases in (no sudden start) to draw the eye without being overwhelming.
export const GLOW_DELAY = 5;      // seconds on the site before the pulse begins
export const GLOW_FADE_IN = 1.5;  // the pulse's strength eases in over this long
export const GLOW_PERIOD = 2.6;   // seconds per breath (dark → glowing → dark)

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 0 = not glowing, 1 = full glow. Starts from dark, and lingers slightly longer in the dark half.
export function breathing(seconds) {
  const envelope = smoothstep(GLOW_DELAY, GLOW_DELAY + GLOW_FADE_IN, seconds);
  const phase = Math.max(0, seconds - GLOW_DELAY);
  const wave = (1 - Math.cos((2 * Math.PI * phase) / GLOW_PERIOD)) / 2;
  return envelope * Math.pow(wave, 1.4);
}
