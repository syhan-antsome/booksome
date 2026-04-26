import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../providers/auth-provider';

export type BottomNavKey = 'home' | 'rooms' | 'reading-life' | 'market' | 'profile';

const items: {
  key: BottomNavKey;
  label: string;
  href: '/' | '/rooms' | '/reading-life' | '/market' | '/profile' | '/auth';
  signedOutHref?: '/auth';
}[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'rooms', label: '리딩방', href: '/rooms' },
  { key: 'reading-life', label: '독서생활', href: '/reading-life', signedOutHref: '/auth' },
  { key: 'market', label: '책마켓', href: '/market' },
  { key: 'profile', label: '나', href: '/profile', signedOutHref: '/auth' },
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
                  <BottomNavGlyph active={isActive} name={item.key} />
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

function BottomNavGlyph({ active = false, name }: { active?: boolean; name: BottomNavKey }) {
  const inkStyle = active ? styles.glyphInkActive : styles.glyphInk;
  const softStyle = active ? styles.glyphSoftActive : styles.glyphSoft;
  const lineStyle = active ? styles.glyphLineActive : styles.glyphLine;

  if (name === 'home') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphHomeRoof, lineStyle)} />
        <View style={StyleSheet.compose(styles.glyphHomeBody, lineStyle)}>
          <View style={StyleSheet.compose(styles.glyphHomeDoor, inkStyle)} />
        </View>
      </View>
    );
  }

  if (name === 'rooms') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphBookSpread, lineStyle)}>
          <View style={StyleSheet.compose(styles.glyphBookFold, lineStyle)} />
          <View style={StyleSheet.compose(styles.glyphBookMark, inkStyle)} />
        </View>
      </View>
    );
  }

  if (name === 'reading-life') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphJournal, lineStyle)}>
          <View style={StyleSheet.compose(styles.glyphJournalLineWide, softStyle)} />
          <View style={StyleSheet.compose(styles.glyphJournalLineShort, softStyle)} />
          <View style={StyleSheet.compose(styles.glyphJournalRibbon, inkStyle)} />
        </View>
      </View>
    );
  }

  if (name === 'market') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphMarketBag, lineStyle)}>
          <View style={StyleSheet.compose(styles.glyphMarketHandle, lineStyle)} />
          <View style={StyleSheet.compose(styles.glyphMarketBook, inkStyle)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.glyphFrame}>
      <View style={StyleSheet.compose(styles.glyphProfileHead, inkStyle)} />
      <View style={StyleSheet.compose(styles.glyphProfileBody, lineStyle)} />
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
    gap: 3,
    justifyContent: 'center',
    minHeight: 78,
  },
  plate: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  plateActive: {
    backgroundColor: '#103D2B',
  },
  label: {
    color: 'rgba(16, 61, 43, 0.58)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 12,
  },
  labelActive: {
    color: '#103D2B',
  },
  glyphFrame: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    position: 'relative',
    width: 34,
  },
  glyphInk: {
    backgroundColor: '#163B2A',
  },
  glyphInkActive: {
    backgroundColor: '#F7F1E5',
  },
  glyphLine: {
    borderColor: '#163B2A',
  },
  glyphLineActive: {
    borderColor: '#F7F1E5',
  },
  glyphSoft: {
    backgroundColor: 'rgba(22, 59, 42, 0.48)',
  },
  glyphSoftActive: {
    backgroundColor: 'rgba(247, 241, 229, 0.58)',
  },
  glyphHomeRoof: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
    height: 18,
    position: 'absolute',
    top: 4,
    transform: [{ rotate: '45deg' }],
    width: 18,
  },
  glyphHomeBody: {
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    bottom: 4,
    height: 18,
    position: 'absolute',
    width: 23,
  },
  glyphHomeDoor: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    bottom: 0,
    height: 9,
    position: 'absolute',
    width: 7,
  },
  glyphBookSpread: {
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2.6,
    height: 24,
    position: 'relative',
    width: 29,
  },
  glyphBookFold: {
    borderLeftWidth: 2.2,
    bottom: 3,
    left: 13,
    position: 'absolute',
    top: 3,
  },
  glyphBookMark: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    height: 9,
    position: 'absolute',
    right: 5,
    top: -1,
    width: 5,
  },
  glyphJournal: {
    borderRadius: 7,
    borderWidth: 2.6,
    height: 27,
    position: 'relative',
    width: 24,
  },
  glyphJournalLineWide: {
    borderRadius: 2,
    height: 3,
    left: 5,
    position: 'absolute',
    top: 8,
    width: 12,
  },
  glyphJournalLineShort: {
    borderRadius: 2,
    height: 3,
    left: 5,
    position: 'absolute',
    top: 15,
    width: 8,
  },
  glyphJournalRibbon: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    height: 12,
    position: 'absolute',
    right: 3,
    top: -1,
    width: 5,
  },
  glyphMarketBag: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 2.6,
    bottom: 2,
    height: 23,
    position: 'absolute',
    width: 27,
  },
  glyphMarketHandle: {
    borderRadius: 9,
    borderTopWidth: 2.6,
    height: 14,
    left: 5,
    position: 'absolute',
    top: -10,
    width: 13,
  },
  glyphMarketBook: {
    borderRadius: 3,
    bottom: 5,
    height: 8,
    position: 'absolute',
    width: 13,
  },
  glyphProfileHead: {
    borderRadius: 9,
    height: 18,
    position: 'absolute',
    top: 4,
    width: 18,
  },
  glyphProfileBody: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 3,
    bottom: 3,
    height: 14,
    position: 'absolute',
    width: 27,
  },
});
