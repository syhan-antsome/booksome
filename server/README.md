# BookSome API

Spring Boot backend for the BookSome Expo application.

## Stack

- Java 21
- Spring Boot 3.5
- Spring Security
- Spring Data JPA
- Flyway
- MariaDB 11.4

## Local verification

Use the project Gradle Wrapper with Java 21:

```sh
./gradlew test
./gradlew bootJar
```

The application requires database credentials at runtime. Copy `.env.example` into your preferred secret-management flow; do not commit a populated `.env` file.

## Runtime contract

- Bind address: `127.0.0.1`
- Port: `8080`
- Public health endpoint: `GET /api/health`
- Actuator health endpoint: `GET /actuator/health`
- Sign up: `POST /api/auth/sign-up`
- Sign in: `POST /api/auth/sign-in`
- Rotate tokens: `POST /api/auth/refresh`
- Sign out: `POST /api/auth/sign-out`
- Current session: `GET /api/auth/me`
- Current profile: `GET|PATCH /api/profiles/me`
- Upload image: `POST /api/media/images`
- Read image: `GET /api/media/{kind}/{ownerId}/{fileName}`
- Database schema changes: Flyway only
- Hibernate schema mode: `validate`

## Book lookup

The public web portal and mobile app both request title and ISBN lookups from this Spring API. It checks cached editions and then calls Kakao Book Search with `BOOKSOME_KAKAO_REST_API_KEY`. If Kakao has no result, it can call the National Library with `BOOKSOME_NL_SEOJI_CERT_KEY`. Set the keys in the API service's environment file at `/etc/booksome/booksome.env`; the web environment file and mobile build do not hold provider credentials. Restart `booksome-api.service` after changing its environment file. The Kakao client adds the `KakaoAK` header prefix itself, so enter only the REST API key value.

## Operations console

The React-admin console in `../admin` uses the same authentication endpoints and calls only `/api/admin/**` APIs. Administrator access is enforced by the `ADMIN` JWT role.

Configure the initial administrator account and admin origin before deployment:

```text
BOOKSOME_ADMIN_EMAILS=your-admin-account@example.com
BOOKSOME_CORS_ALLOWED_ORIGINS=https://booksome.top,https://www.booksome.top,https://admin.booksome.top
```

After the account exists, restart the API once to apply the configured administrator role. The user must sign in again so the new access token contains `ADMIN`.

## Deployment assets

The `deploy/` directory contains templates for:

- the `systemd` service
- the server environment file
- the Nginx reverse-proxy location

Production paths use `/service/booksome`, matching the server layout.

Set the current OCI host and SSH key using the [deployment command reference](../docs/deploy-commands.md). After the one-time service and environment setup, run `./deploy.sh api` from the repository root. The script executes tests and `bootJar`, uploads a versioned JAR, switches `/service/booksome/app/booksome-api.jar`, restarts the service, verifies `/api/health`, and restores the preceding JAR on failure. Flyway migrations themselves are not rolled back.

## Transactional email

Password reset and email verification use 8-digit codes that expire after 15 minutes. The Oracle deployment submits mail to localhost-only Postfix, which relays to Gmail on port 587 with authenticated, certificate-verified TLS. Configure and test the relay before enabling app mail:

```text
BOOKSOME_MAIL_ENABLED=true
BOOKSOME_MAIL_FROM="북썸 BookSome <libre3155@gmail.com>"
BOOKSOME_SMTP_HOST=127.0.0.1
BOOKSOME_SMTP_PORT=25
BOOKSOME_SMTP_USERNAME=
BOOKSOME_SMTP_PASSWORD=
BOOKSOME_SMTP_AUTH=false
BOOKSOME_SMTP_STARTTLS=false
```

The lack of app-side SMTP authentication/TLS applies only to the loopback connection. Never expose this Postfix listener publicly. The Gmail app password is stored in root-only `/etc/postfix/sasl_passwd` and its database, not in the app environment or Git. Use `deploy/configure-postfix-gmail-test.sh` only while app mail is disabled, and use the same Gmail address for SMTP login and the sender. After changing the Google account password, recreate its app password and update Postfix before resuming mail.
