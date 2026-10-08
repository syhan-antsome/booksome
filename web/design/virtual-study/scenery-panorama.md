# 뉴욕 파노라마 배경

2026-10-08. 기존 고정 사진 배경을 카메라의 회전·광학 확대에 맞춰 움직이는 사진 기반 360도 환경으로 바꾼다. 도쿄·런던은 기존 사진 판을 사용한다. 뉴욕은 실제 지도/현장 촬영 자료가 아닌 내장 Image Gen의 실사풍 환경이다.

## 에셋과 구조

- `public/study/scenery/new-york-panorama-v1.webp`: 1774×887 공통 구면 이미지, 약 467 KiB.
- `public/study/scenery/new-york-cube-v1/{px,nx,py,ny,pz,nz}.webp`: 각각 1254×1254, 총 약 2.43 MiB의 방향별 세부 묘사.
- 처음 만든 구면 이미지에서 방향별 90도 뷰를 수학적으로 투영한 뒤 Image Gen으로 세부 묘사를 복원했다. WebGL 외부 CubeTexture의 X 반전 규칙에 맞춰 방향을 정했다. 아래 방향의 중심에는 원본 구면 이미지에 생긴 소용돌이 왜곡을 보정했다.
- `city-backdrop.ts`가 환경 전체를 원자적으로 로딩한다. 일부 실패·늦은 응답·테마 변경·장면 해제 시 텍스처를 해제한다. 같은 테마는 재사용한다.
- `panorama-sky.ts`는 여섯 면의 경계에서 공통 구면 이미지를 샘플링해 생성 이미지 사이의 구름/색 단절을 완화한다. 화면 좌표로 사진을 미는 방식이 아니라, 두 이미지 모두 같은 세계 방향을 사용한다.

카메라는 서재와 배경에 공통이다. 가로/세로 회전과 렌즈 확대가 함께 적용되고 창밖에서도 같은 풍경을 본다. 뉴욕은 아래로 30도 내려다보기부터 위로 45도 올려다보기까지 회전하며 상하 반전과 롤을 막는다. 환경은 아주 먼 배경처럼 카메라 위치를 중심으로 렌더링하므로 화면 이동에서 가까운 건물의 시차를 재현하지 않는다. 각 방향의 모든 건물은 입체 모델이 아니며 사진의 원근·접합·최대 확대의 디테일에는 한계가 있다. 다른 도시를 선택하면 구면 회전과 추가 메시를 제거하고 기존 사진 비율을 복원한다.

## 생성 프롬프트

### 공통 파노라마

```text
Use case: photorealistic-natural.
Asset type: a seamless 360-degree spherical environment texture for a Three.js New York penthouse scene. ONE image in correct EQUIRECTANGULAR 360 x 180 degree projection, 2:1 aspect ratio, high resolution preferably 3840 x 1920.
Input image 1 is a visual reference for natural photographic Manhattan detail, warm golden-hour lighting, Hudson River and skyline. Create a NEW COMPLETE SPHERICAL panorama, not a wide rectilinear photo stretched onto a sphere.

Primary scene: the entire surrounding New York urban landscape as seen from approximately the fortieth floor (160 meters above streets) of a Manhattan residential tower, without depicting the tower itself or its apartment. Professional photorealistic architectural photography, rich authentic rooftop, stone, brick and glass detail, believable city scale. Empire State Building visible toward the central-left skyline, Midtown high-rises, a distant Hudson River and lower neighborhoods extending in every direction. A calm late-afternoon amber sun toward the left of the central forward view, softly cooler shadows, subtly hazy distance. Natural restrained exposure, no orange filter.
CRITICAL PROJECTION: true latitude-longitude/equirectangular panorama: 360 degrees horizontally, +90 zenith at top and -90 nadir at bottom. Level horizon exactly at the vertical midpoint. Upper half is continuous warm pale sky with delicate clouds; bottom half shows the surrounding city looking downward toward real roofs and streets. Apply correct spherical distortion near the poles, especially the nadir, so it reconstructs correctly when wrapped around a viewer. Horizontal left/right image edges join seamlessly; no stitched hard seam, repeated landmarks or duplicated sun. Buildings and water maintain one physically consistent location and perspective around the sphere. This is not a normal 16:9 panorama.
Constraints: ONLY outdoor city and sky. No room, building corner or balcony in foreground, no furniture, framing window, floating islands, visible camera rig, people close to camera, text, labels, logos, watermarks, UI, borders, panels or collage. No miniature, illustration, low-poly/game-render appearance. Complete continuous photographic environment, clean sharp detailed 2:1 spherical texture.
```

### 방향별 사진 세부 묘사

```text
Use case: precise-object-edit / photographic detail restoration.
Input image 1 is the EDIT TARGET: a mathematically reprojected square 90-degree cube-map view of a continuous New York golden-hour panorama.
Reconstruct it as a crisp high-detail professional aerial city photograph. Recover natural, sharply resolved facade windows, stone/brick detail, believable street and roof detail and nuanced cloud texture from the soft reference. Preserve EXACTLY the camera direction, 90-degree rectilinear field of view, framing, perspective, horizon height, building silhouettes and positions, river outline, sun position when visible and restrained warm lighting. Do NOT crop, zoom, reframe, add new landmarks or change the composition.
The adjacent skybox faces must join: the outermost edge locations, skyline silhouettes, sky color and major cloud shapes must remain geometrically matched to the reference. Keep all original scene structures and improve local photographic detail only. No new foreground objects, building terrace, room, UI, writing, logos or watermarks. No blur, painterly treatment, low-poly/game render. Square high-resolution texture with full photographic realism; fine detail for viewing at enlarged screen size.
```

아래 방향은 위의 세부 묘사 복원 대신 ‘중앙 소용돌이를 자연스러운 맨해튼 도로/지붕의 수직 하향 사진으로 복원하고 바깥 15%의 배치를 유지’하도록 지정했다. 위 방향은 ‘하늘과 구름만, 새 도시/태양을 추가하지 않음’을 지정했다.

## 검증

Chrome 로컬 `/study`의 PC 1512×770과 모바일 375×812에서 정면·측면·위/아래 회전과 카메라 롤에 따라 뉴욕 건물과 배경이 함께 변하는 것을 확인했다. 방향별 이미지만 사용했을 때 생긴 뚜렷한 구름/색 접합선을 공통 구면 참조를 사용하는 셰이더로 완화했다. 초기화는 건물과 전경을 함께 복원한다. 모바일 가로 넘침은 없고, 다른 도시로 전환했다가 뉴욕 환경을 다시 로딩해 원래 방/환경 구성을 복원하는 것을 확인했다. 웹 타입 검사·린트·테스트 59개·프로덕션 빌드와 루트 타입 검사·독서 테스트 11개가 통과했다.

회귀 테스트는 구면 환경에 사진용 cover 크롭을 적용하지 않는 것, 다른 도시로 돌아갈 때 구면 회전을 복원하는 것, 일부 로딩 실패·늦은 응답·해제 시 모든 텍스처를 버리는 것, 연결 메시의 재질·기하 정리와 방 모델 보존을 확인한다. 브라우저는 로그아웃 상태였으며 운영 책·독서 기록을 변경하지 않았다. 같은 브라우저 확장의 html 속성 주입 경고는 앱/셰이더 오류와 구분한다. 배포와 커밋은 하지 않았다.
