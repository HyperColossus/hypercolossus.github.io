import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {scheduledPriceSync} from '../server/riftbound/scheduled.js';
import {syncRiftboundPrices} from '../server/riftbound/prices.js';
const db=new PGlite();
const env={PRICE_SYNC_ENABLED:'true',TCG_API_KEY:'tcg_live_test123',SYNC_HYPERDRIVE:{connectionString:'fixture-only'}};
const database=async (settings,fn)=>{assert.deepEqual(settings.HYPERDRIVE,env.SYNC_HYPERDRIVE);return fn(db);};
const event=date=>({scheduledTime:Date.parse(`${date}T08:00:00Z`)});
before(async()=>{
  for(const file of ['001_initial.sql','004_admin_and_sync.sql','006_sync_limits.sql']) await db.exec(await readFile(new URL(`../db/riftbound/${file}`,import.meta.url),'utf8'));
  await db.exec(`INSERT INTO riftbound.card_sets VALUES ('OGN','Origins');
    INSERT INTO riftbound.cards (id,set_id,name,rarity,tcg_product_id) VALUES ('a','OGN','Alpha','Rare','123');`);
});
after(()=>db.close());
test('disabled and unconfigured jobs never query or fetch; overlapping and completed jobs skip',async()=>{
  assert.deepEqual(await scheduledPriceSync(event('2026-10-01'),{},()=>assert.fail()),{status:'disabled'});
  await assert.rejects(scheduledPriceSync(event('2026-10-01'),{PRICE_SYNC_ENABLED:'true'},()=>assert.fail()),/configured/);
  let release;let started;
  const gate=new Promise(resolve=>{release=resolve;});const ready=new Promise(resolve=>{started=resolve;});
  const first=scheduledPriceSync(event('2026-10-01'),env,database,async(_db,_key,options)=>{await options.beforeRequest();started();await gate;return {inserted:2};});
  await ready;
  assert.deepEqual(await scheduledPriceSync(event('2026-10-01'),env,database,()=>assert.fail()),{status:'skipped'});
  release();assert.deepEqual(await first,{status:'completed',inserted:2});
  assert.deepEqual(await scheduledPriceSync(event('2026-10-01'),env,database,()=>assert.fail()),{status:'skipped'});
});
test('failure reservations survive retries and daily requests cannot exceed 80',async()=>{
  const date='2026-10-02';
  await assert.rejects(scheduledPriceSync(event(date),env,database,async(_db,_key,options)=>{await options.beforeRequest();throw new Error('fixture outage');}));
  assert.equal((await db.query('SELECT requests FROM riftbound.sync_leases WHERE sync_date=$1',[date])).rows[0].requests,1);
  await db.query("UPDATE riftbound.sync_leases SET expires_at=now()-interval '1 minute',requests=79 WHERE sync_date=$1",[date]);
  await assert.rejects(scheduledPriceSync(event(date),env,database,async(_db,_key,options)=>{
    assert.equal(options.requestBudget,1);await options.beforeRequest();await options.beforeRequest();return {inserted:0};
  }),/budget/);
  assert.equal((await db.query('SELECT requests FROM riftbound.sync_leases WHERE sync_date=$1',[date])).rows[0].requests,80);
  await db.query("UPDATE riftbound.sync_leases SET expires_at=now()-interval '1 minute' WHERE sync_date=$1",[date]);
  assert.deepEqual(await scheduledPriceSync(event(date),env,database,()=>assert.fail()),{status:'skipped'});
});
test('expired attempts recover but retry count is bounded',async()=>{
  const date='2026-10-03';
  for(let attempt=1;attempt<=3;attempt++) {
    await assert.rejects(scheduledPriceSync(event(date),env,database,async()=>{throw new Error('fixture outage');}));
    await db.query("UPDATE riftbound.sync_leases SET expires_at=now()-interval '1 minute' WHERE sync_date=$1",[date]);
  }
  assert.deepEqual(await scheduledPriceSync(event(date),env,database,()=>assert.fail()),{status:'skipped'});
});
test('upstream failures, malformed pages and partial catalogs never append history',async()=>{
  const sets=()=>Response.json({data:[{id:1,name:'Origins',card_count:1}],meta:{page:1,total:1,has_more:false}});
  for(const broken of [
    ()=>{throw new Error('private timeout');},
    ()=>new Response('rate limited',{status:429}),
    ()=>new Response('not JSON',{headers:{'content-type':'application/json'}}),
    ()=>Response.json({data:[],meta:{page:1,total:1,has_more:false}}),
    ()=>Response.json({data:[{tcgplayer_id:123,market_price:-1,printing:'Normal'}],meta:{page:1,total:1,has_more:false}}),
  ]) {
    let requests=0;
    await assert.rejects(syncRiftboundPrices(db,env.TCG_API_KEY,{fetcher:()=>++requests===1?sets():broken()}));
    assert.equal((await db.query('SELECT count(*)::int AS count FROM riftbound.price_history')).rows[0].count,0);
  }
  let requests=0;
  await assert.rejects(syncRiftboundPrices(db,env.TCG_API_KEY,{requestBudget:1,fetcher:()=>{requests++;return sets();}}),/budget/);
  assert.equal(requests,1);
});
