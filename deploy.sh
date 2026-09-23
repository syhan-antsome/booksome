#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_HOST="${BOOKSOME_DEPLOY_HOST:-naverai}"
KEEP_RELEASES="${BOOKSOME_KEEP_RELEASES:-5}"
TARGET=""
DRY_RUN=false
SKIP_BUILD=false
ALLOW_DIRTY=false
ASSUME_YES=false
TMP_DIR=""
SUDO_MODE=""
NEEDS_SETUP=false

usage() {
  cat <<'EOF'
BookSome 배포

사용법:
  ./deploy.sh <setup|api|web|admin|all> [옵션]

옵션:
  --host <ssh-host>   SSH 호스트 또는 ~/.ssh/config 별칭 (기본값: naverai)
  --keep <개수>       서버에 보관할 릴리스 수 (기본값: 5)
  --skip-build        기존 로컬 빌드 결과를 사용 (api/admin만 지원)
  --allow-dirty       커밋하지 않은 변경도 배포
  --dry-run           빌드·전송·재시작 없이 실행 계획만 표시
  --yes               배포 전 확인 질문 생략
  -h, --help          도움말

예시:
  ./deploy.sh web
  ./deploy.sh setup
  ./deploy.sh api --host naverai
  ./deploy.sh all --allow-dirty

필요 조건:
  - setup은 기존 API, Nginx/인증서, booksome 시스템 사용자를 전제로 웹/관리자를 준비합니다.
  - api/web/admin/all은 해당 서비스의 최초 설정이 완료되어 있어야 합니다.
  - SSH 사용자는 sudo 권한이 있어야 합니다. NOPASSWD가 없으면 터미널에서 비밀번호를 요청합니다.
  - 웹은 서버에서 빌드하여 서버 운영체제에 맞는 Next.js 네이티브 모듈을 만듭니다.
EOF
}

log() { printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
die() { printf '오류: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "필요한 명령을 찾지 못했습니다: $1"; }

while (($#)); do
  case "$1" in
    setup|api|web|admin|all)
      [[ -z "$TARGET" ]] || die "배포 대상은 하나만 선택해주세요."
      TARGET="$1"
      shift
      ;;
    --host)
      (($# >= 2)) || die "--host 뒤에 SSH 호스트가 필요합니다."
      DEPLOY_HOST="$2"
      shift 2
      ;;
    --keep)
      (($# >= 2)) || die "--keep 뒤에 보관 개수가 필요합니다."
      KEEP_RELEASES="$2"
      shift 2
      ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --allow-dirty) ALLOW_DIRTY=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --yes) ASSUME_YES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "알 수 없는 인수입니다: $1" ;;
  esac
done

[[ -n "$TARGET" ]] || { usage; exit 2; }
[[ "$KEEP_RELEASES" =~ ^[1-9][0-9]*$ ]] || die "--keep은 1 이상의 정수여야 합니다."
[[ "$DEPLOY_HOST" =~ ^[A-Za-z0-9._@:-]+$ ]] || die "SSH 호스트 형식이 올바르지 않습니다."
if [[ "$SKIP_BUILD" == true && ("$TARGET" == web || "$TARGET" == all) ]]; then
  die "웹은 서버 운영체제에서 빌드하므로 --skip-build를 사용할 수 없습니다."
fi

cd "$ROOT_DIR"
need git
need ssh
need scp
need tar
need npm

GIT_SHA="$(git rev-parse --short HEAD)"
DIRTY_SUFFIX=""
if [[ -n "$(git status --porcelain)" ]]; then
  [[ "$ALLOW_DIRTY" == true ]] || die "커밋하지 않은 변경이 있습니다. 커밋하거나 --allow-dirty를 사용해주세요."
  DIRTY_SUFFIX="-dirty"
fi
RELEASE_ID="$(date -u '+%Y%m%dT%H%M%SZ')-${GIT_SHA}${DIRTY_SUFFIX}"

selected() { [[ "$TARGET" == all || "$TARGET" == "$1" ]]; }
remote_temp() { ssh "$DEPLOY_HOST" "mktemp /tmp/booksome-$1.XXXXXX.tgz"; }
remote_script_temp() { ssh "$DEPLOY_HOST" "mktemp /tmp/booksome-$1.XXXXXX.sh"; }
remote_config_temp() { ssh "$DEPLOY_HOST" "mktemp /tmp/booksome-$1.XXXXXX.conf"; }

run_remote_root() {
  local remote_script="$1" command
  shift
  printf -v command '%q ' bash "$remote_script" "$@"
  case "$SUDO_MODE" in
    root) ssh "$DEPLOY_HOST" "$command" ;;
    noninteractive) ssh "$DEPLOY_HOST" "sudo -n $command" ;;
    interactive)
      [[ -t 0 && -t 1 ]] || die "sudo 비밀번호 입력이 필요합니다. 터미널에서 직접 배포 명령을 실행해주세요."
      ssh -tt "$DEPLOY_HOST" "sudo $command"
      ;;
    *) die "원격 sudo 방식을 결정하지 못했습니다." ;;
  esac
}

