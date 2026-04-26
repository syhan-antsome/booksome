import { Link } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackgroundSlideshow } from '../src/components/background-slideshow';
import { useAuth } from '../src/providers/auth-provider';
import homeHeroBookStacksImage from '../assets/home-hero-book-stacks.jpg';
import homeHeroWriterDeskImage from '../assets/home-hero-writer-desk.jpg';
import homeHeroImage from '../assets/home-hero-reading-lounge.jpg';
import sseomdiReadingImage from '../assets/sseomdi-reading.png';

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

const homeHeroSlides: ImageSourcePropType[] = [
  toImageSource(homeHeroImage),
  toImageSource(homeHeroBookStacksImage),
  toImageSource(homeHeroWriterDeskImage),
];
const sseomdiReadingSource: ImageSourcePropType =
  toImageSource(sseomdiReadingImage);

export default function DiscoverScreen() {
  const { isLoading, profile, session } = useAuth();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFramedPreview = width >= 640;
  const heroStageHeight = Math.max(470, height - 206);
  const safeAreaStyle = !isFramedPreview
    ? StyleSheet.compose(styles.safeArea, styles.safeAreaFull)
    : styles.safeArea;
  const contentStyle = useMemo(
    () =>
      StyleSheet.compose(
        styles.content,
        StyleSheet.compose(styles.contentWithTabBar, !isFramedPreview ? styles.contentFull : null),
      ),
    [isFramedPreview],
  );
  const activeModeStyle = StyleSheet.compose(styles.appModeItem, styles.appModeItemActive);
  const heroPressableStyle = useMemo(
    () => ({ ...styles.cinematicHero, height: heroStageHeight }),
    [heroStageHeight],
  );
  const tabBarShellStyle = useMemo(
    () => ({
      ...styles.tabBarShell,
      ...(isFramedPreview ? styles.tabBarShellFramed : styles.tabBarShellFull),
      paddingBottom: Math.max(insets.bottom, 8),
    }),
    [insets.bottom, isFramedPreview],
  );
  return (
    <SafeAreaView style={safeAreaStyle}>
      <BackgroundSlideshow sources={homeHeroSlides} />
      <View style={styles.fullBleedShade} />
      <ScrollView
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.greeting}>
              {isLoading
                ? '책장을 여는 중'
                : session
                  ? `Hi, ${profile?.display_name ?? 'Reader'}`
                  : 'Hi, Reader'}
            </Text>
            <Text style={styles.appLogo}>BookSome</Text>
          </View>
          <View style={styles.headerActions}>
            <Link asChild href={session ? '/scan' : '/auth'}>
              <Pressable style={styles.headerIconButton}>
                <Text style={styles.headerIconText}>⌕</Text>
              </Pressable>
            </Link>
            <Link asChild href={session ? '/profile' : '/auth'}>
              <Pressable style={styles.profileButton}>
                <Text style={styles.profileButtonText}>{profile?.display_name?.slice(0, 1) ?? 'B'}</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.appModeRail}>
          <Text style={activeModeStyle}>발견</Text>
          <Text style={styles.appModeItem}>리딩룸</Text>
          <Text style={styles.appModeItem}>대화</Text>
          <Text style={styles.appModeItem}>모임</Text>
        </View>

        <Link asChild href={session ? '/scan' : '/auth'}>
          <Pressable style={heroPressableStyle}>
            <View style={styles.cinematicCopy}>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heroRoomTitle}>
                책으로 이어지는 하루
              </Text>
              <Text style={styles.heroRoomQuestion} numberOfLines={2}>
                책을 고르면 대화와 모임이 함께 열립니다.
              </Text>
              <View style={styles.heroActionRow}>
                <View style={styles.sseomdiGuide}>
                  <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.sseomdiImage} />
                </View>
                <Text style={styles.heroStart}>Start BookSome</Text>
              </View>
            </View>
          </Pressable>
        </Link>
      </ScrollView>
      <View style={tabBarShellStyle}>
        <View style={styles.tabBar}>
          <Link asChild href="/">
            <Pressable accessibilityLabel="홈" style={styles.tabSlot}>
              <View style={styles.tabIconPlateActive}>
                <TabGlyph name="home" active />
              </View>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/scan' : '/auth'}>
            <Pressable accessibilityLabel="발견" style={styles.tabSlot}>
              <View style={styles.tabIconPlate}>
                <TabGlyph name="discover" />
              </View>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/create-room' : '/auth'}>
            <Pressable accessibilityLabel="리딩룸 만들기" style={styles.tabSlot}>
              <View style={styles.tabCreatePlate}>
                <TabGlyph name="create" active />
              </View>
            </Pressable>
          </Link>
          <Link asChild href="/meetups">
            <Pressable accessibilityLabel="모임" style={styles.tabSlot}>
              <View style={styles.tabIconPlate}>
                <TabGlyph name="meetups" />
              </View>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/profile' : '/auth'}>
            <Pressable accessibilityLabel="나의 정보" style={styles.tabSlot}>
              <View style={styles.tabIconPlate}>
                <TabGlyph name="profile" />
              </View>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

