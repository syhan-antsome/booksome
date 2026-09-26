#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 && $# -eq 1 ]] || { echo 'Usage: root verify-restored-reader.sh <backup-email>' >&2; exit 1; }
password_file=/etc/booksome/restore-login-password
[[ -r $password_file ]] || { echo '임시 로그인 비밀번호 파일이 없습니다.' >&2; exit 1; }

login_response=$(
  jq -n --rawfile password "$password_file" --arg email "$1" '{email:$email,password:$password}' |
    curl -fsS --max-time 15 -H 'Content-Type: application/json' -X POST --data-binary @- \
      http://127.0.0.1:8080/api/auth/sign-in
)
[[ $(jq -r '.user.id' <<< "$login_response") == b233612a-28c2-4744-bfcc-0902b1077fd2 ]] || {
  echo '로그인 계정과 복원 프로필 ID가 일치하지 않습니다.' >&2; exit 1;
}
access_token=$(jq -er '.accessToken' <<< "$login_response")
book_count=$(
  curl -fsS --max-time 15 -H "Authorization: Bearer $access_token" \
    http://127.0.0.1:8080/api/reading-life/books | jq -er 'length'
)
[[ $book_count == 7 ]] || { echo "복원된 서재 건수가 다릅니다: $book_count" >&2; exit 1; }
echo "RESTORED_LOGIN_AND_BOOKS_OK=$book_count"
