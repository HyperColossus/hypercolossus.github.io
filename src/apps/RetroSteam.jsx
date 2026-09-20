import React, { useState } from 'react';
import { Gamepad2, ArrowUpRight, ArrowLeft } from 'lucide-react';
const games = [
  { id: 'hollow', title: 'Hollow Field', year: '2025', category: 'EXPLORATION / FIRST PERSON', desc: 'A first-person scavenger built on a procedurally-grown wheat field.', tags: ['Exploration', 'Procedural worlds'], number: '01' },
  { id: 'splice', title: 'Splice', year: '2024', category: 'CO-OP / PUZZLE', desc: 'Two players share one rope. A co-op puzzle experience.', tags: ['Co-op', 'Puzzle', 'Indie'], number: '02' },
];
export default function RetroSteam() {
  const [selected, setSelected] = useState(null);
  const game = games.find(item => item.id === selected);
  return <div className="game-library">
    <header className="library-header"><span><Gamepad2 size={22} /> PLAY / ZS</span><span className="eyebrow">The game collection</span><span className="library-count">02 titles</span></header>
    <div className="library-scroll">{game ? <>
      <button className="library-back" onClick={() => setSelected(null)}><ArrowLeft size={15} /> Back to collection</button>
      <div className={`game-art game-art-large art-${game.id}`}>
        <span className="game-art-atmosphere" aria-hidden="true" />
        <span className="game-art-midground" aria-hidden="true" />
        <span className="game-art-foreground" aria-hidden="true" />
        <span className="game-art-number">{game.number}</span>
        <span className="game-art-title">{game.title}</span>
        <span className="art-caption">{game.category}</span>
      </div>
      <div className="game-detail"><p className="eyebrow">{game.year} / {game.category}</p><h1>{game.title}</h1><p>{game.desc}</p><div className="game-tags">{game.tags.map(tag => <span key={tag}>{tag}</span>)}</div><p className="release-note">A public play link hasn’t been added yet. Check back for release updates.</p></div>
    </> : <>
      <div className="library-heading"><div><p className="eyebrow">Built for the curious</p><h1>Press play.<br /><em>Stay a while.</em></h1></div><p>Worlds to wander.<br />Things to figure out.<br />Games by Zack.</p></div>
      <div className="game-grid">{games.map(item => <button className="game-card" key={item.id} onClick={() => setSelected(item.id)} aria-label={`View ${item.title}`}><div className={`game-art art-${item.id}`}>
          <span className="game-art-atmosphere" aria-hidden="true" />
          <span className="game-art-midground" aria-hidden="true" />
          <span className="game-art-foreground" aria-hidden="true" />
          <span className="game-art-number">{item.number}</span>
          <span className="game-art-title">{item.title}</span>
          <span className="art-caption">{item.category}</span>
        </div><div className="game-card-meta"><h2>{item.title}</h2><ArrowUpRight size={19} /></div><p>{item.desc}</p><span className="game-year">{item.year} <span>View project</span></span></button>)}</div>
      <footer className="library-footer">A collection of playable ideas. Always making room for the next one.</footer>
    </>}</div>
  </div>;
}
