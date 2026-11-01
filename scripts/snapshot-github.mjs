// Saves a snapshot of Zack's public GitHub profile for the Cola OS browser, so the in-browser
// GitHub pages still work when the live API is unreachable or rate-limited (60 requests/hour per
// visitor). Run after publishing something new on GitHub:  npm run snapshot:github
import { writeFile } from 'node:fs/promises';

const USER = 'HyperColossus';
const api = async (path, accept = 'application/vnd.github+json') => {
  const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: accept, 'User-Agent': 'cola-os-snapshot' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return accept.includes('html') ? response.text() : response.json();
};

const user = await api(`/users/${USER}`);
const repos = (await api(`/users/${USER}/repos?sort=updated&per_page=100`)).filter(repo => !repo.fork);
const snapshot = { savedAt: new Date().toISOString(), user, repos, contents: {}, readmes: {} };
for (const repo of repos) {
  const key = `${USER}/${repo.name}`.toLowerCase();
  snapshot.contents[`${key}:`] = await api(`/repos/${USER}/${repo.name}/contents`);
  snapshot.readmes[key] = await api(`/repos/${USER}/${repo.name}/readme`, 'application/vnd.github.html').catch(() => null);
}
await writeFile(new URL('../src/content/githubSnapshot.json', import.meta.url), `${JSON.stringify(snapshot)}\n`);
console.log(`Saved ${repos.length} repos for ${USER}.`);
