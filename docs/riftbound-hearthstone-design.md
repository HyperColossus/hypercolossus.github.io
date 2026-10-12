# Collection manager visual pass

Implemented October 8, 2026. Reference target is the Hearthstone collection manager: carved timber frame, parchment four-by-two card spread, top class tabs, right-hand deck rack, bottom energy and search controls. Riftbound domains replace classes and expansion selection remains available. Numbered ordering, owned-first collection, faded missing cards, real holdings, deck drafts and all existing tools remain functional.

Research:
- Blizzard collection manager documentation and screenshots: https://news.blizzard.com/en-us/article/21790299/managing-the-collection-manager
- Blizzard collection/deck navigation in the returning-player guide: https://hearthstone.blizzard.com/en-us/news/24244450/welcome-back-to-hearthstone-a-returning-player-s-guide
- Collection screenshot discovered through image research: https://hearthstone.wiki.gg/images/thumb/b/bb/My_Collection.jpg/1200px-My_Collection.jpg
- Earlier user-provided annotated Hearthstone collection screenshot.

The references span versions. Exact October 2026 desktop-client parity was not verified. This is a close composition and material treatment, not a pixel-perfect replica. Materials use CSS plus the existing user PSD book export; no new generated assets or downloaded Blizzard artwork are used in the application. Card art remains Riftbound artwork.

## Screenshot reference and UI Skills pass

The user supplied the Heroes collection screenshot from https://www.gameuidatabase.com/gameData.php?id=628. The site could not be fetched; the attached 1920×1080 screenshot was inspected directly. Its tavern side pillars, red timber backing, parchment ribbon and framed deck slots guided this pass. Riftbound keeps its four-by-two card layout instead of the Heroes screenshot's three-by-two portrait layout.

Selected registry guidance via `npx ui-skills`: `anthropics/frontend-design` (intentional reference-led materials, typography, and two-pass critique) and `danny/screenshot` (rendered visual comparison). Screenshot capture uses the available in-app browser rather than the skill's absent local Chrome script. Authored SVGs provide the carved timber frame and textured parchment without embedding the reference screenshot or Blizzard art. Deck creation and backups now live in a collapsible Deck tools drawer; blank framed deck slots open it and focus the name input. Holdings and saved drafts are preserved.

Palette: parchment #ecd9a4, ink #332413, brass #ba9451, red wood #3e110e, timber #312216. Georgia supplies readable serif labels; the collection is the main visual focus, with app navigation below. Desktop comparison uses 1920×1080, matching the supplied reference; mobile uses 390×844.

Styles are isolated in src/apps/riftbound/hearthstone-collection.css, imported after the existing styles, preserving previous work. Below 760px the deck rack stacks beneath the book; below 520px the grid uses two columns. Browser automation recovered after a runtime reset. Verified at 1920×1080 and 390×844: eight owned cards load, no horizontal overflow, two mobile columns, and a blank deck slot opens the tools drawer. No test deck was saved. Screenshot: outputs/hearthstone-collection-preview.png.
