#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
env_file=/etc/booksome/booksome.env
[[ $(grep -c '^BOOKSOME_MAIL_ENABLED=false$' "$env_file") == 1 ]] || {
  echo '메일 발송이 이미 켜졌거나 설정이 달라 중단합니다.' >&2; exit 1;
}
for key in BOOKSOME_SMTP_HOST BOOKSOME_SMTP_PORT BOOKSOME_SMTP_USERNAME BOOKSOME_SMTP_PASSWORD BOOKSOME_SMTP_AUTH BOOKSOME_SMTP_STARTTLS; do
  if grep -q "^${key}=" "$env_file"; then
    echo "기존 SMTP 값이 있습니다: $key" >&2
    exit 1
  fi
done
{
  printf 'BOOKSOME_SMTP_HOST=127.0.0.1\n'
  printf 'BOOKSOME_SMTP_PORT=25\n'
  printf 'BOOKSOME_SMTP_USERNAME=\nBOOKSOME_SMTP_PASSWORD=\n'
  printf 'BOOKSOME_SMTP_AUTH=false\nBOOKSOME_SMTP_STARTTLS=false\n'
} >> "$env_file"
chmod 0640 "$env_file"
chown root:booksome "$env_file"
systemctl restart booksome-api.service
echo 'API_POINTS_TO_LOCAL_POSTFIX=true'
echo 'BOOKSOME_MAIL_ENABLED=false'
