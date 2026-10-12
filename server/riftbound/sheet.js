import { InputError } from './queries.js';
import { adjacentOwnedVersions, combineOwnedFinishes } from './binder.js';

export const INVENTORY_TABS = ['ARC','OGN','OGS','RAD','JDG','OPP','PR','SGN','SFD','T1A','T1S','UNL','VEN'];
const MAX_ROWS = 1000;
const TTL = 60000;
const blank = value => value === null || value === undefined || value === '';
const value = cell => cell?.effectiveValue?.numberValue ?? cell?.effectiveValue?.stringValue ?? cell?.userEnteredValue?.numberValue ?? cell?.userEnteredValue?.stringValue ?? null;
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const encoded = text => b64(new TextEncoder().encode(text));

// Read only designated inventory tabs. No Google credentials enter API responses.
export function parseInventorySheet(document, refreshedAt = new Date().toISOString()) {
  const cards = [], seen = new Set();
  for (const title of INVENTORY_TABS) {
    const sheet = document.sheets?.find(s => s.properties?.title === title);
    if (!sheet || sheet.data?.length !== 1) throw new Error('Inventory tab missing');
    const grid = sheet.data[0];
    const rows = grid.rowData ?? [];
    const header = rows.findIndex(r => ['Card ID','Normal owned','Foil owned'].every(h => (r.values ?? []).some(c => value(c) === h)));
    if (header < 0) throw new Error('Inventory headers missing');
    const labels = rows[header].values.map(value);
    const heading = value(rows[0]?.values?.[0]);
    const setName = typeof heading === 'string' && heading.startsWith(`${title} — `) ? heading.slice(title.length + 3) : title;
    const required = ['Card name','Card ID','Rarity','Domains','Set number','Energy','Normal owned','Foil owned','Normal USD','Foil USD','Price date','Artwork URL'];
    if (required.some(label => labels.filter(x => x === label).length !== 1)) throw new Error('Invalid inventory headers');
    for (let index = header + 1; index < rows.length; index++) {
      const cells = rows[index].values ?? [];
      if (cells.some(c => c.effectiveValue?.errorValue)) throw new Error('Inventory contains a cell error');
      const get = label => value(cells[labels.indexOf(label)]);
      if (cells.every(c => blank(value(c)))) continue;
      if ((grid.startRow ?? 0) + index >= MAX_ROWS - 1) throw new Error('Inventory range is full; expand the configured limit');
      const id = get('Card ID'), name = get('Card name');
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_:-]{1,100}$/.test(id) || seen.has(id) || typeof name !== 'string' || !name.trim()) throw new Error('Invalid or duplicate inventory card');
      seen.add(id);
      const number = (label, nullable, max, integer = false) => {
        const n = get(label);
        if (blank(n)) return nullable ? null : 0;
        if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isSafeInteger(n))) throw new Error('Invalid inventory number');
        return n;
      };
      const normal = number('Normal owned',false,999999,true), foil = number('Foil owned',false,999999,true);
      const normal_price = number('Normal USD',true,9999999999), foil_price = number('Foil USD',true,9999999999);
      const date = get('Price date');
      let price_date = null;
      if (!blank(date)) {
        if (typeof date !== 'number' || !Number.isSafeInteger(date) || date < 1 || date > 100000) throw new Error('Invalid inventory date');
        price_date = new Date(Date.UTC(1899,11,30) + date * 86400000).toISOString().slice(0,10);
      }
      if ((normal_price !== null || foil_price !== null) && !price_date) throw new Error('Price date is required');
      const image = get('Artwork URL');
      if (!blank(image) && (typeof image !== 'string' || !/^https:\/\//.test(image))) throw new Error('Invalid artwork URL');
      const collector = get('Set number');
      const tcg = labels.includes('TCGPlayer ID') ? get('TCGPlayer ID') : null;
      cards.push({ id,name,rarity:String(get('Rarity') ?? ''),domains:String(get('Domains') ?? '').split(/[,/]/).map(s => s.trim()).filter(Boolean),
        energy:number('Energy',true,99,true),image_url:image || null,set_id:title,set_name:setName,collector_number:blank(collector)?null:String(collector),
        tcg_product_id:blank(tcg)?null:String(tcg),normal_price,foil_price,price_date,normal_owned:normal,foil_owned:foil,quantity:normal+foil,is_foil:null,synced_at:refreshedAt,
        card_type:null,card_supertype:null,rules_text:null,is_alt:false,is_overnumbered:false,is_signature:false });
    }
  }
  if (!cards.length || cards.length > 20000) throw new Error('Invalid inventory size');
  const position = card => {
    const match = /^(R|T|SP)?(\d+)(.*)$/i.exec(card.collector_number ?? '');
    return match ? [match[1] ? {R:1,T:2,SP:3}[match[1].toUpperCase()] : 0,Number(match[2]),match[3]] : [4,Infinity,''];
  };
  cards.sort((a,b) => {
    const set = a.set_id.localeCompare(b.set_id); if(set) return set;
    const x=position(a),y=position(b);
    return x[0]-y[0] || (x[1]===y[1]?0:x[1]-y[1]) || x[2].localeCompare(y[2]) || a.id.localeCompare(b.id);
  });
  return {cards,refreshedAt};
}

