import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInput, classify, searchUrl, homeUrl, titleFor, NEW_TAB_URL } from '../src/apps/browser/router.js';

test('typed words become a Fizz Search, typed addresses become URLs', () => {
  assert.equal(resolveInput('zack siegel'), 'http://www.fizzsearch.com/search?q=zack+siegel');
  assert.equal(resolveInput('  '), null);
  assert.equal(resolveInput('github.com/HyperColossus'), 'https://github.com/HyperColossus');
  assert.equal(resolveInput('https://en.wikipedia.org/wiki/Esports'), 'https://en.wikipedia.org/wiki/Esports');
  assert.equal(resolveInput('hypercoloss.us/work'), 'https://hypercoloss.us/work');
  assert.equal(resolveInput('localhost:3000'), 'http://localhost:3000/');
  assert.equal(resolveInput('what is 2+2?'), searchUrl('what is 2+2?'));
  assert.equal(resolveInput('mailto:a@b.co'), 'mailto:a@b.co');
});

test('the homepage and its pages', () => {
  assert.deepEqual(classify(homeUrl()), { site: 'home', path: 'home' });
  assert.deepEqual(classify(homeUrl('work/video')), { site: 'home', path: 'work/video' });
  assert.deepEqual(classify('http://hypercoloss.us/index.html'), { site: 'home', path: 'home' });
});

test('search engines redirect to Fizz Search', () => {
  assert.deepEqual(classify('https://www.google.com/search?q=league+of+legends'), { site: 'redirect', to: searchUrl('league of legends') + '&via=google.com', from: 'google.com' });
  assert.equal(classify('https://bing.com').to, NEW_TAB_URL + '?via=bing.com');
  assert.deepEqual(classify(searchUrl('cola os')), { site: 'search', query: 'cola os', via: null });
  assert.deepEqual(classify(searchUrl('cola os') + '&via=google.com'), { site: 'search', query: 'cola os', via: 'google.com' });
  assert.deepEqual(classify(NEW_TAB_URL), { site: 'search', query: '', via: null });
});

test('GitHub, Wikipedia and YouTube are drawn by the browser itself', () => {
  assert.deepEqual(classify('https://github.com/HyperColossus'), { site: 'github', owner: 'HyperColossus' });
  assert.deepEqual(classify('https://github.com/a/b'), { site: 'github', owner: 'a', repo: 'b', kind: 'repo', ref: null, path: '' });
  assert.deepEqual(classify('https://github.com/a/b/blob/main/src/x.js'), { site: 'github', owner: 'a', repo: 'b', kind: 'file', ref: 'main', path: 'src/x.js' });
  assert.deepEqual(classify('https://github.com/a/b/tree/main/src'), { site: 'github', owner: 'a', repo: 'b', kind: 'dir', ref: 'main', path: 'src' });
  assert.deepEqual(classify('https://en.wikipedia.org/wiki/League_of_Legends#History'), { site: 'wiki', lang: 'en', title: 'League of Legends', hash: 'History' });
  assert.equal(classify('https://wikipedia.org').title, 'Main Page');
  assert.equal(classify('https://www.youtube.com/watch?v=QbcjEgv_FVo').id, 'QbcjEgv_FVo');
  assert.equal(classify('https://youtu.be/QbcjEgv_FVo').id, 'QbcjEgv_FVo');
  assert.deepEqual(classify('https://www.youtube.com/shorts/6jOMhtlukkY'), { site: 'video', id: '6jOMhtlukkY', isShort: true, list: null, channel: null });
});

test('sites that refuse embedding get an explanation; others are framed over https', () => {
  assert.equal(classify('https://www.linkedin.com/in/someone').site, 'blocked');
  assert.deepEqual(classify('http://example.com/a'), { site: 'frame', url: 'http://example.com/a', src: 'https://example.com/a', host: 'example.com' });
  assert.equal(classify('https://www.reddit.com/r/leagueoflegends').site, 'frame');
  assert.equal(classify('http://localhost:3000').site, 'error');
});

test('tab titles', () => {
  assert.equal(titleFor(searchUrl('esports')), 'esports - Fizz Search');
  assert.equal(titleFor('https://github.com/a/b'), 'a/b');
  assert.equal(titleFor('https://en.wikipedia.org/wiki/Esports'), 'Esports - Wikipedia');
});

test('social links open inside the browser through official embeds', () => {
  assert.deepEqual(classify('https://x.com/watchNACL/status/1834567890123456789'), { site: 'x', kind: 'post', user: 'watchNACL', id: '1834567890123456789' });
  assert.deepEqual(classify('https://twitter.com/i/web/status/20'), { site: 'x', kind: 'post', user: null, id: '20' });
  assert.deepEqual(classify('https://x.com/watchNACL'), { site: 'x', kind: 'profile', user: 'watchNACL' });
  assert.deepEqual(classify('https://x.com/LPL_English?lang=en'), { site: 'x', kind: 'profile', user: 'LPL_English' });
  assert.deepEqual(classify('https://x.com/explore'), { site: 'x', kind: 'home' });
  assert.deepEqual(classify('https://www.youtube.com/@SamIsDual/videos'), { site: 'video', id: null, isShort: false, list: null, channel: { path: '/@SamIsDual' } });
  assert.deepEqual(classify('https://www.youtube.com/channel/UCvqRdlKsE5Q8mf8YXbdIJLw').channel, { id: 'UCvqRdlKsE5Q8mf8YXbdIJLw' });
  assert.equal(classify('https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Ar_3GPy3workLeLeLe12').list, 'PLbpi6ZahtOH6Ar_3GPy3workLeLeLe12');
  assert.equal(classify('https://www.instagram.com/p/BsOGulcndj-/').src, 'https://www.instagram.com/p/BsOGulcndj-/embed/captioned/');
  assert.equal(classify('https://www.instagram.com/reels/ABCDEFGHIJ/').src, 'https://www.instagram.com/reel/ABCDEFGHIJ/embed/captioned/');
  assert.deepEqual(classify('https://www.instagram.com/lolesports/'), { site: 'blocked', host: 'instagram.com', handle: 'lolesports' });
  assert.equal(classify('https://www.tiktok.com/@lolesports/video/6718335390845095173').src, 'https://www.tiktok.com/embed/v2/6718335390845095173');
  assert.equal(classify('https://www.tiktok.com/@lolesports').handle, 'lolesports');
  assert.equal(classify('https://www.twitch.tv/RiotGames').channel, 'riotgames');
  assert.equal(classify('https://www.twitch.tv/videos/123456789').video, '123456789');
  assert.equal(classify('https://clips.twitch.tv/FunnyClipSlug').clip, 'FunnyClipSlug');
  assert.equal(classify('https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC').src, 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
  assert.equal(titleFor('https://x.com/watchNACL'), '@watchNACL on X');
  assert.equal(titleFor('https://x.com/watchNACL/status/1'), 'Post by @watchNACL on X');
});
