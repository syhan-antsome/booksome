import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { featuredRooms, type FeaturedRoom } from '../src/data/rooms';
import { useAuth } from '../src/providers/auth-provider';
import { getMediaUrl } from '../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../src/services/rooms';
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
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [incomingHeroIndex, setIncomingHeroIndex] = useState<number | null>(null);
  const heroZoom = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const nextHeroZoom = useRef(new Animated.Value(0)).current;
  const activeHeroIndexRef = useRef(0);
  const useNativeHeroDriver = Platform.OS !== 'web';

  useEffect(() => {
    const animation = Animated.timing(heroZoom, {
      duration: 9000,
      toValue: 1,
      useNativeDriver: useNativeHeroDriver,
    });

    animation.start();

    const timeout = setTimeout(() => {
      const nextIndex = (activeHeroIndexRef.current + 1) % homeHeroSlides.length;

      setIncomingHeroIndex(nextIndex);
      heroFade.setValue(0);
      nextHeroZoom.setValue(0);

      Animated.timing(nextHeroZoom, {
        duration: 1800,
        toValue: 0.2,
        useNativeDriver: useNativeHeroDriver,
      }).start();

      Animated.timing(heroFade, {
        duration: 1800,
        toValue: 1,
        useNativeDriver: useNativeHeroDriver,
      }).start(() => {
        activeHeroIndexRef.current = nextIndex;
        heroZoom.setValue(0.2);
        setActiveHeroIndex(nextIndex);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIncomingHeroIndex(null);
            heroFade.setValue(0);
            nextHeroZoom.setValue(0);
          });
        });
      });
    }, 7000);

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [activeHeroIndex, heroFade, heroZoom, nextHeroZoom, useNativeHeroDriver]);

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsRefreshingRooms(true);

    listFeaturedRooms()
      .then((rooms) => {
        if (!isMounted) return;

        setRemoteRooms(rooms);
      })
      .catch(() => {
        if (!isMounted) return;
      })
      .finally(() => {
        if (isMounted) {
          setIsRefreshingRooms(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(refreshRooms);

  const rooms = useMemo(
    () => (remoteRooms.length > 0 ? remoteRooms.map(toFeaturedRoom) : featuredRooms),
    [remoteRooms],
  );
  const spotlightRooms = rooms.slice(0, 4);
  const isFramedPreview = width >= 640;
  const heroStageHeight = Math.max(350, Math.min(430, height - 330));
  const heroZoomScale = heroZoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1.04, 1.18],
  });
  const nextHeroZoomScale = nextHeroZoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1.04, 1.18],
  });
  const activeHeroSource = homeHeroSlides[activeHeroIndex];
  const incomingHeroSource =
    incomingHeroIndex === null ? null : homeHeroSlides[incomingHeroIndex];
  const nextAmbientOpacity = heroFade.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
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
  const activeFullBleedStyle = {
    ...styles.fullBleedImage,
    opacity: 1,
    transform: [{ scale: heroZoomScale }],
  };
  const nextFullBleedStyle = {
    ...styles.fullBleedImage,
    opacity: nextAmbientOpacity,
    transform: [{ scale: nextHeroZoomScale }],
  };

  return (
    <SafeAreaView style={safeAreaStyle}>
      <Animated.Image
        resizeMode="cover"
        source={activeHeroSource}
        style={activeFullBleedStyle}
      />
      {incomingHeroSource ? (
        <Animated.Image
          resizeMode="cover"
          source={incomingHeroSource}
          style={nextFullBleedStyle}
        />
      ) : null}
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
            <Pressable onPress={refreshRooms} style={styles.headerIconButton}>
              <Text style={styles.headerIconText}>{isRefreshingRooms ? '...' : '⌕'}</Text>
            </Pressable>
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

        <View style={styles.discoveryPanel}>
          <View style={styles.shelfHeader}>
            <View>
              <Text style={styles.shelfKicker}>OPEN ROOMS</Text>
              <Text style={styles.shelfTitle}>지금 함께 읽는 책</Text>
            </View>
          </View>
          <View style={styles.lowerFlow}>
            <ScrollView
              contentContainerStyle={styles.popularRail}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {spotlightRooms.map((room) => {
                const coverUrl = getRoomImageUrl(room);

                return (
                  <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                    <Pressable style={styles.popularItem}>
                      {coverUrl ? (
                        <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.popularBackgroundImage} />
                      ) : (
                        <View
                          style={StyleSheet.compose(
                            styles.popularBackgroundFallback,
                            { backgroundColor: room.accent },
                          )}
                        />
                      )}
                      <View style={styles.popularScrim} />
                      <View style={styles.popularCopy}>
                        <Text style={styles.popularTitle} numberOfLines={1}>
                          {room.title}
                        </Text>
                        <Text style={styles.popularMeta} numberOfLines={1}>
                          {room.author}
                        </Text>
                      </View>
                      <Text style={styles.popularArrow}>→</Text>
                    </Pressable>
                  </Link>
                );
              })}
            </ScrollView>
          </View>
        </View>

      </ScrollView>
      <View style={tabBarShellStyle}>
        <View style={styles.tabBar}>
          <Link asChild href="/">
            <Pressable style={activeTabStyle}>
              <Text style={activeTabIconStyle}>⌂</Text>
            </Pressable>
          </Link>
          <Link asChild href={session ? '/scan' : '/auth'}>
            <Pressable style={styles.tabItem}>
              <Text style={styles.tabIcon}>⌕</Text>
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
            </Pressable>
          </Link>
          <Link asChild href={session ? '/profile' : '/auth'}>
            <Pressable style={styles.tabItem}>
              <Text style={styles.tabIcon}>◌</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

