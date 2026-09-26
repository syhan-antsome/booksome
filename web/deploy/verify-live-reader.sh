#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 && $# -eq 1 ]] || { echo 'Usage: root verify-live-reader.sh <backup-email>' >&2; exit 1; }
password_file=/etc/booksome/restore-login-password
[[ -r $password_file ]] || { echo '임시 로그인 비밀번호 파일이 없습니다.' >&2; exit 1; }
cookie_file=$(mktemp /tmp/booksome-reader-cookies.XXXXXX)
trap 'rm -f -- "$cookie_file"' EXIT
chmod 0600 "$cookie_file"

login_response=$(
  jq -n --rawfile password "$password_file" --arg email "$1" '{email:$email,password:$password}' |
    curl -fsS --max-time 15 --resolve booksome.top:443:127.0.0.1 \
      -c "$cookie_file" -H 'Content-Type: application/json' -X POST --data-binary @- \
      https://booksome.top/api/auth/login
)
[[ $(jq -r '.user.id' <<< "$login_response") == b233612a-28c2-4744-bfcc-0902b1077fd2 ]] || {
  echo '웹 로그인 계정 ID가 복원 프로필과 다릅니다.' >&2; exit 1;
}
[[ $(jq -r '.user.role' <<< "$login_response") == ADMIN ]] || {
  echo '복원 계정의 관리자 역할이 웹 세션에 보이지 않습니다.' >&2; exit 1;
}
books=$(
  curl -fsS --max-time 15 --resolve booksome.top:443:127.0.0.1 \
    -b "$cookie_file" https://booksome.top/api/reader/reading-life/books | jq -er 'length'
)
[[ $books == 7 ]] || { echo "웹 서재 건수가 다릅니다: $books" >&2; exit 1; }
echo "PUBLIC_WEB_LOGIN_ADMIN_AND_BOOKS_OK=$books"
