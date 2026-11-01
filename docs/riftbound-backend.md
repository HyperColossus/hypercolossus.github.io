# Riftbound backend foundation

Current October 6 status: see [completed local features](riftbound-completed-features.md) and [implementation plan](riftbound-plan.md). The admin UI was removed in favor of local edits. Scheduled syncing is implemented and tested but disabled pending hosted configuration. Historical notes below describe earlier milestones; they do not establish hosted release readiness.

The initial migration is `db/riftbound/001_initial.sql`. The site Worker foundation is implemented in `server/` with `wrangler.site.jsonc`. Local PostgreSQL now runs in Docker and the Worker-to-database health check passes. No public deployment has changed.

## Local development

With Docker Desktop running, run:

```powershell
npm install
npm run db:up
npm run build
npm run server:dev
```

Run `npm run dev` in another terminal. Vite forwards `/api` requests to the local Worker at port 8787. The Worker also serves the production build directly at that port.

`db:up` starts PostgreSQL 17 from `compose.riftbound.yaml`, waits for health, applies the initial migration only when its schema does not exist, and configures a separate read-only runtime login. Rerunning it reuses the container and data. It is an initial bootstrap, not a versioned migration runner for future schema changes.

The database is bound to `127.0.0.1:55432`, with data in the `hypercolossus-riftbound-dev_postgres_data` Docker volume. Random owner and runtime passwords are generated once in the Git-ignored `.env.riftbound.local`. Keep that file with this development environment; deleting it does not reset the volume's passwords. No passwords need to be pasted into chat or committed.

Use `npm run db:check` to verify schema access and read-only privileges, and `npm run db:stop` to stop the container while retaining data. `npm run db:up` starts it again. The helper finds Docker Desktop's per-user Windows installation even when Docker is absent from PATH; `DOCKER_PATH` can override the executable path.

`server:dev` supplies only the runtime connection to Wrangler's local Hyperdrive emulation. The all-zero binding ID in the `local` environment is a local-development placeholder, not a deployed Hyperdrive resource. The Docker database is for local development; production hosting remains a separate release decision.

`GET /api/riftbound/health` returns 503 with `{"status":"unavailable"}` until the Hyperdrive binding can read the migrated schema. It returns 200 with `{"status":"ready"}` when the schema and read grants are available. It never returns connection details. Unimplemented API routes return JSON 404s, including navigation requests. `/admin` currently only falls back to the existing app; no admin UI exists yet.

`npm run server:check` packages the Worker in dry-run mode without deploying. The separate config filename avoids changing discovery for the existing Pages deployment commands. There are no custom domains, public workers.dev endpoint, or cron triggers enabled in the site config.

## Future hosted connection

1. Provision a development/staging database with a separate migration credential and runtime login. Apply the migration below with the migration credential.
2. As the database owner, grant the runtime login `USAGE ON SCHEMA riftbound` and `SELECT` on the five tables and two latest-price views. The current foundation only needs read access. Do not give the Worker schema ownership, DDL privileges, or the migration credential. Later sync/admin work will add narrowly scoped write grants.
3. Create a staging Hyperdrive configuration pointing to the runtime login with query caching disabled. Add its real ID as the top-level `HYPERDRIVE` binding in `wrangler.site.jsonc`, using the commented example. Keep the local-only environment separate.
4. Use the staging configuration for hosted validation, not the Docker-specific `server:dev` helper. Do not commit credentials; use TLS for hosted databases.
5. Verify the health endpoint returns 200. A local direct connection does not verify Hyperdrive's hosted behavior; that requires a later staging deployment.

These steps are deferred until production/staging hosting is selected. See Cloudflare's [local Hyperdrive setup](https://developers.cloudflare.com/hyperdrive/configuration/local-development/) and [PostgreSQL guide](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/).

## Apply

Docker development is initialized automatically by `db:up`; the manual instructions below are for another empty database.

Run against an empty development database using a backend-only migration connection. Set `RIFTBOUND_MIGRATION_DATABASE_URL` in the terminal, then run:

```powershell
npm run db:migrate
```

