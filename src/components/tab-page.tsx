import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { tabSlideOffset } from '../lib/tab-navigation';
import { booksomeColors } from '../theme/booksome';

const MotionContext = createContext(false);
export function MotionPreference({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>;
}
export function useReducedMotion() { return useContext(MotionContext); }

// Native-stack's left slide is Android-only. The same content animation on
// all platforms keeps the shared bottom navigation stationary.
export function TabPage({ children }: { children: ReactNode }) {
  const { tabSlide } = useLocalSearchParams<{ tabSlide?: string }>();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const offset = tabSlideOffset(tabSlide, width, reduced);
  const position = useRef(new Animated.Value(offset)).current;
  const entered = useRef(false);
  useFocusEffect(useCallback(() => {
    if (entered.current) { position.setValue(0); return; }
    entered.current = true;
    position.setValue(offset);
    if (offset) Animated.timing(position, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    return () => { position.stopAnimation(); position.setValue(0); };
  }, [offset, position]));
  return <Animated.View testID="tab-page" style={[styles.page, { transform: [{ translateX: position }] }]}>{children}</Animated.View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: booksomeColors.paper } });
