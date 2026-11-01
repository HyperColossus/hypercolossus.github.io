import React from 'react';
import { MODEL_SOURCE, MODEL_VERSION } from './calculations';
export default function PackSettings({ tools, assumptions, setAssumptions }) {
  return <>
    <div className="rb-tool-controls"><label>Card set<select value={tools.set} onChange={event => tools.setSet(event.target.value)}>{tools.sets.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}</select></label><button onClick={tools.refresh} disabled={tools.loading}>Refresh prices</button></div>
    <details className="rb-assumptions"><summary>Pack model and assumptions</summary>
      <p><a href={MODEL_SOURCE} target="_blank" rel="noreferrer">Origins pack structure</a>: 7 commons, 3 uncommons, 2 rare-or-better foils, 1 mixed-rarity foil and 1 token/rune. Model {MODEL_VERSION}.</p>
      <p>Cards within each category are equally likely. The probabilities below are editable modeling assumptions. Known chase treatments, oversized cards and special rune foils are excluded. Other sets use this same hypothetical structure; their pack composition is not verified.</p>
      <p>Only cards with imported type metadata enter this model. Unknown types are excluded, so the modeled pool may be smaller than the imported set.</p>
      <div className="rb-tool-controls">{Object.entries(assumptions).map(([key,value]) => <label key={key}>{({ epic: 'Epic per rare slot', foilCommon: 'Foil common', foilUncommon: 'Foil uncommon', foilRare: 'Foil rare', foilEpic: 'Foil epic' })[key]} (%)<input type="number" min="0" max="100" step="0.1" value={value === '' ? '' : Number((value*100).toFixed(4))} onChange={event => setAssumptions(current => ({ ...current, [key]: event.target.value === '' ? '' : Number(event.target.value)/100 }))} /></label>)}</div>
    </details>
  </>;
}
