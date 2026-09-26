# Oracle Cloud 북썸 서버 준비 상태

2026-09-26 기준 서버: `161.33.4.136`, Rocky Linux 9.8 ARM64, 약 11 GiB RAM / 149 GiB 루트 디스크. `rocky`는 비대화형 sudo가 가능하며 `syhan`은 SSH 접근과 `booksome` 그룹 권한을 갖는다.

## 설치 완료

- Java 21, Node.js 24.21.0 LTS, npm 11.19.0, Nginx 1.20.1, Certbot 3.1.0, Git, rsync, Postfix 3.5.25 등.
- MariaDB 11.4.13 및 `MariaDB-backup`. `127.0.0.1:3306`에서만 접속. `mariadb` 서비스 자동 시작.
- `booksome` DB, 별도의 앱·Flyway 계정, 새 무작위 비밀번호와 JWT 서명 키. 실제 환경 파일은 서버의 `/etc/booksome/`에 `0640 root:booksome`으로 보관하고, 기존 `/service/booksome` 경로에서는 링크로 접근한다. Rocky Linux의 systemd가 `/service` 아래 환경 파일을 직접 읽지 못해 표준 `/etc` 위치로 옮겼다.
- `/service/booksome`의 API·웹·미디어·로그 경로와 `booksome` 서비스 계정. API·웹 systemd 단위 파일 설치. 빌드용 홈과 npm 캐시는 웹 전용 디렉터리 아래에 둔다.
- 관리 콘솔 릴리스 경로 `/var/www/booksome-admin/releases`, SELinux의 Nginx 역방향 프록시 허용, cron 및 실행 중인 인증서 자동 갱신 타이머. ACME 웹루트 `/var/www/letsencrypt`에는 Nginx 읽기용 SELinux 레이블 `httpd_sys_content_t`를 설정했다. 갱신 성공 후 Nginx를 다시 읽는 후크도 설치했다.
- OCI VCN에서 외부 TCP 80·443을 허용했다. DNS의 네 도메인 모두 새 IP를 가리킨다. Let's Encrypt 인증서는 네 도메인을 포함하며 만료일은 2026-12-23이다. 정식 Nginx 설정에서 외부 HTTPS 신뢰 확인과 `certbot renew --dry-run --cert-name booksome.top`이 통과했다. 임시 503 설정은 제거했다.
- `server/deploy/verify-rocky9.sh`로 런타임 버전, 실제 앱·마이그레이터 DB 로그인, 디렉터리/환경 파일 권한, Nginx 설정 문법을 검증했다.
- 2026-08-22 백업에서 계정 1개, 도서·북룸·게시물·독서 기록 76건, 미디어 자산 참조 16건을 복원했다. 파일 17개를 옮겼고 DB에 연결된 16개 파일의 체크섬과 프로필 사진 경로를 확인했다. 복원 계정은 관리자 역할을 부여했으며, API 및 공개 웹 쿠키 로그인 후 서재 7권 조회를 검증했다. 백업에 비밀번호 해시가 없어 `/etc/booksome/restore-login-password`에 임시 비밀번호를 `0600 root:root`로 보관한다. 기존 비밀번호는 사용할 수 없다.
- Spring API, Next.js 공개 포털/독서 앱, React-admin 관리 콘솔을 배포했다. 외부 HTTPS에서 `booksome.top/`, `/login`, `/app/books/add`, `api.booksome.top/api/health`, `admin.booksome.top/` 모두 200이었고 실제 미디어 경로도 200이었다. API·웹·Nginx·MariaDB는 실행 중이고 부팅 시 자동 시작한다.
- 복원 후 DB의 추가 별도 백업은 이 Mac의 `data-backups/oracle-restored-2026-09-25.sql`에 저장했다. 원래의 8월 미디어 백업도 Mac에 보존했다. 서버 홈의 복원용 임시 전송 파일과 Mac 임시 압축본은 제거했다.

초기 설치 파일은 `/home/syhan/booksome-setup/`에 있다. 반복 실행해도 기존 DB 및 비밀값을 덮어쓰지 않는다.

## 메일 운영

