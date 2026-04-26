import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
const MOTION_MS = 8500;

export function BackgroundSlideshow({ sources }: BackgroundSlideshowProps) {
  const sourceCount = sources.length;
  const activeIndexRef = useRef(0);
  const opacities = useRef(
    sources.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
  ).current;
  const motions = useRef(sources.map(() => new Animated.Value(0))).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (sourceCount === 0) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const runningAnimations: Animated.CompositeAnimation[] = [];

    motions.forEach((motionValue) => {
      motionValue.setValue(0);
      const motion = Animated.loop(
        Animated.sequence([
          Animated.timing(motionValue, {
            duration: MOTION_MS,
            easing: Easing.linear,
            toValue: 1,
            useNativeDriver,
          }),
          Animated.timing(motionValue, {
            duration: MOTION_MS,
            easing: Easing.linear,
            toValue: 0,
            useNativeDriver,
          }),
        ]),
      );

      runningAnimations.push(motion);
      motion.start();
    });

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
          scheduleTransition();
        });
      }, SLIDE_HOLD_MS);
    };

    opacities.forEach((opacity, index) => {
      opacity.setValue(index === activeIndexRef.current ? 1 : 0);
    });

    if (sourceCount > 1) {
      scheduleTransition();
    }

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
          outputRange: [1, 1.22],
        }),
      },
    ];
  }

  if (index % 3 === 1) {
    return [
      {
        scale: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [1.24, 1.02],
        }),
      },
    ];
  }

  return [
    { scale: 1.16 },
    {
      translateY: motion.interpolate({
        inputRange: [0, 1],
        outputRange: [-34, 26],
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
