# HyperColossus — interactive portfolio

An interactive portfolio. Desktops get the experience below; phones and tablets are detected and routed to a traditional `#mobile` layout. The visitor starts in a black void with a floating CRT, clicks into it, and lands on a desktop OS where each app shows off a different discipline (browser → social/esports portfolio, Steam-style launcher → games, editing-timeline media browser → video).

- Plan: [`docs/roadmap.md`](docs/roadmap.md)
- Riftbound backend development: [`docs/riftbound-backend.md`](docs/riftbound-backend.md)
- Design direction: [`Style Guides/portfolio-design.md`](Style%20Guides/portfolio-design.md)
- Stack: Vite, React 19, three.js via @react-three/fiber + drei, Tailwind 4.

```bash
npm install
npm run dev     # local dev
npm run build   # production build to dist/
npm test        # window-state tests
```

`_deploy/` is the current live static site (hypercoloss.us). Its content and layout can be reused for the `#mobile` route.
