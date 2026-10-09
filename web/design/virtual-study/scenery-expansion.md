# 도쿄·런던·서울·숲 — 360도 서재 풍경

> 숲의 지면 버전은 같은 날 [나무 위 서재](forest-treehouse.md)로 개선했다. 현재 숲 에셋은 v2이며 지면 평면·낮은 기초를 제거하고 시야 제한을 조정했다. 아래는 최초 네 풍경 확장 기록이다.

2026-10-09. 뉴욕의 건물 안에 있는 서재와 카메라를 따라 움직이는 사진 환경을 네 풍경으로 확장했다. 실행 화면은 `/study → 꾸미기 → 풍경`이다. 기존 책·표지·책장/책상 소품·가구/벽/바닥/카펫 재질과 계정별 브라우저 저장 문서는 유지한다. 배포는 별도이며 운영 데이터·인증·Expo 빌드를 위한 세션 경계는 변경하지 않는다.

## 공간과 분위기

| 풍경 | 창밖 | 건물과 빛 |
| --- | --- | --- |
| 도쿄 | 도쿄타워, 도심의 저녁 불빛 | 차분한 청회색 외벽·금속, 푸른 주변광, 따뜻한 실내 조명 |
| 런던 | 테임즈강, 웨스트민스터, 런던아이, 도시 지붕 | 밝은 석재와 부드러운 아침빛 |
| 서울 | 한강, 남산과 서울타워, 먼 산과 도시 | 회색 외벽, 따뜻한 노을빛 |
| 숲 | 나무·이끼·숲바닥·햇살 | 낮은 기초, 원목 프레임·데크, 세 계단과 지면의 공터 |

도시 네 곳은 공통 펜트하우스 구조와 아래 여섯 층을 사용한다. 뒤의 넓은 면은 창문을 유지하고 반대 측면은 막힌 벽이다. 숲에서는 아래층과 높은 난간을 숨긴다. 기초 바닥과 계단 끝은 지면 -0.89에 닿는다. 36×28 공터는 지면용 실사풍 텍스처를 쓰고 가장자리를 사진에 부드럽게 합성한다. 서재의 책과 가구는 모두 실제 Three.js 메시다.

사용자의 가구·재질을 바꾸지 않고 건물 자체가 가진 별도 재질만 갱신한다. 카메라는 모든 풍경에서 수평선을 유지하며 가로 회전은 제한하지 않는다. 아래로는 도시 30도/숲 35도, 위로는 45도까지 허용한다. 선택을 바꾸면 해당 전체 구도로 돌아간다.

## 런타임 에셋

모두 `web/public/`에 저장했다. 도시별 큐브는 여섯 면 `{px,nx,py,ny,pz,nz}.webp`, 각 1254×1254다. 공통 구면 이미지는 1774×887, 썸네일은 672×378이다. 도시 큐브 WebP 품질 92, 숲 큐브 84/구면 90으로 압축했다. 숲의 잎 세부 묘사를 유지하면서 초기 전송량을 줄였다.

| 풍경 | 경로 | 이미지 합계(썸네일 포함) |
| --- | --- | --- |
| 도쿄 | `study/scenery/tokyo-cube-v2/`, `tokyo-panorama-v2.webp`, `tokyo-photo-v2.webp` | 약 2.68 MiB |
| 런던 | `study/scenery/london-cube-v2/`, `london-panorama-v2.webp`, `london-photo-v2.webp` | 약 2.58 MiB |
| 서울 | `study/scenery/seoul-cube-v1/`, `seoul-panorama-v1.webp`, `seoul-photo-v1.webp` | 약 2.32 MiB |
| 숲 | `study/scenery/forest-cube-v1/`, `forest-panorama-v1.webp`, `forest-photo-v1.webp` | 약 3.78 MiB |

숲 지면은 `study/pbr/woodland-ground-color-v1.webp`(1024×1024)다. 뉴욕 에셋과 이전 도쿄·런던 사진은 덮어쓰지 않았다. 실제 장면에는 선택한 큐브와 구면 이미지 한 세트만 로딩하며 썸네일은 Next Image로 작게 제공한다. 서재 조명과 사진의 색은 함께 정하지만 사진을 실시간으로 다시 생성하지 않는다.

## 생성 도구와 프롬프트

