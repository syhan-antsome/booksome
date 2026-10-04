# 북썸 공개 포털 디자인

읽는 즐거움, 쌓이는 나의 이야기.

공개 포털은 책을 발견하고 서비스를 이해하는 넓은 입구다. 개인 서재와 독서 기록도 /library의 반응형 포털 화면에서 이어진다. 모바일의 화면 구성은 복제하지 않고 워드마크, 코랄, 중립 바탕, 산세리프와 용어를 공유한다.

## 구성과 시각 기준

- 홈: 검색이 있는 두 열의 첫 화면 → 세 단계 독서 흐름 → 개인 기록/공개 대화 구분 → 실제 공개 책 이야기 → 시작 행동.
- 책 찾기: 제목 검색과 ISBN 전용 조회, 결과 목록과 서재 진입. 검색 전, 짧은 검색어, 빈 결과, 설정 미완료, 연결 실패를 구분한다.
- 책 이야기: 공개 목록과 상세. 최근 공개 목록에서 제목을 찾을 수 있다. Spring의 featured API는 최대 12개를 반환하므로 전체 서비스 검색이라고 안내하지 않는다.
- 인증: Next.js 로그인·가입·비밀번호 재설정. 선택한 책의 ISBN과 복귀 경로를 로그인/가입 전환에도 유지한다.
- 기존 /rooms, /rooms/[slug] URL과 API 계약을 유지하며 화면에서는 ‘책 이야기’라고 부른다.
- 큰 명조 제목, 초록 면, 배경 위 흰 글자, 장식적 기록 샘플을 제거한다.
- 회원 수·진행률·모임 예정 문구는 공개 포털의 활동 증거로 사용하지 않는다. API가 제공한 공개 글만 표시한다.

바탕 #FAF9F7, 표면 #FFFFFF, 글자 #262526, 보조 글자 #6D6662, 코랄 #E75B40, 버튼 #C84932, 연한 면 #FFE8DF, 선 #E9E5E1. 작은 코랄 글자는 #B33E2A를 사용해 중립 바탕에서 5.48:1, 연한 코랄 면에서 4.91:1 대비를 확보한다. 버튼의 흰 글자는 4.71:1이다.

Pretendard Variable v1.3.9를 로컬 제공한다. 라이선스는 ../../src/fonts/OFL.txt에 포함한다. 외부 글꼴 서비스에 의존하지 않고 인용문에만 시스템 명조를 제한적으로 사용한다. 입력 56px 이상, 버튼 44px 이상, 반응형 여백 24px부터 시작한다. 키보드 포커스와 본문 건너뛰기, 동작 줄이기를 제공한다.

## 시안과 자산

- hero-concept.png: 홈 첫 화면의 배치·문구·사진 프레임.
- workflow-concept.png: 열린 세 열과 개인 기록 구분 띠.
- stories-concept.png: 공개 이야기의 빈 상태와 마무리·푸터.
- reading-table-source.png: 내장 Image Gen으로 분리 생성한 사진 원본.
- ../../public/images/reading-table-coral.webp: 원본을 화질 82 WebP로 최적화한 운영 자산.
- ../../public/images/booksome-wordmark.png: 모바일과 같은 assets/booksome-wordmark.png의 사본.

시안·사진은 내장 imagegen을 사용했다. 프롬프트는 “BookSome Korean public reading portal, neutral #FAF9F7, coral controls, existing lowercase booksome wordmark, code-native Korean text and controls, search-led two-column hero, single sunlit reading table photo, three open workflow columns, clear private-record/public-conversation separation, honest API empty states, no fake users or metrics, no green or serif headings”를 기반으로 각 구간의 실제 문구와 배치를 지정했다.

시안의 로그인 전 헤더를 기본으로 구현한다. 로그인 후에는 로그아웃을 제공하고 내 서재가 /library로 연결된다. 홈 로그인은 홈으로 복귀하며, 책을 선택한 인증 흐름은 /library/add로 이어진다. 실제 공개 글이 있으면 시안의 빈 상태 자리에 표지·본문·작성자·날짜가 있는 목록을 표시한다. 모바일에서는 사진을 검색 뒤에 배치하고 사용 과정을 세로로 정렬한다. 작은 강조 글자의 더 진한 코랄은 접근성을 위한 의도적인 조정이다.

## 구현 경계

- 브라우저의 토큰 저장소를 추가하지 않는다. HTTP-only 쿠키와 /api/reader/** 전달을 그대로 사용한다.
- 서버 측 주소와 공개 미디어 주소를 구분한다. MariaDB 직접 연결을 추가하지 않는다.
- 검색 실패, 공개 데이터 실패와 실제 404를 구분한다. 검색어와 인증 복귀 정보는 유지한다.
- 웹 테스트 데이터와 상태 조작 코드를 운영 소스에 넣지 않는다.
- web의 prebuild가 생성하는 public/app/에는 현재 루트 작업 트리의 독서 앱이 포함된다. 공개 포털 변경만 릴리스하려면 먼저 모바일 변경의 배포 포함 여부를 별도로 확정해야 한다.

Spring의 Kakao/National Library 검색 계약은 title 검색만 지원한다. 따라서 시안의 검색 입력 안내와 사용 과정 중 저자 검색 표현은 실제 구현에서 ‘책 제목 또는 ISBN’, ‘제목·ISBN’으로 수정한다. 직접 등록에는 제목·저자·ISBN이 필요하다. 저자 검색 지원은 서버 후속 작업이다.

## 공개 책 이야기 참여

로그인·가입 뒤에도 /rooms/[slug]의 포털 헤더와 레이아웃을 유지한다. PC에서는 공개 이야기 목록과 작성 영역을 나란히, 900px 이하에서는 작성 영역과 목록을 세로로 배치한다. 글·댓글·공감은 기존 /api/reader/rooms/** 쿠키 프록시를 통해 Spring으로 전달하며 실제 제출 때만 참여 관계를 만든다. 기존 /app/room/* 인증 복귀 링크도 포털의 같은 책으로 정규화한다. 기존 /app/ Expo 문서와 모바일 앱의 화면·소스는 수정하지 않는다.

## 포털의 개인 서재

/library는 실제 내 책의 읽는 중·완독 분류와 빈 상태를 제공한다. /library/add는 검색 결과 선택과 직접 등록을, /library/[id]는 쪽수 저장·문장/생각/사진 기록·기록 수정과 완독 회고를 제공한다. PC에서는 기록 목록과 입력 영역을 두 열로 배치하고 좁은 화면에서는 세로로 쌓는다. 새 기록은 private로 저장하며 기존 기록 수정 시 공개 범위와 사진 주석 원본을 보존한다. 모든 데이터는 기존 HTTP-only 쿠키 프록시와 Spring API를 사용한다. 내 서재와 개인 기록은 noindex 및 private, no-store로 제공한다.
