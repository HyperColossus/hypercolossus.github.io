import React, { useState } from 'react';
import { Gamepad2, ArrowUpRight, ArrowLeft } from 'lucide-react';

const games = [
  {
    id: 'hollow',
    title: 'Hollow Field',
    year: '2025',
    category: 'Exploration / First person',
    role: 'Game design / Systems / Creative development',
    desc: 'A first-person scavenger built around a procedurally grown wheat field, where navigation and discovery are the core challenge.',
    summary: 'An experiment in procedural space, visual orientation, and making repetition feel mysterious instead of mechanical.',
    tags: ['Exploration', 'Procedural worlds', 'First person'],
    number: '01',
  },
  {
    id: 'splice',
    title: 'Splice',
    year: '2024',
    category: 'Co-op / Puzzle',
    role: 'Game design / Interaction / Creative development',
    desc: 'A two-player puzzle concept where both players are connected by a shared rope and have to solve space together.',
    summary: 'A co-op mechanic built around constraint, communication, and turning one simple relationship into a series of spatial problems.',
    tags: ['Co-op', 'Puzzle', 'Interaction'],
    number: '02',
  },
];

function GameVisual({ game, large = false }) {
  return (
    <div className={`games-project-visual art-${game.id} ${large ? 'is-large' : ''}`}>
      <span className="game-art-atmosphere" aria-hidden="true" />
      <span className="game-art-midground" aria-hidden="true" />
      <span className="game-art-foreground" aria-hidden="true" />
      <span className="games-project-index">{game.number}</span>
      <div className="games-project-visual-copy">
        <span>{game.category}</span>
        <strong>{game.title}</strong>
      </div>
    </div>
  );
}

export default function RetroSteam() {
  const [selected, setSelected] = useState(null);
  const game = games.find(item => item.id === selected);

  return (
    <div className="games-site">
      <header className="games-site-header">
        <div className="games-site-brand">
          <span className="games-site-mark"><Gamepad2 size={18} strokeWidth={1.5} /></span>
          <span><strong>Games by Zack</strong><small>Independent game projects</small></span>
        </div>
        <span className="games-site-count">02 PROJECTS</span>
      </header>

      <div className="games-site-scroll">
        {game ? (
          <main className="games-detail-page">
            <button className="games-back" onClick={() => setSelected(null)}>
              <ArrowLeft size={14} /> All projects
            </button>

            <GameVisual game={game} large />

            <section className="games-detail-grid">
              <div className="games-detail-copy">
                <p className="games-kicker">{game.year} / {game.category}</p>
                <h1>{game.title}</h1>
                <p>{game.desc}</p>
                <p className="games-detail-summary">{game.summary}</p>
              </div>

              <aside className="games-detail-meta">
                <div><span>Role</span><strong>{game.role}</strong></div>
                <div><span>Year</span><strong>{game.year}</strong></div>
                <div><span>Status</span><strong>Portfolio project</strong></div>
              </aside>
            </section>

            <div className="games-tag-row">{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div>

            <section className="games-release-note">
              <span>PLAYABLE BUILD</span>
              <p>A public play link has not been added yet. Project notes and release updates will appear here when they are ready.</p>
            </section>
          </main>
        ) : (
          <>
            <main className="games-hero">
              <div>
                <p className="games-kicker">GAME DESIGN / INTERACTION</p>
                <h1>Small games built around one strong idea.</h1>
                <p>
                  These projects explore how a mechanic, space, or constraint can carry an experience.
                  The focus is less on scale and more on making the core interaction feel worth understanding.
                </p>
              </div>
              <aside>
                <span>COLLECTION / 2024—2025</span>
                <strong>2</strong>
                <p>Original projects currently in the portfolio.</p>
              </aside>
            </main>

            <section className="games-projects-section">
              <div className="games-section-heading">
                <div>
                  <p className="games-kicker">SELECTED PROJECTS</p>
                  <h2>Built to be figured out.</h2>
                </div>
                <span>Concept · systems · interaction</span>
              </div>

              <div className="games-project-grid">
                {games.map(item => (
                  <button className="games-project-card" key={item.id} onClick={() => setSelected(item.id)}>
                    <GameVisual game={item} />
                    <div className="games-project-copy">
                      <div>
                        <p className="games-kicker">{item.year} / {item.category}</p>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                      </div>
                      <div className="games-project-footer">
                        <span>{item.role}</span>
                        <ArrowUpRight size={17} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <footer className="games-site-footer">
          <span>Game design, interaction, and creative development.</span>
          <span>Built by Zachary Siegel.</span>
        </footer>
      </div>
    </div>
  );
}
