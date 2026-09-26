#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
source_dir=${1:?설정 파일이 전송된 디렉터리가 필요합니다.}
[[ -f $source_dir/opendkim-booksome.conf && -f $source_dir/opendkim-trusted-hosts ]] || {
  echo 'OpenDKIM 설정 파일이 없습니다.' >&2; exit 1;
}
[[ $(postconf -h inet_interfaces) == loopback-only ]] || {
  echo 'Postfix가 로컬 전용이 아니므로 중단합니다.' >&2; exit 1;
}
[[ -z $(postconf -h smtpd_milters) && -z $(postconf -h non_smtpd_milters) ]] || {
  echo '기존 Postfix milter 설정이 있어 중단합니다.' >&2; exit 1;
}

key_dir=/etc/opendkim/keys/mail.booksome.top
install -d -o opendkim -g opendkim -m 0750 "$key_dir"
if [[ ! -e $key_dir/booksome2026.private ]]; then
  runuser -u opendkim -- opendkim-genkey \
    --bits=2048 --directory="$key_dir" --domain=mail.booksome.top \
    --selector=booksome2026 --restrict
fi
[[ -f $key_dir/booksome2026.private && -f $key_dir/booksome2026.txt ]] || {
  echo 'DKIM 키 생성에 실패했습니다.' >&2; exit 1;
}
chown opendkim:opendkim "$key_dir/booksome2026.private"
chmod 0600 "$key_dir/booksome2026.private"
install -o root -g root -m 0644 "$source_dir/opendkim-booksome.conf" /etc/opendkim.conf
install -o root -g root -m 0644 "$source_dir/opendkim-trusted-hosts" /etc/opendkim/TrustedHosts
opendkim -n -x /etc/opendkim.conf
systemctl enable --now opendkim.service
systemctl is-active --quiet opendkim.service

postconf -e 'smtpd_milters = inet:127.0.0.1:8891'
postconf -e 'non_smtpd_milters = inet:127.0.0.1:8891'
postconf -e 'milter_protocol = 6'
postfix check
systemctl reload postfix.service
echo 'DKIM_SIGNER_READY=true'
echo 'DIRECT_DELIVERY_ENABLED=false (existing relayhost unchanged)'
echo 'DKIM_PUBLIC_RECORD:'
sed -n '1,20p' "$key_dir/booksome2026.txt"
