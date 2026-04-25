import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { featuredRooms, type FeaturedRoom } from '../src/data/rooms';
import { useAuth } from '../src/providers/auth-provider';
import { getMediaUrl } from '../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../src/services/rooms';
import homeHeroImage from '../assets/home-hero-reading-lounge.jpg';
import sseomdiReadingImage from '../assets/sseomdi-reading.png';

const homeHeroSource: ImageSourcePropType =
  typeof homeHeroImage === 'string' ? { uri: homeHeroImage } : homeHeroImage;
const sseomdiReadingSource: ImageSourcePropType =
  typeof sseomdiReadingImage === 'string' ? { uri: sseomdiReadingImage } : sseomdiReadingImage;

export default function DiscoverScreen() {
  const { isLoading, profile, session, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [connectionLabel, setConnectionLabel] = useState('연결 확인 중');
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsRefreshingRooms(true);
    setConnectionLabel('새로고침 중');

    listFeaturedRooms()
      .then((rooms) => {
        if (!isMounted) return;

        setRemoteRooms(rooms);
        setConnectionLabel(rooms.length > 0 ? 'Live' : 'Ready');
      })
      .catch(() => {
        if (!isMounted) return;

        setConnectionLabel('Preview');
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
  const leadRoom = rooms[0];
  const popularRooms = rooms.slice(0, 4);
  const galleryRooms = rooms.length > 1 ? rooms.slice(1) : rooms;
  const isFramedPreview = width >= 640;

  return (
    <SafeAreaView style={[styles.safeArea, !isFramedPreview ? styles.safeAreaFull : null]}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.contentWithTabBar, !isFramedPreview ? styles.contentFull : null]}
        showsVerticalScrollIndicator={false}
      >
        <Image blurRadius={10} resizeMode="cover" source={homeHeroSource} style={styles.ambientImage} />
        <View style={styles.ambientVeil} />
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
            <Link href={session ? '/auth' : '/auth'} style={styles.profileButton}>
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

        {leadRoom ? (
          <Link href={session ? '/scan' : '/auth'} style={styles.heroRoom}>
            <Image resizeMode="cover" source={homeHeroSource} style={styles.heroRoomImage} />
            <View style={styles.heroScrim} />
            <View style={styles.heroSoftBase} />
            <View style={styles.heroTopMeta}>
              <Text style={styles.countryLabel}>BOOKSOME TODAY</Text>
              <Text style={styles.saveDot}>☆</Text>
            </View>
            <View style={styles.sseomdiSticker}>
              <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.sseomdiImage} />
            </View>
            <View style={styles.heroRoomCopy}>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heroRoomTitle}>
                책으로 이어지는 하루
              </Text>
              <Text style={styles.heroRoomQuestion} numberOfLines={2}>
                책을 고르면 대화와 모임이 함께 열립니다.
              </Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroFooterText}>책 발견</Text>
                <Text style={styles.heroFooterText}>리딩룸</Text>
                <Text style={styles.heroFooterText}>모임</Text>
              </View>
              <Text style={styles.heroStart}>Start BookSome</Text>
            </View>
          </Link>
        ) : null}

        <View style={styles.moodPhotoSection}>
          <Image resizeMode="contain" source={homeHeroSource} style={styles.moodPhotoImage} />
          <Text style={styles.moodPhotoKicker}>TODAY'S SPACE</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Reading rooms</Text>
          <Text style={styles.sectionMore}>{connectionLabel}</Text>
        </View>
        <View style={styles.lowerFlow}>
          <ScrollView
            contentContainerStyle={styles.popularRail}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {popularRooms.map((room, index) => {
              const coverUrl = getRoomImageUrl(room);

              return (
                <Link
                  key={room.slug}
                  href={`/room/${room.slug}`}
                  style={[styles.popularItem, index === 0 ? styles.popularItemActive : null]}
                >
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.popularBackgroundImage} />
                  ) : (
                    <View style={[styles.popularBackgroundFallback, { backgroundColor: room.accent }]} />
                  )}
                  <View style={styles.popularScrim} />
                  <View style={styles.popularFloatingBadge}>
                    <Text style={styles.popularBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.popularCopy}>
                    <Text style={styles.popularTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.popularMeta} numberOfLines={1}>
                      {room.author}
                    </Text>
                    <View style={styles.readerDots}>
                      <Text style={styles.readerDot}>R</Text>
                      <Text style={styles.readerDot}>B</Text>
                      <Text style={styles.readerDotMore}>+{room.members}</Text>
                    </View>
                  </View>
                  <Text style={styles.popularArrow}>→</Text>
                </Link>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Book moods</Text>
          <Link href={session ? '/create-room' : '/auth'} style={styles.createRoomLink}>
            + 방 만들기
          </Link>
        </View>

        <View style={styles.galleryList}>
          {galleryRooms.map((room, index) => {
            const coverUrl = getRoomImageUrl(room);

            return (
              <Link key={room.slug} href={`/room/${room.slug}`} style={styles.galleryRoom}>
                <View style={styles.galleryTextPanel}>
                  <Text style={styles.galleryLocation}>ROOM PICK</Text>
                  <Text style={styles.galleryPanelTitle} numberOfLines={2}>
                    {room.title}
                  </Text>
                  <Text style={styles.galleryPanelQuestion} numberOfLines={2}>
                    {room.question}
                  </Text>
                </View>
                <View style={[styles.galleryImageWrap, { backgroundColor: room.accent }]}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.galleryImage} />
                  ) : (
                    <View style={[styles.heroImageFallback, { backgroundColor: room.accent }]}>
                      <Text style={styles.fallbackLetter}>{room.title.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={styles.galleryScrim} />
                  <Text style={styles.galleryIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.gallerySave}>☆</Text>
                  <View style={styles.galleryCopy}>
                    <Text style={styles.galleryMeta}>{room.author} · {room.host}</Text>
                    <Text style={styles.galleryArrow}>↗</Text>
                  </View>
                </View>
              </Link>
            );
          })}
        </View>

        {session ? (
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </Pressable>
        ) : null}
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
          <Link href={session ? '/auth' : '/auth'} style={styles.tabItem}>
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
    backgroundColor: '#BED3C0',
  },
  safeAreaFull: {
    backgroundColor: '#EEF3E8',
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#EEF3E8',
    borderRadius: 34,
    marginVertical: 14,
    maxWidth: 390,
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
  ambientImage: {
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    height: 440,
    left: 26,
    opacity: 0.2,
    overflow: 'hidden',
    position: 'absolute',
    right: 26,
    top: 174,
  },
  ambientVeil: {
    backgroundColor: 'rgba(238,243,232,0.34)',
    height: 560,
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
    zIndex: 2,
  },
  greeting: {
    color: '#64715F',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  appLogo: {
    color: '#111910',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#0E271B',
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
    zIndex: 2,
  },
  appModeItem: {
    color: '#63705E',
    fontSize: 13,
    fontWeight: '900',
    paddingBottom: 8,
  },
  appModeItemActive: {
    borderBottomColor: '#0E271B',
    borderBottomWidth: 3,
    color: '#0E271B',
  },
  heroRoom: {
    height: 390,
    marginHorizontal: 0,
    marginTop: 4,
    overflow: 'visible',
    position: 'relative',
    zIndex: 1,
  },
  heroRoomImage: {
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    height: 364,
    left: 20,
    opacity: 0.94,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 18,
  },
  heroImageFallback: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fallbackLetter: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 94,
    fontWeight: '900',
  },
  fallbackLetterSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 32,
    fontWeight: '900',
  },
  heroScrim: {
    backgroundColor: 'rgba(7, 12, 8, 0.1)',
    borderTopLeftRadius: 160,
    borderTopRightRadius: 160,
    height: 364,
    left: 20,
    position: 'absolute',
    right: 0,
    top: 18,
  },
  heroSoftBase: {
    backgroundColor: '#EEF3E8',
    borderTopLeftRadius: 190,
    borderTopRightRadius: 190,
    bottom: -28,
    height: 174,
    left: -42,
    opacity: 0.98,
    position: 'absolute',
    right: -42,
  },
  heroTopMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 44,
  },
  countryLabel: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    color: '#16311F',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  saveDot: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 22,
    color: '#16311F',
    fontSize: 22,
    fontWeight: '900',
    height: 42,
    lineHeight: 38,
    overflow: 'hidden',
    textAlign: 'center',
    width: 42,
  },
  sseomdiSticker: {
    alignItems: 'center',
    backgroundColor: '#F8F1E8',
    borderColor: 'rgba(14,39,27,0.08)',
    borderRadius: 26,
    borderWidth: 1,
    bottom: 48,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: 18,
    width: 108,
    zIndex: 3,
  },
  sseomdiImage: {
    height: 82,
    width: 108,
  },
  heroRoomCopy: {
    alignItems: 'center',
    bottom: 66,
    left: 18,
    position: 'absolute',
    right: 18,
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
  heroFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  heroFooterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  heroStart: {
    backgroundColor: '#0E271B',
    borderRadius: 20,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 13,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  moodPhotoSection: {
    backgroundColor: '#0E271B',
    borderRadius: 34,
    height: 536,
    marginHorizontal: 16,
    marginTop: 2,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 3,
  },
  moodPhotoImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  moodPhotoKicker: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 17,
    color: '#16311F',
    fontSize: 11,
    fontWeight: '900',
    left: 16,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 16,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
    position: 'relative',
    zIndex: 3,
  },
  sectionTitle: {
    color: '#111910',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionMore: {
    color: '#64715F',
    fontSize: 12,
    fontWeight: '900',
  },
  createRoomLink: {
    color: '#16311F',
    fontSize: 13,
    fontWeight: '900',
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
    borderRadius: 30,
    height: 122,
    overflow: 'hidden',
    position: 'relative',
    width: 238,
  },
  popularItemActive: {
    backgroundColor: '#0E271B',
  },
  popularBackgroundImage: {
    bottom: 0,
    left: 0,
    opacity: 0.72,
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
    backgroundColor: 'rgba(5, 17, 11, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popularFloatingBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    left: 14,
    position: 'absolute',
    top: 14,
    width: 44,
  },
  popularBadgeText: {
    color: '#0E271B',
    fontSize: 13,
    fontWeight: '900',
  },
  popularCopy: {
    bottom: 16,
    left: 72,
    position: 'absolute',
    right: 48,
  },
  popularTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  popularTitleActive: {
    color: '#FFFFFF',
  },
  popularMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  popularMetaActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  popularArrow: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    color: '#0E271B',
    fontSize: 17,
    fontWeight: '900',
    height: 36,
    lineHeight: 34,
    overflow: 'hidden',
    position: 'absolute',
    right: 12,
    textAlign: 'center',
    top: 43,
    width: 36,
  },
  popularArrowActive: {
    color: '#FFFFFF',
  },
  readerDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 0,
    marginTop: 6,
  },
  readerDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    color: '#0E271B',
    fontSize: 9,
    fontWeight: '900',
    height: 18,
    lineHeight: 18,
    marginRight: -4,
    overflow: 'hidden',
    textAlign: 'center',
    width: 18,
  },
  readerDotMore: {
    backgroundColor: '#DDE9C8',
    borderRadius: 10,
    color: '#0E271B',
    fontSize: 9,
    fontWeight: '900',
    height: 19,
    lineHeight: 19,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  galleryList: {
    gap: 18,
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 3,
  },
  galleryRoom: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    height: 342,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  galleryTextPanel: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 118,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryLocation: {
    color: '#B85744',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  galleryPanelTitle: {
    color: '#101910',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 30,
  },
  galleryPanelQuestion: {
    color: '#52604E',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 10,
    maxWidth: 250,
  },
  galleryImageWrap: {
    height: 148,
    left: 18,
    overflow: 'hidden',
    position: 'absolute',
    right: 18,
    top: 16,
    borderRadius: 24,
  },
  galleryImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryScrim: {
    backgroundColor: 'rgba(7,12,8,0.18)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryIndex: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    color: '#16311F',
    fontSize: 12,
    fontWeight: '900',
    left: 14,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 14,
  },
  gallerySave: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    color: '#16311F',
    fontSize: 22,
    fontWeight: '900',
    height: 40,
    lineHeight: 36,
    overflow: 'hidden',
    position: 'absolute',
    right: 14,
    textAlign: 'center',
    top: 14,
    width: 40,
  },
  galleryCopy: {
    alignItems: 'center',
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 14,
    position: 'absolute',
    right: 14,
  },
  galleryArrow: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 19,
    color: '#0E271B',
    fontSize: 18,
    fontWeight: '900',
    height: 38,
    lineHeight: 36,
    overflow: 'hidden',
    textAlign: 'center',
    width: 38,
  },
  galleryMeta: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 17,
    color: '#0E271B',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  signOutButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#60705B',
    fontSize: 14,
    fontWeight: '900',
  },
});
