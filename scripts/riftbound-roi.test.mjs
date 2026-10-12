import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectedPackValue,calculateBoxEV,calculateROI,simulatePackOpen,DEFAULT_ASSUMPTIONS,packModel,cardCategory} from '../src/apps/riftbound/calculations.js';
const cards=[
  {id:'c',name:'Common',rarity:'Common',normal_price:'1',foil_price:'2'},
  {id:'u',name:'Uncommon',rarity:'Uncommon',normal_price:'3',foil_price:'4'},
  {id:'r',name:'Rare',rarity:'Rare',normal_price:'99',foil_price:'5'},
  {id:'e',name:'Epic',rarity:'Epic',normal_price:'99',foil_price:'6'},
  {id:'t',name:'Rune',rarity:'Common',card_type:'Rune',normal_price:'0',foil_price:null},
].map(card => ({card_type:'Unit',...card}));
test('EV uses every eligible card, finish-specific prices, and the same 14-slot model as simulation',() => {
  const result=expectedPackValue(cards);
  assert.ok(Math.abs(result.value-(7+9+1.75*5+0.25*6+0.7*2+0.2*4+0.08*5+0.02*6))<0.000001);
  assert.equal(result.missingExpectedCopies,0);
  const pack=simulatePackOpen(cards,DEFAULT_ASSUMPTIONS,() => 0.9);
  assert.equal(pack.length,14);
  assert.equal(pack.filter(card=>card.isFoil).length,3);
  assert.equal(pack.at(-1).id,'t');
  assert.equal(pack.at(-1).simulatedPrice,0);
  assert.equal(pack[10].simulatedPrice,6);
  assert.equal(cardCategory({...cards[0],is_alt:true}),null);
  assert.equal(cardCategory({...cards[0],name:'Common (Oversized)'}),null);
  assert.equal(cardCategory({...cards[0],card_supertype:'Token'}),'Token/Rune');
  assert.equal(cardCategory({...cards[0],card_type:null}),null);
  assert.ok(Math.abs(expectedPackValue([...cards,{...cards[0],id:'c2',normal_price:3}]).value-(result.value+7))<0.000001);
});
test('missing prices and categories do not masquerade as free cards or another rarity',() => {
  const missing=cards.map(card=>card.id==='r'?{...card,foil_price:null}:card);
  assert.equal(expectedPackValue(missing).value,null);
  assert.equal(simulatePackOpen(missing,DEFAULT_ASSUMPTIONS,()=>0.5)[10].simulatedPrice,null);
  assert.throws(()=>simulatePackOpen(cards.filter(card=>card.id!=='e')),/Epic/);
  assert.equal(expectedPackValue([]).value,null);
  assert.throws(()=>packModel({...DEFAULT_ASSUMPTIONS,foilCommon:0.1}),/100%/);
  assert.throws(()=>packModel({...DEFAULT_ASSUMPTIONS,epic:Infinity}));
  assert.throws(()=>simulatePackOpen(cards,DEFAULT_ASSUMPTIONS,()=>1));
});
test('ROI keeps missing, zero, invalid costs and pack scaling distinct',()=>{
  assert.equal(calculateBoxEV(2,24),48);
  for(const packs of [0,-1,1.5,Infinity]) assert.equal(calculateBoxEV(2,packs),null);
  assert.equal(calculateBoxEV(null),null);
  assert.equal(calculateROI(5,4),25);
  assert.equal(calculateROI(0,4),-100);
  for(const cost of [null,0,-1,Infinity,'4']) assert.equal(calculateROI(5,cost),null);
  assert.equal(calculateROI(null,4),null);
});
