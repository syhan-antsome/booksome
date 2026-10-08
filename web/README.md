# BookSome Web

Next.js App Router portal for `https://booksome.top`.

## Purpose

- Explain BookSome before sign-in and provide indexable public pages.
- Search books and discover public book conversations (책 이야기) through the Spring API.
- Provide web sign-up, sign-in, password reset, and responsive personal reading pages at `/library`.
- Keep access and refresh tokens in secure HTTP-only cookies through same-origin route handlers.

The portal never connects to MariaDB. Server-side data requests use `BOOKSOME_API_INTERNAL_URL`; browser-visible media URLs use `NEXT_PUBLIC_API_BASE_URL`.

## Shared reading experience

The portal's `/library`, `/library/add`, and `/library/[id]` provide personal shelves, book registration, progress, private text/photo notes and completion review using the existing Spring reading-life API. Login from the home header returns to `/`; login from a selected book keeps that book and continues to `/library/add`. `/me` and older `/app/*` authentication destinations normalize to the corresponding portal page. Primary portal actions stay within Next.js on desktop and mobile.

The desktop header and mobile menu's ‘내 서재’ open `/study`. Clicking the desk notebook, or its accessible ‘책 목록 · 독서 기록’ link, opens the existing protected `/library` list and records. The room can be opened before login, with empty shelves. Signed-in readers automatically see their own registered books and saved cover images; personal data still uses the portal cookie session.

`/app/` still serves the existing Expo browser export for direct reader access. Its native/shared source and routing remain intact.

Both `npm run dev` and `npm run build` first run the repository root's `build:reader` script. Install dependencies in **both** the root and `web/` before running them. The generated `public/app/` directory is ignored by Git and must be included when copying `public/` into a production release. After editing Expo sources, run `npm --prefix .. run build:reader` to refresh this static browser bundle while Next.js is running.

The browser export uses `EXPO_PUBLIC_WEB_SESSION=true`: credentials stay in the portal's existing HTTP-only cookies, and `/api/reader/**` forwards permitted domain requests to Spring. Native apps retain their direct API/SecureStore flow. Do not set this browser flag for native builds. The export is hosted on the **same origin** as Next.js; it cannot be deployed on a separate static host without its session/API routes.

For local development of only the Expo UI, use `npm run web` in the repository root as before (direct API authentication). For the complete portal-to-reader path, use this directory's dev server at `http://127.0.0.1:3000`.

## Local development

```sh
cp .env.example .env.local
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. If Spring is not running locally, set `BOOKSOME_API_INTERNAL_URL=https://api.booksome.top` in `.env.local`.

## Verification

```sh
npm run typecheck
npm run lint
npm run build
```

## Production shape

The production process binds to `127.0.0.1:3000`. Nginx terminates TLS and proxies `booksome.top` to that local port. Use the templates under `deploy/` after installing a supported Node.js LTS release; Next.js 16 requires Node.js 20.9 or newer.

`output: 'standalone'` is enabled. After `npm run build`, deploy `.next/standalone/` as the release root, then copy `.next/static/` to `<release>/.next/static/` and `public/` to `<release>/public/`. The systemd unit starts the resulting `server.js`, so production does not need a full development dependency install.

Do not switch the live root domain until the local portal has been reviewed and the API origin/cookie flow has been smoke-tested on HTTPS.

Set the current OCI host and SSH key using the [deployment command reference](../docs/deploy-commands.md), then use `./deploy.sh web` from the repository root for production deployment. It transfers source and builds on the Linux server so native Next.js dependencies match the runtime, then creates a versioned release and atomically updates `/service/booksome/web/current`. The script verifies `/` and `/app/books/add`, restarts `booksome-web`, and restores the preceding release on failure.

On a new server, first run `./deploy.sh setup` from the repository root. The first successful web deployment replaces the temporary root-domain response with `web/deploy/nginx-booksome.conf` only after the Node service passes its local health checks; an Nginx or public HTTPS failure restores both the preceding Nginx configuration and web release.

## Design sources