cleanup_remote_upload() {
  local command
  printf -v command 'rm -f -- %q %q' "$1" "$2"
  ssh "$DEPLOY_HOST" "$command" >/dev/null 2>&1 || true
}

log "배포 계획"
printf '  대상: %s\n  호스트: %s\n  릴리스: %s\n  보관: %s개\n' "$TARGET" "$DEPLOY_HOST" "$RELEASE_ID" "$KEEP_RELEASES"

if [[ "$DRY_RUN" == true ]]; then
  [[ "$TARGET" == setup ]] && printf '  Setup: Node.js 20 설치 → 웹 service/env/디렉터리 → 관리자 디렉터리/Nginx 준비\n'
  [[ "$TARGET" == all ]] && printf '  Setup: 서버 준비 상태 확인 후 필요한 경우 자동 실행\n'
  selected api && printf '  API: 로컬 테스트/JAR → /service/booksome/releases/api/%s → booksome-api 재시작/헬스 체크\n' "$RELEASE_ID"
  selected web && printf '  Web: 소스 전송 → 서버 npm ci/build → /service/booksome/web/releases/%s → booksome-web 재시작/헬스 체크\n' "$RELEASE_ID"
  selected admin && printf '  Admin: 로컬 빌드 → /var/www/booksome-admin/releases/%s → Nginx 검사/헬스 체크\n' "$RELEASE_ID"
  exit 0
fi

if [[ "$ASSUME_YES" != true ]]; then
  read -r -p "${DEPLOY_HOST}에 ${TARGET}을(를) 배포할까요? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "취소했습니다."; exit 0; }
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/booksome-deploy.XXXXXX")"
cleanup_local() { [[ -z "$TMP_DIR" ]] || rm -rf -- "$TMP_DIR"; }
trap cleanup_local EXIT

log "서버 연결과 권한 확인"
if ! ssh "$DEPLOY_HOST" 'set -eu; command -v tar >/dev/null; command -v curl >/dev/null; command -v systemctl >/dev/null'; then
  die "서버에 연결할 수 없거나 tar/curl/systemctl이 없습니다: $DEPLOY_HOST"
fi
SUDO_MODE="$(ssh "$DEPLOY_HOST" 'if [ "$(id -u)" -eq 0 ]; then echo root; elif sudo -n true >/dev/null 2>&1; then echo noninteractive; else echo interactive; fi')"
if [[ "$SUDO_MODE" == interactive ]]; then
  log "서버 변경 시 syhan 계정의 sudo 비밀번호를 터미널에서 요청합니다."
fi
if selected api && ! ssh "$DEPLOY_HOST" 'test -d /service/booksome/app && test -f /service/booksome/app/booksome.env && systemctl cat booksome-api >/dev/null'; then
  die "API 배포 경로나 환경 파일, systemd 서비스가 준비되지 않았습니다."
fi
if selected web && ! ssh "$DEPLOY_HOST" 'command -v node >/dev/null && command -v npm >/dev/null && test -d /service/booksome/web && test -f /service/booksome/web/booksome-web.env && systemctl cat booksome-web >/dev/null'; then
  if [[ "$TARGET" == all ]]; then
    NEEDS_SETUP=true
    log "웹 초기 설정이 없어 all 배포 전에 setup을 자동 실행합니다."
  else
    die "웹 초기 설정이 필요합니다. 먼저 ./deploy.sh setup을 실행해주세요."
  fi
