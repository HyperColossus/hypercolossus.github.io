# Riftbound Companion implementation plan

Updated October 6, 2026. Checked items are implemented locally unless explicitly stated otherwise. Hosted checks and release remain pending.

## Codebase facts

The portfolio is React 19 with Vite, JavaScript/JSX, and Cola OS windows. `src/App.jsx` currently renders `IntroScene` directly. `src/desktopConfig.js` registers apps and shortcuts; `src/components/Desktop.jsx` resolves them through `APP_MAP`. Mobile routing and lazy app loading are roadmap items, not existing features.

The deployment scripts build `dist/` and publish it to Cloudflare Pages. `proxy/` is a separate Worker that fetches and rewrites third-party websites. It is not the portfolio's application backend. The Riftbound prototype lives in `D:/HyperColossus/Projects/Riftbound ROI`; its API module returns mock data.

## Target architecture

Keep Vite and React. Add a site Worker in `server/` that serves the existing `dist/` assets, handles same-origin `/api/riftbound/*` requests, and runs a daily scheduled price sync. Deploy those assets and that Worker as one portfolio application. Keep the web proxy deployment independent and give it no Binder or database credentials.

Use Docker PostgreSQL for local development, with persistent storage and a separate runtime login. The local Worker connects through Hyperdrive emulation. Production PostgreSQL hosting remains a release decision; the current Cloudflare deployment plan connects through a real Hyperdrive binding. Retain the existing PostgreSQL schema rather than substituting D1. Disable database query caching initially so Binder writes are immediately visible. Store credentials and authentication secrets only on the server.

This adapts prototype ADR 0007's unified application intent to the actual framework: Cloudflare Worker handlers replace assumed Next.js API routes. Pages remains the current host until the combined site deployment passes staging checks. No framework migration is needed.

