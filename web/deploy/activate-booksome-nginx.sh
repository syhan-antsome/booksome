#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 && $# -eq 1 ]] || { echo 'Usage: root activate-booksome-nginx.sh <new-nginx-conf>' >&2; exit 1; }
new_config=$1
active=/etc/nginx/conf.d/booksome.conf
bootstrap=/etc/nginx/conf.d/booksome-acme.conf
backup=/service/booksome/web/nginx-backups/booksome-acme.conf.before-live

[[ -f $new_config && -f $bootstrap && ! -e $active && -f /service/booksome/web/current/server.js ]] || {
  echo '전환에 필요한 Nginx 설정 또는 웹 릴리스가 없습니다.' >&2; exit 1;
}
cp -a "$bootstrap" "$backup"
activated=false
rollback() {
  [[ $activated == true ]] && return
  cp -a "$backup" "$bootstrap"
  rm -f -- "$active"
  nginx -t && systemctl reload nginx
}
trap rollback EXIT

install -o root -g root -m 0644 "$new_config" "$active"
rm -f -- "$bootstrap"
nginx -t
systemctl reload nginx
for _ in {1..15}; do
  web_status=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 6 \
    --resolve booksome.top:443:127.0.0.1 https://booksome.top/app/books/add) || true
  api_status=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 6 \
    --resolve api.booksome.top:443:127.0.0.1 https://api.booksome.top/api/health) || true
  if [[ $web_status == 200 && $api_status == 200 ]]; then
    systemctl enable booksome-web.service
    activated=true
    echo 'PUBLIC_WEB_AND_API_HEALTH_OK=true'
    exit 0
  fi
  sleep 1
done
echo "Nginx 전환 검사 실패: web=$web_status api=$api_status" >&2
exit 1
