# BookSome Web

Next.js App Router portal for `https://booksome.top`.

## Purpose

- Explain BookSome before sign-in and provide indexable public pages.
- Search books and discover public Bookrooms through the Spring API.
- Provide web sign-up, sign-in, password reset, and the full reading flow at `/app/` using the existing Expo application.
- Keep access and refresh tokens in secure HTTP-only cookies through same-origin route handlers.

The portal never connects to MariaDB. Server-side data requests use `BOOKSOME_API_INTERNAL_URL`; browser-visible media URLs use `NEXT_PUBLIC_API_BASE_URL`.

## Shared reading experience

`/app/` serves the Expo browser export. Search, registration, notes, reading progress, and the personal completion recap share the native application's code. `/me` now forwards to `/app/library`. Links between Next.js pages and the Expo document use full-page navigation.

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

Use `./deploy.sh web` from the repository root for production deployment. It transfers source and builds on the Linux server so native Next.js dependencies match the runtime, then creates a versioned release and atomically updates `/service/booksome/web/current`. The script verifies `/` and `/app/books/add`, restarts `booksome-web`, and restores the preceding release on failure.

On a new server, first run `./deploy.sh setup` from the repository root. The first successful web deployment replaces the temporary root-domain response with `web/deploy/nginx-booksome.conf` only after the Node service passes its local health checks; an Nginx or public HTTPS failure restores both the preceding Nginx configuration and web release.

## Design sources

The accepted concept references are kept under `design/`. Production photography generated for the page lives under `public/images/`.
