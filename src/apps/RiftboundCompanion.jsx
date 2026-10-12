import React, { useEffect, useRef, useState } from 'react';
import { getRiftbound, money, priceAge } from './riftbound/api';
import './riftbound.css';
import './riftbound/hearthstone-collection.css';
import PageTurn from './riftbound/PageTurn';
import DeckRack from './riftbound/DeckRack';
import Events from './riftbound/Events.jsx';
import ROICalculator from './riftbound/ROICalculator.jsx';
import PackSimulator from './riftbound/PackSimulator.jsx';
import { isBattlefield } from './riftbound/cardArtwork';

const EMPTY_FILTERS = { q: '', set: '', rarity: '', finish: '', domain: '', energy: '', page: 1 };
const DOMAINS = [['Fury', '#d9564d'], ['Calm', '#5faa64'], ['Mind', '#639add'], ['Body', '#e48b52'], ['Chaos', '#ad75c8'], ['Order', '#eac859'], ['Colorless', '#b6b9bc']];

export default function RiftboundCompanion() {
  const [tab, setTab] = useState('catalog');
  return <section className="riftbound-app" data-app="riftbound" aria-label="Riftbound Companion">
    <header className="rb-heading">
      <span className="rb-mark" aria-hidden="true">✧</span>
      <div className="rb-title-lockup"><p>THE SUMMONER’S ARCHIVE</p><h1>Riftbound</h1><span>Zack’s collection, across the Rift</span></div>
      <div className="rb-header-seal" aria-hidden="true"><span>✦</span><small>COLLECTOR<br />EDITION</small></div>
    </header>
    <nav className="rb-tabs" aria-label="Riftbound views">
      <button aria-pressed={tab === 'catalog'} onClick={() => setTab('catalog')}><i aria-hidden="true">✧</i> Collection <span>Zack’s cards</span></button>
      <button aria-pressed={tab === 'binder'} onClick={() => setTab('binder')}><i aria-hidden="true">▤</i> Binder <span>Owned versions</span></button>
      <button aria-pressed={tab === 'events'} onClick={() => setTab('events')}><i aria-hidden="true">⚑</i> Events <span>Events attended</span></button>
      <button aria-pressed={tab === 'calculator'} onClick={() => setTab('calculator')}><i aria-hidden="true">◷</i> Calculator <span>ROI Analysis</span></button>
      <button aria-pressed={tab === 'simulator'} onClick={() => setTab('simulator')}><i aria-hidden="true">⚄</i> Simulator <span>Rip Packs</span></button>
    </nav>
    {tab === 'events' ? <EventsTab /> : tab === 'calculator' ? <ROICalculator /> : tab === 'simulator' ? <PackSimulator /> : <CardBrowser key={tab} kind={tab} />}
    <footer className="rb-footer">Card data: RiftHunt / DotGG · Prices: TCGPlayer via TCG API / TCGCSV · Unofficial fan project. Not affiliated with Riot Games. <a href="/riftbound">Open full-page tracker</a></footer>
  </section>;
}

function EventsTab() {
  return <Events resource={useResource('events', 0)} />;
}

