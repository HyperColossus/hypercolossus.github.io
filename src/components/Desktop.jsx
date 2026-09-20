import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindows } from '../useWindows';
import { desktopConfig } from '../desktopConfig';
import { Folder, Joystick, ArrowUpRight } from 'lucide-react';
import Window from './Window';
import RetroBrowser from '../apps/RetroBrowser';
import RetroSteam from '../apps/RetroSteam';
import SideProjects from '../apps/SideProjects';

function ExplorerIcon({ size = 25 }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M25 22C22 27 12 29 8 22C4 15 9 7 17 7C24 7 27 12 26 17H8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="16" cy="17" rx="15" ry="7" transform="rotate(-35 16 17)" stroke="currentColor" strokeWidth="1.25" />
  </svg>;
}
const ICON_MAP = { browser: ExplorerIcon, gamepad: Joystick, folder: Folder };
const APP_MAP = { RetroBrowser, RetroSteam, SideProjects };

export default function Desktop() {
  const { windows, openWindow, activeWindow, focusWindow, minimizeWindow } = useWindows();
  const [time, setTime] = useState(() => new Date());
  const desktopRef = useRef(null);
  const [desktopSize, setDesktopSize] = useState({ width: 800, height: 480 });
  useLayoutEffect(() => {
    const el = desktopRef.current;
    const measure = () => setDesktopSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const dockApps = desktopConfig.filter(app => !app.folder);
  return <div className="studio-desktop">
    <div className="desktop-wallpaper" aria-hidden="true">
      <div className="wallpaper-depth wallpaper-depth-far" />
      <div className="wallpaper-grid" />
      <div className="wallpaper-orbit wallpaper-orbit-back" />
      <div className="wallpaper-sun" />
      <div className="wallpaper-orbit" />
      <div className="wallpaper-horizon wallpaper-horizon-back" />
      <div className="wallpaper-horizon" />
      <div className="wallpaper-depth wallpaper-depth-near" />
      <div className="wallpaper-vignette" />
    </div>
    <header className="desktop-menubar"><span className="desktop-brand"><span className="brand-mark">ZS</span><span>ZACK SIEGEL</span></span><span className="desktop-edition">PORTFOLIO SYSTEM / 2026</span><time dateTime={time.toISOString()}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></header>
    <div ref={desktopRef} className="desktop-workspace">
      <div className="desktop-shortcuts">{desktopConfig.filter(app => !app.folder).map(app => {
        const Icon = ICON_MAP[app.icon];
        return <button key={app.id} className={`desktop-shortcut shortcut-${app.id}`} onClick={() => openWindow(app)}><span className="shortcut-icon"><Icon size={25} strokeWidth={1.35} aria-hidden="true" /></span><span>{app.label}</span></button>;
      })}</div>
      <div className="desktop-welcome"><p className="eyebrow">Welcome to my corner of the internet</p><h1>Curiosity,<br />on <em>display.</em></h1><p>I’m Zack. I make things for screens.<br />Pick an app. Have a look around.</p><button className="studio-button" onClick={() => openWindow(desktopConfig[0])}>Meet the human <ArrowUpRight size={16} /></button></div>
      <span className="desktop-caption">SOCIAL / GAMES / VIDEO</span>
      {windows.map(win => { const AppComponent = APP_MAP[win.appName]; return <Window key={win.id} windowData={win} desktopRef={desktopRef} desktopSize={desktopSize}>{AppComponent ? <AppComponent /> : <p>App not found</p>}</Window>; })}
    </div>
    <footer className="desktop-dock-area"><div className="desktop-dock" role="group" aria-label="Applications">
      {dockApps.map(app => { const Icon = ICON_MAP[app.icon]; const win = windows.find(item => item.id === app.id); const running = Boolean(win); const active = activeWindow === app.id && running && !win.minimized;
        return <button key={app.id} className={`dock-app ${active ? 'is-active' : ''} ${running ? 'is-running' : ''}`} aria-label={app.label} aria-pressed={active} title={app.shortLabel} onClick={() => active ? minimizeWindow(app.id) : running ? focusWindow(app.id) : openWindow(app)}><Icon size={21} strokeWidth={1.5} aria-hidden="true" /><span className="dock-tooltip" aria-hidden="true">{app.shortLabel}</span>{running && <i className="running-dot" />}</button>;
      })}</div></footer>
  </div>;
}