- `BOOKSOME_MAIL_ENABLED=true`, `BOOKSOME_MAIL_FROM="북썸 BookSome <libre3155@gmail.com>"`이다. API는 `127.0.0.1:25` Postfix로 제출하고, Postfix는 `smtp.gmail.com:587`로 인증 및 인증서 검증 TLS를 사용해 중계한다. 외부 인바운드 SMTP 포트를 열 필요가 없다.
- 새 Gmail 계정으로 시험 발송한 뒤 공개 웹의 `/api/auth/password-reset/request`에 복원 계정의 이메일을 전달했다. HTTP 202, Gmail의 `250 2.0.0 OK`, 빈 Postfix 대기열을 확인했다. 발신 계정의 Google 앱 비밀번호는 root 전용 `/etc/postfix/sasl_passwd`와 `.db`에만 보관한다. 코드나 문서에는 기록하지 않는다.
- 첫 재설정 메일은 수신 계정의 스팸함에 도착했다. Gmail 원본에서 SPF·DKIM(`gmail.com`)·DMARC 모두 PASS를 확인했다. Gmail의 표시 사유는 기존 스팸과의 유사성이며 상세 분류 원인은 공개되지 않는다. 발신 표시 이름 누락을 수정했고 새 메일의 보낸편지함에서 `북썸 BookSome`을 확인했다. 기존 정상 메일 한 건은 수신 계정에서 스팸 해제해 받은편지함으로 옮겼다. 이 조치는 해당 수신 계정에 대한 오분류 수정이며 전체 사용자에게 정상 분류를 보장하지 않는다.
- 이전 `newsyhan@gmail.com` SMTP 인증 정보는 새 계정으로 교체했다. 더 이상 필요 없는 이전 Google 앱 비밀번호는 사용자 Google 계정에서 취소할 수 있다.
- Resend 전환 스크립트와 SMTP 예제를 제거했다. 기존 Resend DKIM 및 `send.mail.booksome.top` MX·SPF 3개를 DNS에서 삭제했다. 복원에 필요한 공개 레코드는 `docs/archives/2026-09-26-resend-dns.json`에 보관한다. Resend 계정 자체에는 변경하지 않았다.
- 직접 발송을 준비하며 추가한 `mail.booksome.top` A·SPF, `booksome2026._domainkey.mail.booksome.top` DKIM과 OpenDKIM 설정은 남아 있지만 현재 Gmail 발신 메일에는 사용되지 않는다. OCI 아웃바운드 25번 예외와 PTR 요청은 승인되지 않았으며 현재 메일 경로에 필요하지 않다.

## 남은 운영 작업

1. 복원 계정의 임시 비밀번호를 사용자 본인이 원하는 비밀번호로 교체한다. 이번 발송 시험에서는 사용자 비밀번호를 변경하지 않았다. 추가 수신 계정에서 발신 이름·인증·스팸 분류를 점검한다.
2. 카카오·국립중앙도서관 도서 검색 API 키, 관리자 운영 설정을 점검한다. 관리자 이메일은 복원 계정으로 지정했다.
3. Mac의 수동 오프사이트 백업과 별도로 서버 밖 저장소에 DB·업로드 미디어의 **자동** 백업과 복원 시험을 구성한다. DB 3306, 내부 API 8080, 웹 3000은 공개하지 않는다. 로컬 `data-backups/`는 Git에서 제외한다.
4. 폰 앱에서 새 임시 비밀번호로 실제 로그인과 화면을 확인한다. 백업 시각(2026-08-22) 이후의 서버 데이터는 이 백업에 포함되지 않는다.

기존 복원 비밀번호 파일은 서버에서만 확인한다. 사용자 컴퓨터의 터미널에서 `ssh -i /Users/sangyonghan/SSH/oracle-cloud/ssh-key-2026-09-24.key rocky@161.33.4.136 'sudo cat /etc/booksome/restore-login-password'`를 실행하면 된다. 채팅이나 Git에 비밀번호를 복사하지 않는다.

## 배포 명령 형식

자주 쓰는 복사·실행용 명령은 [배포 명령어](deploy-commands.md)에 정리했다.

`deploy.sh`는 `--host rocky@161.33.4.136 --identity /Users/sangyonghan/SSH/oracle-cloud/ssh-key-2026-09-24.key`로 새 서버를 지정한다. 예전 기본 호스트 `naverai`를 사용하지 않도록 `--host`를 명시한다. 정식 웹·API·관리자 HTTP 설정에도 Certbot 갱신용 ACME 경로를 유지한다. 현재 공개 웹 릴리스는 배포 스크립트의 초기 health 확인 시간 문제를 수동 복구한 뒤 전환했으며, 다음 릴리스에서는 보강된 `public_health` 재시도를 검증한다.