function CardBrowser({ kind }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showUnowned, setShowUnowned] = useState(false);
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [turnDirection, setTurnDirection] = useState(1);
  const [turning, setTurning] = useState(false);
  const change = (key, value) => { setFilters(current => ({ ...current, [key]: value, page: 1 })); setSelected(null); };
  const params = new URLSearchParams({ ...filters, ...(kind === 'catalog' && !showUnowned ? { owned: 'true' } : {}), ...(kind === 'binder' ? { group: 'printing' } : {}), limit: 8 });
  const path = `${kind}?${params}`;
  const resource = useResource(path, retry);
  const facets = useResource('facets', retry);
  const summary = useResource('summary', retry);
  const data = resource.data;
  const decks = useResource('decks', retry);
  const title = kind === 'binder' ? 'Binder' : 'Collection';
  const spreadKey = JSON.stringify({ ...filters, page: undefined, showUnowned });
  const pages = data?.items.length ? [0, 1].map(side => <React.Fragment key={side}>
    <div className="rb-pocket-grid" role="group" aria-label={`${side === 0 ? 'Left' : 'Right'} page, four card pockets`}>
      {Array.from({ length: 4 }, (_, pocket) => {
        const card = data.items[side * 4 + pocket];
        return card ? <Card key={`${card.id}:${card.is_foil}`} card={card} binder={kind === 'binder'} onSelect={() => setSelected(card)} /> : <div key={`empty-${pocket}`} className="rb-card-slot" aria-hidden="true"><span /></div>;
      })}
    </div>
    <p className="rb-sheet-number">{(filters.page - 1) * 2 + side + 1}</p>
  </React.Fragment>) : null;
  return <div className="rb-browser">
    <div className="rb-collection-layout">
      <div className="rb-collection-main">
        <div className="rb-collection-controls">
        <div className="rb-color-tabs" role="group" aria-label="Filter by domain">
          <button title="All domains" aria-label="All domains" aria-pressed={!filters.domain} onClick={() => change('domain', '')}>✦</button>
          {DOMAINS.map(([domain, color]) => <button key={domain} title={domain} aria-label={domain} className="rb-domain-button" style={{ '--gem': color }} aria-pressed={filters.domain === domain} onClick={() => change('domain', filters.domain === domain ? '' : domain)}><span aria-hidden="true">◆</span><span className="rb-sr-only">{domain}</span></button>)}
        </div>
        <label className="rb-set-tab">Expansion<select aria-label="Filter by set" value={filters.set} onChange={event => change('set', event.target.value)}><option value="">All sets</option>{facets.data?.sets.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}</select></label>
        </div>
        <div className="rb-collection-heading"><h2>{filters.domain || (kind === 'catalog' ? 'All Cards' : 'My Binder')}</h2>
      {kind === 'catalog' && <div className="rb-ownership-toggle"><button aria-pressed={showUnowned} onClick={() => { setShowUnowned(value => !value); change('page', 1); }}>Show unowned</button><span className="rb-sr-only">{showUnowned ? 'Missing cards appear faded in their collection positions.' : 'Showing owned cards only.'}</span></div>}
        </div>
        <div className="rb-book">
      <main className="rb-results" aria-label={`${title} cards`}>
        {resource.error ? <div className="rb-state" role="alert"><h3>Couldn’t open the {title.toLowerCase()}</h3><p>{resource.error}</p><button onClick={() => setRetry(value => value + 1)}>Try again</button></div>
            : data?.items.length === 0 ? <div className="rb-state"><span aria-hidden="true">◇</span><h3>{filters.q || filters.set || filters.rarity || filters.finish || filters.domain || filters.energy !== '' || filters.page > 1 ? 'No matching cards' : kind === 'binder' ? 'The Binder is empty' : !showUnowned ? 'Your collection is waiting' : 'The collection is waiting for its first import'}</h3><p>{filters.q || filters.set || filters.rarity || filters.finish || filters.domain || filters.energy !== '' || filters.page > 1 ? 'Try clearing your filters or returning to the first page.' : kind === 'binder' ? 'Owned cards will appear here once the owner records them. Browsing the Catalog does not add cards.' : !showUnowned ? 'No owned cards are recorded yet. Turn on Show unowned to explore the collection.' : 'Real card records will appear after a successful Catalog import.'}</p></div>
              : <><div className="rb-count" role="status"><span>{data ? <><b>{data.total.toLocaleString()}</b> {kind === 'binder' ? 'owned printings' : showUnowned ? 'cards in the collection' : 'owned cards'}</> : 'Opening the next spread…'}</span><span>TWO PAGES · FOUR POCKETS EACH</span></div>
                <PageTurn page={filters.page} direction={turnDirection} resetKey={spreadKey} pages={pages} onTurning={setTurning} fallback={<div className="rb-state" role="status">The archive is opening…</div>} />
              </>}
        {data && !resource.loading && !resource.error && data.total > 8 && <div className="rb-pagination"><button aria-label="Previous page" disabled={turning || filters.page <= 1} onClick={() => { setTurnDirection(-1); setFilters(current => ({ ...current, page: current.page - 1 })); setSelected(null); }}>‹ <span>Previous</span></button><span>Pages {(filters.page - 1) * 2 + 1}–{filters.page * 2} · Spread {filters.page} of {Math.ceil(data.total / 8)}</span><button aria-label="Next page" disabled={turning || filters.page * 8 >= data.total} onClick={() => { setTurnDirection(1); setFilters(current => ({ ...current, page: current.page + 1 })); setSelected(null); }}><span>Next</span> ›</button></div>}
      </main>
      </div>
        <div className="rb-toolbox">
        <div className="rb-energy-filter" role="group" aria-label="Filter by energy">
          <span>Energy</span><button aria-pressed={filters.energy === ''} onClick={() => change('energy', '')}>All</button>
          {Array.from({ length: 13 }, (_, energy) => <button key={energy} aria-pressed={filters.energy === String(energy)} onClick={() => change('energy', filters.energy === String(energy) ? '' : String(energy))}>{energy}</button>)}
          <label>Exact cost<input type="number" min="0" max="99" aria-label="Exact energy cost" value={filters.energy} onChange={event => { const value = event.target.value; if (value === '' || /^(?:[0-9]|[1-9][0-9])$/.test(value)) change('energy', value); }} /></label>
        </div>
        <form className="rb-filters" onSubmit={event => { event.preventDefault(); change('q', search.trim()); }}>
          <label className="rb-search">Find a card<div><input type="search" maxLength={100} value={search} placeholder="Card name…" onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Search cards">⌕</button></div></label>
          <label>Rarity<select value={filters.rarity} onChange={event => change('rarity', event.target.value)}><option value="">All rarities</option>{facets.data?.rarities.map(rarity => <option key={rarity}>{rarity}</option>)}</select></label>
          <button type="button" className="rb-clear" onClick={() => { setSearch(''); setFilters(EMPTY_FILTERS); setSelected(null); }}>Reset filters</button>
        </form>
        {facets.error && !resource.error && <p className="rb-filter-warning" role="status">Set and rarity filters could not load. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
        </div>
      </div>
      <DeckRack resource={decks} />
    </div>
    <details className="rb-collection-extras"><summary>Collection overview & value</summary><CollectionOverview resource={summary} retry={retry} onRefresh={() => setRetry(value => value + 1)} />
    {facets.data && <details className="rb-set-progress"><summary>Set completion</summary><p>Each catalog printing counts once, regardless of finish or copy count.</p><ul>{facets.data.sets.map(set => <li key={set.id}><span>{set.name}: {set.owned_cards} / {set.cards}</span><progress aria-label={`${set.name} owned printings`} value={set.owned_cards} max={set.cards || 1} /></li>)}</ul></details>}
    </details>
    {selected && <CardInspector key={`${selected.id}:${selected.is_foil}`} card={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function CollectionOverview({ resource, retry, onRefresh }) {
  const [date,setDate]=useState('');
  const past=useResource(date ? `valuation?date=${encodeURIComponent(date)}` : null,retry);
  const data = resource.data;
  const count = value => Number(value).toLocaleString('en-US');
  return <section className="rb-overview" aria-label="Whole collection overview">
    <header><h2>Collection overview</h2><button disabled={resource.loading} onClick={onRefresh}>Refresh collection</button></header>
    {resource.loading ? <p role="status">Counting the collection…</p>
      : resource.error ? <p role="alert">Collection overview is unavailable. Refresh to try again.</p>
        : data && <>
          <dl>
            <div><dt>Owned copies</dt><dd>{count(data.copies)}</dd><small>{count(data.normal_copies)} normal · {count(data.foil_copies)} foil</small></div>
            <div><dt>Unique cards</dt><dd>{count(data.owned_cards)} <small>/ {count(data.catalog_cards)}</small></dd><small>Counts each printing once</small></div>
            <div><dt>{Number(data.unpriced_copies) ? 'Partial recorded value' : 'Recorded value'}</dt><dd>{money(data.value_usd)}</dd><small>{count(data.priced_copies)} copies priced · {count(data.unpriced_copies)} missing prices</small></div>
          </dl>
          <p>Whole collection · USD · {data.oldest_price_date ? `${priceAge(data.oldest_price_date)}${data.newest_price_date !== data.oldest_price_date ? ` through ${data.newest_price_date}` : ''}.` : 'No owned copies have recorded prices.'} Values use the latest observation for each card.</p>
          {data.source === 'google-sheet' && <p>Live from the inventory sheet · Checks for edits every minute. Last checked {new Date(data.refreshed_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}.</p>}
          {!Number(data.copies) && <p>{data.source === 'google-sheet' ? 'No cards recorded yet.' : 'Add your quantities to the spreadsheet and import it locally, then refresh here.'}</p>}
          {data.source !== 'google-sheet' && <details className="rb-past-value"><summary>Value today’s collection at past prices</summary><p>This uses your current holdings and the newest observation on or before the selected UTC date. It does not reconstruct what you owned then.</p><form onSubmit={event => {event.preventDefault();setDate(new FormData(event.currentTarget).get('date'));}}><label>Valuation date<input name="date" required type="date" max={new Date().toISOString().slice(0,10)} /></label><button>Calculate past value</button></form>
            {past.loading ? <p role="status">Looking up past prices…</p> : past.error ? <p role="alert">Past valuation unavailable. Refresh to retry.</p> : past.data && <p role="status">{date}: {Number(past.data.unpriced_copies) ? 'partial value' : 'recorded value'} {money(past.data.value_usd)} · {count(past.data.priced_copies)} copies priced · {count(past.data.unpriced_copies)} missing prices. {priceAge(past.data.oldest_price_date)}{past.data.newest_price_date!==past.data.oldest_price_date ? ` through ${past.data.newest_price_date}` : ''}.</p>}
          </details>}
        </>}
  </section>;
}

function useResource(path, retry) {
  const [state, setState] = useState({ key: '', data: null, error: null });
  const key = `${path}:${retry}`;
  useEffect(() => {
    if(!path) return;
    const controller = new AbortController();
    let timer;
    const load = () => getRiftbound(path, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setState({ key, data, error: null });
        if (data.source === 'google-sheet' && !timer) timer = setInterval(load, 60000);
      }
    }).catch(error => { if (!controller.signal.aborted) setState({ key, data: null, error: error.message }); });
    load();
    return () => { controller.abort(); clearInterval(timer); };
  }, [path, key]);
  return !path ? {data:null,error:null,loading:false} : state.key === key ? { ...state, loading: false } : { data: null, error: null, loading: true };
}

function Card({ card, binder, onSelect }) {
  const [broken, setBroken] = useState(false);
  return <article className={`rb-card${!binder && !card.quantity ? ' rb-card-unowned' : ''}`}>
    <button className="rb-card-open" aria-label={`Card details & prices for ${card.name}`} onClick={onSelect} onContextMenu={event => { event.preventDefault(); onSelect(); }}><span className="rb-art">{card.image_url && !broken ? <img src={card.image_url} alt={card.name} loading="eager" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <span className="rb-art-missing"><span aria-hidden="true">✦</span>{card.name}<small>Artwork unavailable</small></span>}</span></button>
    <div className="rb-card-caption"><span>{card.quantity > 0 ? `${card.quantity} × owned` : 'Not owned'}</span></div>
    <div className="rb-card-body rb-sr-only"><p className="rb-meta">{card.set_name} · {card.rarity}</p><h3>{card.name}</h3>
      <dl className="rb-prices">{(!binder || card.normal_quantity > 0) && <div><dt>Normal</dt><dd>{money(card.normal_price)}</dd></div>}{(!binder || card.foil_quantity > 0) && <div><dt>Foil</dt><dd>{money(card.foil_price)}</dd></div>}</dl>
      <p className="rb-gameplay">{card.domains?.join(' · ') || 'Domain unknown'} · {card.energy == null ? 'Energy —' : `Energy ${card.energy}`}</p>
      <p className="rb-date">{priceAge(card.price_date)}</p>
    </div>
  </article>;
}

function CardInspector({ card, onClose }) {
  const panel = useRef(null);
  const [printing, setPrinting] = useState(card);
  const [broken, setBroken] = useState(false);
  const [imageShape, setImageShape] = useState(null);
  const landscape = isBattlefield(printing);
  const rotateImage = landscape && imageShape?.url === printing.image_url && imageShape.width < imageShape.height;
  const variants = useResource(`binder?${new URLSearchParams({set:card.set_id,q:card.name,limit:60})}`, 0);
  const ownedVersions = variants.data?.items.filter(c => c.name === card.name) ?? [];
  const finishes = ownedVersions.filter(c => c.id === printing.id && c.quantity > 0);
  const printings = [...new Map(ownedVersions.map(version => [version.id, version])).values()];
  const hasNormal = finishes.some(c => !c.is_foil);
  const hasFoil = finishes.some(c => c.is_foil);
  const owned = finishes.reduce((total, finish) => total + Number(finish.quantity), 0);
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const selectVersion = version => { setPrinting(version); setBroken(false); };
  return <dialog ref={panel} className={`rb-inspector${landscape ? ' rb-inspector-wide' : ''}`} aria-labelledby="rb-inspector-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <button className="rb-inspector-close" aria-label="Close card inspection" onClick={onClose}>×</button>
    <div className="rb-inspector-stage">
      <div className="rb-inspector-art">
        {printing.image_url && !broken ? <div className={`rb-inspector-image${landscape ? ' rb-inspector-landscape' : ''}${rotateImage ? ' rb-inspector-rotate' : ''}`}>
          <img key={printing.image_url} src={printing.image_url} alt={printing.name} referrerPolicy="no-referrer" onLoad={event => setImageShape({url:printing.image_url,width:event.currentTarget.naturalWidth,height:event.currentTarget.naturalHeight})} onError={() => setBroken(true)} />
        </div> : <div className="rb-inspector-missing">{printing.name}<small>Artwork unavailable</small></div>}
      </div>
      <section className="rb-inspector-info">
        <p className="rb-inspector-set">{printing.set_name} · #{printing.collector_number || 'Unknown'}</p>
        <h2 id="rb-inspector-title">{printing.name}</h2>
        <p>{printing.rarity} · {printing.domains?.join(' / ') || 'Domain unknown'}</p>
        {printing.rules_text && <p className="rb-inspector-rules">{printing.rules_text}</p>}
        {variants.loading && <p role="status">Loading owned copies…</p>}
        {owned > 0 && <><table className="rb-finish-information"><caption>{owned} copies owned · Prices per copy</caption><thead><tr><th>Finish</th><th>Owned</th><th>Market price</th></tr></thead><tbody>{finishes.map(finish => <tr key={String(finish.is_foil)}><th scope="row">{finish.is_foil ? 'Foil' : 'Normal'}</th><td>{finish.quantity}</td><td>{money(finish.is_foil ? finish.foil_price : finish.normal_price)}</td></tr>)}</tbody></table>
        <p className="rb-inspector-date">{priceAge(printing.price_date)}</p></>}
        {variants.error && <p role="status">Other owned versions could not be loaded.</p>}
        {printings.length > 1 && <div className="rb-inspector-versions"><h3>Owned artwork versions</h3><div>{printings.map(version => <button key={version.id} aria-pressed={version.id===printing.id} onClick={() => selectVersion(version)}>#{version.collector_number || 'Unknown'} · {version.rarity}<small>{ownedVersions.filter(item => item.id === version.id).reduce((total, item) => total + Number(item.quantity), 0)} owned</small></button>)}</div></div>}
        {owned > 0 && <details className="rb-inspector-history"><summary>Price history</summary><History key={printing.id} card={printing} hasNormal={hasNormal} hasFoil={hasFoil} /></details>}
      </section>
    </div>
  </dialog>;
}

function History({ card, hasNormal, hasFoil }) {
  const panel = useRef(null);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const resource = useResource(`cards/${encodeURIComponent(card.id)}/history?page=${page}&limit=30`, retry);
  return <section ref={panel} className="rb-history" aria-label={`Price history for ${card.name}`}>
    {resource.loading ? <p role="status">Loading prices…</p> : resource.error ? <p role="alert">{resource.error} <button onClick={() => setRetry(value => value + 1)}>Retry</button></p> : resource.data.items.length ? <table><caption>Daily USD observations, newest first</caption><thead><tr><th>Date (UTC)</th>{hasNormal && <th>Normal</th>}{hasFoil && <th>Foil</th>}</tr></thead><tbody>{resource.data.items.map(row => <tr key={row.price_date}><td>{row.price_date}</td>{hasNormal && <td>{money(row.normal_price)}</td>}{hasFoil && <td>{money(row.foil_price)}</td>}</tr>)}</tbody></table> : <p>No price observations recorded{page > 1 ? ' on this page' : ' yet'}.</p>}
    {!resource.loading && !resource.error && (page > 1 || resource.data.items.length === 30) && <div className="rb-pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Newer</button><span>Page {page}</span><button disabled={resource.data.items.length < 30} onClick={() => setPage(value => value + 1)}>Older</button></div>}
  </section>;
}

