import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import PixelIcon from '../../components/PixelIcon';
import { profile } from '../../content/profile';
import { work } from '../../content/work';
import { media } from '../../content/media';
import { desktopConfig } from '../../desktopConfig';
import { homeUrl } from './router';
import { WebLink, useTab } from './ui';

const clock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const NAV = [['home', 'Home'], ['work', 'Work'], ['resume', 'Résumé'], ['contact', 'Contact']];

// Links on Zack's homepage. `to` is a page path on the site; Ext is any other address (it still
// opens inside the browser); AppLink opens another Cola OS app.
function Link({ to, className, children }) {
  return <WebLink as="button" href={homeUrl(to)} className={className}>{children}</WebLink>;
}
function Ext({ href, className, children }) {
  return <WebLink href={href} className={className}>{children}</WebLink>;
}
function AppLink({ id, className, children }) {
  const tab = useTab();
  const label = desktopConfig.find(app => app.id === id)?.label;
  return <button className={className} onClick={() => tab.openApp(id)} onMouseEnter={() => tab.setHover(`Open ${label}`)} onMouseLeave={() => tab.setHover(null)}>{children}</button>;
}

// Zack's homepage: a late-90s / early-2000s personal site (www.hypercoloss.us).

export default function PortfolioSite({ path }) {
  const caseStudy = path.startsWith('work/') ? work.find(item => `work/${item.id}` === path) : null;
  const known = ['home', 'work', 'resume', 'contact'].includes(path) || caseStudy;
  const section = caseStudy ? 'work' : path;
  const page = { Link, Ext, AppLink };
  if (!known) return <NotFound url={homeUrl(path)} Link={Link} />;
  return <div className="site">
    <div className="site-wrap">
      <header className="site-banner">
        <Link to="home" className="site-wordart">{profile.name}</Link>
        <p className="site-tagline">Social <span>✦</span> Games <span>✦</span> Video</p>
      </header>
      <div className="site-layout">
        <aside className="site-side">
          <Box title="Navigation">
            <nav className="site-nav" aria-label="Site">{NAV.map(([id, label]) => <Link key={id} to={id} className={section === id ? 'is-current' : undefined}>{label}</Link>)}</nav>
          </Box>
          <Box title="Elsewhere">
            <ul className="site-links">
              <li><AppLink id="games">My games</AppLink></li>
              <li><Link to="work/video">My edits</Link></li>
              <li><Ext href="https://github.com/HyperColossus">GitHub</Ext></li>
              <li><Ext href={`mailto:${profile.email}`}>Email me</Ext></li>
            </ul>
          </Box>
        </aside>
        <main className="site-main">
          {path === 'home' && <HomePage {...page} />}
          {path === 'work' && <WorkIndex {...page} />}
          {caseStudy && <CaseStudy item={caseStudy} {...page} />}
          {path === 'resume' && <ResumePage {...page} />}
          {path === 'contact' && <ContactPage {...page} />}
        </main>
      </div>
      <footer className="site-footer">
        <p>© 2026 {profile.name}</p>
      </footer>
    </div>
  </div>;
}

function Box({ title, children, className }) {
  return <section className={`box ${className ?? ''}`}>
    <h2 className="box-title">{title}</h2>
    <div className="box-body">{children}</div>
  </section>;
}

