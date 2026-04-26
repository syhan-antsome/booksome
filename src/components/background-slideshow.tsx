import { useEffect, useMemo, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type BackgroundSlideshowProps = {
  sources: ImageSourcePropType[];
};

const SLIDE_HOLD_MS = 7000;
const FADE_MS = 1800;
const ZOOM_MS = SLIDE_HOLD_MS + FADE_MS + 1000;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const currentOpacity = useSharedValue(1);
  const incomingOpacity = useSharedValue(0);
  const currentScale = useSharedValue(1.02);
  const incomingScale = useSharedValue(1.02);
  const slideCount = sources.length;

  useEffect(() => {
    if (slideCount <= 1) return;

    let mounted = true;
    const nextIndex = (currentIndex + 1) % slideCount;

    currentOpacity.value = 1;
    incomingOpacity.value = 0;
    currentScale.value = 1.02;
    incomingScale.value = 1.02;
    currentScale.value = withTiming(1.18, {
      duration: ZOOM_MS,
      easing: Easing.out(Easing.cubic),
    });

    const showIncomingTimer = setTimeout(() => {
      if (!mounted) return;

      setIncomingIndex(nextIndex);
      incomingOpacity.value = 0;
      incomingScale.value = 1.02;
      incomingOpacity.value = withTiming(1, {
        duration: FADE_MS,
        easing: Easing.inOut(Easing.cubic),
      });
      incomingScale.value = withTiming(1.12, {
        duration: FADE_MS + 700,
        easing: Easing.out(Easing.cubic),
      });
    }, SLIDE_HOLD_MS);

    const commitTimer = setTimeout(() => {
      if (!mounted) return;

      setCurrentIndex(nextIndex);
      currentScale.value = 1.02;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!mounted) return;

          setIncomingIndex(null);
          incomingOpacity.value = 0;
          incomingScale.value = 1.02;
        });
      });
    }, SLIDE_HOLD_MS + FADE_MS + 80);

    return () => {
      mounted = false;
      clearTimeout(showIncomingTimer);
      clearTimeout(commitTimer);
      cancelAnimation(currentOpacity);
      cancelAnimation(incomingOpacity);
      cancelAnimation(currentScale);
      cancelAnimation(incomingScale);
    };
  }, [currentIndex, currentOpacity, currentScale, incomingOpacity, incomingScale, slideCount]);

  const currentStyle = useAnimatedStyle(() => ({
    opacity: currentOpacity.value,
    transform: [{ scale: currentScale.value }],
  }));
  const incomingStyle = useAnimatedStyle(() => ({
    opacity: incomingOpacity.value,
    transform: [{ scale: incomingScale.value }],
  }));
  const currentSource = sources[currentIndex];
  const incomingSource = useMemo(
    () => (incomingIndex === null ? null : sources[incomingIndex]),
    [incomingIndex, sources],
  );

  if (!currentSource) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        resizeMode="cover"
        source={currentSource}
        style={[styles.image, currentStyle]}
      />
      {incomingSource ? (
        <Animated.Image
          resizeMode="cover"
          source={incomingSource}
          style={[styles.image, incomingStyle]}
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