Alternatively, with `psql` installed:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/riftbound/001_initial.sql
```

The migration is transactional and intentionally applies once; an existing `riftbound` schema causes an error instead of silently accepting a different schema. Never put a database URL or admin password in a `VITE_` environment variable. Database grants and owner authentication must be configured before exposing backend endpoints.

## Validation

`npm test` executes the SQL migration in an ephemeral PGlite PostgreSQL engine and verifies ownership constraints, daily history uniqueness, retry behavior, latest prices, and missing/invalid prices. Worker tests verify asset delegation, JSON API errors, read-only health methods, and sanitized failures. PGlite does not verify network/TLS, Hyperdrive, or the managed provider's role configuration.

The first implementation passed 38 tests, the Vite build, Worker dry-run packaging, and lint on changed JavaScript files. A local Wrangler smoke check verified asset/SPA delivery and API responses. Repository-wide lint is currently blocked by an existing conditional `useTweaks` call in `_deploy/portfolio.jsx`; the frontend build also reports its existing large bundle warning.

Docker setup was additionally verified against PostgreSQL 17: migration application, repeated bootstrap without recreation, runtime read-only privileges, and HTTP 200 `ready` through the actual local Worker. All 38 tests still pass.

## Model

- `card_sets` and `cards` hold the locally synced Catalog. Normal and foil versions share one card row; distinct catalog artwork retains distinct IDs.
- `binder` holds the owner's positive quantity per card and foil flag. Remove a row when quantity reaches zero. Pack Simulator results never write here.
- `sealed_products` records packs and boxes, pack counts, and MSRP for Retail ROI. Unknown MSRP remains null.
- `price_history` stores dated observations for cards and sealed products. Cards have normal and foil prices; sealed products have a market price for Market ROI. Missing prices remain null. This initial model explicitly supports USD only.
- Latest-price views preserve the observation date so callers can show stale data. A missing variant in the latest observation stays missing rather than silently carrying forward an older value.

Daily sync should validate the entire upstream response before writing, map explicit provider IDs rather than names, and append observations in a transaction. Use the UTC sync date consistently and `ON CONFLICT DO NOTHING` to avoid duplicate daily observations on retries. These constraints prevent duplicate data; scheduling and request locking are still needed to avoid consuming API quota twice. Do not overwrite historical observations during normal sync.

Historical price data supports valuing today's Binder at previous prices. An accurate history of what the owner actually held on each date would additionally require ownership-change history, which is outside this first migration.

## Decision provenance and remaining work

This follows `CONTEXT.md` and ADRs 0001–0009 in `D:/HyperColossus/Projects/Riftbound ROI`. ADR 0006 supersedes the multi-user discussion in 0001; ADRs 0003 and 0005 supersede live client price fetching and overwriting current prices.

The handoff describes an existing Next.js portfolio, but this repository uses React/Vite. The [codebase-specific implementation plan](riftbound-plan.md) adapts ADR 0007 to a Cloudflare site Worker serving the Vite assets, same-origin API, and scheduled sync together. PostgreSQL connects through Hyperdrive. The existing web proxy stays separate. The prototype's `src/lib/api.ts` returns mock cards and prices, so its commented endpoint examples are not verified integration contracts.

Catalog and Binder read APIs and the Cola OS app are implemented. Daily sync, owner editing, interactive tools, and production deployment remain planned.

## Catalog and Binder

Open **Riftbound** from the desktop or Start menu. Its Catalog and Binder tabs offer name search, set/rarity filters, pagination, artwork, latest normal/foil prices, and daily price history. The Binder also filters by finish and shows quantity per owned variant. Missing prices display as unavailable; observations at least two UTC calendar days old are marked stale. These are public read views; editing remains reserved for the future authenticated admin UI.

The frontend is lazy-loaded when the app opens. It reads only local database-backed APIs, never upstream card/price endpoints. The card metadata attribution appears within the app.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/riftbound/catalog` | Filtered Catalog rows and total count |
| `GET /api/riftbound/binder` | Owned normal/foil rows, quantities, and prices |
| `GET /api/riftbound/facets` | Imported sets and rarities |
| `GET /api/riftbound/cards/:id/history` | Newest-first price observations; 404 for missing cards |

List filters: `q` (literal name substring, max 100 characters), `set` (stored set ID), `rarity`, `page` (1–10000), `limit` (1–60, default 24). Binder accepts `finish=normal` or `finish=foil`. History uses `page` and `limit`. Responses retain null prices and UTC observation dates. API writes return 405; database failures return a sanitized 503. Unknown API paths return JSON 404s.

## Import real cards

Run `npm run catalog:check` for a read-only check, then `npm run catalog:import` to load the full RiftHunt catalog into the local Docker database.

```powershell
npm run catalog:import
# Or import a complete saved provider export:
npm run catalog:import -- --file C:\path\to\riftbound-export.json
```

The importer validates the full response before a transaction, keeps existing cards when the provider removes them, and preserves Binder ownership and price history. RiftHunt provides the entire Riftbound catalog in one keyless bulk request; the importer retains card/printing IDs, set names, rarity, artwork URLs, and TCGPlayer product IDs. No sample cards or holdings are installed. See the [RiftHunt API guide and terms](https://rifthunt.com/api/).

### Card prices

Set `TCG_API_KEY` in the Git-ignored `.env.riftbound.local`, then run:

```powershell
npm run prices:sync
```

The sync uses TCG API's authenticated, paginated set-card endpoint, matching by TCGPlayer product ID. It fetches each matching set in pages of 100 (within the key's free daily request allowance), validates all pages before writing, then appends one UTC-day price snapshot. It records normal and foil prices where supplied; unavailable prices remain null. A repeat on the same UTC day does not overwrite the first observation. The key is read from the local ignored file or the `TCG_API_KEY` process environment and is never sent to the browser. TCG API's dedicated bulk endpoints require paid tiers; see [authentication and tier limits](https://tcgapi.dev/authentication/), [set endpoints](https://tcgapi.dev/api/sets/), and [price fields](https://tcgapi.dev/api/prices/).

### Provider access diagnosis — September 28, 2026

Riftcodex's endpoint returned an upstream Cloudflare HTTP 403 challenge. The live RiftHunt bulk catalog and the TCG API's Riftbound search, set list, and paginated card-price response were verified. The observed free tier has 100 requests per day; the sync caps itself at 80 requests per run to leave room for other use.

Catalog import and price sync are operator-run locally. Scheduled production syncing, database leases, automatic retries, and hosted secrets remain deferred until the production database and schedule are selected.
