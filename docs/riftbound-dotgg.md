# DotGG catalog source

Documentation: https://dotgg.gg/api/

Run `node scripts/riftbound-import.mjs --source dotgg` to import the public Riftbound cards and sets endpoints. The default importer continues to use RiftHunt. DotGG does not require authentication for these requests; no TCG API key or account token is sent.

The adapter validates the complete response before importing. It maps card artwork, domains, energy, rarity and TCGPlayer product IDs. Existing records retain their IDs and set labels when a unique product ID matches. Ambiguous product matches or matching names without product matches are skipped and reported. New records use a `dotgg:` prefix. Ownership and price history are preserved by the existing transactional importer.

DotGG prices are not written into TCG API price history because the providers have different observation semantics. Account collection sync and remote deck writes are not part of this catalog integration.

Live validation on September 30, 2026 returned 1,525 card records. This is provider coverage, not a guarantee of every released printing. Database import requires the existing PostgreSQL service to be running.
