#!/usr/bin/env bash
set -Eeuo pipefail

# One-time BookSome runtime preparation for a new Rocky Linux 9 aarch64 VM.
# Run as root after reviewing this file. It does not deploy the application.
[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
source /etc/os-release
[[ $ID == rocky && ${VERSION_ID%%.*} == 9 && $(uname -m) == aarch64 ]] || {
  echo 'Rocky Linux 9 aarch64 서버에서만 실행할 수 있습니다.' >&2; exit 1;
}
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

workdir=$(mktemp -d /tmp/booksome-bootstrap.XXXXXX)
trap 'rm -rf -- "$workdir"' EXIT

echo '[1/7] 운영 도구 설치'
dnf install -y \
  java-21-openjdk-headless nginx certbot python3-certbot-nginx \
  curl tar xz git unzip openssl jq rsync cronie \
  policycoreutils-python-utils

echo '[2/7] MariaDB 11.4 공식 저장소 및 패키지 설치'
if rpm -q mariadb-server >/dev/null 2>&1 && ! rpm -q MariaDB-server >/dev/null 2>&1; then
  echo '배포판 MariaDB가 설치되어 있습니다. 버전을 확인한 후 수동으로 이전해야 합니다.' >&2
  exit 1
fi
if ! rpm -q MariaDB-server >/dev/null 2>&1; then
  curl -fsSL --retry 3 https://r.mariadb.com/downloads/mariadb_repo_setup -o "$workdir/mariadb_repo_setup"
  printf '%s  %s\n' \
    'b54c87edfe81b9837ef44a4a4f39383dd8df32776e6a18c0743a5d3ece044ac3' \
    "$workdir/mariadb_repo_setup" | sha256sum -c -
  bash "$workdir/mariadb_repo_setup" \
    --os-type=rhel --os-version=9 --arch=aarch64 \
    --mariadb-server-version=mariadb-11.4 --skip-maxscale --skip-tools
  dnf install -y MariaDB-server MariaDB-client MariaDB-backup
fi
[[ $(mariadb --version) == *'11.4.'* ]] || { echo 'MariaDB 11.4 설치를 확인하지 못했습니다.' >&2; exit 1; }

echo '[3/7] Node.js 24 LTS 설치'
node_version=24.21.0
node_dir="/opt/node-v${node_version}-linux-arm64"
if [[ ! -x $node_dir/bin/node ]]; then
  node_file="node-v${node_version}-linux-arm64.tar.xz"
  node_url="https://nodejs.org/dist/v${node_version}"
  curl -fsSL --retry 3 "$node_url/$node_file" -o "$workdir/$node_file"
  curl -fsSL --retry 3 "$node_url/SHASUMS256.txt" -o "$workdir/SHASUMS256.txt"
  (cd "$workdir" && grep -F "  $node_file" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$workdir/$node_file" -C /opt
fi
ln -sfn "$node_dir" /opt/nodejs
for binary in node npm npx; do
  ln -sfn "/opt/nodejs/bin/$binary" "/usr/local/bin/$binary"
done

echo '[4/7] 서비스 계정과 디렉터리 준비'
id booksome >/dev/null 2>&1 || useradd --system --home-dir /service/booksome/web --shell /usr/sbin/nologin booksome
usermod -d /service/booksome/web booksome
usermod -a -G booksome syhan
usermod -a -G booksome rocky
install -d -o root -g booksome -m 0750 /service/booksome /service/booksome/app /service/booksome/releases /service/booksome/releases/api
install -d -o root -g booksome -m 0750 /etc/booksome
install -d -o booksome -g booksome -m 0750 /service/booksome/data /service/booksome/data/media /service/booksome/logs
install -d -o booksome -g booksome -m 0750 /service/booksome/web /service/booksome/web/builds /service/booksome/web/releases /service/booksome/web/nginx-backups
install -d -o root -g root -m 0755 /var/www/booksome-admin /var/www/booksome-admin/releases

echo '[5/7] 데이터베이스를 로컬 접속으로 제한'
if [[ ! -e /etc/my.cnf.d/z-booksome.cnf ]]; then
  printf '[mariadbd]\nbind-address=127.0.0.1\n' > /etc/my.cnf.d/z-booksome.cnf
  chmod 0644 /etc/my.cnf.d/z-booksome.cnf
fi
systemctl enable --now mariadb.service
systemctl enable --now crond.service

echo '[6/7] 빈 데이터베이스와 애플리케이션 인증 정보 준비'
if [[ ! -e /etc/booksome/booksome.env ]]; then
  if [[ $(mariadb -NBe "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='booksome'") != 0 ]]; then
    echo 'booksome 데이터베이스가 이미 있습니다. 기존 데이터를 보존하도록 여기서 중단합니다.' >&2
    exit 1
  fi
  app_password=$(openssl rand -hex 32)
  migrator_password=$(openssl rand -hex 32)
  jwt_secret=$(openssl rand -base64 64 | tr -d '\n')
  mariadb <<SQL
CREATE DATABASE booksome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'booksome_app'@'127.0.0.1' IDENTIFIED BY '$app_password';
CREATE USER 'booksome_migrator'@'127.0.0.1' IDENTIFIED BY '$migrator_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON booksome.* TO 'booksome_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON booksome.* TO 'booksome_migrator'@'127.0.0.1';
SQL
  install -o root -g booksome -m 0640 /dev/null /etc/booksome/booksome.env
  {
    printf 'BOOKSOME_DB_URL=jdbc:mariadb://127.0.0.1:3306/booksome\n'
    printf 'BOOKSOME_DB_USERNAME=booksome_app\nBOOKSOME_DB_PASSWORD=%s\n' "$app_password"
    printf 'BOOKSOME_DB_MIGRATOR_USERNAME=booksome_migrator\nBOOKSOME_DB_MIGRATOR_PASSWORD=%s\n' "$migrator_password"
    printf 'BOOKSOME_DB_MAX_POOL_SIZE=10\nBOOKSOME_DB_MIN_IDLE=2\n'
    printf 'BOOKSOME_SERVER_ADDRESS=127.0.0.1\nBOOKSOME_SERVER_PORT=8080\n'
    printf 'BOOKSOME_CORS_ALLOWED_ORIGINS=https://booksome.top,https://www.booksome.top,https://admin.booksome.top\n'
    printf 'BOOKSOME_ADMIN_EMAILS=\nBOOKSOME_JWT_SECRET=%s\n' "$jwt_secret"
    printf 'BOOKSOME_JWT_ISSUER=https://api.booksome.top\nBOOKSOME_JWT_AUDIENCE=booksome-app\n'
    printf 'BOOKSOME_ACCESS_TOKEN_TTL=PT15M\nBOOKSOME_REFRESH_TOKEN_TTL=P30D\n'
    printf 'BOOKSOME_MEDIA_ROOT=/service/booksome/data/media\nBOOKSOME_MEDIA_PUBLIC_BASE_URL=https://api.booksome.top\n'
    printf 'BOOKSOME_MAIL_ENABLED=false\nBOOKSOME_MAIL_FROM=no-reply@mail.booksome.top\n'
  } > /etc/booksome/booksome.env
  unset app_password migrator_password jwt_secret
fi
if [[ ! -L /service/booksome/app/booksome.env ]]; then
  [[ ! -e /service/booksome/app/booksome.env ]] || { echo '기존 API 환경 파일이 있어 링크 생성 전에 수동 확인이 필요합니다.' >&2; exit 1; }
  ln -s /etc/booksome/booksome.env /service/booksome/app/booksome.env
fi

echo '[7/7] 서비스 템플릿과 SELinux 준비'
if [[ ! -f /etc/systemd/system/booksome-api.service ]]; then
  install -o root -g root -m 0644 "$script_dir/booksome-api.service" /etc/systemd/system/booksome-api.service
fi
if [[ ! -f /etc/systemd/system/booksome-web.service ]]; then
  install -o root -g root -m 0644 "$script_dir/booksome-web.service" /etc/systemd/system/booksome-web.service
fi
setsebool -P httpd_can_network_connect 1
restorecon -F /service
restorecon -RF /service/booksome /var/www/booksome-admin
systemctl daemon-reload

java -version 2>&1 | head -1
/usr/local/bin/node --version
PATH=/usr/local/bin:$PATH /usr/local/bin/npm --version
mariadb --version
nginx -v 2>&1
certbot --version
mariadb -NBe 'SELECT @@bind_address, VERSION()' | sed 's/^/DB_LOCAL_AND_VERSION=/'
nginx -t
echo 'BOOKSOME_SETUP_COMPLETE=true'
