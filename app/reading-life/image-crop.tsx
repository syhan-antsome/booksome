import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type PanResponderGestureState,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearReadingImageCropRequest,
  completeReadingImageCrop,
  getReadingImageCropRequest,
  type ReadingImageCropAsset,
  type ReadingImageCropTarget,
} from '../../src/state/reading-image-crop';

const imageCropMaxOutputWidth = 1600;
const imageCropMaxScale = 4;
const cropFrameMinScale = 0.38;

type ImageCropTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

type ImageCropGesture = {
  startDistance: number;
  startScale: number;
  startTranslateX: number;
  startTranslateY: number;
  startX: number;
  startY: number;
  touchCount: number;
};

type CropFrameResizeEdge = 'top' | 'bottom';

type CropFrameResizeGesture = {
  edge: CropFrameResizeEdge;
  startHeight: number;
  startTop: number;
};

export default function ReadingImageCropScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const cropToken = Array.isArray(token) ? token[0] : token;
  const request = getReadingImageCropRequest(cropToken);
  const windowSize = useWindowDimensions();
  const cropFrameWidth = Math.max(260, windowSize.width - 32);
  const cropMaxFrameHeight = Math.min(600, Math.max(360, windowSize.height - 250));
  const [cropFrameScale, setCropFrameScale] = useState(1);
  const [cropFrameTop, setCropFrameTop] = useState(0);
  const cropFrameHeight = cropMaxFrameHeight * cropFrameScale;
  const cropMinFrameHeight = cropMaxFrameHeight * cropFrameMinScale;
  const cropImageLayout = getCropImageLayout(request?.asset ?? null, cropFrameWidth, cropMaxFrameHeight);
  const [imageCropTransform, setImageCropTransform] = useState<ImageCropTransform>(() => createInitialImageCropTransform());
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cropFrameScaleRef = useRef(1);
  const cropFrameTopRef = useRef(0);
  const cropFrameResizeGestureRef = useRef<CropFrameResizeGesture | null>(null);
  const imageCropTransformRef = useRef<ImageCropTransform>(createInitialImageCropTransform());
  const imageCropGestureRef = useRef<ImageCropGesture | null>(null);

  const setTrackedImageCropTransform = useCallback((nextTransform: ImageCropTransform) => {
    imageCropTransformRef.current = nextTransform;
    setImageCropTransform(nextTransform);
  }, []);

  const updateTrackedImageCropTransform = useCallback((updater: (current: ImageCropTransform) => ImageCropTransform) => {
    const nextTransform = updater(imageCropTransformRef.current);
    imageCropTransformRef.current = nextTransform;
    setImageCropTransform(nextTransform);
  }, []);

  const constrainCurrentTransform = useCallback(
    (transform: ImageCropTransform) =>
      constrainImageCropTransform(
        transform,
        request?.asset ?? null,
        cropFrameWidth,
        cropMaxFrameHeight,
        cropFrameTop,
        cropFrameHeight,
      ),
    [cropFrameHeight, cropFrameTop, cropFrameWidth, cropMaxFrameHeight, request?.asset],
  );

  const cropResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(request),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Boolean(request) && (Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1),
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          const center = getTouchCenter(touches);
          imageCropGestureRef.current = {
            startDistance: getTouchDistance(touches),
            startScale: imageCropTransformRef.current.scale,
            startTranslateX: imageCropTransformRef.current.translateX,
            startTranslateY: imageCropTransformRef.current.translateY,
            startX: center?.x ?? gestureState.x0,
            startY: center?.y ?? gestureState.y0,
            touchCount: touches.length,
          };
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          const gesture = imageCropGestureRef.current;

          if (!gesture) return;

          if (touches.length >= 2) {
            const distance = getTouchDistance(touches);
            const center = getTouchCenter(touches);

            if (gesture.touchCount < 2 || gesture.startDistance <= 0 || !center) {
              imageCropGestureRef.current = createGestureSnapshot(touches, gestureState, imageCropTransformRef.current);
              return;
            }

            const nextScale = clampNumber(
              gesture.startScale * (distance / gesture.startDistance),
              1,
              imageCropMaxScale,
            );
            const nextTransform = constrainCurrentTransform({
              scale: nextScale,
              translateX: gesture.startTranslateX + center.x - gesture.startX,
              translateY: gesture.startTranslateY + center.y - gesture.startY,
            });
            setTrackedImageCropTransform(nextTransform);
            setErrorMessage(null);
            return;
          }

          if (gesture.touchCount !== 1) {
            imageCropGestureRef.current = createGestureSnapshot(touches, gestureState, imageCropTransformRef.current);
            return;
          }

          const nextTransform = constrainCurrentTransform({
            ...imageCropTransformRef.current,
            translateX: gesture.startTranslateX + gestureState.dx,
            translateY: gesture.startTranslateY + gestureState.dy,
          });
          setTrackedImageCropTransform(nextTransform);
          setErrorMessage(null);
        },
        onPanResponderRelease: () => {
          imageCropGestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          imageCropGestureRef.current = null;
        },
      }),
    [constrainCurrentTransform, request, setTrackedImageCropTransform],
  );

  const setTrackedCropFrameBounds = useCallback((nextTop: number, nextHeight: number) => {
    const clampedHeight = clampNumber(nextHeight, cropMinFrameHeight, cropMaxFrameHeight);
    const clampedTop = clampNumber(nextTop, 0, cropMaxFrameHeight - clampedHeight);
    const clampedScale = clampedHeight / cropMaxFrameHeight;
    cropFrameTopRef.current = clampedTop;
    cropFrameScaleRef.current = clampedScale;
    setCropFrameTop(clampedTop);
    setCropFrameScale(clampedScale);
  }, [cropMaxFrameHeight, cropMinFrameHeight]);

  const constrainImageAfterFrameResize = useCallback(() => {
    updateTrackedImageCropTransform((currentTransform) =>
      constrainImageCropTransform(
        currentTransform,
        request?.asset ?? null,
        cropFrameWidth,
        cropMaxFrameHeight,
        cropFrameTopRef.current,
        cropMaxFrameHeight * cropFrameScaleRef.current,
      ),
    );
  }, [cropFrameWidth, cropMaxFrameHeight, request?.asset, updateTrackedImageCropTransform]);

  const createFrameResizeResponder = useCallback(
    (edge: CropFrameResizeEdge) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(request),
        onMoveShouldSetPanResponder: () => Boolean(request),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          imageCropGestureRef.current = null;
          cropFrameResizeGestureRef.current = {
            edge,
            startHeight: cropMaxFrameHeight * cropFrameScaleRef.current,
            startTop: cropFrameTopRef.current,
          };
        },
        onPanResponderMove: (_event, gestureState) => {
          const gesture = cropFrameResizeGestureRef.current;

          if (!gesture) return;

          if (gesture.edge === 'top') {
            const startBottom = gesture.startTop + gesture.startHeight;
            const nextTop = clampNumber(gesture.startTop + gestureState.dy, 0, startBottom - cropMinFrameHeight);
            setTrackedCropFrameBounds(nextTop, startBottom - nextTop);
            setErrorMessage(null);
            return;
          }

          const nextHeight = clampNumber(
            gesture.startHeight + gestureState.dy,
            cropMinFrameHeight,
            cropMaxFrameHeight - gesture.startTop,
          );
          setTrackedCropFrameBounds(gesture.startTop, nextHeight);
          setErrorMessage(null);
        },
        onPanResponderRelease: () => {
          constrainImageAfterFrameResize();
          cropFrameResizeGestureRef.current = null;
        },
        onPanResponderTerminate: () => {
          constrainImageAfterFrameResize();
          cropFrameResizeGestureRef.current = null;
        },
      }),
    [constrainImageAfterFrameResize, cropMaxFrameHeight, cropMinFrameHeight, request, setTrackedCropFrameBounds],
  );

  const topResizeResponder = useMemo(
    () => createFrameResizeResponder('top'),
    [createFrameResizeResponder],
  );
  const bottomResizeResponder = useMemo(
    () => createFrameResizeResponder('bottom'),
    [createFrameResizeResponder],
  );

  const resetCrop = () => {
    setTrackedImageCropTransform(createInitialImageCropTransform());
    cropFrameTopRef.current = 0;
    cropFrameScaleRef.current = 1;
    setCropFrameTop(0);
    setCropFrameScale(1);
    cropFrameResizeGestureRef.current = null;
    imageCropGestureRef.current = null;
    setErrorMessage(null);
  };

  const closeCrop = () => {
    clearReadingImageCropRequest(cropToken);
    router.back();
  };

  const applyCrop = async () => {
    if (!request || !cropToken) return;

    setIsApplying(true);
    setErrorMessage(null);

    try {
      const croppedAsset = await cropAndResizeImageAsset(
        request.asset,
        imageCropTransform,
        cropFrameWidth,
        cropMaxFrameHeight,
        cropFrameTop,
        cropFrameHeight,
        request.target,
      );
      completeReadingImageCrop({
        asset: croppedAsset,
        shouldReplace: request.shouldReplace,
        target: request.target,
        token: cropToken,
      });
      router.back();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '사진을 다듬지 못했습니다.'));
    } finally {
      setIsApplying(false);
    }
  };

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>다듬을 사진이 없습니다.</Text>
          <Pressable onPress={() => router.back()} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={closeCrop} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>BOOKSOME EDIT</Text>
          <Text style={styles.title}>사진 다듬기</Text>
        </View>
        <Pressable onPress={resetCrop} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>원본</Text>
        </Pressable>
      </View>

      <View style={styles.cropStage}>
        <View
          style={[
            styles.cropCanvas,
            {
              height: cropMaxFrameHeight,
              width: cropFrameWidth,
            },
          ]}
        >
          <View
            style={[
              styles.cropFrameShell,
              {
                height: cropFrameHeight,
                top: cropFrameTop,
                width: cropFrameWidth,
              },
            ]}
          >
            <View style={styles.cropFrame} {...cropResponder.panHandlers}>
              {cropImageLayout ? (
                <View
                  style={[
                    styles.cropImageLayer,
                    {
                      height: cropImageLayout.height,
                      left: cropImageLayout.left + imageCropTransform.translateX,
                      top: cropImageLayout.top + imageCropTransform.translateY - cropFrameTop,
                      transform: [{ scale: imageCropTransform.scale }],
                      width: cropImageLayout.width,
                    },
                  ]}
                >
                  <Image resizeMode="stretch" source={{ uri: request.asset.uri }} style={styles.cropImage} />
                </View>
              ) : null}
              <View pointerEvents="none" style={styles.cropBorder} />
            </View>
            <View style={[styles.resizeHandle, styles.resizeHandleTop]} {...topResizeResponder.panHandlers}>
              <View style={styles.resizeHandleGlow} />
              <View style={styles.resizeHandleBar} />
            </View>
            <View style={[styles.resizeHandle, styles.resizeHandleBottom]} {...bottomResizeResponder.panHandlers}>
              <View style={styles.resizeHandleGlow} />
              <View style={styles.resizeHandleBar} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.guideText}>사진은 손으로 이동 · 확대하고, 위/아래 가장자리를 끌어 창 높이를 조절하세요.</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <Pressable disabled={isApplying} onPress={applyCrop} style={[styles.applyButton, isApplying ? styles.disabled : null]}>
          {isApplying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.applyButtonText}>다듬기 완료</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createInitialImageCropTransform(): ImageCropTransform {
  return {
    scale: 1,
    translateX: 0,
    translateY: 0,
  };
}