fi
if selected admin && ! ssh "$DEPLOY_HOST" 'command -v nginx >/dev/null && test -d /var/www/booksome-admin'; then
  if [[ "$TARGET" == all ]]; then
    NEEDS_SETUP=true
    log "관리자 초기 설정이 없어 all 배포 전에 setup을 자동 실행합니다."
  else
    die "관리자 초기 설정이 필요합니다. 먼저 ./deploy.sh setup을 실행해주세요."
  fi
fi

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]] && "$JAVA_HOME/bin/java" -version 2>&1 | head -1 | grep -qE '"21([.]|\")'; then
    printf '%s' "$JAVA_HOME"
    return
  fi
  if [[ "$(uname -s)" == Darwin ]] && /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
    /usr/libexec/java_home -v 21
    return
  fi
  local homebrew_java="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  [[ -x "$homebrew_java/bin/java" ]] && { printf '%s' "$homebrew_java"; return; }
  die "Java 21을 찾지 못했습니다. JAVA_HOME을 Java 21로 지정해주세요."
}

read_naver_maps_client_id() {
  local value="${EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID:-}"
  if [[ -z "$value" && -f .env ]]; then
    value="$(awk -F= '$1 == "EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID" {sub(/^[^=]*=/, ""); print; exit}' .env)"
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
  fi
  [[ "$value" =~ ^[A-Za-z0-9_-]+$ ]] || die "EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID가 .env 또는 환경변수에 필요합니다."
  printf '%s' "$value"
}

deploy_setup() {
  local archive upload remote_script remote_script_local env_file naver_id
  archive="$TMP_DIR/booksome-setup-${RELEASE_ID}.tgz"
  remote_script_local="$TMP_DIR/setup-remote.sh"
  env_file="$TMP_DIR/booksome-web.env"
  naver_id="$(read_naver_maps_client_id)"

  printf '%s\n' \
    'BOOKSOME_API_INTERNAL_URL=http://127.0.0.1:8080' \
    'NEXT_PUBLIC_API_BASE_URL=https://api.booksome.top' \
    'EXPO_PUBLIC_API_BASE_URL=https://api.booksome.top' \
    "EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID=$naver_id" >"$env_file"
  tar -czf "$archive" \
    -C web/deploy booksome-web.service \
    -C "$TMP_DIR" booksome-web.env \
    -C "$ROOT_DIR/admin/deploy" nginx-admin.conf.example
  upload="$(remote_temp setup)"
  remote_script="$(remote_script_temp setup)"

  cat >"$remote_script_local" <<'REMOTE_SETUP'
set -Eeuo pipefail
upload="$1"; remote_script="$2"
node_version=20.19.6
work="$(mktemp -d /tmp/booksome-node.XXXXXX)"
cleanup() { rm -rf -- "$work"; rm -f -- "$upload" "$remote_script"; }
trap cleanup EXIT

install_node() {
  if command -v node >/dev/null 2>&1 && node -e 'const [major,minor]=process.versions.node.split(".").map(Number); process.exit(major>20 || (major===20 && minor>=9) ? 0 : 1)'; then
    return
  fi
  command -v sha256sum >/dev/null
  case "$(uname -m)" in
    x86_64) node_arch=x64 ;;
    aarch64|arm64) node_arch=arm64 ;;
    *) echo "지원하지 않는 서버 CPU입니다: $(uname -m)" >&2; exit 1 ;;
  esac
  file="node-v${node_version}-linux-${node_arch}.tar.xz"
  base="https://nodejs.org/dist/v${node_version}"
  cd "$work"
  curl -fsSLO "$base/$file"
  curl -fsSLO "$base/SHASUMS256.txt"
  grep "  $file\$" SHASUMS256.txt | sha256sum -c -
  mkdir -p /opt
  rm -rf -- "/opt/node-v${node_version}-linux-${node_arch}"
  tar -xJf "$file" -C /opt
  ln -sfn "/opt/node-v${node_version}-linux-${node_arch}" /opt/nodejs
  mkdir -p /usr/local/bin
  ln -sfn /opt/nodejs/bin/node /usr/local/bin/node
  ln -sfn /opt/nodejs/bin/npm /usr/local/bin/npm
  ln -sfn /opt/nodejs/bin/npx /usr/local/bin/npx
}

