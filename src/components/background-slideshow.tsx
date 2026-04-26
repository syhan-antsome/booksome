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

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const slideCount = sources.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const opacities = useRef(sources.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))).current;
  const scales = useRef(sources.map(() => new Animated.Value(0))).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (slideCount <= 1) {
      scales[0]?.setValue(0);
      const singleZoom = scales[0]
        ? Animated.timing(scales[0], {
            duration: ZOOM_MS,
            toValue: 1,
            useNativeDriver,
          })
        : null;

      singleZoom?.start();

      return () => {
        singleZoom?.stop();
      };
    }

    let mounted = true;
    const currentIndex = activeIndexRef.current;
    const nextIndex = (currentIndex + 1) % slideCount;

    opacities.forEach((opacity, index) => {
      opacity.setValue(index === currentIndex ? 1 : 0);
    });
    scales[currentIndex]?.setValue(0);
    scales[nextIndex]?.setValue(0);

    const currentZoom = Animated.timing(scales[currentIndex], {
      duration: ZOOM_MS,
      toValue: 1,
      useNativeDriver,
    });

    currentZoom.start();

    const fadeTimer = setTimeout(() => {
      if (!mounted) return;

      const nextZoom = Animated.timing(scales[nextIndex], {
        duration: FADE_MS + 900,
        toValue: 1,
        useNativeDriver,
      });
      const fadeIn = Animated.timing(opacities[nextIndex], {
        duration: FADE_MS,
        toValue: 1,
        useNativeDriver,
      });

      nextZoom.start();
      fadeIn.start();
    }, SLIDE_HOLD_MS);

    const commitTimer = setTimeout(() => {
      if (!mounted) return;

      opacities.forEach((opacity, index) => {
        opacity.setValue(index === nextIndex ? 1 : 0);
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, SLIDE_HOLD_MS + FADE_MS + 120);

    return () => {
      mounted = false;
      clearTimeout(fadeTimer);
      clearTimeout(commitTimer);
      currentZoom.stop();
    };
  }, [activeIndex, opacities, scales, slideCount, useNativeDriver]);

  const imageStyles = useMemo(
    () =>
      sources.map((_, index) => ({
        ...styles.image,
        opacity: opacities[index],
        transform: [
          {
            scale: scales[index].interpolate({
              inputRange: [0, 1],
              outputRange: [1.02, 1.18],
            }),
          },
        ],
      })),
    [opacities, scales, sources],
  );

  if (slideCount === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sources.map((source, index) => (
        <Animated.Image
          key={index}
          resizeMode="cover"
          source={source}
          style={imageStyles[index]}
        />
      ))}
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
