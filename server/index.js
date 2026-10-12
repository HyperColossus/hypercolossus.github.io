import { checkDatabase, withDatabase } from './database.js';
import { scheduledPriceSync } from './riftbound/scheduled.js';
import { readInventorySheet, sheetResponse } from './riftbound/sheet.js';
import { validateCatalog, applyCatalog, sheetSetTools } from './riftbound/catalog.js';
import { parseDecks, parseEvents, DECKS_TAB, EVENTS_TAB } from './riftbound/journal.js';
import catalogSnapshot from './riftbound/catalog-snapshot.json' with { type: 'json' };
import { InputError, readFilters, readCards, readFacets, readHistory, readCollectionSummary, readOwnership, readSetTools, readValuationDate } from './riftbound/queries.js';

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

export function createWorker({ databaseReady = checkDatabase, database = withDatabase, sheetReader = readInventorySheet, catalog = catalogSnapshot } = {}) {
  let checkedCatalog;
  const enriched = new WeakMap();
  // Merge bundled gameplay details into each sheet snapshot once.
  const withCatalog = snapshot => {
    checkedCatalog ??= validateCatalog(catalog);
    if (!enriched.has(snapshot)) enriched.set(snapshot, { ...snapshot, cards: applyCatalog(snapshot.cards, checkedCatalog) });
    return enriched.get(snapshot);
  };
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const { pathname } = url;
      if (pathname !== '/api' && !pathname.startsWith('/api/')) {
        return env.ASSETS.fetch(request);
      }
      const route = pathname.slice('/api/riftbound/'.length);
      const history = /^\/api\/riftbound\/cards\/([^/]+)\/history$/.exec(pathname);

      if (!pathname.startsWith('/api/riftbound/') || (!['health', 'catalog', 'binder', 'facets', 'summary', 'ownership', 'set-tools', 'valuation', 'decks', 'events'].includes(route) && !history)) {
        return json({ error: 'Not found' }, 404);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' });
      }

      if (route !== 'health') {
        try {
          if (route === 'summary' && url.search) throw new InputError('Collection overview does not accept filters');
          if (route === 'ownership' && url.search) throw new InputError('Ownership does not accept filters');
          if ((route === 'decks' || route === 'events') && url.search) throw new InputError('This view does not accept filters');
          if (route === 'set-tools' && [...url.searchParams.keys()].some(key => key !== 'set')) throw new InputError('Set tools only accept a set');
          const valuationDate=route==='valuation' ? readValuationDate(url.searchParams) : null;
          const filters = readFilters(route==='valuation' ? new URLSearchParams() : url.searchParams);
          if (route === 'catalog' && filters.finish) throw new InputError('Finish applies to the Binder only');
          let data;
          if (env.RIFTBOUND_SHEET_ENABLED === 'true') {
            const snapshot = withCatalog(await sheetReader(env));
            if (route === 'decks') data = { decks: parseDecks(snapshot.journal?.[DECKS_TAB], snapshot.cards), source: 'google-sheet', refreshed_at: snapshot.refreshedAt };
            else if (route === 'events') data = { events: parseEvents(snapshot.journal?.[EVENTS_TAB]), source: 'google-sheet', refreshed_at: snapshot.refreshedAt };
            else if (route === 'set-tools') {
              // Gameplay details and sealed products come from the bundled catalog;
              // the sheet is authoritative for current card prices. No database access.
              if (!filters.set) throw new InputError('Choose a set');
              data = sheetSetTools(snapshot, checkedCatalog, filters.set);
            } else {
              data = sheetResponse(snapshot,route,filters,history ? decodeURIComponent(history[1]) : null);
            }
          } else if (route === 'decks' || route === 'events') {
            data = { [route]: [], source: 'database' }; // Journal lives only in the sheet.
          } else data = await database(env, db => history
            ? readHistory(db, history[1], filters)
            : route === 'summary' ? readCollectionSummary(db)
              : route === 'valuation' ? readCollectionSummary(db,valuationDate)
              : route === 'ownership' ? readOwnership(db)
                : route === 'set-tools' ? readSetTools(db, filters.set)
              : route === 'facets' ? readFacets(db) : readCards(db, route, filters));
          const response = data === null ? json({ error: 'Card not found' }, 404) : json(data);
          return request.method === 'HEAD' ? new Response(null, response) : response;
        } catch (error) {
          const response = error instanceof InputError
            ? json({ error: error.message }, 400)
            : json({ error: 'Riftbound is temporarily unavailable. Please try again.' }, 503);
          return request.method === 'HEAD' ? new Response(null, response) : response;
        }
      }

      let ready = false;
      try {
        ready = env.RIFTBOUND_SHEET_ENABLED === 'true'
          ? Boolean(await sheetReader(env)) : await databaseReady(env);
      } catch {
        // Never return connection strings, SQL, or provider errors to visitors.
        ready = false;
      }
      const response = json({ status: ready ? 'ready' : 'unavailable' }, ready ? 200 : 503);
      return request.method === 'HEAD'
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    },
    async scheduled(event, env) {
      try { return await scheduledPriceSync(event, env, database); }
      catch { console.error('Scheduled price sync failed. Existing prices were preserved.'); throw new Error('Scheduled price sync failed'); }
    },
  };
}

export default createWorker();
