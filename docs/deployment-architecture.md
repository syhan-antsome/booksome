# BookSome 배포 아키텍처

BookSome은 하나의 공통 API 규약을 사용하는 네 개의 애플리케이션으로 구성됩니다. 브라우저와 모바일 클라이언트는 MariaDB에 직접 연결하지 않습니다.

| 애플리케이션 | 저장소 경로 | 운영 진입점 | 실행 환경 | 역할 |
| --- | --- | --- | --- | --- |
| Spring API | `server/` | `https://api.booksome.top` | Java 21, Spring Boot, `booksome-api.service`, `127.0.0.1:8080` | 인증·인가, 도메인 규칙, AI 기능, 파일 업로드, 외부 도서 API 연동, MariaDB 접근 |
| 운영 관리 콘솔 | `admin/` | `https://admin.booksome.top` | Nginx에서 제공하는 React-admin 정적 빌드 | 관리자 전용 콘텐츠 관리와 서비스 운영 |
| 공개 웹 포털 | `web/` | `https://booksome.top` | Nginx 뒤에서 실행되는 Next.js Node 서버, `booksome-web.service`, `127.0.0.1:3000` | 공개 콘텐츠 탐색과 SEO, 웹 회원가입·로그인, 개인 웹 서비스 진입점 |
| 사용자 모바일 앱 | 저장소 루트 (`app/`, `src/`) | Expo/EAS 빌드 | Expo React Native | 개인 독서 기록의 핵심 사용자 경험과 모바일 커뮤니티 기능 |

> `app/`이 Expo Router의 라우트 디렉터리이므로 Expo 앱은 저장소 루트에 유지합니다. 앱을 다른 폴더로 옮기는 작업은 별도의 마이그레이션이 필요하며, 현재 사용자에게 제공하는 실질적인 이점은 없습니다.

## 요청 처리 경계

```text
브라우저 ── booksome.top ────── Nginx ── Next.js :3000 ──┐
브라우저 ── admin.booksome.top ─ Nginx 정적 파일 ─────────┼── Spring API :8080 ── MariaDB :3306
모바일 앱 ───────────────────────────────────────────────┘
```

- MariaDB는 `127.0.0.1:3306`에서만 연결을 받습니다.
- 데이터베이스 인증 정보를 사용할 수 있는 애플리케이션은 Spring Boot뿐입니다.
- Next.js는 웹 액세스 토큰과 리프레시 토큰을 안전한 HTTP-only 쿠키에 보관하고, 인증된 요청을 Spring API로 전달합니다.
- React-admin과 Expo는 동일한 Spring 인증·인가 규약을 사용합니다.
- Nginx가 TLS 연결을 종료하며, 두 서버 프로세스에 접근할 수 있는 유일한 공개 진입점 역할을 합니다.
- 업로드된 파일은 서버 파일시스템에 보관하며 Spring 미디어 엔드포인트를 통해 제공합니다.

## 공개 및 로그인 사용자용 웹 경로

- 공개 경로: `/`, `/books`, `/rooms`, `/rooms/[slug]`, `/about`, `/terms`, `/privacy`
- 인증 경로: `/login`, `/signup`, `/password-reset`
- 로그인 사용자 경로: `/me`

공개 웹 포털의 초기 범위는 의도적으로 작게 유지합니다. 웹 제품의 방향성이 검증될 때까지 독서 기록의 생성·조회·수정·삭제 기능은 모바일 중심으로 제공합니다. 이후에도 현재 배포 경계를 변경하지 않고 동일한 Spring 엔드포인트를 이용해 웹 기능을 추가할 수 있습니다.

## 운영 명령어

```sh
sudo systemctl status booksome-api booksome-web
sudo systemctl restart booksome-api
sudo systemctl restart booksome-web
sudo journalctl -u booksome-api -n 100 --no-pager
sudo journalctl -u booksome-web -n 100 --no-pager
```

웹 포털 운영 배포용 템플릿은 `web/deploy/`에 있습니다.