function toFeaturedRoom(room: RoomSummary): FeaturedRoom {
  return {
    slug: room.slug,
    title: room.title,
    author: room.subtitle ?? 'BookSome',
    host: room.host_name ?? 'Host',
    members: room.member_count.toLocaleString(),
    accent: room.accent_color,
    progress: room.progress_percent,
    next: room.next_event ?? '새로운 함께 읽기 일정을 준비 중입니다',
    question: room.pinned_question ?? '이 책은 당신에게 어떤 질문을 남겼나요?',
    coverPath: room.cover_path ?? null,
    coverUrl: null,
  };
}

function getRoomImageUrl(room: FeaturedRoom) {
  if (room.coverPath) {
    return getRoomCoverUrl(room.coverPath);
  }

  return room.coverUrl ?? null;
}

function getRoomCoverUrl(coverPath: string) {
  try {
    return getMediaUrl(coverPath);
  } catch {
    return null;
  }
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
    paddingBottom: 116,
  },
  contentFull: {
    alignSelf: 'stretch',
    borderRadius: 0,
    marginVertical: 0,
    maxWidth: '100%',
  },
  fullBleedImage: {
    height: '112%',
    left: 0,
    objectFit: 'cover',
    position: 'absolute',
    right: 0,
    top: -30,
    width: '100%',
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
  discoveryPanel: {
    backgroundColor: 'rgba(245,240,232,0.92)',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: 0,
    paddingBottom: 122,
    paddingTop: 2,
    position: 'relative',
    zIndex: 4,
  },
  shelfHeader: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
    position: 'relative',
    zIndex: 3,
  },
  shelfKicker: {
    color: '#5E6F59',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  shelfTitle: {
    color: '#111910',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  popularRail: {
    gap: 12,
    paddingHorizontal: 0,
    zIndex: 3,
  },
  lowerFlow: {
    marginHorizontal: 20,
    overflow: 'visible',
    position: 'relative',
    zIndex: 3,
  },
  popularItem: {
    backgroundColor: '#0E271B',
    borderRadius: 24,
    height: 122,
    overflow: 'hidden',
    position: 'relative',
    width: 186,
  },
  popularBackgroundImage: {
    bottom: 0,
    left: 0,
    opacity: 0.84,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popularBackgroundFallback: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popularScrim: {
    backgroundColor: 'rgba(5, 17, 11, 0.34)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popularCopy: {
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 54,
  },
  popularTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  popularMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  popularArrow: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    color: '#0E271B',
    fontSize: 17,
    fontWeight: '900',
    height: 40,
    lineHeight: 38,
    overflow: 'hidden',
    position: 'absolute',
    right: 14,
    textAlign: 'center',
    top: 14,
    width: 40,
  },
  tabBarShell: {
    alignItems: 'center',
    backgroundColor: '#0E271B',
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
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
    minHeight: 62,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  tabItemActive: {
    backgroundColor: '#DDE9C8',
    borderRadius: 24,
    flex: 0,
    height: 46,
    width: 46,
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
