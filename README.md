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
- Host-led rooms, questions, quotes, reading groups, and local meetups
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
EXPO_PUBLIC_NAVER_MAPS_BASE_URL=https://booksome.app
```

For the Bookstore map picker, register the same `EXPO_PUBLIC_NAVER_MAPS_BASE_URL` as a Web Service URL in Naver Cloud Maps.

Then run the SQL files in Supabase SQL Editor in this order:

```text
supabase/schema.sql
supabase/rls.sql
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

The app first tries to read `room_discovery_cards` from Supabase. If the schema has not been applied yet, the Discover screen falls back to local preview data.

## Cloudflare Media API

The current BookSome media Worker is deployed at:

```text
https://booksome-media-api.booksome-api.workers.dev
```

The create-room flow now uses this Worker for Room cover uploads:

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
