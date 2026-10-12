export const initialWindowState = { windows: [], activeWindow: null };

const topVisible = windows => [...windows].reverse().find(win => !win.minimized)?.id ?? null;
const stack = windows => windows.map((win, index) => ({ ...win, zIndex: index + 1 }));

export function windowReducer(state, action) {
  const current = state.windows.find(win => win.id === action.id);
  switch (action.type) {
    case 'open': {
      const existing = state.windows.find(win => win.id === action.app.id);
      // `request` lets a caller ask an open app to do something (e.g. the browser to show a page).
      const win = { ...(existing || action.app), minimized: false, ...(action.request ? { request: { ...action.request, nonce: (existing?.request?.nonce ?? 0) + 1 } } : {}) };
      return { windows: stack([...state.windows.filter(item => item.id !== win.id), win]), activeWindow: win.id };
    }
    case 'focus':
      if (!current) return state;
      return { windows: stack([...state.windows.filter(win => win.id !== action.id), { ...current, minimized: false }]), activeWindow: action.id };
    case 'close': {
      const windows = stack(state.windows.filter(win => win.id !== action.id));
      return { windows, activeWindow: state.activeWindow === action.id ? topVisible(windows) : state.activeWindow };
    }
    case 'minimize': {
      const windows = state.windows.map(win => win.id === action.id ? { ...win, minimized: true } : win);
      return { windows, activeWindow: state.activeWindow === action.id ? topVisible(windows) : state.activeWindow };
    }
    case 'maximize':
      if (!current) return state;
      return { windows: stack([...state.windows.filter(win => win.id !== action.id), { ...current, maximized: !current.maximized, minimized: false }]), activeWindow: action.id };
    case 'retitle': // an app names its window after what it's showing (the browser: the page title)
      if (!current || current.title === action.title) return state;
      return { ...state, windows: state.windows.map(win => win.id === action.id ? { ...win, title: action.title } : win) };
    case 'closeAll':
      return initialWindowState;
    default:
      return state;
  }
}
