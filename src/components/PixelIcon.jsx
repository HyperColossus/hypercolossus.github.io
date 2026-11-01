import React from 'react';

// Original 16×16 pixel-art icons for Cola OS, drawn as crisp SVG rects.
// Each map is 16 rows of 16 chars; '.' is transparent, other chars index PALETTE.
const PALETTE = {
  K: '#000000', W: '#ffffff', L: '#dfdfdf', G: '#c0c0c0', D: '#808080',
  B: '#1f5fd6', b: '#0a2f8a', N: '#000080', S: '#9fd3ff', E: '#3aa04a', e: '#1f6b2b',
  R: '#e0402a', Y: '#ffd21f', C: '#6b3a1e', H: '#a0602e', F: '#f4e9d0', O: '#caa27a', T: '#008080',
};

const ICONS = {
  cards: [
    '................', '...KKKKKKKKK....', '...KYYYYYYYK....', '...KYKKKKKKKK...',
    '...KYKTTTTTTK...', '...KYKTTYYTTK...', '...KYKTYWWYTK...', '...KYKTWWWWTK...',
    '...KYKTYWWYTK...', '...KYKTTYYTTK...', '...KYKTTTTTTK...', '...KYKLLLLLLK...',
    '...KKKTTTTTTK...', '.....KKKKKKKK...', '................', '................',
  ],
  // Web browser: a globe.
  browser: [
    '................',
    '.....KKKKKK.....',
    '...KKSBBEEBKK...',
    '..KSBBEEEEBBBK..',
    '.KSBBBEEEBBBEBK.',
    '.KBBBBBEBBBEEBK.',
    'KBEEBBBBBBBEEBBK',
    'KBEEEBBBBBBBEBBK',
    'KBBEEEBBBBBBBBBK',
    'KBBBEEBBBEEBBBbK',
    'KBBBBBBBEEEEBBbK',
    '.KBBBBBBEEEBBbK.',
    '.KBBBBBBBEBBbbK.',
    '..KbBBBBBBBbbK..',
    '...KKbbbbbbKK...',
    '.....KKKKKK.....',
  ],
  // Games: a controller.
  gamepad: [
    '................',
    '................',
    '................',
    '...KKKKKKKKKK...',
    '..KLLLLLLLLLLK..',
    '.KLGGKGGGGGGRGK.',
    '.KLGKKKGGGGRGYK.',
    '.KLGGKGGDDGGYGK.',
    '.KLGGGGGGGGGGGK.',
    '.KLGGGGKKKKGGGK.',
    '.KGGGGK....KGGK.',
    '.KGGGK......KGK.',
    '..KKK........K..',
    '................',
    '................',
    '................',
  ],
  // Text file: a page with a folded corner.
  notepad: [
    '..KKKKKKKKK.....',
    '..KWWWWWWWKK....',
    '..KWDDDDDWKWK...',
    '..KWWWWWWWKKKK..',
    '..KWDDDDDDDDWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDDDDWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDDWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDDDDWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
    '................',
  ],
  // Résumé: a page with a portrait and lines.
  resume: [
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWOOOWNNNNWK..',
    '..KWOHOWWWWWWK..',
    '..KWBBBWDDDDWK..',
    '..KWBBBWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWNNNNNNNNWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDDDDWK..',
    '..KWDDDDDDWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWDDDDDDDDWK..',
    '..KWDDDDDWWWWK..',
    '..KKKKKKKKKKKK..',
    '................',
  ],
  // Contact: an envelope.
  mail: [
    '................',
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    '.KWKWWWWWWWWKWK.',
    '.KWWKWWWWWWKWWK.',
    '.KWWWKWWWWKWWWK.',
    '.KWWWWKWWKWWWWK.',
    '.KWWWKWKKWKWWWK.',
    '.KWWKWWWWWWKWWK.',
    '.KWKWWWWWWWWKWK.',
    '.KKWWWWWWWWWWKK.',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
  ],
  // Shut down: a power symbol.
  power: [
    '................',
    '.......KK.......',
    '....KK.RR.KK....',
    '...KRR.RR.RRK...',
    '..KRR..RR..RRK..',
    '..KR...RR...RK..',
    '.KRR...RR...RRK.',
    '.KR....RR....RK.',
    '.KR..........RK.',
    '.KRR........RRK.',
    '..KR........RK..',
    '..KRR......RRK..',
    '...KRRRRRRRRK...',
    '....KKRRRRKK....',
    '......KKKK......',
    '................',
  ],
  // Cola OS logo: a glass of cola with a straw and bubbles.
  cola: [
    '...........RR...',
    '..........RW....',
    '.........RR.....',
    '..KKKKKKRWKKKK..',
    '..KFFFFFRFFFFK..',
    '..KFWFFWRFWFFK..',
    '..KCCCCCRCCCCK..',
    '..KCHCCCWCCCCK..',
    '...KCHCCRCCOK...',
    '...KCHCCCCCCK...',
    '...KCCCOCCCCK...',
    '....KCHCCCOK....',
    '....KCCCCCCK....',
    '....KCCCCCCK....',
    '.....KKKKKK.....',
    '................',
  ],
};

export default function PixelIcon({ name, size = 32, className, title }) {
  const map = ICONS[name] ?? ICONS.notepad;
  const rects = [];
  map.forEach((row, y) => Array.from(row.padEnd(16, '.').slice(0, 16)).forEach((ch, x) => {
    if (ch !== '.') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PALETTE[ch]} />);
  }));
  return <svg className={className} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>{rects}</svg>;
}
