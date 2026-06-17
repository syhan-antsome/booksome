# BookSome Media API

Cloudflare Worker for handling BookSome media uploads into R2 and server-side book lookups.

## Purpose

- validate upload intent from the app
- generate stable object keys
- accept image bytes
- write into Cloudflare R2
- proxy book lookup requests without exposing vendor secrets to the app
- run reading-page text recognition without adding native OCR SDKs to the Expo app
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
4. set the book lookup secrets
5. add auth verification before exposing upload endpoints publicly

## Workers AI

The reading-page OCR endpoint first tries Naver CLOVA OCR when configured, then falls back to Workers AI.

Optional Naver OCR secrets:

```sh
npx wrangler secret put NAVER_OCR_INVOKE_URL
npx wrangler secret put NAVER_OCR_SECRET
```

## Book Lookup Secrets

Book lookup runs through this Worker so the mobile app never contains vendor secrets.
ISBN lookup first checks Naver Book Search, then falls back to the National Library of Korea Seoji API when Naver returns no items.
Title search uses Naver Book Search `book_adv` with `d_titl`.

Set these as Worker secrets:

```sh
npx wrangler secret put NAVER_CLIENT_ID
npx wrangler secret put NAVER_CLIENT_SECRET
npx wrangler secret put NL_SEOJI_CERT_KEY
```

## Initial Endpoints

- `GET /health`
- `GET /v1/books/search?query=:title`
- `GET /v1/books/isbn/:isbn`
- `POST /v1/ocr/reading-page`
- `POST /v1/uploads/request`
- `PUT /v1/uploads/blob/:kind/:entityId/:fileName`

The current scaffold is intentionally simple and should be treated as a controlled development starting point, not a production-ready public upload API.
