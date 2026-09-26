# BookSome

BookSome is a personal reading-record service with optional social Bookrooms.

## Current Stack

- Expo React Native, TypeScript, and Expo Router
- Next.js public web portal
- React-admin operations console
- Spring Boot 3.5 on Java 21
- MariaDB 11.4 with Flyway migrations
- Nginx and local image storage on Oracle Cloud Infrastructure
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

The public portal also hosts the same reading UI at `/app/`, including title search, book registration, private notes, progress, and a personal completion recap. To verify the full public-web-to-reader flow, install dependencies in the repository root and in `web/`, then run `npm run dev` from `web/`. Its build hook exports the Expo browser app automatically; browser authentication uses the portal's HTTP-only cookies. See [`web/README.md`](web/README.md) for the shared build and deployment contract, and [`docs/reading-pilot.md`](docs/reading-pilot.md) for the first-user validation plan.

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

## Deployment

Quick reference: [배포 명령어](docs/deploy-commands.md). Current server status and mail configuration: [OCI 서버 문서](docs/oracle-cloud-setup.md).

All production applications are deployed through the single root script. Set the current OCI host and key in each new terminal:

```sh
export BOOKSOME_DEPLOY_HOST=syhan@161.33.4.136
export BOOKSOME_DEPLOY_IDENTITY=/Users/sangyonghan/SSH/oracle-cloud/ssh-key-2026-09-24.key

./deploy.sh all --dry-run
./deploy.sh api
./deploy.sh web
./deploy.sh admin
./deploy.sh all
```

The script's default SSH host is `syhan@161.33.4.136`; use the environment variables above or explicit `--host` and `--identity` options to override the connection. The `syhan` account prompts for its sudo password during deployment; run the command from an interactive terminal. The `booksome` service account continues to run the API and web processes. A dirty worktree is refused unless `--allow-dirty` is explicit. API/admin artifacts are built locally; the public web and its embedded Expo reader are built on the Linux server. Releases are versioned, switched atomically, and checked for health.

Initial setup on the current server is complete. `./deploy.sh setup` prepares web/admin prerequisites on a server that already has the API, MariaDB, Nginx, and the `booksome` service user. It checks/installs Node.js 24, writes the web build environment, and prepares release paths. `all` runs this setup automatically only if web/admin prerequisites are missing. It is not a complete blank-server bootstrap. SSH needs sudo access; when necessary, the script asks for the sudo password through the terminal without storing it.

Rollback restores the failing service's preceding artifact when available. Earlier successful stages of `all` are not automatically rolled back. Flyway database migrations are forward-only, so schema changes must remain backward compatible with the preceding API release.
