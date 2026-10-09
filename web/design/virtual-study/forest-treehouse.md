# 숲 — 나무 위 서재

2026-10-09. 지면 가까이 놓였던 숲 서재를 나무 위의 서재로 변경했다. 사용자가 지적한 거대한 잎/풀의 비율과 화면 이동 후 카메라가 지면 아래로 들어가는 문제를 함께 해결한다. `/study → 꾸미기 → 풍경 → 숲`에서 확인한다. 기존 도시 풍경·개인 책/표지·소품·가구 재질·계정별 저장은 유지한다.

## 장면

- 배경은 약 22m 높이에서 먼 수관과 숲의 능선을 보는 실사풍 360도 환경이다. 가까운 풀·고사리·큰 잎·줄기를 사진에 넣지 않는다. 앞선 지면 버전은 `forest-*-v1`로 보존하고 현재는 `forest-*-v2`를 사용한다.
- 서재의 책장/책상/가구 좌표는 유지한다. 데크 아래에 약 18 장면 단위로 내려가는 굵은 나무줄기와 네 갈래 지지 가지, 목재 장선·보강대·테라스 난간을 만든다. 가지 끝은 실제 받침대와 만나고 개인 독서 공간의 바닥을 뚫지 않는다.
- 후면 가지는 방 밖으로 돌아 올라간다. 작은 잎 900개는 하나의 InstancedMesh로 그리며 후면 벽 밖에 있어 책장과 겹치지 않는다. 나무껍질은 생성한 고해상도 텍스처와 bump map을 사용한다. 목재 받침/프레임은 가구와 별도 재질이라 사용자의 가구색을 덮어쓰지 않는다.
- 기존 지면 평면·낮은 기초·계단은 현재 숲 장면에서 제거한다. 카메라가 평면 아래로 들어가 뒤집힌 지면을 보는 상황 자체를 없앤다.

## 카메라

나무 위 구조를 확인한 뒤 사용자의 요청에 따라 숲의 올려다보기도 최대 45도로 확장했다. 내려다보기 30도와 도시의 기존 시야는 유지한다. 눈높이 하한은 데크 위 0.9에서 가상 지면 위 0.9로 낮춘다. 나무 높이 18을 공통 설정에서 가져오므로 데크 기준 하한은 -17.1이다. 기본 구도에서는 약 36도, 가장 낮은 target에서도 약 32도까지 하늘을 올려다볼 수 있고 target이 높으면 45도를 모두 사용할 수 있다.

`setStudyControlLimits`가 현재 target 높이와 카메라의 거리로 허용 가능한 최대 polar angle을 계산한다. `scene.tick`은 화면 이동의 target 범위를 먼저 보정한 다음 이 제한을 갱신하고 OrbitControls를 업데이트한다. 따라서 회전·화면 이동·광학 확대·시점 전환을 섞어도 같은 높이 제한을 적용한다. 가로 회전, 책장/책상 시점, 초기화는 유지한다. DOM의 `data-camera-y`는 실제 높이 검증용이며 화면에는 노출하지 않는다.

## 에셋과 도구

내장 **imagegen**을 사용했다. CLI·외부 API 키는 사용하지 않았다. 의미 있는 사진 생성/세부 복원은 imagegen, 투영과 크기/포맷 변환만 Sharp로 처리했다.

현재 파일은 모두 `web/public/` 아래에 있다.

- `study/scenery/forest-panorama-v2.webp`: 공통 구면, 1774×887, 품질 90.
- `study/scenery/forest-cube-v2/{px,nx,py,ny,pz,nz}.webp`: 각 1254×1254, 품질 84. 수평 네 면은 세부 복원 결과, 위/아래 면은 공통 구면 투영이다.
- `study/scenery/forest-photo-v2.webp`: 선택 썸네일, 672×378.
- `study/pbr/tree-bark-color-v1.webp`: 나무껍질, 1024×1024, 품질 90. 이전 숲 지면 텍스처는 현재 재질 로더에서 제외한다.

원본은 아래 파일명으로 생성 이미지 폴더에 보존했다. 런타임은 원본 파일이나 외부 생성 경로를 참조하지 않는다.

- 구면: `exec-739c6342-e20d-4828-a88e-860c0f9ef7d7.png`
- 나무껍질: `exec-b797d7dc-a0b2-46df-86d6-76211fbe0a04.png`
- px: `exec-85b9f7f8-f09a-4607-b6c1-e82d5c266bae.png`
- nx: `exec-777b17f9-640f-444e-9ca7-60f07cdbdcc2.png`
- pz: `exec-c81fb0b6-1898-482e-a78e-e9d4fe96e670.png`
- nz: `exec-bf9db39b-d884-4133-9721-809b9d066919.png`

### 구면 생성 프롬프트