**내장 imagegen**을 사용했다. CLI/API 키를 사용하지 않았다. 공통 구면 네 장, 수평 방향별 세부 복원 16장, 지면 텍스처 한 장을 생성했다. 위/아래 면은 공통 구면의 수학적 투영을 사용한다. 아래의 모든 장면 설명은 같은 공통 프롬프트에 삽입했다. 생성 원본 파일명은 [원본 기록](scenery-expansion-sources.json)에 있다. 런타임은 이 파일명이나 외부 생성 경로를 참조하지 않는다.

### 공통 구면 프롬프트

```text
Use case: photorealistic-natural.
Asset type: one seamless 360 x 180 degree spherical environment texture for an interactive Three.js reading room, true EQUIRECTANGULAR latitude-longitude projection, 2:1 aspect ratio, maximum crisp resolution preferably 3840 x 1920.
Primary scene: [아래 풍경별 설명]
Professional realistic architectural/landscape photography, exceptionally sharp natural texture and authentic coherent depth. This is a surrounding environment photographed from one stationary viewpoint.
CRITICAL: correct 360 degree horizontal by 180 degree vertical equirectangular projection. Level horizon at EXACT vertical midpoint. Upper half maps to sky/upper canopy and zenith; lower half maps to downward landscape and nadir. Correct spherical distortion near poles, seamless left and right edges. NOT a normal rectilinear panoramic photograph. All buildings/trees maintain one consistent location, perspective and illumination around the sphere. No duplicated landmarks or sun.
Constraints: ONLY the outdoor environment. No foreground room, apartment, tower from which the photo is taken, terrace, window frame, furniture, people close to camera, text, lettering, UI, borders, collage or watermarks. No illustration, miniature, low-poly or game-render look. Clean continuous photographic 2:1 spherical texture.
```

### tokyo

Tokyo skyline seen from the 35th floor of a residential tower in Shiba, with Tokyo Tower glowing warm orange toward the central forward view, layered contemporary office towers, dense Japanese low-rise neighborhoods, distant Tokyo Bay and long evening streets. Blue hour just after sunset: navy-blue sky still visibly luminous, delicate pale violet horizon, richly resolved windows and warm restrained city lights. Real photographic exposure with visible detailed buildings, never pitch black, no overwhelming neon.

### london

London skyline viewed from a 30th-floor residential tower beside the River Thames on the South Bank. The winding Thames and Westminster, a recognizable distant Elizabeth Tower, London Eye, St Pauls and the Shard positioned naturally in different directions around the city, fine brick and stone architecture with contemporary glass towers. Clear calm morning, softly warm side sunlight and cool mist at the far horizon, detailed rooftops and streets, subtle clouds and a natural soft blue sky. No fog obscuring the city.

### seoul

Seoul from a 35th-floor apartment tower on the south bank of the Han River, facing north toward the broad river, elegant bridges and Namsan Hill with N Seoul Tower in the central forward view. Modern Korean residential and office towers, distant mountains, dense neighborhoods extending around the full panorama, the distant Lotte World Tower far to one side, balanced plausible city arrangement. A beautiful late-afternoon sunset, warm honey sunlight, blue shadows, pale peach-blue sky and subtle clouds. Natural restrained photographic color, not a saturated orange filter.

### forest

A peaceful temperate woodland seen from eye height 3 meters above the forest floor at the edge of a woodland clearing. Mature tall deciduous trees, graceful trunks, moss, fern, grasses and naturally layered green foliage surround the viewer in every direction. A small open clearing near the viewer with realistic earthy ground underfoot, trunks mainly 8 to 25 meters away, continuous forest floor extending into distance. Morning sunlight filters gently through leaves with realistic soft bright patches, overhead branches open to a pale sky. This is a grounded forest location, not an aerial view, no city, no houses, no lake.

### 방향별 세부 복원 프롬프트

```text
Use case: precise-object-edit.
Asset type: a sharp photorealistic square 90-degree cubemap face for a continuous [풍경 ID] panorama surrounding a Three.js reading room.
Input image 1 is the EDIT TARGET, a mathematically projected view of the environment. Restore local photographic detail from the soft reference: [도시: clear natural facade windows, believable brick/stone/glass, sharp detailed roofs, streets and nuanced cloud texture / 숲: crisp bark, believable fern fronds, fine leaves, moss and earthy ground texture].
Preserve EXACT camera direction, 90-degree rectilinear field of view, framing, horizon height, major silhouettes and object positions, waterways, sun and restrained original lighting/color. Do not crop, zoom, add landmarks or change the composition. If there is a vertical exposure discontinuity in the center, make the exposure transition natural without moving any structures.
Adjacent skybox faces must join: keep outermost edge structures, sky colors and clouds geometrically matched to the reference. Improve local details only. No new foreground objects, room, tower/balcony, furniture, people close to camera, letters, logos, UI, watermarks, blur, painterly or game render treatment. A single crisp square photographic environment texture, full image without border.
```

