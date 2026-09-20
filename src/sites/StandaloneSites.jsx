import React from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Gamepad2,
  GraduationCap,
  Mail,
  MonitorPlay,
  Radio,
  Users,
  Video,
} from 'lucide-react';

function SiteNav({ active }) {
  return (
    <header className="standalone-nav">
      <a className="standalone-brand" href="./portfolio.html" aria-label="Zachary Siegel portfolio home">
        <span className="standalone-brand-mark">ZS</span>
        <span>
          <strong>Zachary Siegel</strong>
          <small>Esports · Social · Video</small>
        </span>
      </a>

      <nav aria-label="Primary navigation">
        <a className={active === 'portfolio' ? 'is-active' : ''} href="./portfolio.html">Portfolio</a>
        <a href="#experience">Experience</a>
        <a href="#skills">Skills</a>
        <a className={active === 'games' ? 'is-active' : ''} href="./games.html">Games</a>
        <a className={active === 'lab' ? 'is-active' : ''} href="./lab.html">Lab</a>
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
          <small>Esports Social Media & Content Producer</small>
        </span>
      </div>
      <div className="standalone-footer-links">
        <a href="https://github.com/HyperColossus" target="_blank" rel="noopener noreferrer">
          GitHub <ArrowUpRight size={13} />
        </a>
        <a href="mailto:dzjwarior1@gmail.com">
          Email <ArrowUpRight size={13} />
        </a>
      </div>
      <span className="standalone-footer-copy">2026</span>
    </footer>
  );
}

const experience = [
  {
    dates: 'Apr 2026 — Present',
    role: 'Social Media Manager',
    org: 'watchNACL · Liga ACE',
    location: 'Remote',
    bullets: [
      'Run the official @watchNACL account covering the North American Challengers League, the tier-2 League of Legends circuit feeding LCS rosters.',
      'Manage the content calendar across match coverage, highlights, storylines, and developing talent.',
      'Create content with an in-depth understanding of League of Legends and broader gaming communities.',
    ],
  },
  {
    dates: 'Apr 2025 — Present',
    role: 'Social Media Manager',
    org: 'LPL_English · LPL English',
    location: 'Remote',
    bullets: [
      'Manage social for the fan-made English-language broadcast of the LPL, China’s professional League of Legends league.',
      'Localize Chinese-language storylines for Western audiences and coordinate with talent and production on launch days.',
      'Grew engagement through reactive, narrative-driven posting across X.',
    ],
  },
  {
    dates: 'Apr 2023 — May 2025',
    role: 'President',
    org: 'Wildcat Esports · SUNY Polytechnic Institute',
    location: 'Utica, NY',
    bullets: [
      'Led a 7-person executive team running competitive and casual gaming programming for 500+ students.',
      'Competed and coached the Overwatch 2 varsity team to championship runs in ECAC and SUNY leagues.',
      'Built events, tryouts, and league entries while helping turn the club into a year-round campus institution.',
    ],
  },
  {
    dates: '2022 — Present',
    role: 'Freelance Video Editor',
    org: 'Independent · SamIsDual & others',
    location: 'Remote',
    bullets: [
      'Edit gaming long-form videos, shorts, and thumbnails for YouTube and TikTok creators.',
      'Work quickly through revisions while preserving an existing channel voice.',
    ],
  },
];

const skillGroups = [
  {
    icon: Radio,
    label: 'Social',
    skills: ['Content strategy', 'Community management', 'X', 'TikTok', 'YouTube Shorts', 'Reactive posting', 'Talent coordination'],
  },
  {
    icon: Video,
    label: 'Production',
    skills: ['Premiere Pro', 'After Effects', 'Thumbnail design', 'Short-form editing', 'Photoshop'],
  },
  {
    icon: Users,
    label: 'Esports',
    skills: ['League of Legends', 'Overwatch', 'Broadcast workflow', 'Team operations', 'League operations'],
  },
  {
    icon: Gamepad2,
    label: 'Game development',
    skills: ['Unity', 'Unreal Engine', 'Project leadership'],
  },
];

