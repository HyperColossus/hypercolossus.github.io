import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCw, LockKeyhole, Gamepad2, Clapperboard, Radio } from 'lucide-react';
import { useWindows } from '../useWindows';
import { desktopConfig } from '../desktopConfig';
const pages = { about: 'About', projects: 'Selected work', weblog: 'Notes', guestbook: 'Guestbook' };
const crafts = [
  { icon: Radio, title: 'Social & esports', text: 'Content systems, match-day moments, and stories that bring a community together.', detail: 'watchNACL / LPL English' },
  { icon: Gamepad2, title: 'Games & interactive', text: 'Playable ideas. Curious worlds. That feeling when a mechanic finally clicks.', detail: 'Game design / Creative development' },
  { icon: Clapperboard, title: 'Video & motion', text: 'The right rhythm, a good story, and the cut you didn’t see coming.', detail: 'Editing / Short-form / Thumbnails' },
];
export default function RetroBrowser() {
  const [history, setHistory] = useState({ entries: ['about'], index: 0 });
  const page = history.entries[history.index];
  const contentRef = useRef(null);
  const { openWindow } = useWindows();
  const navigate = next => {
    if (next !== page) setHistory(prev => ({ entries: [...prev.entries.slice(0, prev.index + 1), next], index: prev.index + 1 }));
    contentRef.current?.scrollTo(0, 0);
  };
  const move = delta => {
    setHistory(prev => ({ ...prev, index: Math.max(0, Math.min(prev.entries.length - 1, prev.index + delta)) }));
    contentRef.current?.scrollTo(0, 0);
  };
  return <div className="portfolio-browser">
    <div className="browser-toolbar"><button aria-label="Back" disabled={history.index === 0} onClick={() => move(-1)}><ArrowLeft size={16} /></button><button aria-label="Forward" disabled={history.index === history.entries.length - 1} onClick={() => move(1)}><ArrowRight size={16} /></button><button aria-label="Scroll to top" onClick={() => contentRef.current?.scrollTo(0, 0)}><RotateCw size={14} /></button><div className="browser-address"><LockKeyhole size={12} /><span>zack / <strong>{page}</strong></span><span className="address-label">PERSONAL SITE</span></div></div>
    <div className="portfolio-scroll" ref={contentRef}>
      <div className="portfolio-masthead"><span className="wordmark">Zachary Siegel<span>®</span></span><span className="eyebrow">Independent by nature.</span></div>
      <nav className="portfolio-nav" aria-label="Homepage navigation">{Object.entries(pages).map(([id, label]) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}>{label}</button>)}</nav>
      {page === 'about' && <>
        <section className="portfolio-hero"><p className="eyebrow"><span className="accent-dot" /> Social. Games. Video.</p><h1>Made to make<br />you <em>feel something.</em></h1><p className="hero-intro">Hi, I’m Zack. I work across three crafts that all start with the same question: how do you make people feel something on a screen?</p><button className="studio-button" onClick={() => navigate('projects')}>Explore my work <ArrowUpRight size={16} /></button><span className="hero-asterisk" aria-hidden="true">✳</span></section>
        <section className="craft-section"><div className="section-heading"><span className="eyebrow">01 / A few things I do</span><span>Different mediums. Same instinct.</span></div><div className="craft-grid">{crafts.map(({ icon: Icon, title, text, detail }) => <article key={title}><Icon size={23} strokeWidth={1.5} /><h2>{title}</h2><p>{text}</p><small>{detail}</small></article>)}</div></section>
      </>}
      {page === 'projects' && <section className="portfolio-page"><p className="eyebrow">01 / Selected work</p><h1>Ideas, out<br />in the <em>world.</em></h1><p>A mix of community, craft, and a little experimentation.</p><div className="work-list">
        <article><span className="work-number">01</span><div><small>SOCIAL & ESPORTS</small><h2>Stories beyond the scoreboard.</h2><p>Social content and community storytelling for watchNACL and LPL English.</p></div><Radio size={24} /></article>
        <button onClick={() => openWindow(desktopConfig.find(app => app.id === 'games'))}><span className="work-number">02</span><div><small>GAMES & INTERACTIVE</small><h2>Small worlds. Big curiosity.</h2><p>Explore Hollow Field and Splice in the game library.</p></div><ArrowUpRight size={24} /></button>
        <article><span className="work-number">03</span><div><small>VIDEO & MOTION</small><h2>Find the rhythm.</h2><p>Gaming videos, shorts, and thumbnails for creators including SamIsDual.</p></div><Clapperboard size={24} /></article>
      </div></section>}
      {page === 'weblog' && <section className="portfolio-page"><p className="eyebrow">02 / Notes from the desktop</p><h1>A work<br />in <em>progress.</em></h1><article className="journal-entry"><time>SEPTEMBER 2026</time><h2>A familiar computer. A fresh perspective.</h2><p>This corner of the internet is taking shape: a retro computer, a few small apps, and a home for the things I make.</p></article></section>}
      {page === 'guestbook' && <section className="portfolio-page"><p className="eyebrow">03 / You were here</p><h1>Leave a little<br /><em>hello.</em></h1><div className="guestbook-note"><span>✳</span><h2>A space for passing visitors.</h2><p>The guestbook is still being built. In the meantime, my inbox is open.</p><a className="studio-button" href="mailto:dzjwarior1@gmail.com">Say hello <ArrowUpRight size={16} /></a></div></section>}
      <footer className="portfolio-footer"><span>Thanks for stopping by.</span><a href="https://github.com/HyperColossus" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a><a href="mailto:dzjwarior1@gmail.com">Get in touch <ArrowUpRight size={13} /></a></footer>
    </div>
  </div>;
}
