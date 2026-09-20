import React from 'react';
import { Folder, FlaskConical, Sparkles, ArrowUpRight } from 'lucide-react';

const tracks = [
  {
    number: '01',
    title: 'Tools',
    text: 'Small utilities and workflows that solve a specific problem well.',
    status: 'Open slot',
  },
  {
    number: '02',
    title: 'Interfaces',
    text: 'UI experiments, interaction patterns, and ideas that deserve more than a mockup.',
    status: 'In progress',
  },
  {
    number: '03',
    title: 'Prototypes',
    text: 'Fast technical experiments used to test whether an idea is actually worth pursuing.',
    status: 'Open slot',
  },
];

export default function SideProjects() {
  return (
    <div className="lab-site">
      <header className="lab-site-header">
        <div className="lab-site-brand">
          <span className="lab-site-mark"><FlaskConical size={18} strokeWidth={1.5} /></span>
          <span><strong>The Lab</strong><small>Side projects & experiments</small></span>
        </div>
        <span className="lab-site-path"><Folder size={12} /> /side-projects</span>
      </header>

      <div className="lab-site-scroll">
        <main className="lab-hero">
          <div>
            <p className="lab-kicker">EXPERIMENTAL WORKSPACE</p>
            <h1>A place for ideas that are still becoming something.</h1>
            <p>
              This section is intentionally selective. It will hold small tools, interface experiments,
              and prototypes once they are developed enough to be useful to someone besides me.
            </p>
          </div>

          <aside className="lab-status-card">
            <div className="lab-status-top"><span><i /> ACTIVE WORKSPACE</span><Sparkles size={15} /></div>
            <strong>Building quietly.</strong>
            <p>New work will appear here when it has a real story, not just because it exists.</p>
          </aside>
        </main>

        <section className="lab-tracks">
          <div className="lab-section-heading">
            <div>
              <p className="lab-kicker">WHAT WILL LIVE HERE</p>
              <h2>Three kinds of experiments.</h2>
            </div>
            <span>Quality over volume.</span>
          </div>

          <div className="lab-track-grid">
            {tracks.map(track => (
              <article key={track.number} className="lab-track-card">
                <div className="lab-track-top">
                  <span>{track.number}</span>
                  <span>{track.status}</span>
                </div>
                <h3>{track.title}</h3>
                <p>{track.text}</p>
                <div className="lab-track-bottom">
                  <span>Future project space</span>
                  <ArrowUpRight size={14} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lab-principle">
          <div className="lab-principle-mark"><FlaskConical size={24} strokeWidth={1.3} /></div>
          <div>
            <p className="lab-kicker">THE RULE</p>
            <h2>Ship the useful version.</h2>
            <p>
              Experiments stay private until there is something clear to learn from, use, or explore.
              That keeps this space focused on finished thinking instead of unfinished clutter.
            </p>
          </div>
        </section>

        <footer className="lab-site-footer">
          <span>Workspace ready.</span>
          <span>More soon.</span>
        </footer>
      </div>
    </div>
  );
}
