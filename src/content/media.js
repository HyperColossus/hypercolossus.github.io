// Single source of truth for the Media (editing timeline) app and the #mobile video section.
// Titles and channel come from YouTube (oEmbed), fetched Sep 23, 2026.
// Leave a field null until there's real info — the UI should hide empty fields.
//
// Fields:
//   id              YouTube video ID
//   url             canonical watch URL
//   title, channel  as published on YouTube
//   format          'video' | 'short'  (shorts use the /shorts/ URL and a vertical player)
//   track           timeline track: 'V1' long-form | 'V2' shorts/highlights | 'V3' thumbnails/graphics  (confirm)
//   duration        seconds | null (sets clip width on the timeline).
//                   Filled by `npm run durations` (YouTube Data API), Sep 23, 2026.
//   role, tools     what Zack did on it (all: full editor, Premiere Pro)
//   madeThumbnail   true = Zack designed the thumbnail; the timeline shows it as a V3 clip under its video
//   results         e.g. views / retention, only real numbers | null
const yt = id => `https://www.youtube.com/watch?v=${id}`;

export const media = [
  { id: 'QbcjEgv_FVo', duration: 486, track: 'V1', title: 'It took me 10 years to hit this rank' },
  { id: 'j7oREWODi8E', duration: 631, track: 'V1', title: 'I learned how to COOK on Aphelios.' },
  { id: 'Rr3kcK3-oaI', duration: 507, track: 'V1', title: 'My SECRET Pick To Getting Master Tier! | League Of Legends' },
  { id: 'wgrYSUvnJ2g', duration: 278, track: 'V1', title: 'Lucian Has a New Build... 👑👑' },
  { id: 'mqAIRpRAt1w', duration: 414, track: 'V1', title: 'Sniper Kai\'sa in Grandmaster 🧙‍♂️🧙‍♂️' },
  { id: 'JCkxfY2_EPA', duration: 458, track: 'V1', title: 'AP Kog\'Maw = OP Kog\'Maw 😈😋' },
  { id: 'a9IhrmQgxVo', duration: 379, track: 'V1', title: 'Yunara Is Easy, Just Play Like This | Stream Highlights' },
  { id: 'pko1FMc8HrM', duration: 315, track: 'V1', title: 'Is Essence Reaver Lucian Dead?? Master Tier Lucian Gameplay' },
  { id: '6jOMhtlukkY', duration: 50, track: 'V2', format: 'short', url: 'https://www.youtube.com/shorts/6jOMhtlukkY', title: 'Lollipopping 🍭 EXPLAINED in league (how to dodge hooks) #leagueoflegends #riotgames #adcarry' },
].map(item => ({
  channel: 'SamIsDual',
  format: 'video',
  url: yt(item.id),
  thumbnail: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
  duration: null,
  role: 'Full editor',
  tools: ['Premiere Pro'],
  madeThumbnail: true,
  results: null,
  ...item,
}));