id booksome >/dev/null 2>&1 || { echo "booksome 시스템 사용자가 없습니다." >&2; exit 1; }
install_node
mkdir -p /service/booksome/web/builds /service/booksome/web/releases /service/booksome/web/nginx-backups
chown -R booksome:booksome /service/booksome/web
chmod 2750 /service/booksome/web /service/booksome/web/builds /service/booksome/web/releases /service/booksome/web/nginx-backups
mkdir -p "$work/assets"
tar -xzf "$upload" -C "$work/assets"
install -o root -g booksome -m 0640 "$work/assets/booksome-web.env" /service/booksome/web/booksome-web.env
install -o root -g root -m 0644 "$work/assets/booksome-web.service" /etc/systemd/system/booksome-web.service
mkdir -p /var/www/booksome-admin/releases
chmod 0755 /var/www/booksome-admin /var/www/booksome-admin/releases
if [[ ! -f /etc/nginx/conf.d/booksome-admin.conf ]]; then
  install -o root -g root -m 0644 "$work/assets/nginx-admin.conf.example" /etc/nginx/conf.d/booksome-admin.conf
fi
systemctl daemon-reload
systemctl enable booksome-web.service
nginx -t
systemctl reload nginx
echo "NODE=$(node --version)"
echo "NPM=$(npm --version)"
echo "SETUP_COMPLETE=true"
REMOTE_SETUP

  log "서버 최초 설정 파일 전송"
  scp -q "$archive" "$DEPLOY_HOST:$upload"
  scp -q "$remote_script_local" "$DEPLOY_HOST:$remote_script"
  if ! run_remote_root "$remote_script" "$upload" "$remote_script"; then
    cleanup_remote_upload "$upload" "$remote_script"
    return 1
  fi
}