function createGestureSnapshot(
  touches: GestureResponderEvent['nativeEvent']['touches'],
  gestureState: PanResponderGestureState,
  transform: ImageCropTransform,
): ImageCropGesture {
  const center = getTouchCenter(touches);
  return {
    startDistance: getTouchDistance(touches),
    startScale: transform.scale,
    startTranslateX: transform.translateX,
    startTranslateY: transform.translateY,
    startX: center?.x ?? (gestureState.moveX || gestureState.x0),
    startY: center?.y ?? (gestureState.moveY || gestureState.y0),
    touchCount: touches.length,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCropImageLayout(asset: ReadingImageCropAsset | null, frameWidth: number, frameHeight: number) {
  if (!asset?.width || !asset.height || asset.width <= 0 || asset.height <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    return null;
  }

  const baseScale = Math.max(frameWidth / asset.width, frameHeight / asset.height);
  const width = asset.width * baseScale;
  const height = asset.height * baseScale;
  return {
    baseScale,
    height,
    left: (frameWidth - width) / 2,
    top: (frameHeight - height) / 2,
    width,
  };
}

function constrainImageCropTransform(
  transform: ImageCropTransform,
  asset: ReadingImageCropAsset | null,
  frameWidth: number,
  canvasHeight: number,
  cropTop: number,
  cropHeight: number,
): ImageCropTransform {
  const layout = getCropImageLayout(asset, frameWidth, canvasHeight);
  const scale = clampNumber(transform.scale, 1, imageCropMaxScale);

  if (!layout) {
    return {
      scale,
      translateX: 0,
      translateY: 0,
    };
  }

  const scaledWidth = layout.width * scale;
  const scaledHeight = layout.height * scale;
  const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
  const minTranslateY = cropTop + cropHeight - canvasHeight / 2 - scaledHeight / 2;
  const maxTranslateY = cropTop - canvasHeight / 2 + scaledHeight / 2;

  return {
    scale,
    translateX: clampNumber(transform.translateX, -maxTranslateX, maxTranslateX),
    translateY: clampNumber(transform.translateY, minTranslateY, maxTranslateY),
  };
}

function getTouchDistance(touches: GestureResponderEvent['nativeEvent']['touches']) {
  if (touches.length < 2) return 0;

  const [firstTouch, secondTouch] = touches;
  return Math.hypot(firstTouch.pageX - secondTouch.pageX, firstTouch.pageY - secondTouch.pageY);
}

function getTouchCenter(touches: GestureResponderEvent['nativeEvent']['touches']) {
  if (touches.length === 0) return null;

  const total = touches.reduce(
    (sum, touch) => ({
      x: sum.x + touch.pageX,
      y: sum.y + touch.pageY,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / touches.length,
    y: total.y / touches.length,
  };
}

async function cropAndResizeImageAsset(
  asset: ReadingImageCropAsset,
  transform: ImageCropTransform,
  frameWidth: number,
  canvasHeight: number,
  cropTop: number,
  cropWindowHeight: number,
  target: ReadingImageCropTarget,
): Promise<ReadingImageCropAsset> {
  const assetWithSize = await resolveImageAssetSize(asset);
  const sourceWidth = Math.max(1, Math.round(assetWithSize.width ?? 1));
  const sourceHeight = Math.max(1, Math.round(assetWithSize.height ?? 1));
  const layout = getCropImageLayout(assetWithSize, frameWidth, canvasHeight);

  if (!layout) {
    return assetWithSize;
  }

  const constrainedTransform = constrainImageCropTransform(
    transform,
    assetWithSize,
    frameWidth,
    canvasHeight,
    cropTop,
    cropWindowHeight,
  );
  const totalScale = layout.baseScale * constrainedTransform.scale;
  const imageLeft = frameWidth / 2 - (layout.width * constrainedTransform.scale) / 2 + constrainedTransform.translateX;
  const imageTop = canvasHeight / 2 - (layout.height * constrainedTransform.scale) / 2 + constrainedTransform.translateY;
  const originX = clampNumber(Math.round(-imageLeft / totalScale), 0, sourceWidth - 1);
  const originY = clampNumber(Math.round((cropTop - imageTop) / totalScale), 0, sourceHeight - 1);
  const cropWidth = Math.max(1, Math.min(sourceWidth - originX, Math.round(frameWidth / totalScale)));
  const cropHeight = Math.max(1, Math.min(sourceHeight - originY, Math.round(cropWindowHeight / totalScale)));
  const cropActions: Parameters<typeof manipulateAsync>[1] = [
    {
      crop: {
        height: cropHeight,
        originX,
        originY,
        width: cropWidth,
      },
    },
  ];

  if (cropWidth > imageCropMaxOutputWidth) {
    cropActions.push({
      resize: {
        width: imageCropMaxOutputWidth,
      },
    });
  }

  const result = await manipulateAsync(assetWithSize.uri, cropActions, {
    compress: target === 'highlight' ? 0.88 : 0.9,
    format: SaveFormat.JPEG,
  });

  return {
    fileName: `booksome-${target}-${Date.now()}.jpg`,
    height: result.height,
    mimeType: 'image/jpeg',
    uri: result.uri,
    width: result.width,
  };
}

async function resolveImageAssetSize(asset: ReadingImageCropAsset): Promise<ReadingImageCropAsset> {
  if (asset.width && asset.height && asset.width > 0 && asset.height > 0) {
    return asset;
  }

  const size = await getImageSize(asset.uri);
  return {
    ...asset,
    height: size.height,
    width: size.width,
  };
}

function getImageSize(uri: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ height, width }),
      (error) => reject(error),
    );
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#EEF1DF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,241,229,0.84)',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerButtonText: {
    color: '#103D2B',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 34,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#8B7653',
    fontSize: 10,
    fontWeight: '900',
  },
  title: {
    color: '#14251B',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  resetButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  resetButtonText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  cropStage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cropCanvas: {
    position: 'relative',
  },
  cropFrameShell: {
    left: 0,
    position: 'absolute',
  },
  cropFrame: {
    backgroundColor: '#162018',
    borderColor: 'rgba(16,61,43,0.1)',
    borderRadius: 24,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cropImageLayer: {
    position: 'absolute',
  },
  cropImage: {
    height: '100%',
    width: '100%',
  },
  cropBorder: {
    borderColor: 'rgba(255,247,218,0.72)',
    borderRadius: 24,
    borderWidth: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  resizeHandle: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
  resizeHandleTop: {
    top: -8,
  },
  resizeHandleBottom: {
    bottom: -8,
  },
  resizeHandleGlow: {
    backgroundColor: 'rgba(255,247,218,0.18)',
    borderRadius: 999,
    height: 28,
    position: 'absolute',
    width: 104,
  },
  resizeHandleBar: {
    backgroundColor: 'rgba(255,247,218,0.92)',
    borderRadius: 999,
    height: 5,
    width: 78,
  },
  footer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 8,
  },
  guideText: {
    color: '#6D766F',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 999,
    height: 50,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.52,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
