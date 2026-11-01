// Network helpers for the browser's built-in sites. Every request is cached for the session, so
// Back/Forward and tab switches don't refetch (and the GitHub API's 60-requests/hour limit lasts).
import snapshot from '../../content/githubSnapshot.json';

const cache = new Map();
function cached(key, load) {
  if (!cache.has(key)) cache.set(key, load().catch(error => { cache.delete(key); throw error; }));
  return cache.get(key);
}
async function get(url, { accept, as = 'json' } = {}) {
  const response = await fetch(url, accept ? { headers: { Accept: accept } } : undefined);
  if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
  return as === 'text' ? response.text() : response.json();
}

// ---------- GitHub (live API, with a saved snapshot of Zack's profile as the fallback) ----------
const GH = 'https://api.github.com';
const lower = value => String(value ?? '').toLowerCase();
const isSnapshotUser = owner => lower(owner) === lower(snapshot.user.login);
const withSnapshot = (live, fallback) => live.catch(error => {
  const saved = fallback();
  if (saved == null) throw error;
  return { ...(typeof saved === 'object' && !Array.isArray(saved) ? saved : { items: saved }), fromSnapshot: true };
});

export const github = {
  user: owner => cached(`gh:user:${lower(owner)}`, () => withSnapshot(get(`${GH}/users/${owner}`), () => isSnapshotUser(owner) ? snapshot.user : null)),
  repos: owner => cached(`gh:repos:${lower(owner)}`, () => withSnapshot(
    get(`${GH}/users/${owner}/repos?sort=updated&per_page=100`).then(items => ({ items })),
    () => isSnapshotUser(owner) ? snapshot.repos : null)),
  repo: (owner, repo) => cached(`gh:repo:${lower(owner)}/${lower(repo)}`, () => withSnapshot(
    get(`${GH}/repos/${owner}/${repo}`),
    () => snapshot.repos.find(item => lower(item.full_name) === `${lower(owner)}/${lower(repo)}`) ?? null)),
  contents: (owner, repo, path = '', ref) => cached(`gh:contents:${lower(owner)}/${lower(repo)}:${path}@${ref ?? ''}`, () => withSnapshot(
    get(`${GH}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`).then(data => Array.isArray(data) ? { items: data } : data),
    () => snapshot.contents[`${lower(owner)}/${lower(repo)}:${path}`] ?? null)),
  readme: (owner, repo) => cached(`gh:readme:${lower(owner)}/${lower(repo)}`, () => withSnapshot(
    get(`${GH}/repos/${owner}/${repo}/readme`, { accept: 'application/vnd.github.html', as: 'text' }).then(html => ({ html })),
    () => { const html = snapshot.readmes[`${lower(owner)}/${lower(repo)}`]; return html ? { html } : null; })),
};

// ---------- Wikipedia (MediaWiki action API; origin=* allows cross-site requests) ----------
const wikiApi = (lang, params) => `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
export const wikipedia = {
  article: (lang, title) => cached(`wiki:${lang}:${title}`, () => get(wikiApi(lang, { action: 'parse', page: title, prop: 'text|displaytitle', redirects: '1', disableeditsection: '1' })).then(data => {
    if (data.error) throw Object.assign(new Error(data.error.info), { missing: data.error.code === 'missingtitle' });
    return { title: data.parse.title, displayTitle: data.parse.displaytitle, html: data.parse.text };
  })),
};

// ---------- HTML from other sites ----------
// Keeps the content, drops anything that could run code or pull the page around. Links become
// data-href (resolved to absolute URLs), so the browser opens them in the tab instead of navigating.
const DROP = 'script, style, link, meta, iframe, object, embed, form, noscript, base';
export function cleanHtml(html, { base, fixSrc = src => src } = {}) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  root.querySelectorAll(DROP).forEach(node => node.remove());
  root.querySelectorAll('*').forEach(node => {
    for (const { name, value } of Array.from(node.attributes)) { // a copy: removing attributes changes the live list
      if (name.startsWith('on') || name === 'srcset' || name === 'style' && /url\(|expression/i.test(value)) node.removeAttribute(name);
    }
    if (node.tagName === 'A') {
      const href = node.getAttribute('href');
      node.removeAttribute('href');
      node.removeAttribute('target');
      if (!href || /^\s*javascript:/i.test(href)) return;
      if (href.startsWith('#')) { node.setAttribute('data-anchor', decodeURIComponent(href.slice(1))); return; }
      try { node.setAttribute('data-href', new URL(href, base).href); } catch { /* malformed link: leave it as text */ }
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src');
      if (!src) return;
      try { node.setAttribute('src', fixSrc(new URL(src, base).href, src)); } catch { node.remove(); }
      node.setAttribute('loading', 'lazy');
    }
  });
  return root.innerHTML;
}

// Base64 file contents from the GitHub API -> text (UTF-8).
export function decodeBase64(text) {
  const bytes = Uint8Array.from(atob(String(text).replace(/\s/g, '')), char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
