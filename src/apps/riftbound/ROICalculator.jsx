import React, { useState } from 'react';
import { expectedPackValue, calculateBoxEV, calculateROI, DEFAULT_ASSUMPTIONS } from './calculations';
import { money, priceAge } from './api';
import useSetTools from './useSetTools';
import PackSettings from './PackSettings';
const amount = value => value === '' || value == null ? null : Number(value);
const roiText = value => value == null ? 'Unavailable' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
export default function ROICalculator() {
  const tools = useSetTools();
  const [assumptions,setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [product,setProduct] = useState('');
  const [packs,setPacks] = useState('24');
  const [retail,setRetail] = useState('');
  const [market,setMarket] = useState('');
  const sealed = tools.data?.sealed.find(item => item.id === product);
  let result = null;
  let modelError = '';
  try { if (tools.data) result=expectedPackValue(tools.data.cards,assumptions); } catch(error) { modelError=error.message; }
  const packCount = sealed?.pack_count ?? amount(packs);
  const total = result ? calculateBoxEV(result.value,packCount) : null;
  const retailCost = amount(retail) ?? amount(sealed?.msrp);
  const marketCost = amount(market) ?? amount(sealed?.market_price);
  const dates = tools.data?.cards.map(card => card.price_date).filter(Boolean).sort();
  return <main className="rb-tools rb-book">
    <div className="rb-book-title"><h2>Expected Value Calculator</h2></div>
    <p>Explore a pack model using the selected set’s recorded normal and foil prices. This estimate excludes sales fees and shipping; it is not a guaranteed return.</p>
    <PackSettings tools={tools} assumptions={assumptions} setAssumptions={setAssumptions} />
    {tools.loading ? <p role="status">Loading the complete set and its recorded prices…</p> : tools.error ? <p role="alert">{tools.error}</p> : <>
      {modelError && <p role="alert">{modelError}</p>}
      <div className="rb-tool-controls"><label>Sealed product<select value={product} onChange={event => {setProduct(event.target.value);setRetail('');setMarket('');}}><option value="">Custom purchase</option>{tools.data.sealed.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {!sealed && <label>Packs in purchase<input type="number" min="1" max="1000" step="1" value={packs} onChange={event => setPacks(event.target.value)} /></label>}
        <label>Retail cost of purchase (USD)<input type="number" min="0" step="0.01" value={retail} placeholder={sealed?.msrp ?? 'Enter MSRP'} onChange={event => setRetail(event.target.value)} /></label>
        <label>Market cost of purchase (USD)<input type="number" min="0" step="0.01" value={market} placeholder={sealed?.market_price ?? 'Enter purchase price'} onChange={event => setMarket(event.target.value)} /></label>
      </div>
      {result && <>
        <dl className="rb-tool-totals"><div><dt>Expected pack value</dt><dd>{money(result.value)}</dd></div><div><dt>Expected purchase value ({packCount ?? '—'} packs)</dt><dd>{money(total)}</dd></div><div><dt>Retail ROI</dt><dd>{roiText(calculateROI(total,retailCost))}</dd></div><div><dt>Market ROI</dt><dd>{roiText(calculateROI(total,marketCost))}</dd></div></dl>
        {result.value === null && <p role="status">Full expected value is unavailable: some modeled cards or finish prices are missing. Known-price contribution: {money(result.knownValue)} per pack. Missing prices are not treated as zero.</p>}
        <div className="rb-table-scroll"><table><caption>Price coverage by modeled slot</caption><thead><tr><th>Category</th><th>Finish</th><th>Prices available</th><th>Expected copies / pack</th></tr></thead><tbody>{result.coverage.map((row,index) => <tr key={index}><td>{row.category}</td><td>{row.foil?'Foil':'Normal'}</td><td>{row.priced} / {row.cards}</td><td>{row.expectedCopies.toFixed(3)}</td></tr>)}</tbody></table></div>
      </>}
      <p>{priceAge(dates?.[0])}{dates?.at(-1) && dates[0] !== dates.at(-1) ? ` through ${dates.at(-1)}` : ''}. {sealed ? `Sealed product: ${priceAge(sealed.price_date)}.` : 'Purchase costs are your inputs; no example prices are supplied.'}</p>
    </>}
  </main>;
}
