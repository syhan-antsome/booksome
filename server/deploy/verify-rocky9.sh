#!/usr/bin/env bash
set -Eeuo pipefail

[[ $(id -u) -eq 0 ]] || { echo 'root 권한이 필요합니다.' >&2; exit 1; }
export PATH=/usr/local/bin:$PATH
source /service/booksome/app/booksome.env

systemctl is-active --quiet mariadb.service
systemctl is-active --quiet crond.service
[[ $(mariadb -NBe 'SELECT @@bind_address') == 127.0.0.1 ]]
[[ $(mariadb -NBe 'SELECT VERSION()') == 11.4.* ]]
[[ $(mariadb -NBe "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='booksome'") == 1 ]]

export MYSQL_PWD=$BOOKSOME_DB_PASSWORD
[[ $(mariadb --protocol=TCP --host=127.0.0.1 --user="$BOOKSOME_DB_USERNAME" --database=booksome -NBe 'SELECT CURRENT_USER()') == booksome_app@127.0.0.1 ]]
export MYSQL_PWD=$BOOKSOME_DB_MIGRATOR_PASSWORD
[[ $(mariadb --protocol=TCP --host=127.0.0.1 --user="$BOOKSOME_DB_MIGRATOR_USERNAME" --database=booksome -NBe 'SELECT CURRENT_USER()') == booksome_migrator@127.0.0.1 ]]
unset MYSQL_PWD

[[ $(node -p 'process.versions.node.split(".")[0]') == 24 ]]
[[ $(java -version 2>&1 | head -1) == *'"21.'* ]]
runuser -u booksome -- test -r /service/booksome/app/booksome.env
runuser -u booksome -- test -r /service/booksome/web/booksome-web.env
test -d /service/booksome/data/media
test -d /var/www/booksome-admin/releases
nginx -t
echo 'BOOKSOME_ENV_VERIFIED=true'
