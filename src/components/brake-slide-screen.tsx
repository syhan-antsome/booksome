import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';

const brakeSlideIn = SlideInDown.duration(620).easing(Easing.bezier(0.08, 0.86, 0.12, 1));

export function BrakeSlideScreen({ children }: PropsWithChildren) {
  return (
    <Animated.View entering={brakeSlideIn} style={styles.screen}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
