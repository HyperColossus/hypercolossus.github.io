import test from 'node:test';
import assert from 'node:assert/strict';
import { initialTabs, tabsReducer, currentUrl, MAX_TABS } from '../src/apps/browser/tabs.js';
import { homeUrl, searchUrl, NEW_TAB_URL } from '../src/apps/browser/router.js';
import { searchSite } from '../src/apps/browser/localSearch.js';

const active = state => state.tabs.find(tab => tab.id === state.activeId);

test('each tab keeps its own history', () => {
  let state = initialTabs(homeUrl());
  state = tabsReducer(state, { type: 'navigate', url: homeUrl('work') });
  state = tabsReducer(state, { type: 'open' });
  assert.equal(state.tabs.length, 2);
  assert.equal(currentUrl(active(state)), NEW_TAB_URL);
  state = tabsReducer(state, { type: 'navigate', url: 'https://www.google.com/search?q=esports' });
  assert.equal(currentUrl(active(state)), searchUrl('esports') + '&via=google.com', 'search engines become Fizz Search');
  state = tabsReducer(state, { type: 'activate', id: state.tabs[0].id });
  state = tabsReducer(state, { type: 'step', delta: -1 });
  assert.equal(currentUrl(active(state)), homeUrl());
  state = tabsReducer(state, { type: 'step', delta: 1 });
  assert.equal(currentUrl(active(state)), homeUrl('work'));
  assert.equal(currentUrl(state.tabs[1]), searchUrl('esports') + '&via=google.com');
});

test('navigating forward from the middle drops the old forward history; same URL reloads', () => {
  let state = initialTabs(homeUrl());
  state = tabsReducer(state, { type: 'navigate', url: homeUrl('work') });
  state = tabsReducer(state, { type: 'step', delta: -1 });
  state = tabsReducer(state, { type: 'navigate', url: homeUrl('resume') });
  assert.deepEqual(active(state).entries, [homeUrl(), homeUrl('resume')]);
  state = tabsReducer(state, { type: 'navigate', url: homeUrl('resume') });
  assert.equal(active(state).entries.length, 2);
  assert.equal(active(state).reload, 1);
});

test('new tabs open next to the current one; closing picks a neighbour', () => {
  let state = initialTabs(homeUrl());
  const first = state.activeId;
  state = tabsReducer(state, { type: 'open', url: homeUrl('work') });
  state = tabsReducer(state, { type: 'activate', id: first });
  state = tabsReducer(state, { type: 'open', url: homeUrl('contact'), background: true });
  assert.equal(state.activeId, first, 'background tabs don’t steal focus');
  assert.deepEqual(state.tabs.map(tab => currentUrl(tab)), [homeUrl(), homeUrl('contact'), homeUrl('work')]);
  state = tabsReducer(state, { type: 'close', id: first });
  assert.equal(currentUrl(active(state)), homeUrl('contact'));
  state = tabsReducer(state, { type: 'close' });
  state = tabsReducer(state, { type: 'close' });
  assert.equal(state.tabs.length, 0);
});

test('tab limit: extra foreground links reuse the current tab', () => {
  let state = initialTabs(homeUrl());
  for (let i = 0; i < MAX_TABS + 3; i++) state = tabsReducer(state, { type: 'open', url: homeUrl('work') });
  assert.equal(state.tabs.length, MAX_TABS);
});

test('titles only stick to the page they were reported for', () => {
  let state = initialTabs(homeUrl());
  state = tabsReducer(state, { type: 'title', url: homeUrl('work'), title: 'stale' });
  assert.equal(active(state).title, null);
  state = tabsReducer(state, { type: 'title', url: homeUrl(), title: 'Home' });
  assert.equal(active(state).title, 'Home');
});

test('Fizz finds Zack’s own pages and videos', () => {
  assert.equal(searchSite('resume')[0].url, homeUrl('resume'));
  assert.ok(searchSite('watchNACL').some(result => result.url === homeUrl('work/watchnacl')));
  assert.ok(searchSite('aphelios').some(result => result.video));
  assert.deepEqual(searchSite('zzqx nothing'), []);
});

test('pages showing through the proxy update the tab as the user browses inside them', () => {
  let state = initialTabs('https://example.com/');
  state = tabsReducer(state, { type: 'frame', url: 'https://example.com/', title: 'Example' });
  assert.deepEqual(active(state).entries, ['https://example.com/']);
  assert.equal(active(state).title, 'Example');
  state = tabsReducer(state, { type: 'frame', url: 'https://example.com/about', title: 'About' });
  assert.deepEqual(active(state).entries, ['https://example.com/', 'https://example.com/about']);
  state = tabsReducer(state, { type: 'frame', url: 'https://example.com/about#team', title: 'About', replace: true });
  assert.deepEqual(active(state).entries, ['https://example.com/', 'https://example.com/about#team']);
  state = tabsReducer(state, { type: 'step', delta: -1 });
  assert.equal(currentUrl(active(state)), 'https://example.com/');
});
