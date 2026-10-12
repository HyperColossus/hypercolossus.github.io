# Riftbound interface features

## Collection overview (October 6, 2026)

Collection and Binder now show total owned copies, separate normal/foil counts, unique owned printings against the catalog total, and recorded USD value. These totals cover the entire collection, regardless of the current card filters or page. Refresh collection reloads the overview, cards and filter options after local edits or spreadsheet imports.

The read-only `GET /api/riftbound/summary` endpoint computes a consistent snapshot in one SQL statement. Valuation multiplies each finish's quantity by its price in the latest card observation. Missing prices are excluded and their copy counts remain visible; partial values are labeled. A zero price is available. Older prices do not fill missing finishes in the latest observation. No owned priced copies means unavailable value, rather than an invented zero. The overview displays the oldest/newest dates of included prices and flags stale observations using the existing two-day threshold. Totals count alternate printings separately and combine normal/foil for unique-card counts.

Validation: 71 automated tests pass, including empty/unpriced holdings, finish quantities, latest observations, zero prices, read-only summary routing and sanitized failures. Targeted lint has no errors (two existing unused-variable warnings in the scheduler); production build passes with the existing large main-bundle warning.

The collection now supports domain (including Colorless) and exact energy filters. Values come from the RiftHunt bulk export. Missing energy remains unknown; it does not match zero. Filtering and pagination happen together in PostgreSQL.

Before running the updated API against an existing database, apply `db/riftbound/003_card_gameplay.sql` with the operator role, then rerun the catalog import to populate the new metadata. The migration is additive and safe to repeat. Local `db:up` applies it automatically when Docker is available. The general migration script remains a fresh-database initializer; do not run its initial schema against an existing database.

My Decks supports local drafts, renaming, per-printing quantities, removal and copyable text exports. These are browser-local drafts, not synchronized account decks and not validated for tournament legality. Adding a card does not change Binder ownership. Browser storage failures are shown without overwriting saved data; changes in other windows are reloaded and conflicting saves rejected.

Events is a personal journal with add, edit and remove actions. Dates use local time. It is not a live tournament feed. Records are stored under `riftbound-events-v1`; drafts use `riftbound-drafts-v1`.

The two generated illustrations were deleted at the user's request, including both project copies and generated originals. No generated-image assets are referenced by this implementation.

Validation: 53 automated tests cover existing behavior plus domain/energy filtering, multi-domain cards, zero versus unknown energy, draft quantities, invalid saved records and event validation. Targeted lint and production build passed.

Local services repaired on September 29, 2026: WSL 2 and Docker Desktop are running, PostgreSQL is healthy, and all migrations are applied. Docker created a fresh local volume; its Binder has no entries. Imported 1,432 cards and synchronized 1,383 daily price observations across eight sets using 22 API requests. Live HTTP checks passed for health, catalog, search, pagination, combined domain/zero-energy filters, facets, empty Binder, price history, and invalid-filter rejection. The runtime database role remains read-only. Local app preview runs at http://127.0.0.1:8787 while the local server process is active. The production build retains its existing large main-bundle warning.
