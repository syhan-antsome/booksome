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
  const activeTabStyle = StyleSheet.compose(styles.tabItem, styles.tabItemActive);
  const activeTabIconStyle = StyleSheet.compose(styles.tabIcon, styles.tabIconActive);
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
            <View style={styles.sseomdiSticker}>
              <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.sseomdiImage} />
            </View>
            <View style={styles.cinematicCopy}>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heroRoomTitle}>
                책으로 이어지는 하루
              </Text>
              <Text style={styles.heroRoomQuestion} numberOfLines={2}>
                책을 고르면 대화와 모임이 함께 열립니다.
              </Text>
              <Text style={styles.heroStart}>Start BookSome</Text>
            </View>
          </Pressable>
        </Link>
      </ScrollView>
      <View style={tabBarShellStyle}>
        <View style={styles.tabBar}>
          <Link asChild href="/">
            <Pressable style={activeTabStyle}>
              <Text style={activeTabIconStyle}>⌂</Text>
              <Text style={styles.tabLabelActive}>홈</Text>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/scan' : '/auth'}>
            <Pressable style={styles.tabItem}>
              <Text style={styles.tabIcon}>⌕</Text>
              <Text style={styles.tabLabel}>발견</Text>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/create-room' : '/auth'}>
            <Pressable style={styles.tabCreate}>
              <Text style={styles.tabCreateIcon}>＋</Text>
            </Pressable>
          </Link>
          <Link asChild href="/meetups">
            <Pressable style={styles.tabItem}>
              <Text style={styles.tabIcon}>◎</Text>
              <Text style={styles.tabLabel}>모임</Text>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/profile' : '/auth'}>
            <Pressable style={styles.tabItem}>
              <Text style={styles.tabIcon}>◌</Text>
              <Text style={styles.tabLabel}>나</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
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
  sseomdiSticker: {
    alignItems: 'center',
    backgroundColor: 'rgba(248,241,232,0.94)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 26,
    borderWidth: 1,
    bottom: 146,
    height: 78,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: 18,
    width: 98,
    zIndex: 3,
  },
  sseomdiImage: {
    height: 74,
    width: 98,
  },
  cinematicCopy: {
    alignItems: 'center',
    bottom: 32,
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
  heroStart: {
    backgroundColor: 'rgba(14,39,27,0.94)',
    borderRadius: 20,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 13,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tabBarShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(14,39,27,0.98)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  tabBarShellFramed: {
    alignSelf: 'center',
  },
  tabBarShellFull: {
    backgroundColor: '#0E271B',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 430,
    minHeight: 66,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 50,
  },
  tabItemActive: {
    backgroundColor: '#EEF4DF',
    borderRadius: 26,
    flex: 0,
    height: 52,
    width: 62,
  },
  tabIcon: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  tabIconActive: {
    color: '#0E271B',
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  tabLabelActive: {
    color: '#0E271B',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  tabCreate: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    height: 54,
    justifyContent: 'center',
    marginHorizontal: 6,
    width: 54,
  },
  tabCreateIcon: {
    color: '#0E271B',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
});
