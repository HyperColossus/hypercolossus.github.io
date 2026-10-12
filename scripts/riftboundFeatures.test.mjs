import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {backupText,previewRestore} from '../src/apps/riftbound/backups.js';
import {deckCoverage} from '../src/apps/riftbound/drafts.js';
import {validateEvents} from '../src/apps/riftbound/events.js';
import {createWorker} from '../server/index.js';
import {readSetTools,readFacets,readCollectionSummary} from '../server/riftbound/queries.js';
const db=new PGlite();
before(async()=>{
  for(const file of ['001_initial.sql','003_card_gameplay.sql','005_card_details.sql']) await db.exec(await readFile(new URL(`../db/riftbound/${file}`,import.meta.url),'utf8'));
  await db.exec(`INSERT INTO riftbound.card_sets VALUES ('OGN','Origins'),('SFD','Spiritforged');
    INSERT INTO riftbound.cards (id,set_id,name,rarity,card_type,rules_text) VALUES
    ('a','OGN','Alpha','Common','Unit','Plain text <script>'),('b','SFD','Beta','Rare',NULL,NULL);
    INSERT INTO riftbound.binder VALUES ('a',false,2),('a',true,3);
    INSERT INTO riftbound.price_history (card_id,price_date,normal_price,foil_price) VALUES
    ('a','2026-09-01',1,2),('a','2026-10-01',10,NULL);
    INSERT INTO riftbound.sealed_products (id,set_id,name,kind,pack_count,msrp) VALUES ('box','OGN','Box','box',24,120);`);
});
after(()=>db.close());
test('backup previews merge without mutation, reject conflicts and strip unrelated fields',()=>{
  const deck={id:'d',name:'Draft',cards:[{id:'a',name:'Alpha',quantity:3}],irrelevant:'not exported'};
  const text=backupText('decks',[deck]);assert.doesNotMatch(text,/irrelevant/);
  const preview=previewRestore('decks',text,[]);assert.equal(preview.added,1);
  assert.equal(previewRestore('decks',text,preview.records).skipped,1);
  assert.throws(()=>previewRestore('decks',text,[{...deck,name:'Renamed'}]),/conflicts/);
  assert.throws(()=>previewRestore('events',text,[]));
  assert.throws(()=>previewRestore('decks','{}',[]));
  assert.throws(()=>previewRestore('decks',backupText('decks',[deck]),[{...deck,cards:[]}]),/conflicts/);
  const event={id:'e',name:'Event',location:'Here',date:'2026-10-06T18:00'};
  assert.equal(previewRestore('events',backupText('events',[event]),[]).added,1);
  assert.throws(()=>validateEvents([{...event,date:'2026-02-30T18:00'}]));
  const coverage=deckCoverage(deck,[{id:'a',quantity:'2'}]);assert.equal(coverage.missing,1);assert.equal(deck.cards[0].quantity,3);
});
test('set tools are complete and isolated, and completion counts printings once across finishes',async()=>{
  const tools=await readSetTools(db,'OGN');assert.equal(tools.cards.length,1);assert.equal(tools.cards[0].rules_text,'Plain text <script>');
  assert.equal(tools.sealed[0].msrp,'120.0000');assert.equal(tools.sealed[0].market_price,null);
  const sets=(await readFacets(db)).sets;assert.equal(sets[0].owned_cards,1);assert.equal(sets[1].owned_cards,0);
  const worker=createWorker({database:(_,fn)=>fn(db)});
  for(const path of ['set-tools','set-tools?set=OGN&limit=5','valuation?date=2026-02-30','valuation?date=2999-01-01','ownership?q=Alpha']) {
    assert.equal((await worker.fetch(new Request(`https://test/api/riftbound/${path}`),{})).status,400);
  }
  const owned=await worker.fetch(new Request('https://test/api/riftbound/ownership'),{});assert.deepEqual((await owned.json()).items,[{id:'a',quantity:'5'}]);
});
test('past valuation uses current quantities and never looks ahead or carries missing finishes',async()=>{
  const past=await readCollectionSummary(db,'2026-09-15');assert.equal(Number(past.value_usd),8);assert.equal(past.priced_copies,'5');
  const early=await readCollectionSummary(db,'2026-08-01');assert.equal(early.value_usd,null);
  const latest=await readCollectionSummary(db,'2026-10-02');assert.equal(Number(latest.value_usd),20);assert.equal(latest.unpriced_copies,'3');
});
