import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { INVENTORY_TABS, parseInventorySheet, createSheetReader, sheetResponse } from '../server/riftbound/sheet.js';
import { readFilters } from '../server/riftbound/queries.js';
import { createWorker } from '../server/index.js';

const headers=['Card name','Card ID','Rarity','Domains','Set number','Energy','Normal owned','Foil owned','Normal USD','Foil USD','Price date','TCGPlayer ID','Artwork URL'];
const cells=values=>({values:values.map(v=>v==null?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:v}})});
function document(){return {sheets:INVENTORY_TABS.map(title=>({properties:{title},data:[{startRow:1,rowData:[cells([`${title} — ${title==='VEN'?'Vendetta':title}`]),cells([]),cells([]),cells(headers),...(title==='VEN'?[
  cells(['Six','dotgg:VEN-006','Common','Fury',6,2,5,2,0.1,0.8,46306,'123','https://example.test/6.webp']),
  cells(['Overnumbered','dotgg:VEN-192','Showcase','Mind',192,3,0,1,null,10,46306,'456',null]),
  cells(['Unpriced','dotgg:VEN-SP6','Rare','Order','SP6',1,7,0,null,null,null,null,null]),
]:[])]}]}))};}
const filters=overrides=>({...readFilters(new URLSearchParams()),...overrides});

test('combined sheet printings paginate after merging finishes',()=>{
  const snapshot=parseInventorySheet(document());
  const first=sheetResponse(snapshot,'binder',filters({group:'printing',limit:1}));
  assert.equal(first.total,3);
  assert.equal(first.items[0].quantity,7);
  assert.equal(first.items[0].normal_quantity,5);
  assert.equal(first.items[0].foil_quantity,2);
  assert.equal(sheetResponse(snapshot,'binder',filters({group:'printing',limit:1,page:2})).items[0].id,'dotgg:VEN-192');
});

test('sheet counts and valuation keep missing quotes separate and collector order stable',()=>{
  const snapshot=parseInventorySheet(document(),'2026-10-12T00:00:00Z');
  assert.deepEqual(snapshot.cards.map(c=>c.collector_number),['6','192','SP6']);
  const summary=sheetResponse(snapshot,'summary',filters());
  assert.equal(summary.copies,'15');assert.equal(summary.normal_copies,'12');assert.equal(summary.foil_copies,'3');
  assert.equal(summary.value_usd,'12.1');assert.equal(summary.unpriced_copies,'7');
  assert.equal(sheetResponse(snapshot,'facets',filters()).sets.at(-1).name,'Vendetta');
  const binder=sheetResponse(snapshot,'binder',filters({finish:'foil',limit:1,page:2}));
  assert.equal(binder.total,2);assert.equal(binder.items[0].id,'dotgg:VEN-192');assert.equal(binder.items[0].quantity,1);
  assert.equal(sheetResponse(snapshot,'catalog',filters({q:'unpriced',owned:'true'})).total,1);
  assert.equal(sheetResponse(snapshot,'catalog',filters({domain:'Fury',energy:'2'})).total,1);
  assert.equal(sheetResponse(snapshot,'ownership',filters()).items.length,3);
  assert.equal(sheetResponse(snapshot,'history',filters(),'absent'),null);
  assert.throws(()=>sheetResponse(snapshot,'valuation',filters()),/current prices only/);
});

test('malformed inventory is rejected before any partial collection is returned',()=>{
  for(const [column,bad]of[[6,-1],[7,1.5],[8,'1.20'],[10,null],[1,'dotgg:VEN-192']]){
    const doc=document();doc.sheets.at(-1).data[0].rowData[4].values[column]=cells([bad]).values[0];
    assert.throws(()=>parseInventorySheet(doc));
  }
  const missing=document();missing.sheets.pop();assert.throws(()=>parseInventorySheet(missing),/tab missing/);
  const error=document();error.sheets.at(-1).data[0].rowData[4].values[8]={effectiveValue:{errorValue:{type:'REF'}}};assert.throws(()=>parseInventorySheet(error),/cell error/);
});

