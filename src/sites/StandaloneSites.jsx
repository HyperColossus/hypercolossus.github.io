import React from 'react';
import {
  ArrowUpRight,
  Radio,
  Gamepad2,
  Clapperboard,
  Code2,
  Layers3,
  Mail,
  FlaskConical,
  Sparkles,
  Folder,
} from 'lucide-react';

const portfolioWork = [
  {
    id: 'esports',
    number: '01',
    label: 'Social & esports',
    title: 'Stories beyond the scoreboard.',
    text: 'Content systems and community storytelling built around the personalities, context, and moments that make competition worth following.',
    meta: 'watchNACL / LPL English',
    tags: ['Social strategy', 'Editorial', 'Community'],
    icon: Radio,
  },
  {
    id: 'games',
    number: '02',
    label: 'Games & interactive',
    title: 'Small worlds with something to discover.',
    text: 'Original interactive projects exploring procedural spaces, cooperative mechanics, and the satisfaction of understanding a system.',
    meta: 'Hollow Field / Splice',
    tags: ['Game design', 'Interaction', 'Creative development'],
    icon: Gamepad2,
    href: './games.html',
  },
  {
    id: 'video',
    number: '03',
    label: 'Video & motion',
    title: 'Editing that knows when to get out of the way.',
    text: 'Gaming videos, short-form edits, thumbnails, and motion work shaped around pacing, clarity, and creator identity.',
    meta: 'Creator content / SamIsDual',
    tags: ['Editing', 'Short-form', 'Thumbnails'],
    icon: Clapperboard,
  },
];

const capabilities = [
  {
    icon: Radio,
    title: 'Social & esports',
    text: 'Content systems, editorial thinking, and community-first storytelling for competitive spaces.',
  },
  {
    icon: Gamepad2,
    title: 'Games & interactive',
    text: 'Mechanics, interfaces, and creative development focused on making interaction feel deliberate.',
  },
  {
    icon: Clapperboard,
    title: 'Video & motion',
    text: 'Editing and visual packaging built around rhythm, clarity, and the personality of the subject.',
  },
];

const games = [
  {
    id: 'hollow',
    number: '01',
    title: 'Hollow Field',
    year: '2025',
    category: 'Exploration / First person',
    role: 'Game design / Systems / Creative development',
    desc: 'A first-person scavenger built around a procedurally grown wheat field, where navigation and discovery are the core challenge.',
    thought: 'The project explores how repetition can create uncertainty when landmarks are limited and the environment itself becomes the puzzle.',
    tags: ['Exploration', 'Procedural worlds', 'First person'],
  },
  {
    id: 'splice',
    number: '02',
    title: 'Splice',
    year: '2024',
    category: 'Co-op / Puzzle',
    role: 'Game design / Interaction / Creative development',
    desc: 'A two-player puzzle concept where both players are connected by a shared rope and have to solve space together.',
    thought: 'The mechanic turns one simple relationship into a communication problem: every move affects the other player, so cooperation is physical rather than abstract.',
    tags: ['Co-op', 'Puzzle', 'Interaction'],
  },
];

function SiteNav({ active }) {
  return (
    <header className="standalone-nav">
      <a className="standalone-brand" href="./portfolio.html">
        <span className="standalone-brand-mark">ZS</span>
        <span>
          <strong>Zachary Siegel</strong>
          <small>Designer / Developer / Storyteller</small>
        </span>
      </a>

      <nav aria-label="Primary navigation">
        <a className={active === 'portfolio' ? 'is-active' : ''} href="./portfolio.html">Portfolio</a>
        <a className={active === 'games' ? 'is-active' : ''} href="./games.html">Games</a>
        <a className={active === 'lab' ? 'is-active' : ''} href="./lab.html">Lab</a>
        <a href="mailto:dzjwarior1@gmail.com">Contact</a>
      </nav>
    </header>
  );
}

function SiteFooter({ dark = false }) {
  return (
    <footer className={`standalone-footer ${dark ? 'is-dark' : ''}`}>
      <div>
        <span className="standalone-brand-mark">ZS</span>
        <span>
          <strong>Zachary Siegel</strong>
          <small>Design, development, and storytelling.</small>
        </span>
      </div>
      <div className="standalone-footer-links">
        <a href="https://github.com/HyperColossus" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={13} /></a>
        <a href="mailto:dzjwarior1@gmail.com">Email <ArrowUpRight size={13} /></a>
      </div>
      <span className="standalone-footer-copy">© 2026</span>
    </footer>
  );
}

function WorkCard({ item }) {
  const Icon = item.icon;
  const Tag = item.href ? 'a' : 'article';
  return (
    <Tag className="standalone-work-card" href={item.href}>
      <div className="standalone-work-visual" data-project={item.id}>
        <span className="standalone-work-number">{item.number}</span>
        <Icon size={34} strokeWidth={1.2} />
        <span>{item.meta}</span>
      </div>
      <div className="standalone-work-body">
        <div>
          <p className="standalone-kicker">{item.label}</p>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </div>
        <div className="standalone-tag-row">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
      {item.href && <ArrowUpRight className="standalone-card-arrow" size={20} />}
    </Tag>
  );
}