```text
Use case: photorealistic-natural.
Asset type: one seamless 360-degree equirectangular spherical environment texture for a Three.js luxury reading room in a sturdy woodland treehouse. True 360 x 180 latitude-longitude projection, 2:1 aspect ratio, maximum sharp resolution.
Scene: the panorama seen from a treehouse deck 22 meters above the forest floor, looking across a spacious clearing over a broad rolling temperate woodland canopy. Realistic human scale: mature trees 15 to 25 meters tall, nearest surrounding trees at least 60 meters away, individual foliage subtle and small in the frame. Tree crowns mainly BELOW eye level. A wide expanse of distant green treetops, varied deciduous woods and a few pines receding toward layered low wooded hills, soft atmospheric depth and natural morning sunlight. Calm pale blue sky, delicate high clouds, warm side light, restrained natural greens. Lower hemisphere looks down toward small tree crowns and shaded patches of woodland far below, not close-up grass. Photograph from a single fixed elevated viewpoint, believable canopy height and distances in all directions.
Projection: exact 360 degrees horizontally and 180 vertically, level horizon at the vertical midpoint. Zenith at top, nadir below, correct spherical polar distortion, seamless left/right edges. Do NOT stretch a normal wide rectilinear photo. Preserve coherent perspective, forest scale and lighting around the sphere.
Constraints: ONLY outdoor forest and sky. No room, house, treehouse, deck, near support tree, balcony/window frame, foreground branch, giant leaf/fern/grass, close-up trunk, people, wildlife close to camera, city, text, logos, watermarks, borders or collage. No illustration, miniature, low-poly or game render. Crisp professional photographic environment.
```

### 방향별 세부 복원 프롬프트

```text
Use case: precise-object-edit.
Input image 1 is the EDIT TARGET: a mathematically projected square 90-degree cubemap face from an elevated forest panorama.
Restore crisp fine photographic tree crown detail, varied small individual leaves, realistic pine needles and subtle high cloud texture. Keep every tree crown SMALL at its existing distant scale. Preserve EXACT camera direction, framing, 90-degree rectilinear field of view, level horizon, hills, silhouettes, tree positions, original sky and sun lighting, natural restrained color. Do not add close trees, giant leaves/grass, foreground trunks, room, treehouse, balcony, furniture, people, text, watermarks or borders. No reframing/cropping, blur, painting or game render.
Adjacent faces must join: preserve outermost edge geometry, cloud positions and color. Remove any abrupt central exposure seam while keeping structure. High-resolution square professional aerial woodland photograph.
```

### 나무껍질 프롬프트

```text
Use case: photorealistic-natural.
Asset type: square seamless tiling PBR color texture for a sturdy mature oak tree trunk and branches supporting a realistic Three.js treehouse.
Straight-on detailed photograph of natural aged oak bark over about one meter of trunk surface. Fine vertical irregular fissures and subtle organic rough plates, warm neutral gray-brown wood, a little muted moss inside some crevices. Even soft diffuse lighting, no cast shadows, no perspective, cylindrical outline, foliage, sky, ground, animals, text or watermark. Seamless tile on all four edges, crisp natural microdetail, no illustration or game-art appearance. Vertical bark grain.
```

## 구현 위치와 검증

- `src/lib/study/treehouse.ts`: 줄기·지지 가지·목재 받침·외부 잎·난간.
- `penthouse.ts`, `materials.ts`, `scenery-options.ts`: 숲 모델과 재질·새 환경 연결.
- `navigation-controls.ts`, `scene.ts`: 숲 전용 각도와 실제 높이 제한.
- `books.ts`: 장면 해제 시 잎의 InstancedMesh 전용 GPU 버퍼도 해제한다.

자동 검사는 지지 가지와 받침의 접촉·실내 바닥/후면 벽 침범 방지, 가구 재질/책상 보존, 팬과 반복 회전에서의 실제 눈높이 제한, 광학 확대 .65~3.6, 도시의 기존 시야 복원, 인스턴스 버퍼 정리를 확인한다. 웹 테스트 74개와 루트 독서 테스트 11개·양쪽 타입 검사·웹 린트·프로덕션 빌드가 통과했다. 로컬 Chrome PC 1512×770과 모바일 375×812에서 렌더링·회전·팬·확대·초기화·풍경 전환을 확인했다. 화면 이동으로 target 높이를 최저 -0.35까지 옮긴 다음 크게 올려다보고 회전/확대를 반복해도 실제 camera 높이가 0.900으로 유지됐다(처음 적용한 보수적인 제한의 검증 기록). 이후 하늘 보기 확장에서 하한을 가상 지면 위 -17.1로 낮췄다. 기본 구도에서 polar 2.195(약 36도 올려다보기), target 높이 6.25에서 polar 2.356(45도)을 Chrome에서 확인했다. 모바일 375×812에서도 하늘 시야·책/표지/소품 보존·가로 넘침 없음을 확인했다. 확장 후에도 테스트 85개·양쪽 타입 검사·웹 린트·프로덕션 빌드가 통과했다. 브라우저 확장 rhwp가 html에 data-hwp-extension/version 속성을 주입해 기존 hydration 경고 1건이 발생했으며 앱과 카메라는 정상 렌더링됐다. 경고를 숨기기 위한 앱 수정은 하지 않았다. 초기화는 6.255의 첫 눈높이를 복원했다. 실제 책 7권·표지 7개·소품 3개가 유지됐으며 겹침은 0, 모바일 가로 넘침과 콘솔 오류·경고도 없었다. 기존 저장을 바꾸지 않고 미리보기를 취소했다.

배경은 생성한 사진 환경이며 모든 숲의 나무를 개별 3D로 만든 것은 아니다. 화면 이동 시 먼 사진 환경의 깊이 시차는 재현하지 않는다. 실제 휴대전화/터치와 다른 브라우저는 별도 검증 대상이다. 구조는 서비스의 시각 모형이다.
