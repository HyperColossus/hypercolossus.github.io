import React, { useRef, useState } from 'react';
import { useWindows } from '../useWindows';
import { X, Minus, Minimize2, Square } from 'lucide-react';
import PixelIcon from './PixelIcon';
import './window-chrome.css';

// One window on the Cola OS desktop. The shell owns behavior (focus, drag, min/max/close);
// `windowData.chrome` picks the frame: 'classic' (Cola OS default, 90s) or an app's own look ('xp', …).
export default function Window({ windowData, children, desktopSize, desktopRef }) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, activeWindow } = useWindows();
  const chrome = windowData.chrome || 'classic';
  const isActive = activeWindow === windowData.id;
  const minSize = windowData.minSize ?? { width: 280, height: 180 };
  const [size, setSize] = useState(null);
  const width = Math.min(size?.width ?? windowData.defaultSize.width, desktopSize.width);
  const height = Math.min(size?.height ?? windowData.defaultSize.height, desktopSize.height);
  const [position, setPosition] = useState(null);
  const drag = useRef(null);
  const resize = useRef(null);
  const fallback = windowData.defaultPosition ?? { x: (desktopSize.width - width) / 2, y: (desktopSize.height - height) / 2 };
  const x = Math.max(0, Math.min(position?.x ?? fallback.x, desktopSize.width - width));
  const y = Math.max(0, Math.min(position?.y ?? fallback.y, desktopSize.height - height));
  const maximized = windowData.maximized;
  const label = windowData.label;

  const startDrag = event => {
    if (maximized || event.button !== 0 || event.target.closest('button')) return;
    const bounds = desktopRef.current.getBoundingClientRect();
    drag.current = { startX: event.clientX, startY: event.clientY, x, y, scaleX: bounds.width / desktopSize.width, scaleY: bounds.height / desktopSize.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const moveDrag = event => {
    const start = drag.current;
    if (!start) return;
    setPosition({
      x: Math.max(0, Math.min(start.x + (event.clientX - start.startX) / start.scaleX, desktopSize.width - width)),
      y: Math.max(0, Math.min(start.y + (event.clientY - start.startY) / start.scaleY, desktopSize.height - height)),
    });
  };
  const endDrag = () => { drag.current = null; };

  // Resize from the bottom corners or the left, right and bottom edges. `sides` says which sides move.
  const startResize = sides => event => {
    if (maximized || event.button !== 0) return;
    event.stopPropagation();
    focusWindow(windowData.id);
    setPosition({ x, y }); // pin a still-centered window so it doesn't re-center while resizing
    const bounds = desktopRef.current.getBoundingClientRect();
    resize.current = { sides, startX: event.clientX, startY: event.clientY, x, y, width, height, scaleX: bounds.width / desktopSize.width, scaleY: bounds.height / desktopSize.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const moveResize = event => {
    const start = resize.current;
    if (!start) return;
    const dx = (event.clientX - start.startX) / start.scaleX;
    const dy = (event.clientY - start.startY) / start.scaleY;
    const { sides } = start;
    const nextHeight = sides.includes('b') ? Math.max(minSize.height, Math.min(start.height + dy, desktopSize.height - start.y)) : start.height;
    if (sides.includes('l')) {
      const nextX = Math.max(0, Math.min(start.x + dx, start.x + start.width - minSize.width));
      setSize({ width: start.width + (start.x - nextX), height: nextHeight });
      setPosition({ x: nextX, y: start.y });
    } else {
      const nextWidth = sides.includes('r') ? Math.max(minSize.width, Math.min(start.width + dx, desktopSize.width - start.x)) : start.width;
      setSize({ width: nextWidth, height: nextHeight });
    }
  };
  const endResize = () => { resize.current = null; };
  const handleProps = sides => ({ onPointerDown: startResize(sides), onPointerMove: moveResize, onPointerUp: endResize, onPointerCancel: endResize, onLostPointerCapture: endResize });

  const controls = <div className="win-controls" onPointerDown={event => event.stopPropagation()}>
    <button aria-label={`Minimize ${label}`} onClick={() => minimizeWindow(windowData.id)}><Minus size={10} strokeWidth={3} /></button>
    <button aria-label={`${maximized ? 'Restore' : 'Maximize'} ${label}`} onClick={() => maximizeWindow(windowData.id)}>{maximized ? <Minimize2 size={9} strokeWidth={3} /> : <Square size={9} strokeWidth={3} />}</button>
    <button className="win-close" aria-label={`Close ${label}`} onClick={() => closeWindow(windowData.id)}><X size={11} strokeWidth={3} /></button>
  </div>;

  return (
    <section role="dialog" aria-label={label} hidden={windowData.minimized}
      data-chrome={chrome} data-active={isActive}
      onPointerDown={() => focusWindow(windowData.id)} onFocusCapture={() => { if (!isActive) focusWindow(windowData.id); }}
      style={{ left: maximized ? 0 : x, top: maximized ? 0 : y, width: maximized ? desktopSize.width : width, height: maximized ? desktopSize.height : height, zIndex: windowData.zIndex, display: windowData.minimized ? 'none' : 'flex' }}
      className="os-window">
      <div className="win-titlebar" onDoubleClick={event => { if (!event.target.closest('button')) maximizeWindow(windowData.id); }}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
        <span className="win-title"><PixelIcon name={windowData.icon} size={16} />{windowData.title || label}</span>
        {controls}
      </div>
      <div className="win-body">{children}</div>
      {!maximized && <>
        <span className="win-edge win-edge-left" aria-hidden="true" {...handleProps('l')} />
        <span className="win-edge win-edge-right" aria-hidden="true" {...handleProps('r')} />
        <span className="win-edge win-edge-bottom" aria-hidden="true" {...handleProps('b')} />
        <span className="win-resize win-resize-left" aria-hidden="true" {...handleProps('lb')} />
        <span className="win-resize win-resize-right" aria-hidden="true" {...handleProps('rb')} />
      </>}
    </section>
  );
}
