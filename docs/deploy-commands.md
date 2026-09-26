# 북썸 배포 명령어

현재 운영 서버는 **OCI 오사카 · `161.33.4.136`**입니다. 아래 명령은 Mac 터미널에서 실행합니다.

## 터미널을 열 때 한 번 설정

```bash
cd /Users/sangyonghan/development/booksome
export BOOKSOME_DEPLOY_HOST=rocky@161.33.4.136
export BOOKSOME_DEPLOY_IDENTITY=/Users/sangyonghan/SSH/oracle-cloud/ssh-key-2026-09-24.key
```

환경변수는 현재 터미널에만 적용됩니다. 이를 생략하면 스크립트가 예전 기본 호스트 `naverai`를 사용하므로, 새 터미널에서는 다시 설정합니다.

## 자주 쓰는 배포 명령

```bash
./deploy.sh all     # API → 공개 웹/독서 앱 → 관리자 전체 배포
./deploy.sh api     # Spring API만 배포
./deploy.sh web     # 공개 웹 + /app/ 독서 UI 배포 (서버에서 빌드)
./deploy.sh admin   # 관리자 웹만 배포
```

Android APK 설치는 위 서버 배포에 포함되지 않습니다. API 빌드는 로컬 Java 21, 관리자 빌드는 로컬 npm 의존성 설치가 필요합니다. 기본적으로 변경을 커밋한 뒤 배포합니다.

환경변수 없이 전체 배포하려면:

```bash
./deploy.sh all --host rocky@161.33.4.136 --identity /Users/sangyonghan/SSH/oracle-cloud/ssh-key-2026-09-24.key
```

## 옵션

| 옵션 | 의미 |
| --- | --- |
| `--dry-run` | 빌드·서버 연결·전송·재시작 없이 계획만 확인 |
| `--allow-dirty` | 커밋하지 않은 로컬 변경도 포함하여 배포 |
| `--yes` | 스크립트의 배포 확인 질문 생략. sudo 권한 검사는 유지 |
| `--keep 5` | 최근 릴리스 보관 개수 지정. 기본값 5 |
| `--skip-build` | 기존 로컬 산출물 사용. `api`, `admin`만 가능하며 빌드 검사도 건너뜀 |

```bash
./deploy.sh all --dry-run                  # 커밋된 상태에서 계획 확인
./deploy.sh all --dry-run --allow-dirty    # 수정 중인 상태에서 계획만 확인
./deploy.sh api --allow-dirty              # 수정 중인 API를 실제 배포
./deploy.sh all --yes                      # 확인 질문 없이 실제 전체 배포
```

## 접속·상태 확인

위 환경변수를 설정한 터미널에서:

```bash
ssh -i "$BOOKSOME_DEPLOY_IDENTITY" "$BOOKSOME_DEPLOY_HOST"
```

서버에 접속한 뒤:

```bash
sudo systemctl status booksome-api booksome-web nginx --no-pager
sudo journalctl -u booksome-api -n 100 --no-pager
sudo journalctl -u booksome-web -n 100 --no-pager
```

외부 접속 확인은 Mac에서:

```bash
curl -fsS https://api.booksome.top/api/health
curl -I https://booksome.top/
curl -I https://admin.booksome.top/
```

## 최초 설치와 복구

현재 운영 서버의 최초 설정은 완료되어 있습니다. 평소에는 `setup`을 다시 실행하지 않습니다. `./deploy.sh setup`은 기존 API·DB·서비스 계정 등을 전제로 웹/관리자 환경을 준비하며, 빈 서버의 OS 전체 설치 명령은 아닙니다. 상세 상태는 [OCI 서버 문서](oracle-cloud-setup.md)를 참고합니다.

각 서비스는 배포 후 헬스 체크가 실패하면 이전 릴리스로 복구를 시도합니다. `all`의 앞 단계에서 이미 성공한 서비스와 Flyway DB 마이그레이션은 자동으로 되돌리지 않습니다.