function HomePage({ Link, AppLink }) {
  return <>
    <Box title="Welcome to my homepage!">
      <p className="lead">Hi, I’m <b>Zack</b>! I run social for esports broadcasts, edit videos for creators, and build games. Three crafts, one question: <i>how do you make people feel something on a screen?</i></p>
      <p className="button-row"><Link to="work" className="web-button">See my work »</Link><Link to="resume" className="web-button">Read my résumé »</Link></p>
    </Box>
    <Box title="What I do">
      <table className="craft-table"><tbody>
        <tr><td><PixelIcon name="browser" size={32} /></td><td><Link to="work/watchnacl" className="text-link">Social &amp; esports</Link><br />Match days, storylines, and posts that bring a community together. <small>watchNACL · LPL English</small></td></tr>
        <tr><td><PixelIcon name="gamepad" size={32} /></td><td><AppLink id="games" className="text-link">Games &amp; interactive</AppLink><br />Playable ideas, currently in development. <small>Slots And Ladders · Zombies</small></td></tr>
        <tr><td><PixelIcon name="notepad" size={32} /></td><td><Link to="work/video" className="text-link">Video &amp; motion</Link><br />Full edits and thumbnails with the rhythm that keeps people watching. <small>SamIsDual · Premiere Pro</small></td></tr>
      </tbody></table>
    </Box>
    <Box title="What’s new">
      <dl className="updates">{profile.updates.map(update => <div key={update.date + update.text}><dt>{update.date}</dt><dd>{update.text}{update.isNew && <span className="new-tag">NEW!</span>}</dd></div>)}</dl>
    </Box>
  </>;
}

function WorkTable({ Link }) {
  return <table className="work-table">
    <thead><tr><th>#</th><th>Project</th><th>Role</th><th>When</th></tr></thead>
    <tbody>{work.map((item, index) => <tr key={item.id}>
      <td>{index + 1}</td>
      <td><Link to={`work/${item.id}`} className="text-link">{item.org}</Link><small>{item.discipline}</small></td>
      <td>{item.role}</td>
      <td className="nowrap">{item.period}</td>
    </tr>)}</tbody>
  </table>;
}

function WorkIndex({ Link }) {
  return <Box title="My work">
    <p className="lead">Social for two League of Legends broadcasts, a campus esports program, and a creator’s channel. Click a project for the full story.</p>
    <WorkTable Link={Link} />
  </Box>;
}