### 지면 프롬프트

원본: `exec-6e0befe2-6e64-4dd0-b99b-be44a1666d48.png`.

```text
Use case: photorealistic-natural. Asset type: a seamless tiling PBR color texture for a grounded woodland reading-room garden, square maximum sharp resolution. Straight top-down macro aerial photograph of 2 meters of natural forest floor: muted brown earthy soil, tiny old dry leaves, finely detailed moss patches and short fern-free ground plants, small twigs and pebbles, realistic uneven organic detail. Neutral soft diffuse daylight with NO cast shadows, no directional shading, no perspective or depth of field. Restrained olive green and earthy warm brown, no saturated lawn green. All four edges must tile seamlessly. ONLY flat ground material, no trees, roots, large rocks, furniture, horizon, sky, people, text, logo, watermark, border or collage. Crisp photographic material texture, no illustration/game art.
```

기술적 투영·리사이즈·WebP 압축에만 Sharp를 사용했다. `web/`에서 `node scripts/project-study-scenery.mjs <theme> <source.png> <version>`으로 구면을 여섯 방향 참조와 썸네일로 투영한다. 수평 네 면은 위 세부 복원 프롬프트의 결과를 넣고 여섯 면을 같은 1254 해상도로 맞춘다. Three.js 외부 큐브의 X 반전과 공통 구면의 경도가 같도록 투영한다.

## 수명과 오류

`CityBackdrop`의 초기 선택은 null이어서 처음 숲을 선택해도 이미지가 로딩된다. 각각의 풍경은 자신의 큐브·구면·초기 방향을 갖는다. 두 텍스처를 모두 받은 뒤 적용한다. 일부 실패, 다른 풍경으로 변경한 뒤 늦게 도착한 응답, 장면 해제 시 성공한 텍스처도 해제한다. 실패는 자동 반복 요청 없이 안내하고 사용자가 다시 불러올 수 있다. 방·책은 계속 이용할 수 있다.

`panorama-sky.ts`는 세계 방향으로 두 환경을 샘플링하며 경계를 공통 구면에 연결한다. 사진용 cover 크롭을 적용하지 않는다. 먼 배경을 방과 투명 표면보다 먼저 그려 유리와 숲의 지면이 자연스럽게 합성되게 한다.

환경은 실사풍 생성 이미지이므로 실제 지도나 특정 주소에서 찍은 자료가 아니다. 각 건물/나무의 3D 깊이를 갖지 않아 카메라의 화면 이동에서 가까운 배경 물체의 시차는 재현하지 않는다. 연결부·극 방향·최대 확대의 디테일에는 사진 환경의 한계가 있다.

## 로컬 검증

- 웹 타입 검사·린트·테스트 72개, 루트 타입 검사·독서 테스트 11개, 프로덕션 빌드가 통과했다.
- 자동 검사는 최초 숲 로딩, 각 환경의 실제 에셋 선택, 같은 선택 재사용, 화면 비율에서 구면 유지, 늦은 응답 차단, 부분 실패/명시적 재시도, GPU 텍스처·메시 정리, 숲 기초와 계단의 지면 접촉, 가구 재질 소유권, 서울 저장·복원·계정 격리를 확인한다.
- Chrome PC 1512×770과 모바일 375×812에서 네 풍경 전환과 창밖 연결, 회전·하늘 보기·아래 시야 제한·화면 이동·초기화·취소를 확인했다. 로그인한 계정의 책 7권·표지 7개·소품 3개(책장 1개/책상 2개)가 유지됐고 겹침은 0이었다. 모바일 가로 넘침은 없고 DPR 1.25를 유지했다. 콘솔 오류·경고는 없었다. 미리보기는 저장하지 않고 기존 뉴욕 꾸미기를 복원했다. 책장 확대에서 실제 책등과 표지가 유지되는 것도 확인했다. 실물 휴대전화/터치와 다른 브라우저는 직접 실행하지 않았다.

배포와 커밋/푸시는 이번 요청에 포함하지 않는다.