The `/study` personal room implements the warm oak virtual study in Three.js with rounded oak furniture, PBR wood and textile materials, an authored glTF chair and draped throw, afternoon lighting, touch camera controls and browser-local decoration preferences. New York uses upright Orbit rotation with unlimited horizontal rotation, a maximum 30-degree downward view and a maximum 45-degree skyward view. Other rooms retain unrestricted Trackball rotation, including at maximum zoom. Pan mode and arrow keys move the focused canvas. The visible “초기화” button restores initial camera orientation, position and zoom while keeping books, decoration settings and the current interaction mode; the full-room preset uses the same camera view. It starts empty, loads only the current account's reading-life books through the existing cookie proxy, and uses saved custom/provider covers through an authenticated same-origin image route. Book counts are real, collections use up to 24 books per page and avoid decorated cubbies, and prototype sample books and sample details have been removed. Its nonmodal editor places 14 kinds of props only in empty cubbies, supports move/rotate/color/remove/undo/cancel, and previews furniture, wall, floor and rug materials. Preferences are saved per signed-in account in this browser; cross-device/server synchronization is not yet provided. The concept, editable chair source, asset sources and current limitations are documented in [design/virtual-study/README.md](design/virtual-study/README.md).

The editor's “풍경” tab offers the original forest, a New York penthouse at sunset, Tokyo at twilight and London in morning light. New York connects the existing study to a real 3D building frame, terrace, glazing and three visible lower storeys; the other environments retain the original room shell. New York uses a six-face photographic environment that follows the same camera orientation and lens as the room. A shared spherical reference joins face boundaries. Tokyo and London retain fixed photographic plates. These are AI-generated environments, not on-location photographs or map data; nearby-city translation parallax is not reconstructed. Indoor light and the desk lamp change with the city while personal books, props and saved materials remain intact. Entering or leaving the penthouse frames the corresponding architecture; other appearance edits preserve the camera. One environment is active at a time; switching disposes its textures, joining geometry and material and ignores late image loads. Loading/failure messages offer explicit retry without disrupting the room. Transparent panes pass pointer input and are excluded from the ambient-occlusion depth pass. These local assets require no new runtime API keys. Scenery participates in the existing account-scoped browser-local save/undo/cancel flow. [Asset prompts](design/virtual-study/scenery-prompts.md), the [360-degree environment](design/virtual-study/scenery-panorama.md) and the [penthouse reference and implementation](design/virtual-study/new-york-penthouse.md) record provenance, behavior and visual limits.

The current portal design and its source concepts are documented in [design/portal-renovation/README.md](design/portal-renovation/README.md). It shares the mobile wordmark, neutral surfaces and coral actions while using a search-led public web layout. Production photography lives under `public/images/`; Pretendard is self-hosted under `src/fonts/` with its OFL license.

Public /rooms URLs remain compatible and are labelled 책 이야기. Personal records live in 내 서재 and are not automatically posted to public discussions. Empty responses, failed requests and missing pages have separate states. ISBN searches use the Spring ISBN endpoint; title searches show up to 12 results. Spring currently passes target=title to the book providers, so the public search label does not promise author search. Author information can still be supplied during manual registration. The discussion finder filters the featured API’s recent public list (up to 12), not the entire database.

In `/study`, the first closed-book click slides it forward by two-thirds of its depth. The open desk book flashes briefly and opens its detail on a single click; the notebook opens `/library`. Selecting another returns the previous book; clicking the selected book again navigates to its detail. Registered books use `/library/[id]`. Covers use `/api/study/books/[id]/cover`, which verifies book ownership through Spring before reading the saved image. The page and image responses use private/no-store settings. A nonmodal selection link and the book list provide keyboard access. Standing books are upright and fit the available cubby height. `tests/study.test.mjs` covers interrupted movements, selection changes, reduced motion and detail destinations.

Authentication keeps the chosen book through login/signup using a validated local next path. Personal library links use Next.js navigation. Book conversation participation stays at /rooms/[slug] after login/signup; posts, comments and reactions use the existing same-origin /api/reader/rooms/** cookie proxy. Legacy /app/room/* login destinations are forwarded to the corresponding portal conversation. Personal shelves and notes use /api/reader/reading-life/**; photo uploads use the existing media proxy with multipart encoding. New notes are private; editing an existing note preserves its visibility, snapshot and native annotation metadata. API/media origins and HTTP-only cookie routes retain the existing deployment boundary.

Run `npm run test:portal` for redirect validation, API states, ISBN routing, private progress/annotation behavior, multipart uploads, public-post visibility and internal/public origin separation. Root checks remain `npm run typecheck` and `npm run test:reading`; `npm run build` here also runs the reader export.

Before deploying, remember that `prebuild` exports the **current root working tree**, including uncommitted mobile edits. Separate or finish those edits deliberately; do not deploy this portal review with `--allow-dirty` merely to bypass the protection.

Signed-in visitors can log out from the desktop header or mobile menu. The portal clears its HTTP-only session, reloads the current public page to discard authenticated state, and notifies other portal tabs without storing tokens in the browser.
