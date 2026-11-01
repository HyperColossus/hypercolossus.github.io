import React, { useReducer } from 'react';
import { WindowContext } from './useWindows';
import { initialWindowState, windowReducer } from './windowState';

export function WindowProvider({ children }) {
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);
  const value = {
    ...state,
    openWindow: (app, request) => dispatch({ type: 'open', app, request }),
    closeAll: () => dispatch({ type: 'closeAll' }),
    closeWindow: id => dispatch({ type: 'close', id }),
    focusWindow: id => dispatch({ type: 'focus', id }),
    minimizeWindow: id => dispatch({ type: 'minimize', id }),
    maximizeWindow: id => dispatch({ type: 'maximize', id }),
    retitleWindow: (id, title) => dispatch({ type: 'retitle', id, title }),
  };
  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}

