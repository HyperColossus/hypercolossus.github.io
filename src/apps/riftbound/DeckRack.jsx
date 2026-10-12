import React, { useState } from 'react';

const SECTION_ORDER = ['Legend', 'Champion', 'Main', 'Battlefield', 'Rune', 'Sideboard'];

// Zack's played decks, read from the sheet's Decks tab. View-only.
export default function DeckRack({ resource }) {
  const [activeName, setActiveName] = useState(null);
  const decks = resource.data?.decks ?? [];
  const active = decks.find(deck => deck.name === activeName);
  return <aside className="rb-decks" aria-labelledby="rb-decks-title">
    <h2 id="rb-decks-title">Zack’s Decks</h2>
    {resource.loading ? <p className="rb-deck-note" role="status">Loading decks…</p>
      : resource.error ? <p className="rb-deck-note" role="alert">Decks are unavailable right now.</p>
        : !decks.length ? <p className="rb-deck-note">No decks recorded yet.</p>
          : <div className="rb-deck-list">{decks.map(deck => <button key={deck.name} aria-pressed={deck.name === activeName}
              onClick={() => setActiveName(current => current === deck.name ? null : deck.name)}>
              <span>{deck.name}</span><small>{deck.total} cards{deck.domains.length ? ` · ${deck.domains.join(' / ')}` : ''}</small></button>)}</div>}
    {active && <section className="rb-deck-editor" aria-label={`${active.name} card list`}>
      <h3>{active.name}</h3>
      <p className="rb-deck-note" role="status">{active.missing ? `${active.missing} ${active.missing === 1 ? 'copy' : 'copies'} not in the collection.` : 'Every card is in the collection.'}</p>
      {SECTION_ORDER.map(section => {
        const cards = active.cards.filter(card => card.section === section);
        return cards.length ? <div key={section} className="rb-deck-section"><h4>{section} <small>{cards.reduce((sum, card) => sum + card.quantity, 0)}</small></h4>
          <ul>{cards.map(card => <li key={`${card.id ?? card.name}`} className={card.owned < card.quantity ? 'rb-deck-short' : undefined}>
            <b>{card.quantity}×</b><span>{card.name}{!card.known && <small> (not in catalog)</small>}</span>
          </li>)}</ul></div> : null;
      })}
    </section>}
  </aside>;
}
