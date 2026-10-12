# Portfolio design direction

Keep the retro computer and desktop metaphor. Make each app feel like part of one personal collection.

## Visual language

- Cream paper (`#f6f3eb`), charcoal ink (`#272720`), burnt orange (`#b9421d`), and forest green (`#25302a`).
- System sans-serif for clear interface text; Georgia italic for expressive headlines; Consolas for small labels.
- Thin borders, quiet shadows, restrained rounding, and visible keyboard focus.
- CSS artwork for the desktop landscape and game covers; no external wallpaper dependency.

## Surfaces

- **Intro:** preserve the physical computer and its camera interaction. Keep the outer header and desktop shortcut removed; introductory controls disappear after entering the computer. Reduced-motion visitors and scene failures go directly to the desktop.
- **Desktop:** a personal welcome and slim, monochrome `.exe` shortcuts. An icon-only dock slides into view when an app opens, lists only running apps (including minimized ones), and disappears when the last app closes. Labels appear on hover or keyboard focus. The workspace reserves space for the menu bar and dock.
- **Portfolio:** an editorial layout for social, games, and video, with working page history and contact links.
- **Organization:** Internet Explorer opens the portfolio. Side projects is a desktop folder containing Rank Tracker; nested apps appear in the dock only after being launched.
- **Games:** a darker collection with individual project views. Cover art is an abstract composition, not a gameplay screenshot. Keep release availability honest until public play links are supplied.
- **Rank tracker:** use the shared warm palette, clear labels, profile totals, and actual connection states. Configure a hosted API through `VITE_API_BASE_URL`; the local default is `http://localhost:8000`.

## Responsive behavior

Use container queries for apps: windows can be narrower than the browser viewport, especially on the 3D computer. Game cards and craft columns stack in narrow windows. Keep navigation horizontally scrollable and window controls reachable.

## Next content pass

Replace abstract game covers with supplied artwork if desired. Add social and video case studies with real media, outcomes, and destinations. The guestbook remains explicitly unfinished; it links to email in the meantime.
