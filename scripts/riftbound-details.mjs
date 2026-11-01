import {readFile,stat} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import pg from 'pg';
import {normalizeCards} from '../server/riftbound/import.js';

// Metadata-only backfill from a saved provider export. No prices or ownership.
let db;
try {
  const args=process.argv.slice(2);
  if(args.length!==1 || (await stat(args[0])).size>20*1024*1024) throw new Error();
  const source=JSON.parse(await readFile(args[0],'utf8'));
  const cards=normalizeCards(source.cards);
  const settings=parseEnv(await readFile(new URL('../.env.riftbound.local',import.meta.url),'utf8'));
  if(!/^[a-f0-9]{64}$/.test(settings.RIFTBOUND_POSTGRES_PASSWORD??'')) throw new Error();
  db=new pg.Client({host:'127.0.0.1',port:55432,database:'riftbound_dev',user:'riftbound_owner',password:settings.RIFTBOUND_POSTGRES_PASSWORD,connectionTimeoutMillis:5000});
  await db.connect();await db.query('BEGIN');
  let updated=0;
  for(const card of cards) {
    const result=await db.query(`UPDATE riftbound.cards SET card_type=COALESCE($2,card_type),rules_text=COALESCE($3,rules_text),
      is_alt=is_alt OR $4,is_overnumbered=is_overnumbered OR $5,is_signature=is_signature OR $6,card_supertype=COALESCE($7,card_supertype) WHERE id=$1`,
    [card.id,card.cardType,card.rulesText,card.alt,card.over,card.sig,card.cardSupertype]);
    updated+=result.rowCount;
  }
  await db.query('COMMIT');console.log(`Backfilled details for ${updated} existing printings. Ownership and prices preserved.`);
} catch {
  await db?.query('ROLLBACK').catch(()=>{});
  console.error('Metadata backfill failed. Use a complete saved provider export and check local database setup. No partial changes were saved.');process.exitCode=1;
} finally {await db?.end();}
