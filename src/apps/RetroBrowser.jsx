import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  RotateCw,
  LockKeyhole,
  Gamepad2,
  Clapperboard,
  Radio,
  Code2,
  Layers3,
  Mail
} from 'lucide-react';
import { useWindows } from '../useWindows';
import { desktopConfig } from '../desktopConfig';

const pages = {
  overview: 'Overview',
  work: 'Work',
  about: 'About',
  contact: 'Contact',
};

const capabilities = [
  {
    icon: Radio,
    label: 'Social & esports',
    title: 'Community-first content systems',
    text: 'Match-day storytelling, social formats, and editorial ideas designed around the way fans actually follow competition.',
    detail: 'watchNACL / LPL English',
  },
  {
    icon: Gamepad2,
    label: 'Games & interactive',
    title: 'Playable ideas with a strong point of view',
    text: 'Game concepts, interaction design, and creative development focused on making mechanics feel understandable and memorable.',
    detail: 'Hollow Field / Splice',
  },
  {
    icon: Clapperboard,
    label: 'Video & motion',
    title: 'Editing built around rhythm and clarity',
    text: 'Gaming videos, shorts, thumbnails, and motion work shaped to communicate quickly without losing personality.',
    detail: 'Creator content / SamIsDual',
  },
];

const workItems = [
  {
    id: 'esports',
    number: '01',
    eyebrow: 'SOCIAL & ESPORTS',
    title: 'Stories beyond the scoreboard.',
    client: 'watchNACL / LPL English',
    text: 'Content systems and community storytelling built around the moments, personalities, and context that make competition worth following.',
    tags: ['Social strategy', 'Editorial', 'Community'],
    icon: Radio,
  },
  {
    id: 'games',
    number: '02',
    eyebrow: 'GAMES & INTERACTIVE',
    title: 'Small worlds with something to discover.',
    client: 'Hollow Field / Splice',
    text: 'Original game projects exploring procedural spaces, cooperative mechanics, and the satisfaction of figuring something out for yourself.',
    tags: ['Game design', 'Interaction', 'Creative development'],
    icon: Gamepad2,
    opensApp: 'games',
  },
  {
    id: 'video',
    number: '03',
    eyebrow: 'VIDEO & MOTION',
    title: 'Editing that knows when to get out of the way.',
    client: 'Creator video systems',
    text: 'Gaming videos, short-form edits, and visual packaging designed around pacing, clarity, and the identity of the creator.',
    tags: ['Editing', 'Short-form', 'Thumbnails'],
    icon: Clapperboard,
  },
];

function WorkCard({ item, onOpen }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="professional-work-visual" data-project={item.id}>
        <span className="professional-work-number">{item.number}</span>
        <Icon size={28} strokeWidth={1.25} aria-hidden="true" />
        <span>{item.client}</span>
      </div>
      <div className="professional-work-copy">
        <p className="professional-kicker">{item.eyebrow}</p>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <div className="professional-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
      <ArrowUpRight className="professional-work-arrow" size={18} aria-hidden="true" />
    </>
  );

  if (item.opensApp) {
    return <button className="professional-work-card is-action" onClick={onOpen}>{content}</button>;
  }

  return <article className="professional-work-card">{content}</article>;
}

