# BookSome Media API

Cloudflare Worker for handling BookSome media uploads into R2.

## Purpose

- validate upload intent from the app
- generate stable object keys
- accept image bytes
- write into Cloudflare R2
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
4. add auth verification before exposing upload endpoints publicly

## Initial Endpoints

- `GET /health`
- `POST /v1/uploads/request`
- `PUT /v1/uploads/blob/:kind/:entityId/:fileName`

The current scaffold is intentionally simple and should be treated as a controlled development starting point, not a production-ready public upload API.
