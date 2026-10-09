# 실사풍 도시 배경 에셋

> 이 문서는 2026-10-08의 구현 기록이다. 2026-10-09부터 도쿄·런던·서울·숲도 360도 환경과 연결된 공간을 사용한다. 현재 동작과 에셋은 [풍경 확장 기록](scenery-expansion.md)을 참고한다.

2026-10-08. 내장 `image_gen`으로 생성한 실사풍 이미지이며 실제 현장에서 촬영한 사진이나 지도 자료가 아니다. 사용자 책·이미지·개인 정보를 생성 도구에 전달하지 않았다. 서재/가구는 이미지에 포함하지 않고 Three.js가 별도로 렌더링한다.

최종 에셋은 `web/public/study/scenery/{new-york,tokyo,london}-photo-v1.webp`에 있다. 원본 크기 1672×941, WebP quality 90, 각각 약 452/490/463 KiB다. 원본 생성 결과를 그대로 포맷 변환했으며 구도·내용을 후처리하지 않았다. 다음 프롬프트는 재생성과 향후 작업의 참고 자료다.

## 뉴욕

```text
Use case: photorealistic-natural.
Asset type: full-screen photographic city background plate for an interactive 3D reading room composited separately in front. Generate ONLY the city, NOT the room.
Primary request: an exquisitely detailed photorealistic aerial photograph of New York City, Manhattan, at late golden hour, photographed from a high apartment or helicopter, looking diagonally downward about 30 degrees over the urban fabric.
Composition: wide landscape 16:9, edge-to-edge continuous photographic scenery. Horizon in the upper fifth, warm pale sky, Hudson River on the left, iconic Empire State Building off toward the left third and other Manhattan skyline silhouettes farther away. The center is a spacious vista of distant rooftops and city streets, allowing a separately rendered room to sit naturally in front. Buildings recede correctly, clear atmospheric depth, no giant building cropped too close in foreground. Rooftops and facades have real glass, stone and brick texture; tiny streets, trees and traffic are believable.
Style: professional travel/architectural photography, realistic perspective and scale, sharp natural detail with restrained photographic grain, luminous gentle sunset, warm side light coming from the upper left; softly cooler shadows, no theatrical orange filter.
Constraints: ONLY city scenery; no floating islands, platforms, room, furniture, bookshelves, people in foreground, windows or balcony framing, overlays, logos, labels, watermarks. Absolutely no illustration, low-poly buildings, toy miniature, isometric render or videogame appearance. High-resolution photographic realism.
```

## 도쿄

```text
Use case: photorealistic-natural.
Asset type: full-screen photographic aerial city background plate for an interactive 3D reading room composited separately in front. Generate ONLY scenery, no room.
Primary request: a photorealistic, richly detailed aerial photograph of Tokyo at blue hour, viewed from a high-rise or helicopter looking diagonally downward about 30 degrees over the city.
Composition: wide 16:9 landscape, edge-to-edge scenery with the horizon in the upper fifth. Tokyo Tower glowing softly orange-red in the left third, dense realistic Tokyo rooftops and gentle street lights below, Skytree a much more distant narrow silhouette in the right portion. The center is a spacious vista of lower distant city blocks, suitable for a separate room overlay. No enormous close-up buildings. Clear near/far perspective, crisp architectural detail, realistic street grid and rooftop equipment, believable scale and atmospheric depth.
Style/lighting: natural professional aerial photography, calm indigo twilight sky, warm windows and amber streets; soft cool ambient light with subtle warmth from the upper left. Restrained colors, natural photographic grain and exposure, gentle luminous atmosphere, not oversaturated cyberpunk.
Constraints: city scenery only. No room, floating platform, island, furniture, bookshelves, windows or balcony framing, foreground people, text overlays, captions, logos or watermarks. No illustration, low-poly geometry, miniature/toy, videogame or 3D render appearance. High-resolution photographic realism.
```

## 런던

```text
Use case: photorealistic-natural.
Asset type: full-screen photographic aerial city background plate for an interactive 3D reading room composited separately in front. Generate ONLY scenery, no room.
Primary request: an exquisitely detailed photorealistic aerial photograph of London over Westminster and the River Thames on a softly overcast luminous morning, seen from a high-rise or helicopter looking diagonally downward about 30 degrees.
Composition: wide 16:9 landscape, continuous edge-to-edge photographic cityscape. Horizon near upper fifth, the Elizabeth Tower (Big Ben) and Palace of Westminster towards the left third, the London Eye across the river towards the right third. Broad Thames curves through the city below, recognizable stone architecture, rooftops, tiny bridges, green trees, realistic streets. The center is a spacious vista of distant river and rooftops where an interactive reading room will be separately composited. No huge close-up foreground buildings; gentle depth and perspective.
Style/lighting: professional travel and architectural photography, detailed real stone, brick and glass; pale blue-gray sky with delicate morning haze, softly warm light from upper left and cooler shadows. Restrained neutral color, natural photographic grain, no sepia filter.
Constraints: ONLY city scenery. No room, floating platform, island, furniture, bookshelves, windows or balcony framing, foreground people, text overlays, captions, logos or watermarks. Absolutely no illustration, low-poly buildings, toy miniature, videogame or 3D render appearance. High-resolution photographic realism.
```
