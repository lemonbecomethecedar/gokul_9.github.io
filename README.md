# Minecraft Reimagined

## Reviews and owner email

`npm run dev` now starts both Vite and the local reviews API. Reviews are stored in `data/reviews.json` (not committed) and displayed in the guestbook panel. The API validates input, limits request size, uses a honeypot and per-IP rate limit, and never accepts an email recipient from the browser.

For Gmail notifications, copy `.env.server.example` to `.env.server`, then set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `REVIEW_OWNER_EMAIL`. Use a Google app password, not the regular account password. Never use `VITE_*` names for these secrets. Restart the dev server after configuring them. The form reports separately whether a review was saved and whether email was sent; an SMTP failure never silently claims delivery.

Production needs the Node API (`npm run server`) behind your HTTPS reverse proxy at `/api/reviews`, plus persistent writable storage for `data/` and the correct `SITE_ORIGIN`. A static-only deployment cannot store reviews or send mail by itself. Add CAPTCHA, moderation and infrastructure-level rate limits before exposing a high-traffic public guestbook. Remove inappropriate reviews from the server-side JSON storage; avoid editing it while the API is writing.

Run `npm run test:reviews` to test validation, persistence, origin checks, listing, and rate limiting. Tests send no real emails.

React + TypeScript + Vite, with one React Three Fiber canvas, GSAP transitions, Zustand state, and hand-authored CSS.

## Get started

```sh
npm install
npm run assets
npm run dev
```

The repository's discovered assets include `assets/video/intro.mp4`, `assets/video/landing.png`, `assets/video/main.mp4`, `assets/skins/player.png`, `assets/audio/landing-click.mp3`, and `assets/audio/main-click.mp3`. `main.mp4` and both context-specific clicks are recognized as separate roles by asset discovery. Place additional supplied media in `assets/`, `public/assets/`, `src/assets/`, `media/`, or `public/media/`. The discovery script recursively copies these into `public/managed-assets/` and writes `src/config/discovered.json`. Check its console report for **missing** and **ambiguous** roles. If a role has multiple candidates, choose the correct emitted URL in `src/config/assets.ts` under `overrides`.

Use `src/config/assets.ts` to choose `skinConfig.model = 'slim'` for 3-pixel arms. The character uses standard 64×64 skin UVs; the supplied skin should be a 64×64 PNG.

Edit the real player's biography, hobbies, projects and social profiles in `src/config/content.ts`. Empty projects/socials/hobbies are deliberate; no personal facts or URLs have been fabricated. Without media assets the interface falls back to dark atmospheric gradients, a CSS title, and untextured block character.

Build with `npm run build`. The introduction is session-scoped and can be replayed by opening a new browser tab session or clearing `sessionStorage['mc-intro-seen']` in the browser developer tools. No hover sound, transition sound, background music, font, or standalone logo was found in the supplied assets; those features use quiet or visual fallbacks until the files are supplied.

## GitHub Pages deployment

Pushes to `main` are built and deployed automatically by `.github/workflows/deploy-pages.yml`. In the repository's **Settings → Pages** screen, set **Build and deployment → Source** to **GitHub Actions**. The workflow derives the published base path from the current repository name, so Vite's scripts, styles, and discovered media keep working if the repository is renamed.

GitHub Pages is static hosting. The website itself works there, but the reviews API still needs a separate Node.js host as described above.
