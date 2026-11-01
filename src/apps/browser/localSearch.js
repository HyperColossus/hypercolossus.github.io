// Fizz Search's index of Zack's own site: pages, projects, videos and games. Pure, so it's tested
// in scripts/browserRouter.test.mjs alongside the router.
import { profile } from '../../content/profile.js';
import { work } from '../../content/work.js';
import { media } from '../../content/media.js';
import { games } from '../../content/games.js';
import { homeUrl } from './router.js';

const words = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9']+/g) ?? [];

const entries = [
  { url: homeUrl(), title: `${profile.name} — Homepage`, snippet: `${profile.title}. ${profile.summary}`, keywords: 'zack zachary siegel homepage portfolio about home social games video' },
  { url: homeUrl('work'), title: `${profile.name} — Work`, snippet: 'Social for two League of Legends broadcasts, a campus esports program, and a creator’s channel.', keywords: work.map(item => item.org).join(' ') + ' work projects portfolio case studies' },
  { url: homeUrl('resume'), title: `${profile.name} — Résumé`, snippet: `${profile.title}. ${profile.education.map(entry => `${entry.degree}, ${entry.school}`).join('. ')}.`, keywords: `resume cv experience education skills ${Object.values(profile.skills).flat().join(' ')}` },
  { url: homeUrl('contact'), title: `${profile.name} — Contact`, snippet: `Open to social, content, and game roles. Email ${profile.email}.`, keywords: 'contact email hire reach message' },
  ...work.map(item => ({ url: homeUrl(`work/${item.id}`), title: `${item.org} — ${item.discipline}`, snippet: `${item.role}, ${item.period}. ${item.summary}`, keywords: `${item.company} ${item.did.join(' ')}` })),
  ...media.map(clip => ({ url: clip.url, title: clip.title, snippet: `Video by ${clip.channel}: full edit and thumbnail by Zack, cut in ${clip.tools.join(', ')}.`, keywords: `video edit editing youtube ${clip.channel} ${clip.format}`, video: clip })),
  ...games.map(game => ({ url: homeUrl('home'), title: `${game.title} (in development)`, snippet: `${game.title} is a game Zack is developing. Details coming soon.`, keywords: 'game games steam development indie' })),
];
const indexed = entries.map(entry => ({ entry, title: new Set(words(entry.title)), body: new Set(words(`${entry.snippet} ${entry.keywords}`)) }));

// Every search word must appear (title words count double); results are ranked by score.
export function searchSite(query) {
  const terms = words(query);
  if (!terms.length) return [];
  return indexed
    .map(({ entry, title, body }) => {
      let score = 0;
      for (const term of terms) {
        const hit = word => word === term || (term.length > 2 && word.startsWith(term));
        const inTitle = [...title].some(hit);
        const inBody = [...body].some(hit);
        if (!inTitle && !inBody) return null;
        score += inTitle ? 2 : 1;
      }
      return { ...entry, score: score + (entry.video ? 0 : 0.5) }; // pages edge out videos on ties
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// Tab/window titles for the homepage's pages.
const PAGE_TITLES = { home: 'Homepage', work: 'Work', resume: 'Résumé', contact: 'Contact' };
export function homePageTitle(path) {
  const item = path.startsWith('work/') ? work.find(entry => `work/${entry.id}` === path) : null;
  const name = item ? item.org : PAGE_TITLES[path];
  return name ? `${profile.name} — ${name}` : 'The page cannot be found';
}
