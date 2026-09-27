# 문장 수집가 · 적용 기준

> 이전 디자인의 보관 문서입니다. 현재 모바일 기준은 ../mobile-renovation/README.md를 따릅니다.

사용자가 선택한 3번 시안에 1번의 책 두께 표현을 더한 기준 이미지: `approved-depth.png`.

- 노란 종이 `#FFF6D7`, 초록 기록 배경 `#214F40`, 잉크 `#143E32`, 메모지 `#FFFAEB`.
- 홈 순서: BookSome/검색 → “오늘도, 좋은 문장을 만나길” → 입체 책/제목/저자/쪽수/이어 기록하기 → 초록 기록 영역/종이 메모/실제 사진 → 주간 기록.
- 실제 표지에 책등 음영, 종이 단면, 얇은 표지 테두리와 그림자를 합성한다. 실제 데이터가 없으면 제목이 있는 기본 책과 첫 기록 안내를 같은 구도로 제공한다.
- 제목·인용문은 Noto Serif KR 500, 조작부는 시스템 산세리프. 긴 제목은 줄바꿈하며 버튼은 최소 44px.
- 하단 다섯 메뉴는 동등한 크기로 고정. 내용만 메뉴 순서에 맞춰 좌우 이동하며 동작 줄이기 설정을 따른다.
- 시안 아래에 기존 주간 기록 기능을 유지한다. 사진이 없을 때 예시 사진으로 채우지 않는다.

## 생성 이미지

내장 image_gen으로 기준 시안의 책 깊이만 수정하고 런타임 배경을 별도 생성했다. UI 텍스트·도서 정보는 코드에서 그린다.

- 종이 프롬프트: seamless pale buttery-yellow fine paper texture, dominant #FFF6D7; no objects, writing, borders, stains, shadows or gradients; low-contrast paper fibers.
- 초록 배경 프롬프트: deep forest green #214F40 matte bookcloth; calm left 75%, very subtle leafy shadow at far right; no text, cards, objects or logos.
- 기본 표지 프롬프트: approved folk-art green bird, ochre sun and layered hills; flat 2:3 printable art with calm cream upper 40% for code-rendered title; no text, perspective, spine or shadow. 실제 표지가 없거나 로드되지 않을 때만 사용한다.

확인 기준: 배경 비율, 책의 크기·깊이, 메모와 사진 겹침, 한국어 크기·줄바꿈, 하단 메뉴, 실제 데이터/빈 상태, 좌우 이동.

## 실제 앱에 맞춘 적용

- 종이와 초록 천의 대비, 왼쪽 책/오른쪽 정보, 기울어진 메모, 사진 겹침, 고정 하단바를 공통 구성으로 사용한다.
- 책등 음영·종이 단면·그림자는 `BookObject` 하나로 홈·서재·기록 화면에 적용한다. 표지는 실제 도서 이미지를 우선하며 기본 표지를 실제 출판물 표지로 간주하지 않는다.
- 시안의 이미지 속 손글씨 대신 검색·선택 가능한 Noto Serif KR 텍스트를 사용한다. 도서명·저자·쪽수·진행률·문장은 실제 데이터로 바뀌며, 긴 제목과 작은 화면에는 줄 수와 크기를 조절한다.
- 사진은 사용자가 남긴 사진만 보여준다. 사진이 없으면 메모를 넓게 표시한다. 첫 화면 아래에 기존 주간 기록을 유지하고 `모두 보기`로 상세 기록에 연결한다.
- 첫 화면의 브랜드·인사말·문장 제목·메뉴명을 유지한다. 로그인 전에는 책 정보 대신 첫 책 등록 안내를 제공한다. 문장 아래의 안내는 기록 유무에 맞게 바뀐다.
- 메뉴 이동은 `오늘 / 내 서재 / 기록 / 북룸 / 나` 순서의 인덱스 차이로 결정한다. 280ms 동안 화면 내용만 이동하며 시스템의 동작 줄이기 설정에서는 즉시 전환한다. 상세 화면에서 현재 메뉴를 눌러도 해당 메뉴의 첫 화면으로 돌아간다.
