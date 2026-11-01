// Fills in video durations in src/content/media.js using the YouTube Data API v3.
// Usage:  YOUTUBE_API_KEY=your_key node scripts/fetch-durations.mjs
//   (PowerShell:  $env:YOUTUBE_API_KEY="your_key"; node scripts/fetch-durations.mjs)
// Get a key: Google Cloud Console → enable "YouTube Data API v3" → Credentials → API key.
// Uses 1 quota unit per run. The key is never written to disk.
import { readFile, writeFile } from 'node:fs/promises';
import { media } from '../src/content/media.js';

const key = process.env.YOUTUBE_API_KEY;
if (!key) { console.error('Set YOUTUBE_API_KEY first.'); process.exit(1); }

const toSeconds = iso => {
  const [, h = 0, m = 0, s = 0] = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return +h * 3600 + +m * 60 + +s;
};

const ids = media.map(item => item.id).join(',');
const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${key}`);
const data = await res.json();
if (!res.ok) { console.error('API error:', data.error?.message ?? res.status); process.exit(1); }

const durations = Object.fromEntries(data.items.map(v => [v.id, toSeconds(v.contentDetails.duration)]));
const file = new URL('../src/content/media.js', import.meta.url);
let src = await readFile(file, 'utf8');
for (const [id, seconds] of Object.entries(durations)) {
  const entry = new RegExp(`(\\{ id: '${id}', )(duration: \\d+, )?`);
  src = src.replace(entry, `$1duration: ${seconds}, `);
  console.log(id, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
}
const missing = media.filter(item => !(item.id in durations)).map(item => item.id);
if (missing.length) console.warn('Not returned by the API:', missing.join(', '));
await writeFile(file, src);
console.log('Updated src/content/media.js');
