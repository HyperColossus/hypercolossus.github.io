import { validateDrafts } from './drafts.js';
import { validateEvents } from './events.js';
export function cleanRecords(kind, records) {
  if (kind === 'decks') return validateDrafts(records).map(deck => ({ id: deck.id, name: deck.name, cards: deck.cards.map(card => ({ id: card.id, name: card.name, quantity: card.quantity })) }));
  if (kind === 'events') return validateEvents(records).map(event => ({ id: event.id, name: event.name, location: event.location, date: event.date }));
  throw new Error('Unknown backup type');
}
export function backupText(kind, records) { return JSON.stringify({version:1,kind,records:cleanRecords(kind,records)},null,2); }
export function previewRestore(kind, text, current) {
  if(typeof text!=='string'||text.length>2*1024*1024) throw new Error('Use a backup smaller than 2 MB');
  let data;try {data=JSON.parse(text);} catch {throw new Error('The backup is not valid JSON');}
  if(!data||data.version!==1||data.kind!==kind) throw new Error(`Choose a version 1 ${kind} backup`);
  const records=cleanRecords(kind,data.records);
  const existing=cleanRecords(kind,current);
  const merged=[...existing];let added=0;let skipped=0;
  for(const record of records) {
    const same=existing.find(item => item.id===record.id);
    if(same) {if(JSON.stringify(same)!==JSON.stringify(record)) throw new Error('This backup conflicts with an existing record. Export your current records and resolve the duplicate ID before restoring.');skipped++;}
    else {merged.push(record);added++;}
  }
  return {records:cleanRecords(kind,merged),added,skipped,snapshot:JSON.stringify(existing)};
}
