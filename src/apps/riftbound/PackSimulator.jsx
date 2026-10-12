import React, { useState } from 'react';
import { money,priceAge } from './api';
import { simulatePackOpen,DEFAULT_ASSUMPTIONS } from './calculations';
import useSetTools from './useSetTools';
import PackSettings from './PackSettings';
export default function PackSimulator() {
  const tools=useSetTools();
  const [assumptions,setAssumptions]=useState(DEFAULT_ASSUMPTIONS);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const pulled=result?.set===tools.set ? result.cards : [];
  const missing=pulled.filter(card => card.simulatedPrice===null).length;
  const total=pulled.reduce((sum,card) => sum+(card.simulatedPrice??0),0);
  const open=() => {
    try {const cards=simulatePackOpen(tools.data.cards,assumptions);setResult({set:tools.set,cards});setError('');}
    catch(issue) {setError(issue.message);setResult(null);}
  };
  return <main className="rb-tools rb-book">
    <div className="rb-book-title"><h2>Pack Simulator</h2></div>
    <p>A hypothetical opening from one complete imported set. Results stay on this screen and never change your collection.</p>
    <PackSettings tools={tools} assumptions={assumptions} setAssumptions={setAssumptions} />
    {tools.loading ? <p role="status">Loading the complete set…</p> : tools.error ? <p role="alert">{tools.error}</p> : <button onClick={open}>Open a simulated pack</button>}
    {error && <p role="alert">{error}</p>}
    {!!pulled.length && <>
      <p role="status">{pulled.length} cards · {missing ? `Partial recorded value: ${money(total)} · ${missing} missing prices` : `Recorded value: ${money(total)}`}</p>
      <div className="rb-simulation-grid">{pulled.map((card,index) => <article key={`${result.set}:${index}:${card.id}`} className={`rb-sim-card${card.isFoil?' rb-sim-foil':''}`}>
        {card.image_url ? <img src={card.image_url} alt={card.name} loading="lazy" referrerPolicy="no-referrer" onError={event => {event.currentTarget.hidden=true;}} /> : <p>Artwork unavailable</p>}
        <h3>{card.name}</h3><p>{card.isFoil?'Foil':'Normal'} · {card.rarity}</p><p>{money(card.simulatedPrice)}</p><small>{priceAge(card.price_date)}</small>
      </article>)}</div>
      <button onClick={() => setResult(null)}>Clear opening</button>
    </>}
  </main>;
}
