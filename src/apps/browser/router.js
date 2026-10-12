// Where the Cola OS browser goes. Pure functions (no React), so they're unit-tested in
// scripts/browserRouter.test.mjs.
//
// Everything opens inside the browser window; nothing leaves the site. Most big sites (Google,
// GitHub, YouTube, X, …) refuse to be shown inside another page, so the browser draws its own
// version of the ones that matter, from their public data:
//   hypercoloss.us     Zack's homepage (the portfolio)
//   fizzsearch.com     the built-in search engine (Zack's site + live Wikipedia and GitHub results)
//   github.com         profiles, repos, files and READMEs from the GitHub API
//   *.wikipedia.org    articles from the Wikipedia API
//   youtube.com        videos, Shorts, playlists and channels with YouTube's embeddable player
//   x.com              posts via X's official post embed; profiles get an explanation page
//   instagram, tiktok, twitch, spotify   posts / videos / streams / tracks via official embeds
// Search engines redirect to Fizz Search. Sites that only work when logged in get an explanation
// page, and anything else opens as a real web page through the Cola OS web proxy (proxy/) — or,
// without the proxy, in a plain frame.

export const HOME_DOMAIN = 'hypercoloss.us';
export const SEARCH_DOMAIN = 'fizzsearch.com';
export const NEW_TAB_URL = `http://www.${SEARCH_DOMAIN}/`;

export const homeUrl = (path = 'home') => `http://www.${HOME_DOMAIN}/${path === 'home' ? '' : path}`;
export const searchUrl = query => `http://www.${SEARCH_DOMAIN}/search?q=${encodeURIComponent(query.trim()).replace(/%20/g, '+')}`;

const SEARCH_ENGINES = ['google.', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'yahoo.com', 'ask.com', 'altavista.com'];
// Login-walled apps with no public embeds: the proxy never passes cookies, so these can't work.
const BLOCKED = ['facebook.com', 'linkedin.com', 'netflix.com', 'discord.com', 'threads.net'];
const X_RESERVED = ['home', 'explore', 'search', 'i', 'settings', 'notifications', 'messages', 'login', 'signup', 'tos', 'privacy', 'hashtag', 'intent', 'share', 'compose'];

const hostOf = url => url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
const matches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

