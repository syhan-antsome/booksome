#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 && $# -eq 1 ]] || { echo 'Usage: root seed-restore-login.sh <backup-email>' >&2; exit 1; }
[[ $1 =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$ ]] || { echo '이메일 형식이 올바르지 않습니다.' >&2; exit 1; }
[[ $(mariadb -NBe 'SELECT COUNT(*) FROM booksome.users') == 0 ]] || { echo '새 DB에 이미 사용자가 있습니다.' >&2; exit 1; }
password_file=/etc/booksome/restore-login-password
[[ ! -e $password_file ]] || { echo '복원용 비밀번호 파일이 이미 있습니다.' >&2; exit 1; }

install -o root -g root -m 0600 /dev/null "$password_file"
openssl rand -hex 24 | tr -d '\n' > "$password_file"
request_status=0
jq -n --rawfile password "$password_file" --arg email "$1" --arg displayName '복원 계정' \
  '{email:$email,password:$password,displayName:$displayName}' |
  curl -fsS --max-time 15 -o /dev/null -w 'SIGNUP_HTTP=%{http_code}\n' \
    -H 'Content-Type: application/json' -X POST --data-binary @- \
    http://127.0.0.1:8080/api/auth/sign-up || request_status=$?
if ((request_status != 0)); then
  rm -f -- "$password_file"
  exit "$request_status"
fi
[[ $(mariadb -NBe "SELECT COUNT(*) FROM booksome.users WHERE email='$1'") == 1 ]] || {
  echo '가입 후 사용자 확인에 실패했습니다.' >&2
  exit 1
}
echo 'RESTORE_LOGIN_SEEDED=true'
