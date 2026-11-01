import React, { lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindows } from '../useWindows';
import { appById, desktopConfig, shortcuts } from '../desktopConfig';
import Window from './Window';
import PixelIcon from './PixelIcon';
import StartMenu from './StartMenu';
import RetroBrowser from '../apps/RetroBrowser';
import RetroSteam from '../apps/RetroSteam';
import Notepad from '../apps/Notepad';
import AppBoundary from './AppBoundary';
import './cola-os.css';

const RiftboundCompanion = lazy(() => import('../apps/RiftboundCompanion'));
const APP_MAP = { RetroBrowser, RetroSteam, Notepad, RiftboundCompanion };
const BOOT_MS = 1100;
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Cola OS. `powered`/`onPowerOn`/`onShutdown` come from the 3D intro; without them the
// desktop manages its own power state (reduced-motion and no-3D fallbacks).
export default function Desktop({ powered, onPowerOn, onShutdown }) {
  const { windows, openWindow, closeAll } = useWindows();
  const [localOn, setLocalOn] = useState(true);
  const isOn = onPowerOn ? !!powered : localOn;
  const [phase, setPhase] = useState(() => (isOn ? (prefersReducedMotion() ? 'ready' : 'boot') : 'off'));
  const [startOpen, setStartOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const greeted = useRef(false);
  const desktopRef = useRef(null);
  const [desktopSize, setDesktopSize] = useState({ width: 800, height: 570 });

  // Power transitions: off → boot → ready.
  useEffect(() => {
    if (!isOn) { setPhase('off'); greeted.current = false; return; }
    setPhase(current => (current === 'off' ? (prefersReducedMotion() ? 'ready' : 'boot') : current));
  }, [isOn]);
  useEffect(() => {
    if (phase !== 'boot') return;
    const finish = () => setPhase('ready');
    const timer = setTimeout(finish, BOOT_MS);
    window.addEventListener('keydown', finish);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', finish); };
  }, [phase]);
  // First boot: open the recruiter guide.
  useEffect(() => {
    if (isOn && phase === 'ready' && !greeted.current) { greeted.current = true; openWindow(appById('readme')); }
  }, [isOn, phase, openWindow]);

  useLayoutEffect(() => {
    const el = desktopRef.current;
    if (!el) return;
    const measure = () => setDesktopSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!startOpen) return;
    const onKey = event => { if (event.key === 'Escape') setStartOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startOpen]);

  const launch = shortcut => { setStartOpen(false); openWindow(appById(shortcut.app), shortcut.request); };
  // Safety net: nothing on the desktop leaves the site. Any web link that no app handled itself
  // (e.g. target="_blank" links) opens in Internet Explorer instead of a real browser tab.
  const keepLinksInside = event => {
    if (event.defaultPrevented || (event.type === 'auxclick' && event.button !== 1)) return;
    const link = event.target.closest?.('a[href]');
    if (!link || !/^https?:/i.test(link.href)) return;
    const sameSite = new URL(link.href).origin === window.location.origin && link.target !== '_blank';
    if (sameSite) return;
    event.preventDefault();
    openWindow(appById('portfolio'), { url: link.href });
  };
  const powerOn = () => (onPowerOn ? onPowerOn() : setLocalOn(true));
  const shutDown = () => {
    setStartOpen(false);
    setSelected(null);
    closeAll();
    if (onShutdown) onShutdown(); else setLocalOn(false);
  };
  const restart = () => {
    setStartOpen(false);
    setSelected(null);
    closeAll();
    greeted.current = false;
    setPhase(prefersReducedMotion() ? 'ready' : 'boot');
  };

  return <div className="cola-os" data-phase={phase} onClick={keepLinksInside} onAuxClick={keepLinksInside}>
    <div ref={desktopRef} className="os-workspace" inert={phase !== 'ready'} onPointerDown={event => { if (event.target === event.currentTarget || event.target.classList.contains('os-icons')) { setSelected(null); setStartOpen(false); } }}>
      <span className="os-watermark" aria-hidden="true"><PixelIcon name="cola" size={48} />Cola OS</span>
      <ul className="os-icons" aria-label="Desktop">
        {shortcuts.map(shortcut => <li key={shortcut.key}>
          <button className={`os-icon ${selected === shortcut.key ? 'is-selected' : ''}`}
            onClick={() => setSelected(shortcut.key)} onDoubleClick={() => launch(shortcut)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); launch(shortcut); } }}
            title="Double-click to open">
            <PixelIcon name={shortcut.icon} size={32} /><span>{shortcut.label}</span>
          </button>
        </li>)}
      </ul>
      {windows.map(win => {
        const AppComponent = APP_MAP[win.appName];
        return <Window key={win.id} windowData={win} desktopRef={desktopRef} desktopSize={desktopSize}>
          {AppComponent ? <AppBoundary><AppComponent windowData={win} /></AppBoundary> : <p>App not found</p>}
        </Window>;
      })}
    </div>
    <Taskbar inert={phase !== 'ready'} startOpen={startOpen} onStart={() => setStartOpen(open => !open)} />
    {startOpen && <StartMenu onLaunch={launch} onShutDown={shutDown} onRestart={restart} />}
    {phase === 'off' && <Standby onPowerOn={powerOn} />}
    {phase === 'boot' && <BootScreen onSkip={() => setPhase('ready')} />}
  </div>;
}

function Taskbar({ inert, startOpen, onStart }) {
  const { windows, activeWindow, focusWindow, minimizeWindow } = useWindows();
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setTime(new Date()), 15000); return () => clearInterval(timer); }, []);
  const running = desktopConfig.filter(app => windows.some(win => win.id === app.id));
  // While the screen is off or booting, nothing behind it can be clicked or focused.
  return <footer className="os-taskbar" inert={inert}>
    <button className={`os-start ${startOpen ? 'is-pressed' : ''}`} aria-expanded={startOpen} aria-haspopup="menu" onClick={onStart}><PixelIcon name="cola" size={16} />Start</button>
    <span className="os-taskbar-sep" aria-hidden="true" />
    <div className="os-tasks" role="group" aria-label="Open windows">
      {running.map(app => {
        const win = windows.find(item => item.id === app.id);
        const active = activeWindow === app.id && !win.minimized;
        return <button key={app.id} className={`os-task ${active ? 'is-pressed' : ''}`} aria-pressed={active}
          onClick={() => (active ? minimizeWindow(app.id) : focusWindow(app.id))}>
          <PixelIcon name={app.icon} size={16} /><span>{app.label}</span>
        </button>;
      })}
    </div>
    <span className="os-tray"><time dateTime={time.toISOString()}>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></span>
  </footer>;
}

// Standby: the screen is fully blank (a powered-off tube) until the computer's power button is
// pressed in the 3D scene. This invisible button keeps power-on keyboard-reachable (Tab + Enter)
// and ignores pointer clicks.
function Standby({ onPowerOn }) {
  return <button className="os-standby" onClick={onPowerOn} aria-label="Power on Cola OS" />;
}

function BootScreen({ onSkip }) {
  return <div className="os-boot" onPointerDown={onSkip} role="status" aria-label="Cola OS is starting">
    <PixelIcon name="cola" size={96} />
    <span className="os-boot-name">Cola<b>OS</b></span>
    <span className="os-boot-bar" aria-hidden="true"><i /></span>
    <span className="os-boot-hint">Click or press any key to skip</span>
  </div>;
}
