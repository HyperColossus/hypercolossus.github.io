import React from 'react';

function SiteNav({ active }) {
  return (
    <header className="standalone-nav">
      <a className="standalone-brand" href="./portfolio.html" aria-label="Home">
        <span className="standalone-brand-mark">ZS</span>
      </a>

      <nav aria-label="Primary navigation">
        <a className={active === 'portfolio' ? 'is-active' : ''} href="./portfolio.html">Portfolio</a>
        <a className={active === 'games' ? 'is-active' : ''} href="./games.html">Games</a>
        <a className={active === 'lab' ? 'is-active' : ''} href="./lab.html">Lab</a>
      </nav>
    </header>
  );
}

function SiteFooter({ dark = false }) {
  return (
    <footer className={`standalone-footer standalone-footer-empty ${dark ? 'is-dark' : ''}`}>
      <span className="standalone-brand-mark">ZS</span>
    </footer>
  );
}

export function PortfolioSite() {
  return (
    <div className="standalone-site site-portfolio">
      <SiteNav active="portfolio" />
      <main className="empty-site-canvas" aria-label="Portfolio content" />
      <SiteFooter />
    </div>
  );
}

export function GamesSite() {
  return (
    <div className="standalone-site site-games">
      <SiteNav active="games" />
      <main className="empty-site-canvas empty-site-canvas-dark" aria-label="Games content" />
      <SiteFooter dark />
    </div>
  );
}

export function LabSite() {
  return (
    <div className="standalone-site site-lab">
      <SiteNav active="lab" />
      <main className="empty-site-canvas" aria-label="Lab content" />
      <SiteFooter />
    </div>
  );
}