Cloudflare documents [serving static assets and APIs together](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/), [Worker-first API routing](https://developers.cloudflare.com/workers/static-assets/binding/), [scheduled handlers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), and [PostgreSQL connections](https://developers.cloudflare.com/workers/tutorials/postgres/).

## 1. Establish the server and database

- [x] Draft `db/riftbound/001_initial.sql`: Catalog, single-owner Binder, sealed products, and dated prices. The actual migration passes embedded PostgreSQL tests; hosted connectivity remains unverified.
- [x] Add `server/index.js`, root `wrangler.site.jsonc`, static asset binding to `dist/`, and explicit Worker-first routing for `/api` and `/api/*`. Unknown API paths return JSON 404s, never the SPA HTML fallback. Ordinary assets retain static delivery.
- [x] Add a development Worker command and a Vite `/api` development proxy. Production clients use relative API URLs. Preserve `VITE_PROXY_URL` for the existing browser app.
- [x] Provision isolated Docker development PostgreSQL, configure local Hyperdrive emulation and a read-only runtime role, and apply the migration with a separate owner credential. Verified HTTP 200 readiness through the local Worker.
- [ ] Select production/staging PostgreSQL hosting and verify deployed Hyperdrive connectivity before release.
- [x] Verify SQL constraints in ephemeral embedded PostgreSQL (PGlite): normal/foil ownership, positive quantities, foreign keys, valid price targets, daily uniqueness, missing prices, and latest-price selection. Managed database grants, TLS, and Hyperdrive require a separate staging check.

Acceptance: the existing portfolio builds, a staging site serves it through the Worker, and a read-only backend check reaches the isolated database. No public domain changes yet.

## 2. Deliver Catalog and Binder reads

- [x] Verify the live RiftHunt bulk card export and import the catalog locally; Riftcodex's own endpoint remains blocked by Cloudflare.
- [x] Implement an operator-run Catalog import using documented provider IDs and transactional upserts, plus a complete saved-export input. Keep existing cards and Binder ownership when records disappear upstream. No automatic deletions.
- [x] Implement bounded/paginated `GET /api/riftbound/catalog`, `GET /api/riftbound/binder`, and card price-history reads. Return observation dates and explicit missing prices. Add facets for set/rarity filters.
- [x] Add `src/apps/RiftboundCompanion.jsx`, app-scoped CSS, and a small API client under `src/apps/riftbound/`. Register it in `desktopConfig` and `Desktop`'s `APP_MAP`; use lazy loading with a loading/error boundary for this app.
- [x] Add Catalog and Binder tabs with responsive grids and distinct empty, loading, unavailable, and stale-price states. Browser-checked both tabs in the existing Cola OS window.

Acceptance: visitors can browse imported cards and the owner's Binder without triggering upstream fetches. No invented holdings or mock prices appear as live data.

## 3. Add daily price history

- [x] Implement an operator-run daily card-price snapshot using TCG API's paginated set-card endpoint, matching on TCGPlayer product IDs and preserving normal/foil prices.
- [x] Add persistent daily lease attempts and request reservations. Atomic claims prevent overlapping runs; at most three attempts and 80 requests per UTC date are allowed. Failed attempts retain spent requests. Leases expire after 30 minutes; upstream work has a four-minute deadline.
- [x] Implement a scheduled handler using a separate sync binding, explicit enable flag and sanitized errors. No production schedule is enabled. Sealed-product price coverage remains unverified.
- [x] Validate complete response pagination before a transactional history insert; daily conflict handling makes retries idempotent while retaining prior observations.
- [x] Test request failures, rate limits, malformed/partial responses, overlapping jobs, retry limits and persistent budget exhaustion. Staging cron is disabled by default; hosted dispatch remains pending.

Acceptance: a retry does not duplicate observations, public traffic cannot initiate a sync, and an upstream outage leaves the Catalog/Binder usable with visible price dates.

## 4. Edit collection data locally

The owner requested local database editing on October 6, 2026. The admin console, login/session endpoints, and Binder write API have been removed. The app database role is read-only. See [local editing instructions](riftbound-local-editing.md) for printing lookup, normal/foil quantities, and removal. Existing holdings, prices, and session tables are preserved.

- [x] Excel ownership import with preview, backup, exact counts, blank/zero distinction, stale-preview rejection and transactional apply.
- [x] Whole-collection valuation, finish counts, unpriced-copy coverage and per-set completion.
- [x] Current-holdings valuation at past observation dates; this is not historical ownership.
- [x] Card rules/type details, browser-local deck ownership checks and missing-copy exports.
- [x] Browser draft/event JSON backups and restore previews that merge without overwriting conflicting records.

## 5. Add ROI Calculator and Pack Simulator

- [x] Port the prototype UI and pure calculations into JavaScript modules compatible with this project. Reuse the same Catalog and daily price snapshot across all four tabs.
- [x] Version an Origins model using Riot's published slot structure, with explicit editable probability assumptions. Uniform category sampling and chase exclusion are visible. Other sets use a hypothetical model; their composition is not verified. Compute separate Retail/Market ROI using optional sealed records or explicit user costs. Missing or zero baselines produce unavailable results.
- [x] Label prices with their observation date rather than implying per-visit live fetches. Keep Pack Simulator pulls local and separate from the Binder.
- [x] Test EV/ROI with known fixtures, variant prices, pack/box scaling, and missing inputs. Test simulated pack composition without relying on exact random sequences.

Acceptance: all four tabs work from persisted data; assumptions are visible; simulated pulls never change ownership.

## 6. Release the combined portfolio

- [x] Run automated tests, targeted Riftbound lint, production build and local read API checks. Full-project lint still has two existing hook-order errors in `_deploy`; build has a large-bundle warning.
- [ ] Verify hosted application/database connectivity, responsive layouts, static/GLB loading, API routing and the existing browser proxy on staging.
- [x] Update `deploy:site` and `deploy.cmd` to build and publish the site Worker plus assets. Keep proxy deployment separate. Document required bindings, secrets, migration order, and local development.
- [ ] Confirm hosting/database costs and create production bindings with separate read/sync roles.
- [ ] Back up the hosted database and retain the existing Pages deployment for rollback. Move custom domains only after hosted validation; enable production cron and verify its first run.

Acceptance: one site deployment serves the portfolio and Riftbound backend, existing apps still work, and a documented rollback restores Pages without deleting persisted Binder data.

## Scope and next action

The original domain terminology and ADRs remain authoritative except for the framework/hosting adaptation stated above. Preserve one row per card, the single-owner Binder, dual ROI baselines, and append-only daily history. Historical valuation initially means today's Binder valued at past prices; historical holdings require a separate future design.

Local tracker features are implemented. RiftHunt and DotGG supply catalog data; TCG API supplies operator-run price snapshots. Current local data has 1,644 printings, with details backfilled for 1,432 from the saved export. Holdings remain owner-supplied. Scheduled syncing code is tested but disabled pending hosted provisioning, separate sync permissions and deployment validation. No public deployment, domain cutover or automatic live sync has occurred. Tournament legality, historical holdings and verified sealed-product syncing are outside the completed local scope.
