import React, { useRef, useState } from 'react';
import { adjustCard, deckText, deckCoverage } from './drafts';
import LocalBackup from './LocalBackup';

export default function DeckRack({ decks, activeId, setActiveId, save, error, ownership, unavailable }) {
  const [name, setName] = useState('');
  const [exported, setExported] = useState(false);
  const toolsRef = useRef(null);
  const active = decks.find(deck => deck.id === activeId);
  const coverage=active && ownership.data ? deckCoverage(active,ownership.data.items) : null;
  const update = next => save(decks.map(deck => deck.id === next.id ? next : deck));
  return <aside className="rb-decks" aria-labelledby="rb-decks-title">
    <h2 id="rb-decks-title">My Decks</h2>
    <details ref={toolsRef} className="rb-deck-help"><summary>Deck tools</summary><p className="rb-deck-note">Drafts saved in this browser. Legality is not checked.</p>
    {error && <p role="alert">{error}</p>}
    <form className="rb-deck-create" onSubmit={event => {
      event.preventDefault();
      if (!name.trim() || decks.length >= 100) return;
      const deck = { id: crypto.randomUUID(), name: name.trim(), cards: [] };
      if (save([...decks, deck])) { setActiveId(deck.id); setName(''); setExported(false); }
    }}>
      <label>New deck name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="My next deck" /></label>
      <button disabled={decks.length >= 100}>Create deck</button>
    </form>
    <LocalBackup kind="decks" records={decks} save={save} unavailable={unavailable} /></details>
    <div className="rb-deck-list">{decks.map(deck => <button key={deck.id} aria-pressed={activeId === deck.id} onClick={() => { setActiveId(deck.id); setExported(false); }}><span>{deck.name}</span><small>{deck.cards.reduce((sum, card) => sum + card.quantity, 0)} cards</small></button>)}</div>
    {!active && <div className="rb-deck-empty-slots">{Array.from({length:Math.max(0,8-decks.length)},(_,i)=><button key={i} className="rb-deck-empty-slot" aria-label="Create a new deck" onClick={()=>{ if(toolsRef.current) { toolsRef.current.open=true; toolsRef.current.querySelector('input')?.focus(); } }}><span aria-hidden="true">♧</span><span>New deck</span></button>)}</div>}
    {active ? <section className="rb-deck-editor" aria-label={`Edit ${active.name}`}>
      <form onSubmit={event => { event.preventDefault(); const value = new FormData(event.currentTarget).get('name').trim(); if (value) update({ ...active, name: value }); }} key={active.id + active.name}>
        <label>Deck name<input name="name" required maxLength={80} defaultValue={active.name} /></label><button>Rename</button>
      </form>
      {!active.cards.length && <p>Choose “Add to deck” on a catalog card to begin.</p>}
      {ownership.loading ? <p role="status">Checking owned copies…</p> : ownership.error ? <p>Ownership check unavailable. Refresh collection to retry.</p> : coverage && <p role="status">{coverage.missing ? `${coverage.missing} copies missing from this draft.` : 'You own all copies in this draft.'} Checks this printing and combines normal/foil copies; other drafts do not reserve cards.</p>}
      <ul>{active.cards.map(card => <li key={card.id}><span>{card.name}</span><div><button aria-label={`Remove one ${card.name}`} onClick={() => update(adjustCard(active, card, -1))}>−</button><b>{card.quantity}</b><button disabled={card.quantity >= 99} aria-label={`Add one ${card.name}`} onClick={() => update(adjustCard(active, card, 1))}>+</button></div></li>)}</ul>
      <button onClick={() => setExported(value => !value)}>Export deck text</button>
      {coverage?.missing>0 && <details><summary>Missing cards</summary><ul>{coverage.cards.filter(card => card.missing).map(card => <li key={card.id}>{card.missing} × {card.name} ({card.owned} owned / {card.quantity} required)</li>)}</ul><label>Copy missing-card list<textarea readOnly rows={5} value={coverage.cards.filter(card => card.missing).map(card => `${card.missing} × ${card.name} [${card.id}]`).join('\n')} onFocus={event => event.target.select()} /></label></details>}
      {exported && <label>Copy deck list<textarea readOnly rows={8} value={deckText(active)} onFocus={event => event.target.select()} /></label>}
      <button onClick={() => { if (save(decks.filter(deck => deck.id !== active.id))) setActiveId(null); }}>Delete draft</button>
    </section> : <p className="rb-deck-note">Create or select a draft to add cards. Your Binder stays unchanged.</p>}
  </aside>;
}