deploy_api() {
  local jar archive upload java_home remote_script remote_script_local
  archive="$TMP_DIR/booksome-api-${RELEASE_ID}.tgz"
  remote_script_local="$TMP_DIR/api-remote.sh"

  if [[ "$SKIP_BUILD" != true ]]; then
    log "API 테스트와 JAR 빌드"
    java_home="$(resolve_java_home)"
    (cd server && env JAVA_HOME="$java_home" PATH="$java_home/bin:$PATH" ./gradlew test bootJar)
  fi
  jar="server/build/libs/booksome-api.jar"
  [[ -f "$jar" ]] || die "API JAR가 없습니다: $jar"
  tar -czf "$archive" -C "$(dirname "$jar")" "$(basename "$jar")"
  upload="$(remote_temp api)"
  remote_script="$(remote_script_temp api)"

  log "API 전송과 원자적 교체"
  cat >"$remote_script_local" <<'REMOTE_API'
set -Eeuo pipefail
release_id="$1"; keep="$2"; upload="$3"; remote_script="$4"
app_dir=/service/booksome/app
releases=/service/booksome/releases/api
service=booksome-api

root() { if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo -n "$@"; fi; }
health() { for _ in {1..20}; do curl -fsS --max-time 3 http://127.0.0.1:8080/api/health >/dev/null && return 0; sleep 2; done; return 1; }
cleanup() { root rm -f -- "$upload" "$remote_script"; }
trap cleanup EXIT

[[ ! -e "$releases/$release_id" ]] || { echo "이미 존재하는 API 릴리스입니다: $release_id" >&2; exit 1; }
root mkdir -p "$app_dir" "$releases/$release_id"
root tar -xzf "$upload" -C "$releases/$release_id"
root chown -R booksome:booksome "$releases/$release_id"
root chmod 0640 "$releases/$release_id/booksome-api.jar"

previous=""
if [[ -e "$app_dir/booksome-api.jar" ]]; then
  if [[ -L "$app_dir/booksome-api.jar" ]]; then
    previous="$(readlink -f "$app_dir/booksome-api.jar")"
  else
    legacy="$releases/legacy-$(date -u '+%Y%m%dT%H%M%SZ')"
    root mkdir -p "$legacy"
    root mv "$app_dir/booksome-api.jar" "$legacy/booksome-api.jar"
    previous="$legacy/booksome-api.jar"
  fi
fi

root ln -s "$releases/$release_id/booksome-api.jar" "$app_dir/.booksome-api.jar.$release_id"
root mv -Tf "$app_dir/.booksome-api.jar.$release_id" "$app_dir/booksome-api.jar"
if ! root systemctl restart "$service" || ! health; then
  echo "API 헬스 체크 실패. 이전 JAR로 복구합니다." >&2
  if [[ -n "$previous" && -f "$previous" ]]; then
    root ln -s "$previous" "$app_dir/.booksome-api.jar.rollback"
    root mv -Tf "$app_dir/.booksome-api.jar.rollback" "$app_dir/booksome-api.jar"
    root systemctl restart "$service"
    health || true
  fi
  exit 1
fi

current="$(readlink -f "$app_dir/booksome-api.jar")"
mapfile -t dirs < <(find "$releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for ((i=keep; i<${#dirs[@]}; i++)); do
  [[ "$current" == "${dirs[$i]}"/* ]] || root rm -rf -- "${dirs[$i]}"
done
root systemctl --no-pager --lines=5 status "$service"
echo "API_DEPLOYED=$release_id"
REMOTE_API
  scp -q "$archive" "$DEPLOY_HOST:$upload"
  scp -q "$remote_script_local" "$DEPLOY_HOST:$remote_script"
  if ! run_remote_root "$remote_script" "$RELEASE_ID" "$KEEP_RELEASES" "$upload" "$remote_script"; then
    cleanup_remote_upload "$upload" "$remote_script"
    return 1
  fi
}

package_web_source() {
  local archive="$1"
  tar -czf "$archive" \
    --exclude='web/public/app' \
    --exclude='web/node_modules' \
    --exclude='web/.next' \
    --exclude='node_modules' \
    --exclude='.expo' \
    package.json package-lock.json app.json app.config.js assets.d.ts tsconfig.json \
    app src assets public \
    web/package.json web/package-lock.json web/next.config.ts web/tsconfig.json \
    web/next-env.d.ts web/eslint.config.mjs web/src web/public
}

deploy_web() {
  local archive upload remote_script remote_script_local nginx_upload
  archive="$TMP_DIR/booksome-web-source-${RELEASE_ID}.tgz"
  remote_script_local="$TMP_DIR/web-remote.sh"
  log "웹 소스 패키징"
  package_web_source "$archive"
  upload="$(remote_temp web)"
  remote_script="$(remote_script_temp web)"
  nginx_upload="$(remote_config_temp nginx)"

  log "웹 소스 전송, 서버 빌드와 원자적 교체"
  cat >"$remote_script_local" <<'REMOTE_WEB'
set -Eeuo pipefail
release_id="$1"; keep="$2"; upload="$3"; remote_script="$4"; nginx_upload="$5"
web_base=/service/booksome/web
build_dir="$web_base/builds/$release_id"
release_dir="$web_base/releases/$release_id"
current_link="$web_base/current"
env_file="$web_base/booksome-web.env"
service=booksome-web

root() { if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo -n "$@"; fi; }
as_booksome() {
  if [[ "$(id -u)" -eq "$(id -u booksome)" ]]; then "$@"
  elif [[ "$(id -u)" -eq 0 ]]; then runuser -u booksome -- "$@"
  else sudo -n -u booksome -- "$@"
  fi
}
health() {
  for _ in {1..30}; do
    curl -fsS --max-time 4 http://127.0.0.1:3000/ >/dev/null &&
      curl -fsS --max-time 4 http://127.0.0.1:3000/app/books/add >/dev/null && return 0
    sleep 2
  done
  return 1
}
cleanup() { root rm -f -- "$upload" "$remote_script" "$nginx_upload"; root rm -rf -- "$build_dir"; }
trap cleanup EXIT

[[ -f "$env_file" ]] || { echo "웹 환경 파일이 없습니다: $env_file" >&2; exit 1; }
command -v node >/dev/null
command -v npm >/dev/null
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
((node_major >= 20)) || { echo "Node.js 20 이상이 필요합니다." >&2; exit 1; }
as_booksome test -r "$env_file" || {
  echo "booksome 사용자가 웹 환경 파일을 읽을 수 없습니다. root:booksome, 0640 권한을 권장합니다: $env_file" >&2
  exit 1
}

[[ ! -e "$release_dir" && ! -e "$build_dir" ]] || { echo "이미 존재하는 웹 릴리스입니다: $release_id" >&2; exit 1; }
root mkdir -p "$build_dir" "$web_base/releases" "$web_base/builds"
root tar -xzf "$upload" -C "$build_dir"
root chown -R booksome:booksome "$build_dir"
as_booksome bash -c 'set -a; source "$1"; set +a; for key in BOOKSOME_API_INTERNAL_URL NEXT_PUBLIC_API_BASE_URL EXPO_PUBLIC_API_BASE_URL EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID; do [[ -n "${!key:-}" ]] || { echo "필수 웹 환경값이 없습니다: $key" >&2; exit 1; }; done; cd "$2"; npm ci --no-audit --no-fund; npm --prefix web ci --no-audit --no-fund; cd web; ./node_modules/.bin/next typegen; npm run typecheck; npm run lint; npm run build' _ "$env_file" "$build_dir"

root mkdir -p "$release_dir/.next"
root cp -a "$build_dir/web/.next/standalone/." "$release_dir/"
root cp -a "$build_dir/web/.next/static" "$release_dir/.next/static"
root cp -a "$build_dir/web/public" "$release_dir/public"
[[ -f "$release_dir/server.js" && -f "$release_dir/public/app/index.html" ]] || { echo "웹 배포 산출물이 불완전합니다." >&2; exit 1; }
root chown -R booksome:booksome "$release_dir"

previous=""
if [[ -e "$current_link" ]]; then
  if [[ -L "$current_link" ]]; then
    previous="$(readlink -f "$current_link")"
  else
    legacy="$web_base/releases/legacy-$(date -u '+%Y%m%dT%H%M%SZ')"
    root mv "$current_link" "$legacy"
    previous="$legacy"
  fi
fi
root ln -s "$release_dir" "$web_base/.current.$release_id"
root mv -Tf "$web_base/.current.$release_id" "$current_link"

rollback_release() {
  if [[ -n "$previous" && -d "$previous" ]]; then
    root ln -s "$previous" "$web_base/.current.rollback"
    root mv -Tf "$web_base/.current.rollback" "$current_link"
    root systemctl restart "$service"
    health || true
  else
    root rm -f -- "$current_link"
    root systemctl stop "$service" || true
  fi
}

if ! root systemctl restart "$service" || ! health; then
  echo "웹 헬스 체크 실패. 이전 릴리스로 복구합니다." >&2
  rollback_release
  exit 1
fi

nginx_active=/etc/nginx/conf.d/booksome.conf
nginx_backup="$web_base/nginx-backups/booksome.conf.$release_id"
root mkdir -p "$web_base/nginx-backups"
[[ -f "$nginx_active" ]] && root cp -a "$nginx_active" "$nginx_backup"
root install -o root -g root -m 0644 "$nginx_upload" "$nginx_active"
if ! root nginx -t || ! root systemctl reload nginx || ! curl -fsS --max-time 10 --resolve booksome.top:443:127.0.0.1 https://booksome.top/app/books/add >/dev/null; then
  echo "Nginx 전환 검사 실패. 이전 설정과 웹 릴리스로 복구합니다." >&2
  [[ -f "$nginx_backup" ]] && root cp -a "$nginx_backup" "$nginx_active"
  root nginx -t && root systemctl reload nginx || true
  rollback_release
  exit 1
fi

current="$(readlink -f "$current_link")"
mapfile -t dirs < <(find "$web_base/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for ((i=keep; i<${#dirs[@]}; i++)); do [[ "${dirs[$i]}" == "$current" ]] || root rm -rf -- "${dirs[$i]}"; done
root systemctl --no-pager --lines=5 status "$service"
echo "WEB_DEPLOYED=$release_id"
REMOTE_WEB
  scp -q "$archive" "$DEPLOY_HOST:$upload"
  scp -q "$remote_script_local" "$DEPLOY_HOST:$remote_script"
  scp -q web/deploy/nginx-booksome.conf "$DEPLOY_HOST:$nginx_upload"
  if ! run_remote_root "$remote_script" "$RELEASE_ID" "$KEEP_RELEASES" "$upload" "$remote_script" "$nginx_upload"; then
    cleanup_remote_upload "$upload" "$remote_script"
    ssh "$DEPLOY_HOST" "rm -f -- '$nginx_upload'" >/dev/null 2>&1 || true
    return 1
  fi
}

deploy_admin() {
  local archive upload remote_script remote_script_local
  archive="$TMP_DIR/booksome-admin-${RELEASE_ID}.tgz"
  remote_script_local="$TMP_DIR/admin-remote.sh"
  if [[ "$SKIP_BUILD" != true ]]; then
    log "관리자 타입 검사와 정적 빌드"
    npm --prefix admin run typecheck
    env VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.booksome.top}" npm --prefix admin run build
  fi
  [[ -f admin/dist/index.html ]] || die "관리자 빌드 결과가 없습니다: admin/dist/index.html"
  tar -czf "$archive" -C admin/dist .
  upload="$(remote_temp admin)"
  remote_script="$(remote_script_temp admin)"

  log "관리자 전송과 원자적 교체"
  cat >"$remote_script_local" <<'REMOTE_ADMIN'
set -Eeuo pipefail
release_id="$1"; keep="$2"; upload="$3"; remote_script="$4"
base=/var/www/booksome-admin
release="$base/releases/$release_id"
current="$base/current"
root() { if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo -n "$@"; fi; }
cleanup() { root rm -f -- "$upload" "$remote_script"; }
trap cleanup EXIT

[[ ! -e "$release" ]] || { echo "이미 존재하는 관리자 릴리스입니다: $release_id" >&2; exit 1; }
root mkdir -p "$release"
root tar -xzf "$upload" -C "$release"
[[ -f "$release/index.html" ]] || { echo "관리자 index.html이 없습니다." >&2; exit 1; }
if [[ -e "$current" ]]; then
  web_owner="$(stat -Lc '%U:%G' "$current")"
elif id www-data >/dev/null 2>&1; then
  web_owner=www-data:www-data
elif id nginx >/dev/null 2>&1; then
  web_owner=nginx:nginx
else
  web_owner=root:root
fi
root chown -R "$web_owner" "$release"

previous=""
if [[ -e "$current" ]]; then
  if [[ -L "$current" ]]; then previous="$(readlink -f "$current")"
  else previous="$base/releases/legacy-$(date -u '+%Y%m%dT%H%M%SZ')"; root mv "$current" "$previous"; fi
fi
root ln -s "$release" "$base/.current.$release_id"
root mv -Tf "$base/.current.$release_id" "$current"

if ! root nginx -t || ! curl -fsS --max-time 10 --resolve admin.booksome.top:443:127.0.0.1 https://admin.booksome.top/ >/dev/null; then
  echo "관리자 헬스 체크 실패. 이전 릴리스로 복구합니다." >&2
  if [[ -n "$previous" && -d "$previous" ]]; then
    root ln -s "$previous" "$base/.current.rollback"
    root mv -Tf "$base/.current.rollback" "$current"
  fi
  exit 1
fi

active="$(readlink -f "$current")"
mapfile -t dirs < <(find "$base/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for ((i=keep; i<${#dirs[@]}; i++)); do [[ "${dirs[$i]}" == "$active" ]] || root rm -rf -- "${dirs[$i]}"; done
echo "ADMIN_DEPLOYED=$release_id"
REMOTE_ADMIN
  scp -q "$archive" "$DEPLOY_HOST:$upload"
  scp -q "$remote_script_local" "$DEPLOY_HOST:$remote_script"
  if ! run_remote_root "$remote_script" "$RELEASE_ID" "$KEEP_RELEASES" "$upload" "$remote_script"; then
    cleanup_remote_upload "$upload" "$remote_script"
    return 1
  fi
}

if [[ "$TARGET" == setup || "$NEEDS_SETUP" == true ]]; then
  deploy_setup
fi
selected api && deploy_api
selected web && deploy_web
selected admin && deploy_admin

log "배포 완료"
printf '릴리스 %s가 %s에 배포되었습니다.\n' "$RELEASE_ID" "$DEPLOY_HOST"
