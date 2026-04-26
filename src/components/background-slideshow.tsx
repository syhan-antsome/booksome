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

const SLIDE_HOLD_MS = 6500;
const FADE_MS = 1400;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const sourceCount = sources.length;
  const activeIndexRef = useRef(0);
  const [cycle, setCycle] = useState(0);
  const opacities = useRef(
    sources.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
  ).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (sourceCount <= 1) return;

    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    const currentIndex = activeIndexRef.current;
    const nextIndex = (currentIndex + 1) % sourceCount;

    const timer = setTimeout(() => {
      if (!mounted) return;

      opacities[nextIndex]?.setValue(0);
      animation = Animated.parallel([
        Animated.timing(opacities[currentIndex], {
          duration: FADE_MS,
          toValue: 0,
          useNativeDriver,
        }),
        Animated.timing(opacities[nextIndex], {
          duration: FADE_MS,
          toValue: 1,
          useNativeDriver,
        }),
      ]);

      animation.start(({ finished }) => {
        if (!finished || !mounted) return;

        opacities.forEach((opacity, index) => {
          opacity.setValue(index === nextIndex ? 1 : 0);
        });
        activeIndexRef.current = nextIndex;
        setCycle((value) => value + 1);
      });
    }, SLIDE_HOLD_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [cycle, opacities, sourceCount, useNativeDriver]);

  const imageStyles = useMemo(
    () =>
      sources.map((_, index) => ({
        ...styles.image,
        opacity: opacities[index],
      })),
    [opacities, sources],
  );

  if (sourceCount === 0) return null;

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
