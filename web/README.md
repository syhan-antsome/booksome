# BookSome Web

Next.js App Router portal for `https://booksome.top`.

## Purpose

- Explain BookSome before sign-in and provide indexable public pages.
- Search books and discover public Bookrooms through the Spring API.
- Provide web sign-up, sign-in, password reset, and a small account entry point.
- Keep access and refresh tokens in secure HTTP-only cookies through same-origin route handlers.

The portal never connects to MariaDB. Server-side data requests use `BOOKSOME_API_INTERNAL_URL`; browser-visible media URLs use `NEXT_PUBLIC_API_BASE_URL`.

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

## Design sources

The accepted concept references are kept under `design/`. Production photography generated for the page lives under `public/images/`.
