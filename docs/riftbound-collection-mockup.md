# Collection mockup implementation — October 6, 2026

The collection now follows the supplied Photoshop mockup: an open gold rune book, four columns and two rows on desktop, domain markers above the left page, expansion selection above the right page, pagination below the cards, and My Decks beside the book. Narrow screens use two columns and move the deck rack below the collection.

## Artwork

Everything located the source at `D:\DeadlockMods\mods\ratking_brazil_flag\riftbound collection.psd` (1920 × 1080). `Group 2` was exported with its existing clipping masks and stroke effects to `public/riftbound/collection-book.webp` (1472 × 969, approximately 151 KB). The original PSD was read without modification. The exported book includes the user's existing artwork and the League classic rune-page texture. No new artwork was generated.

## Behavior

- Owned cards remain the default. Show unowned includes missing printings in catalog order and fades their artwork. Current holdings were not changed.
- Each card image opens its details and price history. The plus button adds to the selected browser-local deck; without a selected deck, it is disabled.
- Expansion, domain, energy, rarity, finish (Binder), search, reset, pagination, and retry remain available.
- Blank slots preserve an eight-card spread for short result pages. Empty and error states have their own explanation.
- Collection totals, set completion, refresh, and past valuations are available in Collection overview & value below the book.
- Profile/account features are not part of this first mockup implementation; existing Events, Calculator, Simulator, Binder, and deck tools remain accessible.

## Verification

- All 76 automated tests passed.
- Targeted lint for `src/apps/RiftboundCompanion.jsx` and `src/apps/riftbound` passed.
- Production build passed. The existing large IntroScene chunk warning remains.
- Full-project lint still fails on conditional `useTweaks` calls in `_deploy/resume.jsx:348` and `_deploy/portfolio.jsx:1094`.
- The existing local PostgreSQL container was started after Docker Desktop was found stopped. Catalog and ownership were preserved; the runtime role remains read-only.
- Browser checks at 1920 × 1080 and 390 × 844 confirmed four/two card columns, respectively, and no horizontal page overflow. Set/domain/name filters, reset, card details, Escape dismissal, the owned-only empty state, and a one-card result with seven blank slots were checked against the real local catalog.
- Preview screenshot: `outputs/riftbound-mockup/collection-preview.jpg` (Show unowned enabled; no owned quantities were invented).
