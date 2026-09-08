import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../providers/auth-provider';
import { booksomeColors, booksomeLayout } from '../theme/booksome';

export type BottomNavKey = 'today' | 'library' | 'record' | 'rooms' | 'profile';

type NavItem = {
  key: BottomNavKey;
  label: string;
  href: '/' | '/library' | '/record' | '/rooms' | '/profile';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  signedOutHref?: '/auth';
};

const items: NavItem[] = [
  { key: 'today', label: '오늘', href: '/', icon: 'sunny-outline', activeIcon: 'sunny' },
  { key: 'library', label: '내 서재', href: '/library', icon: 'library-outline', activeIcon: 'library' },
  {
    key: 'record',
    label: '기록',
    href: '/record',
    icon: 'create-outline',
    activeIcon: 'create',
    signedOutHref: '/auth',
  },
  { key: 'rooms', label: '북룸', href: '/rooms', icon: 'book-outline', activeIcon: 'book' },
  {
    key: 'profile',
    label: '나',
    href: '/profile',
    icon: 'person-outline',
    activeIcon: 'person',
    signedOutHref: '/auth',
  },
];

export function BottomNavigation({ active }: { active: BottomNavKey }) {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (isKeyboardVisible) return null;

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const isActive = active === item.key;
          const isRecord = item.key === 'record';
          const href = !session && item.signedOutHref ? item.signedOutHref : item.href;

          return (
            <Link asChild href={href} key={item.key}>
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={StyleSheet.flatten([styles.slot, isRecord ? styles.recordSlot : null])}
              >
                <View
                  style={[
                    styles.iconPlate,
                    isRecord ? styles.recordPlate : null,
                    isRecord && isActive ? styles.recordPlateActive : null,
                  ]}
                >
                  <Ionicons
                    color={isRecord ? booksomeColors.white : isActive ? booksomeColors.forest : '#687168'}
                    name={isActive ? item.activeIcon : item.icon}
                    size={isRecord ? 28 : 23}
                  />
                </View>
                <Text style={[styles.label, isActive ? styles.labelActive : null, isRecord ? styles.recordLabel : null]}>
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
    backgroundColor: 'rgba(255,253,248,0.98)',
    borderTopColor: booksomeColors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingTop: 7,
    position: 'absolute',
    right: 0,
    zIndex: 30,
  },
  bar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    maxWidth: booksomeLayout.maxContentWidth,
    minHeight: 66,
    width: '100%',
  },
  slot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 64,
    paddingBottom: 4,
  },
  recordSlot: {
    justifyContent: 'flex-start',
  },
  iconPlate: {
    alignItems: 'center',
    height: 31,
    justifyContent: 'center',
    width: 40,
  },
  recordPlate: {
    backgroundColor: booksomeColors.forest,
    borderColor: booksomeColors.paperStrong,
    borderRadius: 30,
    borderWidth: 4,
    boxShadow: '0px 4px 8px rgba(11,46,32,0.2)',
    height: 58,
    marginTop: -25,
    width: 58,
  },
  recordPlateActive: {
    backgroundColor: '#0B5035',
  },
  label: {
    color: '#687168',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  labelActive: {
    color: booksomeColors.forest,
    fontWeight: '900',
  },
  recordLabel: {
    marginTop: 1,
  },
});
