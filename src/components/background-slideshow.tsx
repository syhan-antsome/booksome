import { useEffect, useRef, useState } from 'react';
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
const FADE_OUT_MS = 650;
const FADE_IN_MS = 950;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const indexRef = useRef(0);
  const useNativeDriver = Platform.OS !== 'web';
  const sourceCount = sources.length;
  const source = sources[currentIndex];

  useEffect(() => {
    if (sourceCount <= 1) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let animation: Animated.CompositeAnimation | null = null;

    const scheduleNext = () => {
      timer = setTimeout(() => {
        if (!mounted) return;

        animation = Animated.timing(opacity, {
          duration: FADE_OUT_MS,
          toValue: 0,
          useNativeDriver,
        });

        animation.start(({ finished }) => {
          if (!finished || !mounted) return;

          const nextIndex = (indexRef.current + 1) % sourceCount;
          indexRef.current = nextIndex;
          setCurrentIndex(nextIndex);

          requestAnimationFrame(() => {
            if (!mounted) return;

            animation = Animated.timing(opacity, {
              duration: FADE_IN_MS,
              toValue: 1,
              useNativeDriver,
            });

            animation.start(({ finished: fadeInFinished }) => {
              if (fadeInFinished && mounted) {
                scheduleNext();
              }
            });
          });
        });
      }, SLIDE_HOLD_MS);
    };

    scheduleNext();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      animation?.stop();
    };
  }, [opacity, sourceCount, useNativeDriver]);

  if (!source) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        resizeMode="cover"
        source={source}
        style={[styles.image, { opacity }]}
      />
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
