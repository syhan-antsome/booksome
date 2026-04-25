import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [nextHeroIndex, setNextHeroIndex] = useState(1);
  const heroZoom = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const activeHeroIndexRef = useRef(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroZoom, {
          duration: 11000,
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(heroZoom, {
          duration: 3500,
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [heroZoom]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeHeroIndexRef.current + 1) % homeHeroSlides.length;

      setNextHeroIndex(nextIndex);
      heroFade.setValue(0);
      Animated.timing(heroFade, {
        duration: 1400,
        toValue: 1,
        useNativeDriver: false,
      }).start(() => {
        activeHeroIndexRef.current = nextIndex;
        setActiveHeroIndex(nextIndex);
        heroFade.setValue(0);
      });
    }, 7200);

    return () => {
      clearInterval(interval);
    };
  }, [heroFade]);

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
  const heroZoomScale = heroZoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const activeHeroSource = homeHeroSlides[activeHeroIndex];
  const nextHeroSource = homeHeroSlides[nextHeroIndex];
  const activeAmbientOpacity = heroFade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const nextAmbientOpacity = heroFade.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={[styles.safeArea, !isFramedPreview ? styles.safeAreaFull : null]}>
      <Animated.Image
        resizeMode="cover"
        source={activeHeroSource}
        style={[
          styles.fullBleedImage,
          { opacity: activeAmbientOpacity, transform: [{ scale: heroZoomScale }] },
        ]}
      />
      <Animated.Image
        resizeMode="cover"
        source={nextHeroSource}
        style={[
          styles.fullBleedImage,
          { opacity: nextAmbientOpacity, transform: [{ scale: heroZoomScale }] },
        ]}
      />
      <View style={styles.fullBleedShade} />
      <ScrollView
        contentContainerStyle={[styles.content, styles.contentWithTabBar, !isFramedPreview ? styles.contentFull : null]}
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
            <Link href={session ? '/profile' : '/auth'} style={styles.profileButton}>
              {profile?.display_name?.slice(0, 1) ?? 'B'}
            </Link>
          </View>
        </View>

        <View style={styles.appModeRail}>
          <Text style={[styles.appModeItem, styles.appModeItemActive]}>발견</Text>
          <Text style={styles.appModeItem}>리딩룸</Text>
          <Text style={styles.appModeItem}>대화</Text>
          <Text style={styles.appModeItem}>모임</Text>
        </View>

        <Link href={session ? '/scan' : '/auth'} style={styles.cinematicHero}>
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
                  <Link
                    key={room.slug}
                    href={`/room/${room.slug}`}
                    style={styles.popularItem}
                  >
                    {coverUrl ? (
                      <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.popularBackgroundImage} />
                    ) : (
                      <View style={[styles.popularBackgroundFallback, { backgroundColor: room.accent }]} />
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
                  </Link>
                );
              })}
            </ScrollView>
          </View>
        </View>

      </ScrollView>
      <View
        style={[
          styles.tabBarShell,
          isFramedPreview ? styles.tabBarShellFramed : styles.tabBarShellFull,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <View style={styles.tabBar}>
          <Link href="/" style={[styles.tabItem, styles.tabItemActive]}>
            <Text style={[styles.tabIcon, styles.tabIconActive]}>⌂</Text>
          </Link>
          <Link href={session ? '/scan' : '/auth'} style={styles.tabItem}>
            <Text style={styles.tabIcon}>⌕</Text>
          </Link>
          <Link href={session ? '/create-room' : '/auth'} style={styles.tabCreate}>
            <Text style={styles.tabCreateIcon}>＋</Text>
          </Link>
          <Link href="/meetups" style={styles.tabItem}>
            <Text style={styles.tabIcon}>◎</Text>
          </Link>
          <Link href={session ? '/profile' : '/auth'} style={styles.tabItem}>
            <Text style={styles.tabIcon}>◌</Text>
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
    paddingBottom: 126,
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
    backgroundColor: 'rgba(14,39,27,0.92)',
    borderRadius: 21,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    height: 42,
    lineHeight: 42,
    overflow: 'hidden',
    textAlign: 'center',
    width: 42,
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
    height: 476,
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
    paddingBottom: 24,
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
    borderRadius: 28,
    height: 148,
    overflow: 'hidden',
    position: 'relative',
    width: 214,
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
    backgroundColor: 'transparent',
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#0E271B',
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 320,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    borderRadius: 20,
    flex: 0,
    height: 40,
    width: 40,
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
    height: 52,
    justifyContent: 'center',
    marginHorizontal: 8,
    width: 52,
  },
  tabCreateIcon: {
    color: '#0E271B',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
});
