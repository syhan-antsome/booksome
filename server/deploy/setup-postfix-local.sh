#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
source /etc/os-release
[[ $ID == rocky && ${VERSION_ID%%.*} == 9 ]] || { echo 'Rocky Linux 9 서버에서만 실행할 수 있습니다.' >&2; exit 1; }

dnf install -y postfix cyrus-sasl-plain
postconf -e 'myhostname = mail.booksome.top'
postconf -e 'myorigin = $myhostname'
postconf -e 'mydestination = $myhostname, localhost.$mydomain, localhost'
postconf -e 'inet_interfaces = loopback-only'
postconf -e 'inet_protocols = ipv4'
postconf -e 'mynetworks = 127.0.0.0/8'
postconf -e 'smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination'
postconf -e 'relayhost ='
postconf -e 'smtp_tls_security_level = encrypt'
postconf -e 'smtp_sasl_auth_enable = no'
postfix check
systemctl enable --now postfix.service

[[ $(postconf -h inet_interfaces) == loopback-only ]]
[[ $(postconf -h smtp_sasl_auth_enable) == no ]]
systemctl is-active --quiet postfix.service
echo 'POSTFIX_LOCAL_ONLY_READY=true'
echo 'SMTP_RELAY_CONFIGURED=false'
