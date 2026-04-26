import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

type BackgroundSlideshowProps = {
  sources: ImageSourcePropType[];
};

const SLIDE_HOLD_MS = 7000;
const FADE_MS = 1800;
const ZOOM_MS = SLIDE_HOLD_MS + FADE_MS + 1200;
const LAYER_SETTLE_MS = 220;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const currentScale = useRef(new Animated.Value(0)).current;
  const incomingOpacity = useRef(new Animated.Value(0)).current;
  const incomingScale = useRef(new Animated.Value(0)).current;
  const slideCount = sources.length;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (slideCount <= 1) return;

    let mounted = true;
    let fadeAnimation: Animated.CompositeAnimation | null = null;
    let incomingScaleAnimation: Animated.CompositeAnimation | null = null;
    let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
    const nextIndex = (currentIndex + 1) % slideCount;

    currentScale.setValue(0);
    incomingOpacity.setValue(0);
    incomingScale.setValue(0);

    const currentScaleAnimation = Animated.timing(currentScale, {
      duration: ZOOM_MS,
      toValue: 1,
      useNativeDriver,
    });

    currentScaleAnimation.start();

    const showIncomingTimer = setTimeout(() => {
      if (!mounted) return;

      setIncomingIndex(nextIndex);
      incomingOpacity.setValue(0);
      incomingScale.setValue(0);

      requestAnimationFrame(() => {
        if (!mounted) return;

        fadeAnimation = Animated.timing(incomingOpacity, {
          duration: FADE_MS,
          toValue: 1,
          useNativeDriver,
        });
        incomingScaleAnimation = Animated.timing(incomingScale, {
          duration: FADE_MS + 900,
          toValue: 1,
          useNativeDriver,
        });

        fadeAnimation.start();
        incomingScaleAnimation.start();
      });
    }, SLIDE_HOLD_MS);

    const commitTimer = setTimeout(() => {
      if (!mounted) return;

      setCurrentIndex(nextIndex);
      currentScale.setValue(0);

      cleanupTimer = setTimeout(() => {
        if (!mounted) return;

        setIncomingIndex(null);
        incomingOpacity.setValue(0);
        incomingScale.setValue(0);
      }, LAYER_SETTLE_MS);
    }, SLIDE_HOLD_MS + FADE_MS + LAYER_SETTLE_MS);

    return () => {
      mounted = false;
      clearTimeout(showIncomingTimer);
      clearTimeout(commitTimer);
      if (cleanupTimer) clearTimeout(cleanupTimer);
      currentScaleAnimation.stop();
      fadeAnimation?.stop();
      incomingScaleAnimation?.stop();
    };
  }, [currentIndex, currentScale, incomingOpacity, incomingScale, slideCount, useNativeDriver]);

  const currentSource = sources[currentIndex];
  const incomingSource = useMemo(
    () => (incomingIndex === null ? null : sources[incomingIndex]),
    [incomingIndex, sources],
  );
  const currentImageStyle = useMemo(
    () => ({
      ...styles.image,
      transform: [
        {
          scale: currentScale.interpolate({
            inputRange: [0, 1],
            outputRange: [1.02, 1.18],
          }),
        },
      ],
    }),
    [currentScale],
  );
  const incomingImageStyle = useMemo(
    () => ({
      ...styles.image,
      opacity: incomingOpacity,
      transform: [
        {
          scale: incomingScale.interpolate({
            inputRange: [0, 1],
            outputRange: [1.02, 1.12],
          }),
        },
      ],
    }),
    [incomingOpacity, incomingScale],
  );

  if (!currentSource) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        resizeMode="cover"
        source={currentSource}
        style={currentImageStyle}
      />
      {incomingSource ? (
        <Animated.Image
          resizeMode="cover"
          source={incomingSource}
          style={incomingImageStyle}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    bottom: -32,
    height: '112%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: -32,
    width: '100%',
  },
});
