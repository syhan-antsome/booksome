# BookSome

BookSome is a mobile-first social reading app where every book can become a reader-run room.

## Current Stack

- Expo React Native
- TypeScript
- Expo Router
- Expo native modules for camera, location, notifications, image picker, sharing, and deep links
- Supabase for auth and relational data
- Cloudflare R2 + Workers scaffold for media uploads

## Initial Product Direction

- App-first launch for App Store and Google Play
- Web preview and shared links as supporting surfaces
- Book Room discovery as the first core experience
- Book-centered rooms, questions, quotes, reader traces, and local meetups
- Supabase Auth with profile bootstrap on first sign-in

## MVP Native Capabilities

- Push notifications
- Deep links and universal/app links
- Native share sheet
- Location for city/local reading meetups
- ISBN barcode scanning
- Image upload and camera access

## Development

```sh
npm install
npm run typecheck
npm run web
```

The current web preview runs at:

```text
http://localhost:8081
```

## Supabase Setup

Create `.env` from `.env.example` and set:

```sh
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MEDIA_API_URL=
EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID=
EXPO_PUBLIC_NAVER_MAPS_BASE_URL=http://localhost
EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:8082/auth/update-password
```

For the Bookstore map picker, configure the Naver Cloud Platform **Maps** service, not **AI.NAVER API - MAP**. Enable Web Dynamic Map and Geocoding, then register the same host as the WebView page in the Maps Web Service URL list. Naver Maps Web Service URLs should use only the host and protocol, without port numbers or paths. For local browser development, use `http://localhost`, not `http://localhost:8082`. For Expo Go on a physical device, use the LAN host shown by Expo, such as `http://192.168.0.10`, not `http://192.168.0.10:8082`.

Then run the SQL files in Supabase SQL Editor in this order:

```text
supabase/schema.sql
supabase/rls.sql
supabase/add-book-lookup-fields.sql
supabase/functions.sql
supabase/seed.sql
```

If an existing database reports recursive RLS errors while reading rooms, run:

```text
supabase/fix-rls-recursion.sql
```

If an existing database needs the Room participation RPC, run:

```text
supabase/add-join-room-function.sql
```

If an existing database needs stricter comment writes, run:

```text
supabase/tighten-comment-rls.sql
```

If an existing database needs reading note progress snapshots, run:

```text
supabase/add-reading-note-progress-snapshots.sql
```

If an existing database needs the Bookroom v2 rule that a book work can have only one shared Bookroom, first merge duplicate rooms if any, then run:

```text
supabase/enforce-one-room-per-work.sql
supabase/add-book-lookup-fields.sql
supabase/functions.sql
```

The app first tries to read `room_discovery_cards` from Supabase. If the schema has not been applied yet, the Discover screen falls back to local preview data.

## Cloudflare Media API

The current BookSome media Worker is deployed at:

```text
https://booksome-media-api.booksome-api.workers.dev
```

User-uploaded media flows use this Worker for R2 uploads:

```text
App image picker
-> POST /v1/uploads/request
-> PUT /v1/uploads/blob/:kind/:entityId/:fileName
-> R2 object saved
-> Supabase media_assets row inserted
```

Saved media can be read through:

```text
GET /v1/media/:objectPath
```

The current Worker is suitable for development. Before a public beta, upload endpoints should verify the Supabase access token from the app.

## Cloudflare Pages

The Expo web build can be deployed to Cloudflare Pages. This is used as the stable password reset landing page for Supabase Auth.

```sh
npm run deploy:pages
```

The Pages deploy includes the Expo web app and static files from `public/`. `public/_redirects` sends app routes such as `/auth/update-password` back to `index.html`, so password reset links can be opened directly from email.

`npm run deploy:pages` builds with Pages-specific public env values:

```text
EXPO_PUBLIC_AUTH_REDIRECT_URL=https://booksome-app.pages.dev/auth/update-password
EXPO_PUBLIC_NAVER_MAPS_BASE_URL=https://booksome-app.pages.dev
```

After deployment, set the Supabase Auth redirect URL and the app env value to the Pages URL:

```text
https://booksome-app.pages.dev/auth/update-password
```

If a custom domain is connected later, use:

```text
https://booksome.app/auth/update-password
```
