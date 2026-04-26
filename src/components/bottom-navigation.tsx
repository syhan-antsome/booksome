import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../providers/auth-provider';

export type BottomNavKey = 'home' | 'rooms' | 'reading-life' | 'market' | 'profile';

const items: {
  key: BottomNavKey;
  label: string;
  href: '/' | '/rooms' | '/reading-life' | '/market' | '/profile' | '/auth';
  icon: string;
  signedOutHref?: '/auth';
}[] = [
  { key: 'home', label: '홈', href: '/', icon: '🏠' },
  { key: 'rooms', label: '리딩방', href: '/rooms', icon: '📖' },
  { key: 'reading-life', label: '독서생활', href: '/reading-life', icon: '📝', signedOutHref: '/auth' },
  { key: 'market', label: '책마켓', href: '/market', icon: '🛍️' },
  { key: 'profile', label: '나', href: '/profile', icon: '👤', signedOutHref: '/auth' },
];

export function BottomNavigation({ active }: { active: BottomNavKey }) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const isActive = active === item.key;
          const href = !session && item.signedOutHref ? item.signedOutHref : item.href;

          return (
            <Link asChild href={href} key={item.key}>
              <Pressable accessibilityLabel={item.label} style={styles.slot}>
                <View style={[styles.plate, isActive ? styles.plateActive : null]}>
                  <Text style={[styles.icon, isActive ? styles.iconActive : null]}>{item.icon}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.label, isActive ? styles.labelActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.98)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 0,
    paddingTop: 7,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 430,
    minHeight: 78,
    width: '100%',
  },
  slot: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 78,
  },
  plate: {
    alignItems: 'center',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 52,
  },
  plateActive: {
    backgroundColor: '#103D2B',
  },
  icon: {
    color: '#103D2B',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 31,
    textAlign: 'center',
  },
  iconActive: {
    color: '#F7F1E5',
  },
  label: {
    color: 'rgba(16, 61, 43, 0.58)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 13,
  },
  labelActive: {
    color: '#103D2B',
  },
});
