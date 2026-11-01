import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Power, ChevronRight, ChevronLeft } from 'lucide-react';
import PixelIcon from './PixelIcon';
import { shortcuts } from '../desktopConfig';
import { profile } from '../content/profile';
import './start-menu.css';

// A Vista-era Start menu (glass frame, white program list, dark link column, user picture,
// Start Search, power button). Original styling — no Microsoft logos or assets.
const byKey = key => shortcuts.find(item => item.key === key);
const PINNED = [
  { ...byKey('portfolio'), label: 'Internet', sub: 'Internet Explorer' },
  { ...byKey('games'), label: 'Steam', sub: 'Games I’m developing' },
];
const RECENT = ['readme', 'resume', 'contact'].map(byKey);
const LINKS = [
  { key: 'me', label: profile.shortName, icon: 'cola', app: 'portfolio', request: { path: 'home' }, strong: true },
  { key: 'work', label: 'My Work', icon: 'browser', app: 'portfolio', request: { path: 'work' } },
  { key: 'resume-link', label: 'Résumé', icon: 'resume', app: 'portfolio', request: { path: 'resume' } },
  { key: 'games-link', label: 'Games', icon: 'gamepad', app: 'games' },
  { key: 'contact-link', label: 'Contact', icon: 'mail', app: 'portfolio', request: { path: 'contact' } },
  { key: 'github', label: 'GitHub', icon: 'browser', app: 'portfolio', request: { url: 'https://github.com/HyperColossus' } },
  { divider: true, key: 'div' },
  { key: 'help', label: 'Help and Support', icon: 'notepad', app: 'readme' },
];
const ALL = [...shortcuts].sort((a, b) => a.label.localeCompare(b.label));
// Search ignores case and accents, so "resume" finds "Résumé".
const fold = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const SEARCHABLE = [...shortcuts, ...LINKS.filter(item => !item.divider && !shortcuts.some(s => s.label === item.label))];

function Item({ item, big, activate, hover }) {
  const body = <><PixelIcon name={item.icon} size={big ? 32 : 24} /><span><b>{item.label}</b>{item.sub && <small>{item.sub}</small>}</span></>;
  const className = `vista-item ${big ? 'is-big' : ''}`;
  return <button className={className} role="menuitem" onClick={() => activate(item)} {...hover(item)}>{body}</button>;
}

export default function StartMenu({ onLaunch, onShutDown, onRestart }) {
  const [view, setView] = useState('pinned');
  const [query, setQuery] = useState('');
  const [picture, setPicture] = useState('cola');
  const [powerMenu, setPowerMenu] = useState(false);
  const searchRef = useRef(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? SEARCHABLE.filter(item => fold(`${item.label} ${item.sub ?? ''}`).includes(q)) : [];
  }, [query]);

  const activate = item => onLaunch(item); // every item opens inside Cola OS (web pages in Internet Explorer)
  const hover = item => ({ onMouseEnter: () => setPicture(item.icon), onFocus: () => setPicture(item.icon) });
  const itemProps = { activate, hover };

  return <div className="vista-start" role="menu" aria-label="Start" onMouseLeave={() => setPicture('cola')}>
    <div className="vista-picture" aria-hidden="true"><PixelIcon name={picture} size={40} /></div>

    <div className="vista-left">
      {query.trim() ? <>
        <p className="vista-heading">Programs</p>
        {results.length ? results.map(item => <Item key={item.key} item={item} {...itemProps} />) : <p className="vista-empty">No items match your search.</p>}
      </> : view === 'all' ? <>
        <div className="vista-list">{ALL.map(item => <Item key={item.key} item={item} {...itemProps} />)}</div>
        <button className="vista-all" onClick={() => setView('pinned')}><ChevronLeft size={14} strokeWidth={3} /> Back</button>
      </> : <>
        <div className="vista-list">
          {PINNED.map(item => <Item key={item.key} item={item} big {...itemProps} />)}
          <hr />
          {RECENT.map(item => <Item key={item.key} item={item} {...itemProps} />)}
        </div>
        <button className="vista-all" onClick={() => setView('all')}>All Programs <ChevronRight size={14} strokeWidth={3} /></button>
      </>}
    </div>

    <nav className="vista-right" aria-label="Places">
      {LINKS.map(item => item.divider ? <hr key={item.key} />
        : <button key={item.key} className={item.strong ? 'is-strong' : undefined} role="menuitem" onClick={() => activate(item)} {...hover(item)}>{item.label}</button>)}
    </nav>

    <form className="vista-search" role="search" onSubmit={event => { event.preventDefault(); if (results[0]) activate(results[0]); }}>
      <input ref={searchRef} id="vista-search" type="search" placeholder="Start Search" aria-label="Start Search" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" />
      <Search size={14} aria-hidden="true" />
    </form>

    <div className="vista-power">
      <button className="vista-power-btn" aria-label="Shut down (back to space)" title="Shut down" onClick={onShutDown} {...hover({ icon: 'power' })}><Power size={15} strokeWidth={3} /></button>
      <button className="vista-arrow" aria-label="More power options" aria-expanded={powerMenu} onClick={() => setPowerMenu(open => !open)}><ChevronRight size={13} strokeWidth={3} /></button>
      {powerMenu && <div className="vista-power-menu" role="menu">
        <button role="menuitem" onClick={onRestart}>Restart</button>
        <button role="menuitem" onClick={onShutDown}>Shut Down</button>
      </div>}
    </div>
  </div>;
}
