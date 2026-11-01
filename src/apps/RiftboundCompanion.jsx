import React, { useEffect, useRef, useState } from 'react';
import { getRiftbound, money, priceAge } from './riftbound/api';
import './riftbound.css';
import './riftbound/hs-collection.css';
import PageTurn from './riftbound/PageTurn';
import DeckRack from './riftbound/DeckRack';
import Events from './riftbound/Events.jsx';
import ROICalculator from './riftbound/ROICalculator.jsx';
import PackSimulator from './riftbound/PackSimulator.jsx';
import { isBattlefield } from './riftbound/cardArtwork';

const EMPTY_FILTERS = { q: '', set: '', rarity: '', finish: '', domain: '', energy: '', page: 1 };
const DOMAINS = [['Fury', '#d9564d'], ['Calm', '#5faa64'], ['Mind', '#639add'], ['Body', '#e48b52'], ['Chaos', '#ad75c8'], ['Order', '#eac859'], ['Colorless', '#b6b9bc']];

// Booster pack art (TCGPlayer product images) for each main set's tab.
const PACK_ART = { OGN: 635366, SFD: 661954, UNL: 678149, VEN: 693377, RAD: 711362 };
const packArt = set => PACK_ART[set.id] ? `https://tcgplayer-cdn.tcgplayer.com/product/${PACK_ART[set.id]}_in_1000x1000.jpg` : set.cover;
const MODES = [['binder', '▤', 'Binder'], ['calculator', '◷', 'ROI calculator'], ['simulator', '⚄', 'Pack simulator'], ['events', '⚑', 'Events']];

export default function RiftboundCompanion() {
  const [tab, setTab] = useState('catalog');
  const [set, setSet] = useState('');
  const facets = useResource('facets', 0);
  const summary = useResource('summary', 0);
  const decks = useResource('decks', 0);
  const sets = facets.data?.sets.filter(item => item.cards > 0) ?? [];
  const chooseSet = id => { setSet(id); if (tab !== 'catalog' && tab !== 'binder') setTab('catalog'); };
  return <section className="riftbound-app hs" data-app="riftbound" aria-label="Zack’s Riftbound collection">
    <div className="hs-stage">
      <div className="hs-main">
        <nav className="hs-tabs" aria-label="Sets and tools">
          <div className="hs-set-tabs" role="group" aria-label="Sets">
            <button className="hs-set-tab hs-set-all" aria-pressed={!set && (tab === 'catalog' || tab === 'binder')} title="All sets" onClick={() => chooseSet('')}><span aria-hidden="true">✦</span><span className="rb-sr-only">All sets</span></button>
            {sets.map(item => <button key={item.id} className="hs-set-tab" aria-pressed={set === item.id && (tab === 'catalog' || tab === 'binder')} title={`${item.name} · ${item.owned_cards}/${item.cards}`} onClick={() => chooseSet(item.id)}>
              {packArt(item) ? <img src={packArt(item)} alt="" referrerPolicy="no-referrer" loading="lazy" className={PACK_ART[item.id] ? 'hs-pack' : 'hs-card-crop'} /> : <b>{item.id}</b>}
              <span className="rb-sr-only">{item.name}</span></button>)}
          </div>
          <div className="hs-mode-tabs" role="group" aria-label="Tools">
            {MODES.map(([mode, icon, label]) => <button key={mode} className="hs-mode-tab" aria-pressed={tab === mode} title={label} onClick={() => setTab(current => current === mode && mode === 'binder' ? 'catalog' : mode)}><span aria-hidden="true">{icon}</span><span className="rb-sr-only">{label}</span></button>)}
          </div>
        </nav>
        {tab === 'events' ? <EventsTab /> : tab === 'calculator' ? <ROICalculator /> : tab === 'simulator' ? <PackSimulator />
          : <CardBrowser key={`${tab}:${set}`} kind={tab} set={set} setName={sets.find(item => item.id === set)?.name} facets={facets} summary={summary} />}
      </div>
      <DeckRack resource={decks} />
    </div>
    <footer className="hs-status">
      <span className="hs-status-count" title="Owned copies">{summary.data ? <><b>{Number(summary.data.copies).toLocaleString()}</b> cards</> : '—'}</span>
      <span className="hs-status-credit">Card data: RiftHunt / DotGG · Prices: TCGPlayer · Unofficial fan project, not affiliated with Riot Games.</span>
      <span className="hs-status-value" title="Collection value at recorded prices">{summary.data?.value_usd ? money(summary.data.value_usd) : '—'}</span>
    </footer>
  </section>;
}

function EventsTab() {
  return <Events resource={useResource('events', 0)} />;
}

