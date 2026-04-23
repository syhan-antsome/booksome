# BookSome Cloudflare R2 Strategy

BookSome uses Supabase for Auth and relational data, and Cloudflare R2 for user-uploaded media.

## Why R2

- zero egress pricing is a better fit for a social reading product with repeated image views
- storage cost is predictable as profiles, room covers, and meetup photos grow
- it aligns with the long-term plan to move backend logic into Cloudflare Workers

## Bucket Strategy

Use one bucket per environment.

### Recommended buckets

- `booksome-media-dev`
- `booksome-media-staging`
- `booksome-media-prod`

This keeps bindings simple and avoids cross-environment cleanup mistakes.

## Object Key Conventions

Use stable prefixes by media kind, then entity ids, then a generated file name.

### Avatar

```text
avatars/{profile_id}/{uuid}.{ext}
```

### Room cover

```text
room-covers/{room_id}/{uuid}.{ext}
```

### Meetup photo

```text
meetups/{meetup_id}/{uuid}.{ext}
```

### Post image

```text
post-media/{post_id}/{uuid}.{ext}
```

## Upload Flow

BookSome should start with a Worker-mediated upload flow rather than direct browser/mobile uploads to R2.

Current development Worker URL:

```text
https://booksome-media-api.booksome-api.workers.dev
```

### Initial flow

1. mobile app asks Worker for an upload plan
2. Worker validates media kind and returns a generated object key
3. mobile app uploads bytes to the Worker endpoint
4. Worker writes the object into R2
5. app stores metadata in Supabase `media_assets`

This keeps R2 credentials out of the client and makes validation easier.

Saved media can be rendered through the Worker:

```text
GET /v1/media/:objectPath
```

Development note: upload endpoints are currently open so the app can test the full R2 path quickly. Before a public beta, the Worker should validate the app's Supabase access token and require the authenticated user to match the upload owner.

### Later optimization

When volume grows, move to presigned upload URLs to reduce Worker bandwidth overhead.

## Metadata to Save in Supabase

`media_assets` already supports the minimum useful metadata:

- `bucket`
- `object_path`
- `mime_type`
- `width`
- `height`
- `owner_id`
- `room_id`

For display URLs, do not store a full public URL in the database. Store only:

```text
bucket = booksome-media-prod
object_path = room-covers/<room-id>/<uuid>.jpg
```

This keeps CDN/domain changes cheap later.

## Public vs Private Media

### Public by default

- room covers
- meetup photos
- post images intended for room feeds

### Private or signed access later

- moderation evidence
- internal admin uploads
- private-draft room assets

## Image Rules

Start with these limits:

- avatars: max 2 MB
- room covers: max 5 MB
- meetup photos: max 8 MB
- post media: max 8 MB

Recommended accepted types:

- `image/jpeg`
- `image/png`
- `image/webp`

Reject everything else at the Worker boundary.

## Cache Guidance

Public image responses should use a long cache header once filenames are immutable:

```text
Cache-Control: public, max-age=31536000, immutable
```

## Future Extensions

- image resizing via Cloudflare Images or a dedicated image service
- signed delivery URLs for private assets
- background moderation pipeline
- automatic thumbnail generation