type TabGlyphName = 'home' | 'discover' | 'create' | 'meetups' | 'profile';

function TabGlyph({ active = false, name }: { active?: boolean; name: TabGlyphName }) {
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

  if (name === 'discover') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphCompass, lineStyle)}>
          <View style={StyleSheet.compose(styles.glyphCompassNeedle, inkStyle)} />
        </View>
        <View style={StyleSheet.compose(styles.glyphCompassDot, softStyle)} />
      </View>
    );
  }

  if (name === 'create') {
    return (
      <View style={styles.glyphFrameLarge}>
        <View style={StyleSheet.compose(styles.glyphPlusVertical, inkStyle)} />
        <View style={StyleSheet.compose(styles.glyphPlusHorizontal, inkStyle)} />
      </View>
    );
  }

  if (name === 'meetups') {
    return (
      <View style={styles.glyphFrame}>
        <View style={StyleSheet.compose(styles.glyphPersonMain, inkStyle)} />
        <View style={StyleSheet.compose(styles.glyphPersonLeft, softStyle)} />
        <View style={StyleSheet.compose(styles.glyphPersonRight, softStyle)} />
        <View style={StyleSheet.compose(styles.glyphPeopleBase, lineStyle)} />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#101610',
    overflow: 'hidden',
  },
  safeAreaFull: {
    backgroundColor: '#101610',
  },
  content: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginVertical: 14,
    maxWidth: 430,
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 26,
    position: 'relative',
    width: '100%',
  },
  contentWithTabBar: {
    paddingBottom: 104,
  },
  contentFull: {
    alignSelf: 'stretch',
    borderRadius: 0,
    marginVertical: 0,
    maxWidth: '100%',
  },
  fullBleedShade: {
    backgroundColor: 'rgba(7, 13, 8, 0.34)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  appHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
    zIndex: 4,
  },
  greeting: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  appLogo: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerIconText: {
    color: '#111910',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(14,39,27,0.92)',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  appModeRail: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 20,
    paddingBottom: 4,
    zIndex: 4,
  },
  appModeItem: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '900',
    paddingBottom: 8,
  },
  appModeItemActive: {
    borderBottomColor: '#FFFFFF',
    borderBottomWidth: 3,
    color: '#FFFFFF',
  },
  cinematicHero: {
    backgroundColor: 'transparent',
    marginHorizontal: 0,
    marginTop: 8,
    overflow: 'visible',
    position: 'relative',
    zIndex: 3,
  },
  sseomdiGuide: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,241,232,0.96)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 23,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 66,
  },
  sseomdiImage: {
    height: 54,
    width: 70,
  },
  cinematicCopy: {
    alignItems: 'center',
    bottom: 126,
    left: 24,
    position: 'absolute',
    right: 24,
  },
  heroRoomTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: 'center',
  },
  heroRoomQuestion: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 8,
    maxWidth: 260,
    textAlign: 'center',
  },
  heroActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 15,
  },
  heroStart: {
    backgroundColor: 'rgba(14,39,27,0.94)',
    borderRadius: 20,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabBarShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.98)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 0,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  tabBarShellFramed: {
    alignSelf: 'center',
  },
  tabBarShellFull: {
    backgroundColor: 'rgba(247, 241, 229, 0.98)',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: 430,
    minHeight: 76,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
  },
  tabSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 76,
  },
  tabIconPlate: {
    alignItems: 'center',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  tabIconPlateActive: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  tabCreatePlate: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderColor: '#F7F1E5',
    borderRadius: 32,
    borderWidth: 4,
    height: 64,
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    width: 64,
  },
  glyphFrame: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    position: 'relative',
    width: 34,
  },
  glyphFrameLarge: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    width: 36,
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
  glyphCompass: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2.6,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  glyphCompassNeedle: {
    borderRadius: 3,
    height: 16,
    transform: [{ rotate: '38deg' }],
    width: 5,
  },
  glyphCompassDot: {
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  glyphPlusVertical: {
    borderRadius: 3,
    height: 26,
    position: 'absolute',
    width: 6,
  },
  glyphPlusHorizontal: {
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    width: 26,
  },
  glyphPersonMain: {
    borderRadius: 9,
    height: 18,
    position: 'absolute',
    top: 4,
    width: 18,
    zIndex: 2,
  },
  glyphPersonLeft: {
    borderRadius: 7,
    height: 14,
    left: 2,
    position: 'absolute',
    top: 10,
    width: 14,
  },
  glyphPersonRight: {
    borderRadius: 7,
    height: 14,
    position: 'absolute',
    right: 2,
    top: 10,
    width: 14,
  },
  glyphPeopleBase: {
    borderBottomWidth: 2.8,
    borderRadius: 12,
    bottom: 4,
    height: 15,
    position: 'absolute',
    width: 29,
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
