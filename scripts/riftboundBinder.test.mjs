import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacentOwnedVersions, combineOwnedFinishes } from '../server/riftbound/binder.js';

test('finish grouping preserves inventory totals and keeps separate artwork printings', () => {
  const cards = [{id:'base',is_foil:false,quantity:3},{id:'base',is_foil:true,quantity:2},{id:'showcase',is_foil:true,quantity:1}];
  const result = combineOwnedFinishes(cards);
  assert.equal(result.length,2);
  assert.deepEqual(result.map(c=>[c.id,c.quantity,c.normal_quantity,c.foil_quantity]),[['base',5,3,2],['showcase',1,0,1]]);
  assert.equal(cards[0].quantity,3);
});

test('Binder places later alternate art, promos and signatures beside the owned base finishes within each set', () => {
  const cards = [
    { id:'base-normal', set_id:'VEN', name:'Zed - From the Shadows', is_foil:false },
    { id:'base-foil', set_id:'VEN', name:'Zed - From the Shadows', is_foil:true },
    { id:'other', set_id:'VEN', name:'Other card', is_foil:false },
    { id:'alt', set_id:'VEN', name:'Zed - From the Shadows', is_foil:true },
    { id:'promo', set_id:'VEN', name:'Zed - From the Shadows (Judge Promo)', is_foil:true },
    { id:'signature', set_id:'VEN', name:'Zed - From the Shadows (Signature)', is_foil:true },
    { id:'another-set', set_id:'OGN', name:'Zed - From the Shadows', is_foil:true },
  ];
  assert.deepEqual(adjacentOwnedVersions(cards).map(c=>c.id), ['base-normal','base-foil','alt','promo','signature','other','another-set']);
  assert.equal(cards[2].id,'other');
});
