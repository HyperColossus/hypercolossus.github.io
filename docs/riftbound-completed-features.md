# Riftbound local tracker features

Updated October 6, 2026.

Open `/riftbound` for the full-page tracker on desktop or mobile. The desktop app also links there. This route loads the tracker without downloading the 3D desktop scene. Both interfaces share browser-local drafts and events because they use the same origin.

## Collection and cards

The collection starts with owned printings; Show unowned reveals faded missing printings. Filters and pagination remain database-backed. Set completion counts distinct owned printings, combining normal/foil copies. Refresh collection reloads cards, counts, ownership checks and facets after local edits or spreadsheet imports.

Open Card details & prices for artwork, type, plain-text rules, domains, energy, printing ID and price history. Metadata absent from a provider stays unavailable. Migration 005 adds these fields without replacing existing data; `node scripts/riftbound-details.mjs riftbound-catalog.pending.json` fills only matching existing IDs from the saved provider export. Future catalog imports retain existing details when a provider omits them.

The overview's past valuation uses today's quantities with the newest observation on or before the chosen UTC date. It never reconstructs past holdings or fills a missing finish with an older observation. Missing-priced copies are excluded and shown explicitly.

The model pool requires type metadata; a Unit with Token subtype enters the token/rune slot. Unknown types are excluded and this limitation is shown in the model settings. Provider eligibility is not a certified booster checklist.

## Decks and events

Drafts compare each printing's required quantity with total owned normal/foil copies. Other drafts do not reserve copies. Missing cards have a copyable list. This check is not tournament legality validation.

Back up or restore decks/events downloads a version 1 JSON file. A restore is validated and previewed, then explicitly applied. New records are merged, identical records skipped and conflicting IDs rejected. Existing records and storage are preserved on failure; changing records after preview requires a new preview. Browser storage conflicts still reject saves. Keep JSON backups before clearing browser data.

## Calculator and simulator

Both load the entire selected set and recorded prices in one consistent database snapshot, including optional sealed products. Retail and Market ROI use costs for the whole selected purchase, with matching pack counts. User cost overrides are explicit; no example prices masquerade as database observations. Missing prices make full expected value unavailable; the known-price contribution and slot coverage remain visible. Zero prices are available.

Model `origins-slots-v1` follows the [published Origins slot structure](https://playriftbound.com/en-us/news/announcements/collectability-in-riftbound-origins/). It contains fourteen cards and uses foil prices for rare/epic slots. Editable rarity probabilities, uniform sampling within a category, exclusion of known chase treatments/oversized cards and unverified application to other sets are modeling assumptions. Token/rune eligibility uses imported card types, not names. Missing categories stop simulation instead of substituting unrelated cards. Simulated pulls never alter holdings. Unknown prices remain unavailable in pull totals.

## Daily price sync

Migrations 004 and 006 maintain UTC daily leases with three attempts and an eighty-request budget shared by retries. Reservations commit before each upstream call, including failed calls. Completed/active/exhausted jobs skip, stale leases expire after thirty minutes and fetches have a four-minute overall deadline. Failed imports leave price history unchanged. Public requests cannot trigger jobs or write holdings.

Production cron remains disabled. To enable later, provision `SYNC_HYPERDRIVE` with a separate login, grant only catalog reads, price-history insert, and sync-lease select/insert/update (plus required sequence usage), add the TCG secret server-side and set `PRICE_SYNC_ENABLED=true`. Keep `HYPERDRIVE` read-only. Use an hourly cron for bounded retries; the UTC daily lease permits only one completed run. Verify hosted connectivity and scheduled dispatch before enabling. No secrets belong in frontend variables or logs.

Sealed-product price syncing is not verified; enter costs in the calculator or maintain sealed-product records locally. Hosted provisioning/domain changes still need deployment decisions; the roadmap now reflects that accurately.

## Verification

All 76 automated tests pass. Targeted lint for the tracker, backend and changed operator scripts passes without warnings. Production build and Worker dry-run packaging pass. Local API checks pass using the read-only runtime role. Browser checks cover the full-page desktop and 390-pixel phone layout, card details, Escape/focus restoration, past valuation and a fourteen-card simulated opening. Existing ownership and price records were preserved.

Repository-wide lint remains blocked by existing conditional `useTweaks` calls at `_deploy/resume.jsx:348` and `_deploy/portfolio.jsx:1094`. The build's large-chunk warning now applies to the separately loaded 3D desktop scene; the initial entry is about 193.5 KB uncompressed, and the tracker is about 39.5 KB. No hosted deployment was performed.