// What the user typed in the address bar -> a URL to open (typed words become a search).
export function resolveInput(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return normalize(text) ?? searchUrl(text);
  if (/^(about|mailto):/i.test(text)) return text;
  const looksLikeHost = !/\s/.test(text) && /^(localhost|[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,})(:\d+)?([/?#].*)?$/i.test(text);
  if (looksLikeHost) return normalize(`${/^(localhost|[\d.]+)(:|\/|$)/i.test(text) ? 'http' : 'https'}://${text}`) ?? searchUrl(text); // typed addresses default to https, like modern browsers
  return searchUrl(text);
}

function normalize(text) {
  try {
    const url = new URL(text);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

// A URL -> which built-in site draws it, plus that site's parameters.
export function classify(href) {
  let url;
  try { url = new URL(href); } catch { return { site: 'error', href }; }
  const host = hostOf(url);
  const parts = url.pathname.split('/').filter(Boolean).map(part => { try { return decodeURIComponent(part); } catch { return part; } });

  if (matches(host, HOME_DOMAIN) || host === 'hypercolossus.github.io') {
    const path = parts.join('/').toLowerCase().replace(/^index\.html$/, '');
    return { site: 'home', path: path || 'home' };
  }
  if (matches(host, SEARCH_DOMAIN)) {
    return { site: 'search', query: parts[0] === 'search' ? (url.searchParams.get('q') ?? '').trim() : '', via: url.searchParams.get('via') || null };
  }
  if (SEARCH_ENGINES.some(engine => host.startsWith(engine) || matches(host, engine))) {
    const query = url.searchParams.get('q') ?? url.searchParams.get('p') ?? '';
    // Google & co. refuse to run inside other sites (they answer proxies with a CAPTCHA), so the
    // search runs on Fizz instead, which says so (`via`).
    const via = host.replace(/^(www|search)\./, '');
    return { site: 'redirect', to: query ? `${searchUrl(query)}&via=${encodeURIComponent(via)}` : `${NEW_TAB_URL}?via=${encodeURIComponent(via)}`, from: host };
  }
  if (matches(host, 'github.com')) {
    const [owner, repo, view, ref, ...rest] = parts;
    if (!owner) return { site: 'github', owner: null };
    if (!repo) return { site: 'github', owner };
    const kind = view === 'blob' ? 'file' : view === 'tree' ? 'dir' : 'repo';
    return { site: 'github', owner, repo, kind, ref: kind === 'repo' ? null : ref ?? null, path: kind === 'repo' ? '' : rest.join('/') };
  }
  if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org')) {
    const lang = host === 'wikipedia.org' ? 'en' : host.split('.')[0];
    const title = parts[0] === 'wiki' && parts[1] ? parts.slice(1).join('/').replace(/_/g, ' ') : 'Main Page';
    return { site: 'wiki', lang: /^[a-z-]{2,12}$/.test(lang) ? lang : 'en', title, hash: url.hash.slice(1) };
  }
  if (matches(host, 'youtube.com') || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    let id = null;
    if (host === 'youtu.be') id = parts[0];
    else if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1];
    id = id && /^[\w-]{6,20}$/.test(id) ? id : null;
    const list = /^[\w-]{10,64}$/.test(url.searchParams.get('list') ?? '') ? url.searchParams.get('list') : null;
    // Channels: /@handle, /channel/UC…, /c/name, /user/name (a trailing /videos etc. is ignored).
    let channel = null;
    if (!id && parts[0]?.startsWith('@')) channel = { path: `/${parts[0]}` };
    else if (!id && parts[0] === 'channel' && /^UC[\w-]{22}$/.test(parts[1] ?? '')) channel = { id: parts[1] };
    else if (!id && ['c', 'user'].includes(parts[0]) && parts[1]) channel = { path: `/${parts[0]}/${parts[1]}` };
    return { site: 'video', id, isShort: parts[0] === 'shorts', list, channel };
  }
  if (matches(host, 'x.com') || matches(host, 'twitter.com')) {
    const [user, section, third, fourth] = parts;
    if (user === 'i' && section === 'web' && third === 'status' && /^\d+$/.test(fourth ?? '')) return { site: 'x', kind: 'post', user: null, id: fourth };
    if (user && section === 'status' && /^\d+$/.test(third ?? '')) return { site: 'x', kind: 'post', user, id: third };
    if (user && /^\w{1,15}$/.test(user) && !X_RESERVED.includes(user.toLowerCase())) return { site: 'x', kind: 'profile', user };
    return { site: 'x', kind: 'home' };
  }
  if (matches(host, 'instagram.com')) {
    const [kind, code] = parts;
    if (['p', 'reel', 'reels', 'tv'].includes(kind) && /^[\w-]{5,40}$/.test(code ?? '')) {
      return { site: 'embed', provider: 'instagram', src: `https://www.instagram.com/${kind === 'reels' ? 'reel' : kind}/${code}/embed/captioned/`, shape: 'tall' };
    }
    return { site: 'blocked', host: 'instagram.com', handle: kind && /^[\w.]{1,30}$/.test(kind) ? kind : null };
  }
  if (matches(host, 'tiktok.com')) {
    const video = parts[1] === 'video' && /^\d{8,25}$/.test(parts[2] ?? '') ? parts[2] : null;
    if (video) return { site: 'embed', provider: 'tiktok', src: `https://www.tiktok.com/embed/v2/${video}`, shape: 'tall' };
    return { site: 'blocked', host: 'tiktok.com', handle: parts[0]?.startsWith('@') ? parts[0].slice(1) : null };
  }
  if (matches(host, 'twitch.tv')) {
    if (host === 'clips.twitch.tv' && parts[0]) return { site: 'embed', provider: 'twitch', clip: parts[0], shape: 'wide' };
    if (parts[1] === 'clip' && parts[2]) return { site: 'embed', provider: 'twitch', clip: parts[2], shape: 'wide' };
    if (parts[0] === 'videos' && /^\d+$/.test(parts[1] ?? '')) return { site: 'embed', provider: 'twitch', video: parts[1], shape: 'wide' };
    if (parts[0] && /^\w{2,25}$/.test(parts[0]) && !['directory', 'downloads', 'settings', 'p', 'search'].includes(parts[0])) return { site: 'embed', provider: 'twitch', channel: parts[0].toLowerCase(), shape: 'wide' };
  }
  if (host === 'open.spotify.com') {
    const clean = parts[0]?.startsWith('intl-') ? parts.slice(1) : parts;
    if (['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(clean[0]) && /^\w{10,40}$/.test(clean[1] ?? '')) {
      return { site: 'embed', provider: 'spotify', src: `https://open.spotify.com/embed/${clean[0]}/${clean[1]}`, shape: ['track', 'episode'].includes(clean[0]) ? 'short' : 'panel' };
    }
  }
  const blocked = BLOCKED.find(domain => matches(host, domain));
  if (blocked) return { site: 'blocked', host: blocked, handle: ['x.com', 'twitter.com'].includes(blocked) ? parts[0] ?? null : null };
  if (host === 'localhost' || /^[\d.]+$/.test(host)) return { site: 'error', href };
  return { site: 'frame', url: href, src: url.protocol === 'http:' ? href.replace(/^http:/, 'https:') : href, host };
}

// Tab and window title for a page (sites can refine it once they've loaded, e.g. a video's name).
export function titleFor(href, extra = {}) {
  const page = classify(href);
  switch (page.site) {
    case 'home': return extra.title ?? 'Zachary Siegel — Homepage';
    case 'search': return page.query ? `${page.query} - Fizz Search` : 'Fizz Search';
    case 'github': return page.repo ? `${page.owner}/${page.repo}${page.path ? ` · ${page.path}` : ''}` : page.owner ? `${page.owner} · GitHub` : 'GitHub';
    case 'wiki': return `${page.title} - Wikipedia`;
    case 'video': return extra.title ?? (page.channel ? 'YouTube channel' : page.list && !page.id ? 'YouTube playlist' : 'Video');
    case 'x': return page.kind === 'post' ? `Post${page.user ? ` by @${page.user}` : ''} on X` : page.kind === 'profile' ? `@${page.user} on X` : 'X';
    case 'embed': return extra.title ?? { instagram: 'Instagram post', tiktok: 'TikTok video', twitch: 'Twitch', spotify: 'Spotify' }[page.provider];
    case 'blocked': return page.host;
    case 'frame': return page.host;
    default: return 'Cannot find server';
  }
}
