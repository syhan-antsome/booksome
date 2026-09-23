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

After the one-time service and environment setup, run `./deploy.sh api` from the repository root. The script executes tests and `bootJar`, uploads a versioned JAR, switches `/service/booksome/app/booksome-api.jar`, restarts the service, verifies `/api/health`, and restores the preceding JAR on failure. Flyway migrations themselves are not rolled back.

## Transactional email

Password reset and email verification use 8-digit codes that expire after 15 minutes. Configure a verified SMTP sender before enabling mail:

```text
BOOKSOME_MAIL_ENABLED=true
BOOKSOME_MAIL_FROM=no-reply@mail.booksome.top
BOOKSOME_SMTP_HOST=smtp.resend.com
BOOKSOME_SMTP_PORT=587
BOOKSOME_SMTP_USERNAME=resend
BOOKSOME_SMTP_PASSWORD=<Resend API key>
BOOKSOME_SMTP_AUTH=true
BOOKSOME_SMTP_STARTTLS=true
```

Keep the SMTP password only in the server environment file. Never commit it.
