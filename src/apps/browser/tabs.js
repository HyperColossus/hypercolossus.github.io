// Browser tabs: each has its own Back/Forward history. Pure reducer, tested in
// scripts/browserTabs.test.mjs.
import { classify, NEW_TAB_URL } from './router.js';

export const MAX_TABS = 8;
let nextId = 1;
const makeTab = url => ({ id: `tab-${nextId++}`, entries: [url], index: 0, reload: 0, title: null });
export const currentUrl = tab => tab.entries[tab.index];

// Search-engine addresses (google.com/search?q=…) turn into Fizz Search before they're stored.
export function finalUrl(url) {
  const page = classify(url);
  return page.site === 'redirect' ? page.to : url;
}

export function initialTabs(url) {
  const tab = makeTab(finalUrl(url));
  return { tabs: [tab], activeId: tab.id };
}

const update = (state, id, change) => ({ ...state, tabs: state.tabs.map(tab => tab.id === id ? { ...tab, ...change(tab) } : tab) });

export function tabsReducer(state, action) {
  const id = action.id ?? state.activeId;
  switch (action.type) {
    case 'navigate': {
      const url = finalUrl(action.url);
      return update(state, id, tab => currentUrl(tab) === url
        ? { reload: tab.reload + 1 }
        : { entries: [...tab.entries.slice(0, tab.index + 1), url], index: tab.index + 1, title: null });
    }
    case 'step':
      return update(state, id, tab => {
        const index = Math.max(0, Math.min(tab.entries.length - 1, tab.index + action.delta));
        return index === tab.index ? {} : { index, title: null };
      });
    case 'reload':
      return update(state, id, tab => ({ reload: tab.reload + 1 }));
    // A page showing through the proxy reports where it is now (the user clicked a link inside it,
    // a form was sent, a script changed the address). Redirects and replaceState replace the entry.
    case 'frame': {
      const url = finalUrl(action.url);
      return update(state, id, tab => {
        if (currentUrl(tab) === url) return action.title ? { title: action.title } : {};
        const keep = action.replace ? tab.index : tab.index + 1;
        return { entries: [...tab.entries.slice(0, keep), url], index: keep, title: action.title || null };
      });
    }
    case 'title':
      return update(state, id, tab => currentUrl(tab) === action.url ? { title: action.title } : {});
    case 'open': {
      // Out of room: a foreground request uses the current tab instead.
      if (state.tabs.length >= MAX_TABS) return action.background || !action.url ? state : tabsReducer(state, { type: 'navigate', url: action.url });
      const tab = makeTab(finalUrl(action.url ?? NEW_TAB_URL));
      const after = state.tabs.findIndex(item => item.id === (action.after ?? state.activeId));
      const tabs = [...state.tabs];
      tabs.splice(after < 0 ? tabs.length : after + 1, 0, tab);
      return { tabs, activeId: action.background ? state.activeId : tab.id };
    }
    case 'close': {
      const index = state.tabs.findIndex(tab => tab.id === id);
      if (index < 0) return state;
      const tabs = state.tabs.filter(tab => tab.id !== id);
      if (!tabs.length) return { tabs, activeId: null };
      const activeId = state.activeId === id ? tabs[Math.min(index, tabs.length - 1)].id : state.activeId;
      return { tabs, activeId };
    }
    case 'activate':
      return state.tabs.some(tab => tab.id === action.id) ? { ...state, activeId: action.id } : state;
    default:
      return state;
  }
}
