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

## Deployment assets

The `deploy/` directory contains templates for:

- the `systemd` service
- the server environment file
- the Nginx reverse-proxy location

Production paths use `/service/booksome`, matching the server layout.