export function PortfolioSite() {
  return (
    <div className="standalone-site site-portfolio">
      <SiteNav active="portfolio" />

      <main>
        <section className="portfolio-full-hero">
          <div className="portfolio-full-copy">
            <p className="standalone-kicker"><i /> DIGITAL EXPERIENCES / 2026</p>
            <h1>I build things people want to <em>spend time with.</em></h1>
            <p className="portfolio-full-lede">
              I’m Zack — a designer and developer working across social, games, and video.
              I care about clear systems, strong interaction, and making digital work feel considered from the first click.
            </p>
            <div className="standalone-actions">
              <a className="standalone-primary" href="#work">View selected work <ArrowUpRight size={16} /></a>
              <a className="standalone-secondary" href="#about">About me</a>
            </div>
          </div>

          <aside className="portfolio-full-focus">
            <div className="portfolio-focus-head">
              <span><i /> CURRENT FOCUS</span>
              <span>01 / 03</span>
            </div>
            <div className="portfolio-focus-mark"><Layers3 size={46} strokeWidth={1} /></div>
            <div>
              <p className="standalone-kicker">SYSTEMS + FEELING</p>
              <h2>Designing systems that still feel human.</h2>
              <p>Interaction, storytelling, and technical craft treated as one problem instead of three separate disciplines.</p>
            </div>
          </aside>
        </section>

        <section className="standalone-section portfolio-proof">
          <div className="portfolio-proof-item">
            <strong>03</strong>
            <span>disciplines<br />in one practice</span>
          </div>
          <div className="portfolio-proof-item">
            <strong>01</strong>
            <span>point of view<br />across the work</span>
          </div>
          <div className="portfolio-proof-copy">
            <p className="standalone-kicker">THE THROUGHLINE</p>
            <p>Make the idea understandable. Make the interaction satisfying. Make the details earn their place.</p>
          </div>
        </section>

        <section className="standalone-section" id="work">
          <div className="standalone-section-heading">
            <div>
              <p className="standalone-kicker">SELECTED WORK</p>
              <h2>A few things worth opening.</h2>
            </div>
            <p>Projects across community, interaction, and story.</p>
          </div>

          <div className="standalone-work-grid">
            {portfolioWork.map(item => <WorkCard key={item.id} item={item} />)}
          </div>
        </section>

        <section className="standalone-section portfolio-capabilities" id="about">
          <div className="standalone-section-heading">
            <div>
              <p className="standalone-kicker">CAPABILITIES</p>
              <h2>Different mediums. Same standard.</h2>
            </div>
            <p>Strategy through execution.</p>
          </div>

          <div className="portfolio-capability-grid">
            {capabilities.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <div className="portfolio-capability-top">
                  <span>0{index + 1}</span>
                  <Icon size={24} strokeWidth={1.35} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="standalone-section portfolio-process">
          <div>
            <p className="standalone-kicker">HOW I WORK</p>
            <h2>I like the part where the idea becomes a system.</h2>
          </div>
          <ol>
            <li><span>01</span><div><strong>Find the useful idea.</strong><p>Strip the concept down until the value is obvious.</p></div></li>
            <li><span>02</span><div><strong>Build a clear structure.</strong><p>Turn that idea into something repeatable, navigable, and understandable.</p></div></li>
            <li><span>03</span><div><strong>Refine the feel.</strong><p>Polish the details until the system gets out of the way.</p></div></li>
          </ol>
        </section>

        <section className="portfolio-contact-strip">
          <div>
            <p className="standalone-kicker">CONTACT</p>
            <h2>Have something interesting to build?</h2>
          </div>
          <a className="standalone-primary" href="mailto:dzjwarior1@gmail.com">
            <Mail size={16} /> Email me <ArrowUpRight size={16} />
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function GameArt({ game, large = false }) {
  return (
    <div className={`standalone-game-art art-${game.id} ${large ? 'is-large' : ''}`}>
      <span className="game-art-atmosphere" />
      <span className="game-art-midground" />
      <span className="game-art-foreground" />
      <span className="standalone-game-index">{game.number}</span>
      <div>
        <span>{game.category}</span>
        <strong>{game.title}</strong>
      </div>
    </div>
  );
}

export function GamesSite() {
  return (
    <div className="standalone-site site-games">
      <SiteNav active="games" />

      <main>
        <section className="games-full-hero">
          <div>
            <p className="standalone-kicker">GAME DESIGN / INTERACTION</p>
            <h1>Small games built around one strong idea.</h1>
            <p>
              These projects explore how a mechanic, space, or constraint can carry an experience.
              The focus is less on scale and more on making the core interaction feel worth understanding.
            </p>
          </div>
          <aside>
            <span>COLLECTION / 2024—2025</span>
            <strong>02</strong>
            <p>Original projects currently in the portfolio.</p>
          </aside>
        </section>

        <section className="games-full-projects">
          {games.map(game => (
            <article className="games-full-project" key={game.id} id={game.id}>
              <GameArt game={game} large />
              <div className="games-full-project-info">
                <div className="games-full-project-intro">
                  <p className="standalone-kicker">{game.year} / {game.category}</p>
                  <h2>{game.title}</h2>
                  <p>{game.desc}</p>
                </div>

                <dl className="games-full-meta">
                  <div><dt>Role</dt><dd>{game.role}</dd></div>
                  <div><dt>Year</dt><dd>{game.year}</dd></div>
                  <div><dt>Status</dt><dd>Portfolio project</dd></div>
                </dl>

                <div className="games-full-thought">
                  <span>DESIGN THOUGHT</span>
                  <p>{game.thought}</p>
                </div>

                <div className="standalone-tag-row">{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div>

                <div className="games-full-build">
                  <span>PLAYABLE BUILD</span>
                  <p>A public play link has not been added yet. Release notes and playable builds will appear here when ready.</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="games-principles">
          <p className="standalone-kicker">DESIGN PRINCIPLES</p>
          <div>
            <article><span>01</span><h3>One mechanic should be enough to start.</h3><p>Complexity is more interesting when it grows from something understandable.</p></article>
            <article><span>02</span><h3>The space should teach the player.</h3><p>Environment and interaction should carry information before text has to.</p></article>
            <article><span>03</span><h3>Discovery should feel earned.</h3><p>The best moment is when the player understands the system a second before you explain it.</p></article>
          </div>
        </section>
      </main>

      <SiteFooter dark />
    </div>
  );
}

export function LabSite() {
  return (
    <div className="standalone-site site-lab">
      <SiteNav active="lab" />

      <main>
        <section className="lab-full-hero">
          <div>
            <p className="standalone-kicker">EXPERIMENTAL WORKSPACE</p>
            <h1>A place for ideas that are still becoming something.</h1>
            <p>
              The Lab is where small tools, interface experiments, and technical prototypes get room to develop.
              Work only moves into the public collection when there is something clear to use, learn from, or explore.
            </p>
          </div>

          <aside className="lab-full-status">
            <div><span><i /> ACTIVE WORKSPACE</span><Sparkles size={18} /></div>
            <FlaskConical size={48} strokeWidth={1} />
            <strong>Building quietly.</strong>
            <p>Quality over volume. Finished thinking over unfinished clutter.</p>
          </aside>
        </section>

        <section className="standalone-section">
          <div className="standalone-section-heading">
            <div>
              <p className="standalone-kicker">WHAT LIVES HERE</p>
              <h2>Three kinds of experiments.</h2>
            </div>
            <p>Small scope. Real purpose.</p>
          </div>

          <div className="lab-full-grid">
            <article>
              <div><span>01</span><Code2 size={25} strokeWidth={1.3} /></div>
              <p className="standalone-kicker">TOOLS</p>
              <h3>Utilities with a clear job.</h3>
              <p>Small workflows and focused tools that remove friction from something I actually do.</p>
              <span className="lab-full-state">Open slot</span>
            </article>
            <article>
              <div><span>02</span><Layers3 size={25} strokeWidth={1.3} /></div>
              <p className="standalone-kicker">INTERFACES</p>
              <h3>Interaction ideas worth touching.</h3>
              <p>UI systems, motion studies, and interface patterns tested as working experiences instead of static mockups.</p>
              <span className="lab-full-state is-active">In progress</span>
            </article>
            <article>
              <div><span>03</span><FlaskConical size={25} strokeWidth={1.3} /></div>
              <p className="standalone-kicker">PROTOTYPES</p>
              <h3>Fast tests for uncertain ideas.</h3>
              <p>Technical experiments used to learn whether a concept is interesting enough to deserve a larger build.</p>
              <span className="lab-full-state">Open slot</span>
            </article>
          </div>
        </section>

        <section className="lab-full-principle">
          <div className="lab-full-principle-icon"><Folder size={28} strokeWidth={1.25} /></div>
          <div>
            <p className="standalone-kicker">THE RULE</p>
            <h2>Ship the useful version.</h2>
            <p>
              Experiments stay private until they have a clear reason to exist. That means fewer things here,
              but everything that appears should be understandable, usable, or genuinely interesting to explore.
            </p>
          </div>
        </section>

        <section className="lab-full-log">
          <div>
            <p className="standalone-kicker">WORKSPACE LOG</p>
            <h2>The public collection starts small on purpose.</h2>
          </div>
          <div className="lab-log-row">
            <span>2026 / 09</span>
            <strong>Lab structure established.</strong>
            <p>Preparing the first set of interface and tooling experiments for public documentation.</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