function CaseStudy({ item, Link, Ext }) {
  const index = work.indexOf(item);
  const prev = work[(index - 1 + work.length) % work.length];
  const next = work[(index + 1) % work.length];
  return <>
    <Box title={`${item.org} — ${item.discipline}`}>
      <h1 className="page-heading">{item.headline}</h1>
      <table className="facts-table"><tbody>
        <tr><th>Role</th><td>{item.role}</td></tr>
        <tr><th>With</th><td>{item.company}</td></tr>
        <tr><th>When</th><td>{item.period}</td></tr>
      </tbody></table>
      <p className="lead">{item.summary}</p>
      {item.showMedia && <>
        <h3 className="sub-heading">Selected work at a glance</h3>
        <table className="facts-table"><tbody>
          <tr><th>Portfolio</th><td>{media.filter(clip => clip.format === 'video').length} long-form videos · {media.filter(clip => clip.format === 'short').length} Short</td></tr>
          <tr><th>Editing</th><td>{[...new Set(media.map(clip => clip.role))].join(' · ')}</td></tr>
          <tr><th>Tools</th><td>{[...new Set(media.flatMap(clip => clip.tools))].join(' · ')}</td></tr>
          <tr><th>Thumbnails</th><td>{media.filter(clip => clip.madeThumbnail).length} designed by me</td></tr>
        </tbody></table>
      </>}
      {item.stats.length > 0 && <div className="counters">{item.stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>}
      <h3 className="sub-heading">What I did</h3>
      <ul className="star-list">{item.did.map(line => <li key={line}>{line}</li>)}</ul>
      {item.links.length > 0 && <p className="button-row">{item.links.map(link => <Ext key={link.url} href={link.url} className="web-button">{link.label} »</Ext>)}</p>}
    </Box>
    {item.posts?.length > 0 && <Box title="Featured posts">
      <p>Selected examples from my work for {item.org}.</p>
      <ul className="star-list">{item.posts.map((url, index) => <li key={url}><Ext href={url}>View featured post {index + 1} »</Ext></li>)}</ul>
    </Box>}
    {item.showMedia && <Box title={`Selected edits (${media.length}) — thumbnails by me too`}>
      <div className="media-grid">{media.map(clip => <Ext key={clip.id} href={clip.url} className={`media-card ${clip.format === 'short' ? 'is-short' : ''}`}>
        <span className="media-thumb"><img src={clip.thumbnail} alt="" loading="lazy" onError={event => event.currentTarget.classList.add('is-missing')} />{clip.duration && <span className="media-time">{clip.format === 'short' ? 'SHORT ' : ''}{clock(clip.duration)}</span>}</span>
        <span className="media-title">{clip.title}</span>
        <span className="media-credit">{clip.format === 'short' ? 'Short' : 'Long-form'} · {clip.role}{clip.madeThumbnail ? ' + thumbnail design' : ''}<br />{clip.tools.join(' · ')}</span>
        {clip.results && <span className="media-credit">{clip.results}</span>}
      </Ext>)}</div>
      <p className="hint">Click a thumbnail to watch it right here.</p>
    </Box>}
    <nav className="webring" aria-label="More work">
      <Link to={`work/${prev.id}`}>« {prev.org}</Link>
      <Link to="work">Zack’s Work Ring</Link>
      <Link to={`work/${next.id}`}>{next.org} »</Link>
    </nav>
  </>;
}

function ResumePage({ Ext }) {
  return <Box title="Résumé">
    <h1 className="page-heading">{profile.name}</h1>
    <p className="resume-title">{profile.title}</p>
    <p className="lead">{profile.summary}</p>
    <p className="resume-contact"><Ext href={`mailto:${profile.email}`} className="text-link">{profile.email}</Ext>{profile.links.map(link => <Ext key={link.url} href={link.url} className="text-link">{link.label}</Ext>)}</p>
    <h3 className="sub-heading">Experience</h3>
    {work.map(item => <div className="resume-entry" key={item.id}>
      <p className="resume-when">{item.period}</p>
      <div><b>{item.role}</b> — {item.org}{item.company !== item.org ? `, ${item.company}` : ''}<ul className="star-list">{item.did.map(line => <li key={line}>{line}</li>)}</ul></div>
    </div>)}
    <h3 className="sub-heading">Education</h3>
    {profile.education.map(entry => <div className="resume-entry" key={entry.degree}>
      <p className="resume-when">{entry.period}</p>
      <div><b>{entry.degree}</b> — {entry.school}{entry.note && <p className="resume-note">{entry.note}</p>}</div>
    </div>)}
    <h3 className="sub-heading">Skills</h3>
    <table className="facts-table skills-table"><tbody>{Object.entries(profile.skills).map(([group, items]) => <tr key={group}><th>{group}</th><td>{items.join(' · ')}</td></tr>)}</tbody></table>
  </Box>;
}

function ContactPage({ Ext }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(profile.email); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable: the address is selectable text */ }
  };
  return <Box title="Contact me!">
    <div className="contact-card">
      <PixelIcon name="mail" size={64} />
      <div>
        <p className="lead">Open to social, content, and game roles. The fastest way to reach me is email:</p>
        <p className="contact-email">{profile.email}</p>
        <p className="button-row"><Ext href={`mailto:${profile.email}`} className="web-button">Send an email »</Ext><button className="web-button" onClick={copy}>{copied ? 'Copied!' : 'Copy address'}</button></p>
      </div>
    </div>
    <h3 className="sub-heading">Find me on</h3>
    <ul className="star-list">{profile.links.map(link => <li key={link.url}><Ext href={link.url} className="text-link">{link.label}</Ext> — {link.url.replace(/^https?:\/\//, '')}</li>)}</ul>
  </Box>;
}

function NotFound({ url, Link }) {
  return <div className="xp-error">
    <h1><Globe size={30} strokeWidth={1.4} />The page cannot be displayed</h1>
    <p>The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or the page never existed in the first place.</p>
    <hr />
    <p>Please try the following:</p>
    <ul>
      <li>Make sure the Web site address displayed in the address bar is spelled and formatted correctly: <code>{url}</code></li>
      <li>Open the <Link to="home">home page</Link>, and then look for links to the information you want.</li>
      <li>Try one of these: <Link to="work">Work</Link>, <Link to="resume">Résumé</Link>, <Link to="contact">Contact</Link>.</li>
    </ul>
    <p className="xp-error-code">HTTP 404 - File not found<br />Internet Explorer</p>
  </div>;
}
