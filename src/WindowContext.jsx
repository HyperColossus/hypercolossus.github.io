import React, { useReducer } from 'react';
import { WindowContext } from './useWindows';
import { initialWindowState, windowReducer } from './windowState';

export function WindowProvider({ children }) {
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);
  const value = {
    ...state,
    openWindow: app => dispatch({ type: 'open', app }),
    closeWindow: id => dispatch({ type: 'close', id }),
    focusWindow: id => dispatch({ type: 'focus', id }),
    minimizeWindow: id => dispatch({ type: 'minimize', id }),
    maximizeWindow: id => dispatch({ type: 'maximize', id }),
  };
  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
}

