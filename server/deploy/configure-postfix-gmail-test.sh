#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
[[ -t 0 ]] || { echo '앱 비밀번호는 대화형 터미널에서만 입력할 수 있습니다.' >&2; exit 1; }
grep -qx 'BOOKSOME_MAIL_ENABLED=false' /etc/booksome/booksome.env || {
  echo '설정 시험 전에 북썸 메일 발송을 비활성화해야 합니다.' >&2; exit 1;
}
[[ $(postconf -h inet_interfaces) == loopback-only ]] || { echo 'Postfix가 로컬 전용이 아니므로 중단합니다.' >&2; exit 1; }
current_relayhost=$(postconf -h relayhost)
[[ -z $current_relayhost || $current_relayhost == '[smtp.gmail.com]:587' ]] || {
  echo '다른 중계 서버가 있어 중단합니다.' >&2; exit 1;
}
current_sasl_auth=$(postconf -h smtp_sasl_auth_enable)
[[ $current_sasl_auth == no || ( $current_relayhost == '[smtp.gmail.com]:587' && $current_sasl_auth == yes ) ]] || {
  echo '예상하지 못한 SMTP 인증 설정이 있어 중단합니다.' >&2; exit 1;
}
credential_file=/etc/postfix/sasl_passwd
if [[ -z $current_relayhost && ( -e $credential_file || -e ${credential_file}.db ) ]]; then
  echo '기존 SMTP 자격 증명 파일이 있어 중단합니다.' >&2
  exit 1
fi

read -r -p '시험 발송에 사용할 Gmail 주소 [libre3155@gmail.com]: ' gmail_address
gmail_address=${gmail_address:-libre3155@gmail.com}
[[ $gmail_address =~ ^[A-Za-z0-9._%+-]+@gmail\.com$ ]] || {
  echo '유효한 Gmail 주소를 입력해주세요.' >&2; exit 1;
}
read -r -s -p 'Google 앱 비밀번호(입력 내용 숨김): ' app_password
printf '\n'
app_password=${app_password// /}
[[ ${#app_password} -eq 16 && $app_password =~ ^[A-Za-z0-9]+$ ]] || {
  echo '공백을 제외한 16자리 Google 앱 비밀번호가 필요합니다.' >&2; exit 1;
}

umask 077
printf '[smtp.gmail.com]:587 %s:%s\n' "$gmail_address" "$app_password" > "$credential_file"
unset app_password
postmap "hash:$credential_file"
chown root:root "$credential_file" "${credential_file}.db"
chmod 0600 "$credential_file" "${credential_file}.db"
postconf -e 'relayhost = [smtp.gmail.com]:587'
postconf -e 'smtp_sasl_auth_enable = yes'
postconf -e 'smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd'
postconf -e 'smtp_sasl_security_options = noanonymous'
postconf -e 'smtp_sasl_tls_security_options = noanonymous'
postconf -e 'smtp_tls_security_level = secure'
postconf -e 'smtp_tls_CAfile = /etc/pki/tls/certs/ca-bundle.crt'
postfix check
systemctl reload postfix.service

[[ $(postconf -h relayhost) == '[smtp.gmail.com]:587' ]]
[[ $(postconf -h smtp_sasl_auth_enable) == yes ]]
[[ $(postconf -h inet_interfaces) == loopback-only ]]
echo 'GMAIL_RELAY_READY_FOR_TEST=true'
echo 'BOOKSOME_MAIL_ENABLED is unchanged (still false).'
