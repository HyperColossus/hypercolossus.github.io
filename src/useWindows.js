import { createContext, useContext } from 'react';
export const WindowContext = createContext(null);
export function useWindows() {
  const context = useContext(WindowContext);
  if (!context) throw new Error('Desktop windows require a WindowProvider.');
  return context;
}
