import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWindowState, windowReducer } from '../src/windowState.js';
const app = id => ({ id, label: id, defaultSize: { width: 600, height: 400 } });
const open = (state, id) => windowReducer(state, { type: 'open', app: app(id) });

test('reopening an existing app raises it without duplicating it', () => {
  let state = open(open(initialWindowState, 'portfolio'), 'games');
  state = open(state, 'portfolio');
  assert.equal(state.windows.length, 2);
  assert.equal(state.activeWindow, 'portfolio');
  assert.equal(state.windows.at(-1).id, 'portfolio');
  assert.ok(state.windows.at(-1).zIndex > state.windows[0].zIndex);
});
test('new windows stay above repeatedly focused windows', () => {
  let state = open(open(initialWindowState, 'portfolio'), 'games');
  for (let i = 0; i < 10; i++) state = windowReducer(state, { type: 'focus', id: 'portfolio' });
  state = windowReducer(state, { type: 'close', id: 'games' });
  state = open(state, 'games');
  assert.equal(state.windows.at(-1).id, state.activeWindow);
  assert.equal(new Set(state.windows.map(win => win.zIndex)).size, 2);
});
test('minimize selects the next visible window; focus restores it', () => {
  let state = open(open(initialWindowState, 'portfolio'), 'games');
  state = windowReducer(state, { type: 'minimize', id: 'games' });
  assert.equal(state.activeWindow, 'portfolio');
  assert.equal(state.windows.find(win => win.id === 'games').minimized, true);
  state = windowReducer(state, { type: 'focus', id: 'games' });
  assert.equal(state.activeWindow, 'games');
  assert.equal(state.windows.at(-1).minimized, false);
});
test('closing an active window skips minimized windows', () => {
  let state = open(open(initialWindowState, 'portfolio'), 'games');
  state = windowReducer(state, { type: 'minimize', id: 'portfolio' });
  state = windowReducer(state, { type: 'close', id: 'games' });
  assert.equal(state.activeWindow, null);
});
test('maximize toggles and reopening restores a minimized maximized app', () => {
  let state = open(initialWindowState, 'portfolio');
  state = windowReducer(state, { type: 'maximize', id: 'portfolio' });
  assert.equal(state.windows[0].maximized, true);
  state = windowReducer(state, { type: 'minimize', id: 'portfolio' });
  state = open(state, 'portfolio');
  assert.equal(state.windows[0].maximized, true);
  assert.equal(state.windows[0].minimized, false);
  state = windowReducer(state, { type: 'maximize', id: 'portfolio' });
  assert.equal(state.windows[0].maximized, false);
});

test('open with a request passes it to the app and bumps its nonce', () => {
  let state = windowReducer(initialWindowState, { type: 'open', app: app('portfolio'), request: { path: 'resume' } });
  assert.deepEqual(state.windows[0].request, { path: 'resume', nonce: 1 });
  state = windowReducer(state, { type: 'open', app: app('portfolio'), request: { path: 'contact' } });
  assert.deepEqual(state.windows[0].request, { path: 'contact', nonce: 2 });
  state = open(state, 'portfolio');
  assert.equal(state.windows[0].request.path, 'contact');
});
test('closeAll clears every window', () => {
  const state = windowReducer(open(open(initialWindowState, 'a'), 'b'), { type: 'closeAll' });
  assert.equal(state.windows.length, 0);
  assert.equal(state.activeWindow, null);
});
test('retitle renames one window, and only when the title changes', () => {
  let state = open(open(initialWindowState, 'portfolio'), 'games');
  state = windowReducer(state, { type: 'retitle', id: 'portfolio', title: 'Fizz Search - Internet Explorer' });
  assert.equal(state.windows.find(win => win.id === 'portfolio').title, 'Fizz Search - Internet Explorer');
  assert.equal(windowReducer(state, { type: 'retitle', id: 'portfolio', title: 'Fizz Search - Internet Explorer' }), state);
  assert.equal(windowReducer(state, { type: 'retitle', id: 'missing', title: 'x' }), state);
});
