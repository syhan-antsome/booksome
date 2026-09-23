import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabForPath, tabOrder, tabPaths, tabSlideDirection, type BottomNavKey } from '../lib/tab-navigation';
import { booksomeColors as c, booksomeLayout } from '../theme/booksome';
export type { BottomNavKey } from '../lib/tab-navigation';

const labels = ['오늘', '내 서재', '기록', '북룸', '나'];
const icons = ['home-outline', 'library-outline', 'reader-outline', 'people-outline', 'person-outline'] as const;
const selectedIcons = ['home', 'library', 'reader', 'people', 'person'] as const;

export function BottomNavigation({ active }: { active: BottomNavKey }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [keyboard, setKeyboard] = useState(false);
  const current = useRef(active);
  current.current = active;
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);
  if (keyboard) return null;
  return <View testID="bottom-navigation" style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
    <View accessibilityRole="tablist" style={styles.bar}>
      {tabOrder.map((key, index) => <Pressable key={key} accessibilityRole="tab" accessibilityLabel={labels[index]} accessibilityState={{ selected: active === key }} onPress={() => {
        const direction = tabSlideDirection(current.current, key);
        if (direction === 'none' && tabForPath(pathname) === key) return;
        current.current = key;
        router.replace({ pathname: tabPaths[index], params: { tabSlide: direction } });
      }} style={styles.tab}>
        <Ionicons name={active === key ? selectedIcons[index] : icons[index]} size={25} color={active === key ? c.forest : '#85877C'} />
        <Text style={[styles.label, active === key && styles.active]}>{labels[index]}</Text>
        <View style={[styles.dot, { opacity: active === key ? 1 : 0 }]} />
      </Pressable>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, backgroundColor: c.paperStrong, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(20,62,50,0.1)', paddingTop: 10, alignItems: 'center' },
  bar: { flexDirection: 'row', width: '100%', maxWidth: booksomeLayout.maxContentWidth, paddingHorizontal: 10 },
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { color: '#72786E', fontSize: 11, fontWeight: '500' },
  active: { color: c.forest, fontWeight: '700' },
  dot: { backgroundColor: c.forest, width: 4, height: 4, borderRadius: 2 },
});
