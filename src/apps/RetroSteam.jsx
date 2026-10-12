import React, { useState } from 'react';
import PixelIcon from '../components/PixelIcon';
import { games } from '../content/games';
import { profile } from '../content/profile';
import './steam.css';

// A standalone game client in the style of the original 2003-era Steam (olive VGUI skin).
// Referential only: no Valve logos or assets.
const STATUS = { 'in-development': 'In development', released: 'Released' };
const statusOf = game => STATUS[game.status] ?? 'In development';

export default function RetroSteam() {
  const [tab, setTab] = useState('games');
  const [selected, setSelected] = useState(games[0]?.id ?? null);
  const [detail, setDetail] = useState(null);
  const game = games.find(item => item.id === (detail ?? selected));

  const openDetail = id => { setSelected(id); setDetail(id); setTab('games'); };
  const moveSelection = (event, index) => {
    if (event.key === 'Enter') { event.preventDefault(); openDetail(games[index].id); return; }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = games[Math.max(0, Math.min(games.length - 1, index + step))];
    setSelected(next.id);
    event.currentTarget.parentElement.children[games.indexOf(next)]?.focus();
  };

  return <div className="steam">
    <div className="st-tabs" role="tablist" aria-label="Steam">
      <button role="tab" aria-selected={tab === 'games'} onClick={() => { setTab('games'); setDetail(null); }}>My games</button>
      <button role="tab" aria-selected={tab === 'developer'} onClick={() => setTab('developer')}>Developer</button>
    </div>

    <div className="st-panel" role="tabpanel">
      {tab === 'games' && !detail && <>
        <div className="st-table" role="grid" aria-label="My games">
          <div className="st-row st-head" role="row"><span role="columnheader">Games</span><span role="columnheader">Status</span></div>
          <div className="st-rows">
            {games.map((item, index) => <div key={item.id} role="row" tabIndex={0} aria-selected={selected === item.id}
              className={`st-row ${selected === item.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(item.id)} onDoubleClick={() => openDetail(item.id)} onKeyDown={event => moveSelection(event, index)}>
              <span role="gridcell" className="st-game"><PixelIcon name="gamepad" size={16} />{item.title}</span>
              <span role="gridcell">{statusOf(item)}</span>
            </div>)}
          </div>
        </div>
        <div className="st-actions">
          <PlayButton game={games.find(item => item.id === selected)} />
          <button className="st-button" disabled={!selected} onClick={() => openDetail(selected)}>View details</button>
          <span className="st-tip">Double-click a game to see its details.</span>
        </div>
      </>}

      {tab === 'games' && detail && game && <div className="st-detail">
        <button className="st-link" onClick={() => setDetail(null)}>‹ Back to My games</button>
        <div className="st-detail-body">
          <h2>{game.title}</h2>
          {game.desc && <p className="st-desc">{game.desc}</p>}
          <dl className="st-props">
            <dt>Status</dt><dd>{statusOf(game)}</dd>
            {game.category && <><dt>Genre</dt><dd>{game.category}</dd></>}
            {game.engine && <><dt>Engine</dt><dd>{game.engine}</dd></>}
            {game.role && <><dt>My role</dt><dd>{game.role}</dd></>}
            <dt>Developer</dt><dd>{profile.name}</dd>
          </dl>
          {game.tags?.length > 0 && <p className="st-tags">{game.tags.join(' · ')}</p>}
          {game.playUrl && <div className="st-actions"><PlayButton game={game} /></div>}
        </div>
      </div>}

      {tab === 'developer' && <div className="st-dev">
        <h2>{profile.name}</h2>
        <p className="st-sub">Game developer</p>
        <dl className="st-props">
          {profile.education.filter(entry => /Game/.test(entry.degree)).map(entry => <React.Fragment key={entry.degree}>
            <dt>Education</dt><dd>{entry.degree}<br /><small>{entry.school}, {entry.period}</small></dd>
            {entry.note && <><dt>Track record</dt><dd>{entry.note}</dd></>}
          </React.Fragment>)}
          <dt>Tools</dt><dd>{profile.skills['Game Dev'].join(' · ')}</dd>
          <dt>Now building</dt><dd>{games.map(item => item.title).join(', ')}</dd>
        </dl>
        <div className="st-actions"><button className="st-button" onClick={() => games[0] && openDetail(games[0].id)}>Browse my games</button></div>
      </div>}
    </div>

    <div className="st-status" role="status">{games.length} {games.length === 1 ? 'game' : 'games'} · {games.filter(item => item.status !== 'released').length} in development</div>
  </div>;
}

function PlayButton({ game }) {
  if (game?.playUrl) return <a className="st-button st-play" href={game.playUrl} target="_blank" rel="noreferrer">Play</a>;
  return null;
}
