import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
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
  { key: 'rooms', label: '북룸', href: '/rooms', icon: '📖' },
  { key: 'reading-life', label: '독서생활', href: '/reading-life', icon: '📝', signedOutHref: '/auth' },
  { key: 'market', label: '책가게', href: '/market', icon: '🛍️' },
  { key: 'profile', label: '나', href: '/profile', icon: '👤', signedOutHref: '/auth' },
];

export function BottomNavigation({ active }: { active: BottomNavKey }) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

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
    backgroundColor: 'rgba(13, 47, 34, 0.72)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 430,
    minHeight: 66,
    width: '100%',
  },
  slot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 66,
  },
  plate: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.12)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 48,
  },
  plateActive: {
    backgroundColor: 'rgba(247, 241, 229, 0.9)',
  },
  icon: {
    color: '#F7F1E5',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 30,
    textAlign: 'center',
  },
  iconActive: {
    color: '#103D2B',
  },
});
