# BookSome deployment architecture

BookSome is split into four applications with one shared API contract. The browser and mobile clients never connect to MariaDB directly.

| Application | Repository path | Production entry point | Runtime | Responsibility |
| --- | --- | --- | --- | --- |
| Spring API | `server/` | `https://api.booksome.top` | Java 21, Spring Boot, `booksome-api.service`, `127.0.0.1:8080` | Authentication, authorization, domain rules, AI features, file uploads, external book APIs, MariaDB access |
| Operations console | `admin/` | `https://admin.booksome.top` | React-admin static build served by Nginx | Administrator-only moderation and operations |
| Public web portal | `web/` | `https://booksome.top` | Next.js Node server, `booksome-web.service`, `127.0.0.1:3000`, behind Nginx | Public discovery and SEO, web sign-up/sign-in, personal web entry point |
| User mobile app | repository root (`app/`, `src/`) | Expo/EAS builds | Expo React Native | Primary personal reading-record experience and mobile community features |

> The Expo app remains at the repository root because `app/` is the Expo Router route directory. Moving it into another folder would be a separate migration with no user benefit today.

## Request boundaries

```text
Browser ── booksome.top ────── Nginx ── Next.js :3000 ──┐
Browser ── admin.booksome.top ─ Nginx static files ──────┼── Spring API :8080 ── MariaDB :3306
Mobile app ──────────────────────────────────────────────┘
```

- MariaDB listens only on `127.0.0.1:3306`.
- Spring Boot is the only application allowed to use database credentials.
- Next.js keeps web access and refresh tokens in secure, HTTP-only cookies and forwards authenticated requests to Spring.
- React-admin and Expo use the same Spring authentication and authorization contract.
- Nginx terminates TLS and is the only public entry point for the two server processes.
- Uploaded files remain on the server filesystem and are served through the Spring media endpoint.

## Public and signed-in web routes

- Public: `/`, `/books`, `/rooms`, `/rooms/[slug]`, `/about`, `/terms`, `/privacy`
- Authentication: `/login`, `/signup`, `/password-reset`
- Signed in: `/me`

The public portal starts small on purpose. Reading CRUD stays mobile-first until the web product direction is validated; it can later be added behind the same Spring endpoints without changing the deployment boundary.

## Operations

```sh
sudo systemctl status booksome-api booksome-web
sudo systemctl restart booksome-api
sudo systemctl restart booksome-web
sudo journalctl -u booksome-api -n 100 --no-pager
sudo journalctl -u booksome-web -n 100 --no-pager
```

Production deployment templates for the web portal live in `web/deploy/`.