test('sheet Binder groups owned alternate printings before pagination and keeps finish filters',()=>{
  const doc=document();
  doc.sheets.at(-1).data[0].rowData.push(cells(['Six','dotgg:VEN-195','Showcase','Fury',195,2,0,3,null,8,46306,'789',null]));
  const snapshot=parseInventorySheet(doc);
  const first=sheetResponse(snapshot,'binder',filters({limit:3}));
  assert.deepEqual(first.items.map(c=>[c.id,c.is_foil,c.quantity]),[['dotgg:VEN-006',false,5],['dotgg:VEN-006',true,2],['dotgg:VEN-195',true,3]]);
  const next=sheetResponse(snapshot,'binder',filters({limit:3,page:2}));
  assert.equal(next.items[0].id,'dotgg:VEN-192');
  const foil=sheetResponse(snapshot,'binder',filters({finish:'foil'}));
  assert.deepEqual(foil.items.map(c=>c.id),['dotgg:VEN-006','dotgg:VEN-195','dotgg:VEN-192']);
  assert.deepEqual(sheetResponse(snapshot,'catalog',filters()).items.map(c=>c.id),['dotgg:VEN-006','dotgg:VEN-192','dotgg:VEN-195','dotgg:VEN-SP6']);
});

test('private-sheet authentication signs a read-only JWT, coalesces reads and refreshes edits',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const secret=JSON.stringify({type:'service_account',client_email:'reader@example.test',private_key:privateKey.export({type:'pkcs8',format:'pem'})});
  let now=Date.parse('2026-10-12T00:00:00Z'),auth=0,reads=0,journal=0,broken=false;
  const reader=createSheetReader({clock:()=>now,fetcher:async(url,options)=>{
    if(String(url)==='https://oauth2.googleapis.com/token'){
      auth++;const jwt=options.body.get('assertion').split('.');const payload=JSON.parse(Buffer.from(jwt[1],'base64url'));
      assert.equal(payload.scope,'https://www.googleapis.com/auth/spreadsheets.readonly');
      assert.equal(payload.iss,'reader@example.test');assert.ok(verify('RSA-SHA256',Buffer.from(jwt.slice(0,2).join('.')),publicKey,Buffer.from(jwt[2],'base64url')));
      return Response.json({access_token:'fake-token',expires_in:3600});
    }
    if(/^(Decks|Events)!/.test(url.searchParams.get('ranges'))){journal++;return new Response('missing tab',{status:400});}
    reads++;assert.equal(options.headers.Authorization,'Bearer fake-token');assert.equal(url.searchParams.getAll('ranges').length,13);
    if(broken)return new Response('private upstream detail',{status:403});
    const doc=document();if(reads>1)doc.sheets.at(-1).data[0].rowData[4].values[6]=cells([10]).values[0];
    return Response.json(doc);
  }});
  const env={RIFTBOUND_SHEET_ID:'a'.repeat(30),GOOGLE_SERVICE_ACCOUNT_JSON:secret};
  const initial=await Promise.all([reader(env),reader(env)]);assert.equal(reads,1);assert.equal(auth,1);assert.equal(initial[0],initial[1]);assert.equal(journal,2);assert.equal(initial[0].journal.Decks,null);
  await reader(env);assert.equal(reads,1);
  now+=61000;const changed=await reader(env);assert.equal(changed.cards[0].normal_owned,10);assert.equal(auth,1);
  now+=61000;broken=true;await assert.rejects(reader(env));assert.equal(reads,3);
  await assert.rejects(reader({}));
});

test('Worker serves the sheet without database access and sanitizes failures',async()=>{
  const env={RIFTBOUND_SHEET_ENABLED:'true'};
  const worker=createWorker({database:()=>assert.fail('database accessed'),sheetReader:async()=>parseInventorySheet(document())});
  for(const path of ['summary','catalog?owned=true','binder?finish=foil','facets','ownership','cards/dotgg%3AVEN-006/history','health']){
    const response=await worker.fetch(new Request(`https://site.test/api/riftbound/${path}`),env);assert.equal(response.status,200);await response.json();
  }
  const write=await worker.fetch(new Request('https://site.test/api/riftbound/binder',{method:'POST'}),env);assert.equal(write.status,405);
  const bad=await worker.fetch(new Request('https://site.test/api/riftbound/catalog?finish=foil'),env);assert.equal(bad.status,400);
  const head=await worker.fetch(new Request('https://site.test/api/riftbound/summary',{method:'HEAD'}),env);assert.equal(await head.text(),'');
  const failing=createWorker({sheetReader:()=>{throw Error('credential-secret');}});
  const failed=await failing.fetch(new Request('https://site.test/api/riftbound/summary'),env);assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('credential-secret'));
});
