import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabForPath, tabOrder, tabPaths, tabSlideDirection, type BottomNavKey } from '../lib/tab-navigation';
import { booksomeLayout, booksomeColors as c } from '../theme/booksome';
export type { BottomNavKey } from '../lib/tab-navigation';

const labels = ['내 서재', '책 이야기', '나'];
const icons = ['book-outline', 'chatbubbles-outline', 'person-outline'] as const;
const selectedIcons = ['book', 'chatbubbles', 'person'] as const;

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
        <View style={[styles.icon, active === key && styles.selectedIcon]}><Ionicons name={active === key ? selectedIcons[index] : icons[index]} size={25} color={active === key ? c.action : c.muted} /></View>
        <Text style={[styles.label, active === key && styles.active]}>{labels[index]}</Text>
      </Pressable>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: 8, alignItems: 'center' },
  bar: { flexDirection: 'row', width: '100%', maxWidth: booksomeLayout.maxContentWidth, paddingHorizontal: 10 },
  tab: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 64, height: 36, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  selectedIcon: { backgroundColor: c.accentSoft },
  label: { color: c.muted, fontSize: 11, fontWeight: '500' },
  active: { color: c.action, fontWeight: '700' },
});
