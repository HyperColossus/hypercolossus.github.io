import React, { useRef, useState } from 'react';
import { useWindows } from '../useWindows';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';

export default function Window({ windowData, children, desktopSize, desktopRef }) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, activeWindow } = useWindows();
  const isActive = activeWindow === windowData.id;
  const width = Math.min(windowData.defaultSize.width, desktopSize.width);
  const height = Math.min(windowData.defaultSize.height, desktopSize.height);
  const [position, setPosition] = useState(null);
  const drag = useRef(null);
  const x = Math.max(0, Math.min(position?.x ?? (desktopSize.width - width) / 2, desktopSize.width - width));
  const y = Math.max(0, Math.min(position?.y ?? (desktopSize.height - height) / 2, desktopSize.height - height));
  const maximized = windowData.maximized;
  const endDrag = () => { drag.current = null; };

  return (
    <section role="dialog" aria-label={windowData.label} hidden={windowData.minimized}
      onPointerDown={() => focusWindow(windowData.id)} onFocusCapture={() => { if (!isActive) focusWindow(windowData.id); }}
      style={{ left: maximized ? 0 : x, top: maximized ? 0 : y, width: maximized ? desktopSize.width : width, height: maximized ? desktopSize.height : height, zIndex: windowData.zIndex, display: windowData.minimized ? 'none' : 'flex' }}
      className={`studio-window absolute flex-col bg-white/95 backdrop-blur-3xl overflow-hidden border border-black/5 ${isActive ? 'shadow-2xl' : 'shadow-xl opacity-95'} ${maximized ? 'rounded-none' : 'rounded-xl'}`}>
      
      <div className={`window-titlebar flex h-12 shrink-0 touch-none select-none items-center px-4 border-b border-black/5 transition-colors ${isActive ? 'bg-white/50' : 'bg-white/30'}`}
        onDoubleClick={event => { if (!event.target.closest('button')) maximizeWindow(windowData.id); }}
        onPointerDown={event => {
          if (maximized || event.button !== 0 || event.target.closest('button')) return;
          const bounds = desktopRef.current.getBoundingClientRect();
          drag.current = { startX: event.clientX, startY: event.clientY, x, y, scaleX: bounds.width / desktopSize.width, scaleY: bounds.height / desktopSize.height };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          const start = drag.current;
          setPosition({ x: Math.max(0, Math.min(start.x + (event.clientX - start.startX) / start.scaleX, desktopSize.width - width)), y: Math.max(0, Math.min(start.y + (event.clientY - start.startY) / start.scaleY, desktopSize.height - height)) });
        }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
        
        <div className="flex gap-2 absolute left-4" onPointerDown={event => event.stopPropagation()}>
          <button 
            aria-label={`Close ${windowData.label}`} 
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 text-[#ff5f56] hover:text-black/50 transition-all focus:outline-none" 
            onClick={() => closeWindow(windowData.id)}
          >
            <X size={8} strokeWidth={3} className="opacity-0 hover:opacity-100" />
          </button>
          <button 
            aria-label={`Minimize ${windowData.label}`} 
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 text-[#ffbd2e] hover:text-black/50 transition-all focus:outline-none" 
            onClick={() => minimizeWindow(windowData.id)}
          >
            <Minus size={8} strokeWidth={3} className="opacity-0 hover:opacity-100" />
          </button>
          <button 
            aria-label={`${maximized ? 'Restore' : 'Maximize'} ${windowData.label}`} 
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 text-[#27c93f] hover:text-black/50 transition-all focus:outline-none" 
            onClick={() => maximizeWindow(windowData.id)}
          >
            {maximized ? <Minimize2 size={8} strokeWidth={3} className="opacity-0 hover:opacity-100" /> : <Maximize2 size={8} strokeWidth={3} className="opacity-0 hover:opacity-100" />}
          </button>
        </div>

        <span className="truncate text-sm font-semibold text-zinc-700 mx-auto pointer-events-none">
          {windowData.label}
        </span>
      </div>
      
      <div className="relative min-h-0 flex-1 select-text overflow-auto bg-transparent">
        {children}
      </div>
    </section>
  );
}