export function PortfolioSite() {
  return (
    <div className="standalone-site site-portfolio">
      <SiteNav active="portfolio" />

      <main>
        <section className="resume-hero">
          <div className="resume-hero-copy">
            <p className="standalone-kicker"><i /> ESPORTS / SOCIAL MEDIA / VIDEO</p>
            <h1>Esports Social Media & <em>Content Producer.</em></h1>
            <p className="resume-hero-lede">
              I’m Zachary Siegel. I build social content, community coverage, and video for gaming audiences — with hands-on experience running broadcast-scale accounts for League of Legends and the NACL.
            </p>
            <div className="standalone-actions">
              <a className="standalone-primary" href="#experience">
                View experience <ArrowUpRight size={16} />
              </a>
              <a className="standalone-secondary" href="mailto:dzjwarior1@gmail.com">
                Contact me
              </a>
            </div>
          </div>

          <aside className="resume-hero-card">
            <div className="resume-card-status">
              <span><i /> CURRENT</span>
              <span>2026</span>
            </div>
            <div className="resume-card-icon"><MonitorPlay size={44} strokeWidth={1.1} /></div>
            <div>
              <p className="standalone-kicker">CURRENT WORK</p>
              <h2>League of Legends social & content.</h2>
              <p>Managing social for watchNACL and LPL English while continuing freelance video work.</p>
            </div>
          </aside>
        </section>

        <section className="resume-proof">
          <article>
            <strong>4+</strong>
            <span>years building gaming communities and content</span>
          </article>
          <article>
            <strong>500+</strong>
            <span>students served through Wildcat Esports programming</span>
          </article>
          <article>
            <strong>3</strong>
            <span>games shipped end-to-end during university</span>
          </article>
          <article>
            <strong>2</strong>
            <span>games led as part of my degree work</span>
          </article>
        </section>

        <section className="resume-section" id="experience">
          <div className="resume-section-heading">
            <div>
              <p className="standalone-kicker">EXPERIENCE</p>
              <h2>Work built around gaming audiences.</h2>
            </div>
            <BriefcaseBusiness size={30} strokeWidth={1.25} />
          </div>

          <div className="resume-experience-list">
            {experience.map(item => (
              <article className="resume-experience-item" key={item.role + item.org}>
                <div className="resume-experience-meta">
                  <span>{item.dates}</span>
                  <span>{item.location}</span>
                </div>
                <div className="resume-experience-body">
                  <p className="standalone-kicker">{item.org}</p>
                  <h3>{item.role}</h3>
                  <ul>
                    {item.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-section resume-skills-section" id="skills">
          <div className="resume-section-heading">
            <div>
              <p className="standalone-kicker">SKILLS</p>
              <h2>Social, production, esports, and game development.</h2>
            </div>
          </div>

          <div className="resume-skill-grid">
            {skillGroups.map(({ icon: Icon, label, skills }) => (
              <article key={label}>
                <div className="resume-skill-icon"><Icon size={23} strokeWidth={1.35} /></div>
                <h3>{label}</h3>
                <div className="resume-skill-tags">
                  {skills.map(skill => <span key={skill}>{skill}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="resume-section resume-education">
          <div className="resume-section-heading">
            <div>
              <p className="standalone-kicker">EDUCATION</p>
              <h2>Interactive media, game design, and computer science.</h2>
            </div>
            <GraduationCap size={30} strokeWidth={1.25} />
          </div>

          <div className="resume-education-grid">
            <article>
              <span className="resume-education-year">Fall 2026 — Present</span>
              <p className="standalone-kicker">LEHMAN COLLEGE</p>
              <h3>Master’s in Computer Science Education</h3>
              <p>Currently pursuing graduate study in computer science education.</p>
            </article>
            <article>
              <span className="resume-education-year">May 2025</span>
              <p className="standalone-kicker">SUNY POLYTECHNIC INSTITUTE</p>
              <h3>B.S. Interactive Media & Game Design</h3>
              <p>Minor in Computer Science. Shipped three games end-to-end, led two, and provided competitive gaming experience to hundreds of students.</p>
            </article>
            <article>
              <span className="resume-education-year">May 2022</span>
              <p className="standalone-kicker">ROCKLAND COMMUNITY COLLEGE</p>
              <h3>A.S. Computer Science</h3>
            </article>
          </div>
        </section>

        <section className="resume-contact" id="contact">
          <div>
            <p className="standalone-kicker">CONTACT</p>
            <h2>Let’s talk esports, social, or production.</h2>
          </div>
          <div className="resume-contact-actions">
            <a href="mailto:dzjwarior1@gmail.com">
              <Mail size={17} /> Email <ArrowUpRight size={15} />
            </a>
            <a href="https://github.com/HyperColossus" target="_blank" rel="noopener noreferrer">
              GitHub <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
      </main>

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
