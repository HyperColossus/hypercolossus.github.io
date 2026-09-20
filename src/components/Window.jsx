import React, { useRef, useState } from 'react';
import { useWindows } from '../useWindows';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';

const TITLEBAR_HEIGHT = 38;
const EDGE_GRAB = 88;

function stableOffset(id) {
  const score = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return {
    x: ((score % 5) - 2) * 18,
    y: (((score * 3) % 5) - 2) * 14,
  };
}

function clampLoose(position, width, height, desktopSize) {
  return {
    x: Math.max(-width + EDGE_GRAB, Math.min(position.x, desktopSize.width - EDGE_GRAB)),
    y: Math.max(-8, Math.min(position.y, desktopSize.height - TITLEBAR_HEIGHT)),
  };
}

export default function Window({ windowData, children, desktopSize, desktopRef }) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, activeWindow } = useWindows();
  const isActive = activeWindow === windowData.id;
  const width = Math.min(windowData.defaultSize.width, desktopSize.width);
  const height = Math.min(windowData.defaultSize.height, desktopSize.height);
  const offset = stableOffset(windowData.id);
  const [position, setPosition] = useState(() => ({
    x: Math.max(0, (desktopSize.width - width) / 2 + offset.x),
    y: Math.max(8, (desktopSize.height - height) / 2 + offset.y),
  }));
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef(null);
  const maximized = windowData.maximized;
  const resolvedPosition = clampLoose(position, width, height, desktopSize);

  const endDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };

  return (
    <section
      role="dialog"
      aria-label={windowData.label}
      hidden={windowData.minimized}
      onPointerDown={() => focusWindow(windowData.id)}
      onFocusCapture={() => { if (!isActive) focusWindow(windowData.id); }}
      style={{
        width: maximized ? desktopSize.width : width,
        height: maximized ? desktopSize.height : height,
        zIndex: windowData.zIndex,
        display: windowData.minimized ? 'none' : 'flex',
        transform: maximized
          ? 'translate3d(0, 0, 0)'
          : `translate3d(${resolvedPosition.x}px, ${resolvedPosition.y}px, 0)`,
      }}
      className={`studio-window ${isActive ? 'is-active' : 'is-inactive'} ${isDragging ? 'is-dragging' : ''} ${maximized ? 'is-maximized' : ''}`}
    >
      <div
        className="window-titlebar"
        onDoubleClick={event => {
          if (!event.target.closest('button')) maximizeWindow(windowData.id);
        }}
        onPointerDown={event => {
          if (maximized || event.button !== 0 || event.target.closest('button')) return;
          const bounds = desktopRef.current.getBoundingClientRect();
          drag.current = {
            startX: event.clientX,
            startY: event.clientY,
            x: resolvedPosition.x,
            y: resolvedPosition.y,
            scaleX: bounds.width / desktopSize.width,
            scaleY: bounds.height / desktopSize.height,
          };
          setIsDragging(true);
          focusWindow(windowData.id);
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          const start = drag.current;
          setPosition(clampLoose({
            x: start.x + (event.clientX - start.startX) / start.scaleX,
            y: start.y + (event.clientY - start.startY) / start.scaleY,
          }, width, height, desktopSize));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <div className="window-controls" onPointerDown={event => event.stopPropagation()}>
          <button aria-label={`Close ${windowData.label}`} className="window-control window-control-close" onClick={() => closeWindow(windowData.id)}>
            <X size={11} strokeWidth={2} />
          </button>
          <button aria-label={`Minimize ${windowData.label}`} className="window-control" onClick={() => minimizeWindow(windowData.id)}>
            <Minus size={11} strokeWidth={2} />
          </button>
          <button aria-label={`${maximized ? 'Restore' : 'Maximize'} ${windowData.label}`} className="window-control" onClick={() => maximizeWindow(windowData.id)}>
            {maximized ? <Minimize2 size={10} strokeWidth={2} /> : <Maximize2 size={10} strokeWidth={2} />}
          </button>
        </div>

        <div className="window-title">
          <span className="window-title-dot" aria-hidden="true" />
          <span>{windowData.label}</span>
        </div>

        <span className="window-drag-hint" aria-hidden="true">DRAG</span>
      </div>

      <div className="window-content">
        {children}
      </div>
    </section>
  );
}
