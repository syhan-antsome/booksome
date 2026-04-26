# BookSome Media API

Cloudflare Worker for handling BookSome media uploads into R2 and server-side book lookups.

## Purpose

- validate upload intent from the app
- generate stable object keys
- accept image bytes
- write into Cloudflare R2
- proxy book lookup requests without exposing vendor secrets to the app
- later notify Supabase or an internal API layer

## Local Development

```sh
npm install
npm run dev
```

## Before First Real Use

1. create the R2 bucket for the current environment
2. update `bucket_name` in `wrangler.jsonc`
3. run `npm run types`
4. set the Naver book lookup secrets
5. add auth verification before exposing upload endpoints publicly

## Book Lookup Secrets

Naver book lookup runs through this Worker so the mobile app never contains the Naver client secret.

Set these as Worker secrets:

```sh
npx wrangler secret put NAVER_CLIENT_ID
npx wrangler secret put NAVER_CLIENT_SECRET
```

## Initial Endpoints

- `GET /health`
- `GET /v1/books/isbn/:isbn`
- `POST /v1/uploads/request`
- `PUT /v1/uploads/blob/:kind/:entityId/:fileName`

The current scaffold is intentionally simple and should be treated as a controlled development starting point, not a production-ready public upload API.