function CardBrowser({ kind, set, setName, facets, summary }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, set });
  const [showUnowned, setShowUnowned] = useState(false);
  const [search, setSearch] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [turnDirection, setTurnDirection] = useState(1);
  const [turning, setTurning] = useState(false);
  const change = (key, value) => { setFilters(current => ({ ...current, [key]: value, page: 1 })); setSelected(null); };
  const params = new URLSearchParams({ ...filters, ...(kind === 'catalog' && !showUnowned ? { owned: 'true' } : {}), ...(kind === 'binder' ? { group: 'printing' } : {}), limit: 8 });
  const resource = useResource(`${kind}?${params}`, retry);
  const data = resource.data;
  const title = kind === 'binder' ? 'Binder' : 'Collection';
  const spreadKey = JSON.stringify({ ...filters, page: undefined, showUnowned });
  const filtered = filters.q || filters.rarity || filters.domain || filters.energy !== '';
  const heading = filters.domain || setName || (kind === 'binder' ? 'Binder' : 'All Cards');
  const pages = data?.items.length ? [0, 1].map(side => <React.Fragment key={side}>
    <div className="rb-pocket-grid" role="group" aria-label={`${side === 0 ? 'Left' : 'Right'} page`}>
      {Array.from({ length: 4 }, (_, pocket) => {
        const card = data.items[side * 4 + pocket];
        return card ? <Card key={`${card.id}:${card.is_foil}`} card={card} binder={kind === 'binder'} onSelect={() => setSelected(card)} /> : <div key={`empty-${pocket}`} className="rb-card-slot" aria-hidden="true"><span /></div>;
      })}
    </div>
    <p className="rb-sheet-number">Page {(filters.page - 1) * 2 + side + 1}</p>
  </React.Fragment>) : null;
  const turn = delta => { setTurnDirection(delta); setFilters(current => ({ ...current, page: current.page + delta })); setSelected(null); };
  const totalSpreads = data ? Math.max(1, Math.ceil(data.total / 8)) : 1;
  return <div className="rb-browser hs-browser">
    <div className="hs-book">
      <h2 className="hs-book-title">{heading}</h2>
      <main className="rb-results" aria-label={`${title} cards`}>
        {resource.error ? <div className="rb-state" role="alert"><h3>Couldn’t open the {title.toLowerCase()}</h3><p>{resource.error}</p><button onClick={() => setRetry(value => value + 1)}>Try again</button></div>
          : data?.items.length === 0 ? <div className="rb-state"><span aria-hidden="true">◇</span><h3>{filtered || filters.page > 1 ? 'No matching cards' : kind === 'binder' ? 'No owned versions here yet' : showUnowned ? 'No cards in this set yet' : 'No owned cards in this set yet'}</h3><p>{filtered ? 'Try clearing the filters.' : !showUnowned && kind === 'catalog' ? 'Turn on Missing to see the cards not owned yet.' : ''}</p></div>
            : <PageTurn page={filters.page} direction={turnDirection} resetKey={spreadKey} pages={pages} onTurning={setTurning} fallback={<div className="rb-state" role="status">Opening the book…</div>} />}
      </main>
      {data && data.total > 8 && <>
        <button className="hs-page-arrow hs-page-prev" aria-label="Previous page" disabled={turning || filters.page <= 1} onClick={() => turn(-1)}>‹</button>
        <button className="hs-page-arrow hs-page-next" aria-label="Next page" disabled={turning || filters.page >= totalSpreads} onClick={() => turn(1)}>›</button>
      </>}
      <p className="hs-book-count" role="status">{data ? `${data.total.toLocaleString()} ${kind === 'binder' ? 'owned versions' : showUnowned ? 'cards' : 'owned cards'} · spread ${filters.page} of ${totalSpreads}` : ''}</p>
    </div>
    <div className="hs-bottombar">
      <div className="hs-domains" role="group" aria-label="Filter by domain">
        <button className="hs-domain-all" title="All domains" aria-pressed={!filters.domain} onClick={() => change('domain', '')}><span aria-hidden="true">∞</span><span className="rb-sr-only">All domains</span></button>
        {DOMAINS.map(([domain, color]) => <button key={domain} className="hs-domain" title={domain} style={{ '--gem': color }} aria-pressed={filters.domain === domain} onClick={() => change('domain', filters.domain === domain ? '' : domain)}><span className="rb-sr-only">{domain}</span></button>)}
      </div>
      <form className="hs-search" role="search" onSubmit={event => { event.preventDefault(); change('q', search.trim()); }}>
        <span aria-hidden="true">⌕</span><input type="search" aria-label="Search cards" maxLength={100} value={search} placeholder="Search" onChange={event => { setSearch(event.target.value); if (!event.target.value) change('q', ''); }} />
      </form>
      <details className="hs-more-filters"><summary>Filters{filters.rarity || filters.energy !== '' ? ' •' : ''}</summary>
        <div>
          <label>Rarity<select value={filters.rarity} onChange={event => change('rarity', event.target.value)}><option value="">All rarities</option>{facets.data?.rarities.map(rarity => <option key={rarity}>{rarity}</option>)}</select></label>
          <label>Energy<select value={filters.energy} onChange={event => change('energy', event.target.value)}><option value="">Any</option>{Array.from({ length: 13 }, (_, energy) => <option key={energy} value={energy}>{energy}</option>)}</select></label>
          <button type="button" onClick={() => { setSearch(''); setFilters({ ...EMPTY_FILTERS, set }); setSelected(null); }}>Reset filters</button>
        </div>
      </details>
      {kind === 'catalog' && <button className="hs-missing" aria-pressed={showUnowned} onClick={() => { setShowUnowned(value => !value); change('page', 1); }}>Missing</button>}
    </div>
    <details className="rb-collection-extras"><summary>Collection overview & value</summary><CollectionOverview resource={summary} retry={retry} onRefresh={() => setRetry(value => value + 1)} />
    {facets.data && <details className="rb-set-progress"><summary>Set completion</summary><p>Each catalog printing counts once, regardless of finish or copy count.</p><ul>{facets.data.sets.map(item => <li key={item.id}><span>{item.name}: {item.owned_cards} / {item.cards}</span><progress aria-label={`${item.name} owned printings`} value={item.owned_cards} max={item.cards || 1} /></li>)}</ul></details>}
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
    <div className="rb-card-caption hs-plaque"><span>{card.quantity > 0 ? `x${card.quantity}` : ''}</span></div>
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

