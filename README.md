# BookSome

BookSome is a personal reading-record service with optional social Bookrooms.

## Current Stack

- Expo React Native, TypeScript, and Expo Router
- Next.js public web portal
- React-admin operations console
- Spring Boot 3.5 on Java 21
- MariaDB 11.4 with Flyway migrations
- Nginx and local image storage on Naver Cloud
- JWT access tokens with rotating refresh tokens
- Kakao Book Search for covers and rich metadata, with National Library of Korea fallback

Authentication, profiles, reading life, Bookrooms, meetups, marketplace data, and image uploads use the Spring API at `https://api.booksome.top`.
Book lookup follows `MariaDB cache → Kakao Book Search → National Library fallback`; external API keys remain on the Spring server only.

The repository contains four applications:

- Expo user app: repository root (`app/`, `src/`)
- Next.js user portal: `web/`
- React-admin operations console: `admin/`
- Spring API: `server/`

See [`docs/deployment-architecture.md`](docs/deployment-architecture.md) for the runtime and security boundaries.

## App Development

Create `.env` from `.env.example` and set the required public values.

```sh
npm install
npm run typecheck
npm run web
```

The default web preview runs at `http://localhost:8081`.

Important app environment variables:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.booksome.top
EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID=
EXPO_PUBLIC_NAVER_MAPS_BASE_URL=http://localhost
```

## Spring API Development

The backend lives in `server/`.

```sh
cd server
./gradlew test
./gradlew bootJar
```

The application expects MariaDB and the environment variables represented in `server/src/main/resources/application.yml`. Flyway creates and validates the schema from `server/src/main/resources/db/migration/`.

## Naver Maps

For the Bookstore map picker, configure the Naver Cloud Platform **Maps** service, not **AI.NAVER API - MAP**. Enable Web Dynamic Map and Geocoding, then register the WebView host in the Maps Web Service URL list. Register only the protocol and host, without port numbers or paths.

## Public Web Development

```sh
cd web
npm install
npm run typecheck
npm run lint
npm run build
```