export function createSheetReader({ fetcher = fetch, clock = Date.now } = {}) {
  let tokenCache, dataCache, pending;
  async function token(secret) {
    if (tokenCache?.secret === secret && tokenCache.expires > clock()) return tokenCache.value;
    const credentials = JSON.parse(secret);
    if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) throw new Error('Google access is not configured');
    const now = Math.floor(clock()/1000);
    const assertion = `${encoded(JSON.stringify({alg:'RS256',typ:'JWT'}))}.${encoded(JSON.stringify({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}))}`;
    const pem = credentials.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
    const key = await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem), c => c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(assertion));
    const response = await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${assertion}.${b64(signature)}`}),signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Google authorization failed');
    const result = await response.json();
    if (typeof result.access_token !== 'string' || !Number.isFinite(result.expires_in) || result.expires_in <= 60) throw new Error('Invalid Google authorization');
    tokenCache = {secret,value:result.access_token,expires:clock()+(result.expires_in-60)*1000};
    return tokenCache.value;
  }
  return async env => {
    const id=env.RIFTBOUND_SHEET_ID, secret=env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!/^[\w-]{20,100}$/.test(id ?? '') || !secret) throw new Error('Sheet access is not configured');
    const key=id+secret;
    if(dataCache?.key===key && dataCache.expires>clock()) return dataCache.data;
    if(pending?.key===key) return pending.promise;
    const promise=(async()=>{
      const access = await token(secret);
      const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${id}`);
      url.searchParams.set('fields','sheets(properties(title),data(startRow,rowData(values(userEnteredValue,effectiveValue))))');
      for(const tab of INVENTORY_TABS) url.searchParams.append('ranges',`${tab}!A2:M${MAX_ROWS}`);
      const response=await fetcher(url,{headers:{Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(15000)});
      if(!response.ok){if(response.status===401)tokenCache=null;throw new Error('Inventory sheet unavailable');}
      const data=parseInventorySheet(await response.json(),new Date(clock()).toISOString());
      dataCache={key,data,expires:clock()+TTL};
      return data;
    })();
    const flight={key,promise}; pending=flight;
    try{return await promise;}finally{if(pending===flight)pending=null;}
  };
}

export const readInventorySheet = createSheetReader();

export function sheetResponse(snapshot, route, filters, historyId = null) {
  const { cards, refreshedAt } = snapshot;
  const source = {source:'google-sheet',refreshed_at:refreshedAt};
  const page = items => ({items:items.slice((filters.page-1)*filters.limit,filters.page*filters.limit),total:items.length,page:filters.page,limit:filters.limit,...source});
  if(historyId){
    const card=cards.find(c=>c.id===historyId);if(!card)return null;
    const observations=card.price_date?[{price_date:card.price_date,normal_price:card.normal_price,foil_price:card.foil_price,currency:'USD'}]:[];
    return {card:{id:card.id,name:card.name},...page(observations)};
  }
  if(route==='ownership')return {items:cards.filter(c=>c.quantity).map(c=>({id:c.id,quantity:String(c.quantity)})),...source};
  if(route==='facets')return {sets:INVENTORY_TABS.map(id=>({id,name:cards.find(c=>c.set_id===id)?.set_name??id,cards:cards.filter(c=>c.set_id===id).length,owned_cards:cards.filter(c=>c.set_id===id&&c.quantity).length})),rarities:[...new Set(cards.map(c=>c.rarity))].sort(),...source};
  if(route==='valuation')throw new InputError('Past valuations require recorded database history; the sheet holds current prices only');
  if(route==='summary'){
    let copies=0,normal=0,foil=0,priced=0,unpriced=0,cents=0;const dates=[];
    for(const card of cards)for(const [quantity,price,isFoil]of[[card.normal_owned,card.normal_price,false],[card.foil_owned,card.foil_price,true]]){
      copies+=quantity;if(isFoil)foil+=quantity;else normal+=quantity;
      if(price===null)unpriced+=quantity;else{priced+=quantity;cents+=Math.round(price*10000)*quantity;if(quantity)dates.push(card.price_date);}
    }
    dates.sort();return {catalog_cards:cards.length,owned_cards:cards.filter(c=>c.quantity).length,copies:String(copies),normal_copies:String(normal),foil_copies:String(foil),priced_copies:String(priced),unpriced_copies:String(unpriced),value_usd:priced?String(cents/10000):null,oldest_price_date:dates[0]??null,newest_price_date:dates.at(-1)??null,...source};
  }
  let items=cards.filter(c=>(!filters.q||c.name.toLowerCase().includes(filters.q.toLowerCase()))&&(!filters.set||c.set_id===filters.set)&&(!filters.rarity||c.rarity===filters.rarity)&&(!filters.domain||c.domains.includes(filters.domain))&&(filters.energy===''||c.energy===Number(filters.energy))&&(filters.owned!=='true'||c.quantity>0));
  if(route==='binder')items=adjacentOwnedVersions(items.flatMap(c=>[[false,c.normal_owned],[true,c.foil_owned]].filter(([f,q])=>q&&(!filters.finish||f===(filters.finish==='foil'))).map(([is_foil,quantity])=>({...c,is_foil,quantity}))));
  if(route==='binder' && filters.group==='printing')items=combineOwnedFinishes(items);
  // Quantity internals are not part of the public card contract.
  return page(items.map(({normal_owned:_normal,foil_owned:_foil,...card})=>card));
}
