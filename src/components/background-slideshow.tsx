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

const SLIDE_HOLD_MS = 3000;
const FADE_MS = 1400;
const MOTION_MS = SLIDE_HOLD_MS + FADE_MS + 220;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const sourceCount = sources.length;
  const activeIndexRef = useRef(0);
  const opacities = useRef(
    sources.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
  ).current;
  const motions = useRef(sources.map(() => new Animated.Value(0))).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (sourceCount <= 1) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const runningAnimations: Animated.CompositeAnimation[] = [];

    const startMotion = (index: number) => {
      motions[index]?.setValue(0);
      const motion = Animated.timing(motions[index], {
        duration: MOTION_MS,
        toValue: 1,
        useNativeDriver,
      });

      runningAnimations.push(motion);
      motion.start();
    };

    const scheduleTransition = () => {
      timer = setTimeout(() => {
        if (!mounted) return;

        const currentIndex = activeIndexRef.current;
        const nextIndex = (currentIndex + 1) % sourceCount;

        opacities[nextIndex]?.setValue(0);
        const fade = Animated.parallel([
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

        runningAnimations.push(fade);
        fade.start(({ finished }) => {
          if (!finished || !mounted) return;

          opacities.forEach((opacity, index) => {
            opacity.setValue(index === nextIndex ? 1 : 0);
          });
          activeIndexRef.current = nextIndex;
          startMotion(nextIndex);
          scheduleTransition();
        });
      }, SLIDE_HOLD_MS);
    };

    opacities.forEach((opacity, index) => {
      opacity.setValue(index === activeIndexRef.current ? 1 : 0);
    });
    startMotion(activeIndexRef.current);
    scheduleTransition();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      runningAnimations.forEach((animation) => animation.stop());
    };
  }, [motions, opacities, sourceCount, useNativeDriver]);

  const imageStyles = useMemo(
    () =>
      sources.map((_, index) => ({
        ...styles.image,
        opacity: opacities[index],
        transform: getSlideTransform(index, motions[index]),
      })),
    [motions, opacities, sources],
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

function getSlideTransform(index: number, motion: Animated.Value) {
  if (index % 3 === 0) {
    return [
      {
        scale: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1.02, 1.18],
        }),
      },
    ];
  }

  if (index % 3 === 1) {
    return [
      {
        scale: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1.18, 1.03],
        }),
      },
    ];
  }

  return [
    { scale: 1.12 },
    {
      translateY: motion.interpolate({
        inputRange: [0, 1],
        outputRange: [-22, 18],
      }),
    },
  ];
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
