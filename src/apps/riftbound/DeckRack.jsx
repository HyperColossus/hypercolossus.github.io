import React, { useState } from 'react';

const SECTION_ORDER = ['Legend', 'Champion', 'Main', 'Battlefield', 'Rune', 'Sideboard'];

// Zack's played decks, read from the sheet's Decks tab. View-only.
export default function DeckRack({ resource }) {
  const [activeName, setActiveName] = useState(null);
  const decks = resource.data?.decks ?? [];
  const active = decks.find(deck => deck.name === activeName);
  return <aside className="hs-decks" aria-labelledby="hs-decks-title">
    <h2 id="hs-decks-title" className="hs-decks-title">{active ? active.name : 'Zack’s Decks'}</h2>
    <div className="hs-decks-body">
      {resource.loading ? <p className="hs-decks-note" role="status">Loading decks…</p>
        : resource.error ? <p className="hs-decks-note" role="alert">Decks are unavailable right now.</p>
          : active ? <section className="hs-deck-list" aria-label={`${active.name} card list`}>
              {SECTION_ORDER.map(section => {
                const cards = active.cards.filter(card => card.section === section);
                return cards.length ? <div key={section} className="hs-deck-section"><h3>{section}<small>{cards.reduce((sum, card) => sum + card.quantity, 0)}</small></h3>
                  <ul>{cards.map(card => <li key={card.id ?? card.name} className={card.owned < card.quantity ? 'hs-deck-short' : undefined}
                    style={card.image_url ? { '--art': `url("${card.image_url}")` } : undefined}>
                    <span className="hs-deck-card-name">{card.name}</span><b>{card.quantity}</b>
                  </li>)}</ul></div> : null;
              })}
              <p className="hs-decks-note">{active.missing ? `${active.missing} ${active.missing === 1 ? 'copy' : 'copies'} not in the collection` : 'Every card is in the collection'}</p>
            </section>
            : !decks.length ? <p className="hs-decks-note">No decks recorded yet.</p>
              : <div className="hs-deck-banners">{decks.map(deck => <button key={deck.name} className="hs-deck-banner"
                  style={deck.cover ? { '--art': `url("${deck.cover}")` } : undefined} onClick={() => setActiveName(deck.name)}>
                  <span>{deck.name}</span><small>{deck.total} cards{deck.domains.length ? ` · ${deck.domains.join(' / ')}` : ''}</small>
                </button>)}</div>}
    </div>
    <div className="hs-decks-footer">
      <span className="hs-deck-count"><b>{decks.length}</b><small>Decks</small></span>
      {active && <button className="hs-back" onClick={() => setActiveName(null)}>Back</button>}
    </div>
  </aside>;
}