export default function RetroBrowser() {
  const [history, setHistory] = useState({ entries: ['overview'], index: 0 });
  const page = history.entries[history.index];
  const contentRef = useRef(null);
  const { openWindow } = useWindows();

  const navigate = next => {
    if (next !== page) {
      setHistory(prev => ({
        entries: [...prev.entries.slice(0, prev.index + 1), next],
        index: prev.index + 1,
      }));
    }
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const move = delta => {
    setHistory(prev => ({
      ...prev,
      index: Math.max(0, Math.min(prev.entries.length - 1, prev.index + delta)),
    }));
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGames = () => {
    const gamesApp = desktopConfig.find(app => app.id === 'games');
    if (gamesApp) openWindow(gamesApp);
  };

  return (
    <div className="portfolio-browser professional-browser">
      <div className="browser-toolbar">
        <button aria-label="Back" disabled={history.index === 0} onClick={() => move(-1)}><ArrowLeft size={15} /></button>
        <button aria-label="Forward" disabled={history.index === history.entries.length - 1} onClick={() => move(1)}><ArrowRight size={15} /></button>
        <button aria-label="Scroll to top" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}><RotateCw size={13} /></button>
        <div className="browser-address">
          <LockKeyhole size={11} />
          <span>hypercoloss.us / <strong>{page}</strong></span>
          <span className="address-label">PORTFOLIO</span>
        </div>
      </div>

      <div className="portfolio-scroll professional-scroll" ref={contentRef}>
        <header className="professional-site-header">
          <button className="professional-wordmark" onClick={() => navigate('overview')} aria-label="Go to overview">
            <span className="professional-monogram">ZS</span>
            <span>
              <strong>Zachary Siegel</strong>
              <small>Designer / Developer / Storyteller</small>
            </span>
          </button>

          <nav className="professional-nav" aria-label="Portfolio navigation">
            {Object.entries(pages).map(([id, label]) => (
              <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}>
                {label}
              </button>
            ))}
          </nav>
        </header>

        {page === 'overview' && (
          <>
            <main className="professional-hero">
              <div className="professional-hero-copy">
                <p className="professional-kicker"><span /> DIGITAL EXPERIENCES / 2026</p>
                <h1>I build things people want to <em>spend time with.</em></h1>
                <p className="professional-lede">
                  I’m Zack — a designer and developer working across social, games, and video.
                  I care about clear systems, strong interaction, and making digital work feel considered from the first click.
                </p>
                <div className="professional-hero-actions">
                  <button className="professional-primary-action" onClick={() => navigate('work')}>
                    View selected work <ArrowUpRight size={15} />
                  </button>
                  <button className="professional-text-action" onClick={() => navigate('about')}>
                    About me
                  </button>
                </div>
              </div>

              <aside className="professional-hero-panel">
                <div className="professional-panel-top">
                  <span className="professional-panel-status"><i /> Available to explore</span>
                  <span>01 / 03</span>
                </div>
                <div className="professional-panel-mark"><Layers3 size={34} strokeWidth={1.1} /></div>
                <div>
                  <p className="professional-kicker">CURRENT FOCUS</p>
                  <h2>Designing systems that still feel human.</h2>
                  <p>Interaction, storytelling, and technical craft — treated as one problem instead of three separate disciplines.</p>
                </div>
              </aside>
            </main>

            <section className="professional-section professional-selected">
              <div className="professional-section-heading">
                <div>
                  <p className="professional-kicker">SELECTED WORK</p>
                  <h2>A few things worth opening.</h2>
                </div>
                <button className="professional-text-action" onClick={() => navigate('work')}>See all work <ArrowUpRight size={14} /></button>
              </div>
              <div className="professional-work-grid">
                {workItems.slice(0, 2).map(item => (
                  <WorkCard key={item.id} item={item} onOpen={item.opensApp ? openGames : undefined} />
                ))}
              </div>
            </section>

            <section className="professional-section professional-capabilities">
              <div className="professional-section-heading">
                <div>
                  <p className="professional-kicker">CAPABILITIES</p>
                  <h2>Different mediums. Same standard.</h2>
                </div>
                <p className="professional-section-note">Strategy through execution.</p>
              </div>
              <div className="professional-capability-list">
                {capabilities.map(({ icon: Icon, label, title, text, detail }, index) => (
                  <article key={title} className="professional-capability-row">
                    <span className="professional-capability-index">0{index + 1}</span>
                    <span className="professional-capability-icon"><Icon size={19} strokeWidth={1.5} /></span>
                    <div>
                      <p className="professional-kicker">{label}</p>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <small>{detail}</small>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {page === 'work' && (
          <main className="professional-page">
            <div className="professional-page-intro">
              <p className="professional-kicker">SELECTED WORK</p>
              <h1>Work across community, interaction, and story.</h1>
              <p>
                These projects span different formats, but the process is consistent: understand the audience,
                make the idea legible, and build the details that make it feel intentional.
              </p>
            </div>

            <div className="professional-work-stack">
              {workItems.map(item => (
                <WorkCard key={item.id} item={item} onOpen={item.opensApp ? openGames : undefined} />
              ))}
            </div>
          </main>
        )}

        {page === 'about' && (
          <main className="professional-page">
            <div className="professional-about-grid">
              <div className="professional-page-intro">
                <p className="professional-kicker">ABOUT</p>
                <h1>I like the part where the idea becomes a system.</h1>
                <p>
                  My work moves between social content, interactive projects, and video. The medium changes;
                  the interesting part stays the same — taking something messy and shaping it into an experience people can understand and enjoy.
                </p>
              </div>

              <aside className="professional-about-card">
                <Code2 size={24} strokeWidth={1.4} />
                <p className="professional-kicker">HOW I WORK</p>
                <ol>
                  <li><span>01</span><strong>Find the useful idea.</strong></li>
                  <li><span>02</span><strong>Build a clear system around it.</strong></li>
                  <li><span>03</span><strong>Refine until the details disappear.</strong></li>
                </ol>
              </aside>
            </div>

            <section className="professional-section professional-about-capabilities">
              <div className="professional-section-heading">
                <div>
                  <p className="professional-kicker">WHAT I DO</p>
                  <h2>Three disciplines, one point of view.</h2>
                </div>
              </div>
              <div className="professional-capability-cards">
                {capabilities.map(({ icon: Icon, label, title, text, detail }) => (
                  <article key={title}>
                    <Icon size={21} strokeWidth={1.45} />
                    <p className="professional-kicker">{label}</p>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <small>{detail}</small>
                  </article>
                ))}
              </div>
            </section>
          </main>
        )}

        {page === 'contact' && (
          <main className="professional-contact">
            <div>
              <p className="professional-kicker">CONTACT</p>
              <h1>Have something interesting to build?</h1>
              <p>
                I’m always interested in thoughtful creative work, interactive ideas, and projects that need both taste and execution.
              </p>
            </div>

            <div className="professional-contact-actions">
              <a href="mailto:dzjwarior1@gmail.com">
                <span><Mail size={19} /><strong>Email me</strong></span>
                <ArrowUpRight size={17} />
              </a>
              <a href="https://github.com/HyperColossus" target="_blank" rel="noopener noreferrer">
                <span><Code2 size={19} /><strong>GitHub</strong></span>
                <ArrowUpRight size={17} />
              </a>
            </div>
          </main>
        )}

        <footer className="professional-footer">
          <span>© 2026 Zachary Siegel</span>
          <span>Designed and built as an interactive desktop portfolio.</span>
          <button onClick={() => navigate('contact')}>Get in touch <ArrowUpRight size={12} /></button>
        </footer>
      </div>
    </div>
  );
}
