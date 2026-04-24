import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms, type FeaturedRoom } from '../src/data/rooms';
import { useAuth } from '../src/providers/auth-provider';
import { getMediaUrl } from '../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../src/services/rooms';

export default function DiscoverScreen() {
  const { isLoading, profile, session, signOut } = useAuth();
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
  const leadCoverUrl = leadRoom ? getRoomImageUrl(leadRoom) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>
              {isLoading
                ? '책장을 여는 중'
                : session
                  ? `Hi, ${profile?.display_name ?? 'Reader'}`
                  : 'Hi, Reader'}
            </Text>
            <Text style={styles.brand}>BookSome</Text>
          </View>
          {session ? (
            <Text style={styles.statusBadge}>Live 15°C</Text>
          ) : (
            <Link href="/auth" style={styles.headerAction}>
              로그인
            </Link>
          )}
        </View>

        <View style={styles.searchLine}>
          <Text style={styles.pageTitle}>Reading{'\n'}Power</Text>
          <Pressable onPress={refreshRooms} style={styles.iconButton}>
            <Text style={styles.iconText}>{isRefreshingRooms ? '...' : '⌕'}</Text>
          </Pressable>
        </View>

        <View style={styles.topicRail}>
          <Text style={[styles.topicPill, styles.topicPillActive]}># 함께읽기</Text>
          <Text style={styles.topicPill}>질문</Text>
          <Text style={styles.topicPill}>감상</Text>
          <Text style={styles.topicPill}>모임</Text>
        </View>

        {leadRoom ? (
          <Link href={`/room/${leadRoom.slug}`} style={styles.heroRoom}>
            {leadCoverUrl ? (
              <Image resizeMode="cover" source={{ uri: leadCoverUrl }} style={styles.heroRoomImage} />
            ) : (
              <View style={[styles.heroImageFallback, { backgroundColor: leadRoom.accent }]}>
                <Text style={styles.fallbackLetter}>{leadRoom.title.slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.heroScrim} />
            <View style={styles.heroTopMeta}>
              <Text style={styles.countryLabel}>READING ROOM</Text>
              <Text style={styles.saveDot}>☆</Text>
            </View>
            <View style={styles.heroRoomCopy}>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heroRoomTitle}>
                {leadRoom.title}
              </Text>
              <Text style={styles.heroRoomQuestion} numberOfLines={2}>
                {leadRoom.question}
              </Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroFooterText}>읽는 중</Text>
                <Text style={styles.heroFooterText}>{leadRoom.members}</Text>
                <Text style={styles.heroFooterText}>{leadRoom.progress}%</Text>
              </View>
              <Text style={styles.heroStart}>Start room</Text>
            </View>
          </Link>
        ) : null}

        <View style={styles.bottomDock}>
          <Link href={session ? '/scan' : '/auth'} style={styles.dockItem}>⌕</Link>
          <Link href="/" style={[styles.dockItem, styles.dockItemActive]}>⌂</Link>
          <Link href="/meetups" style={styles.dockItem}>◎</Link>
          <Link href={session ? '/create-room' : '/auth'} style={styles.dockItem}>＋</Link>
          <Text style={styles.dockItem}>◌</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Popular</Text>
          <Text style={styles.sectionMore}>{connectionLabel}</Text>
        </View>
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
                <View style={styles.popularThumb}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.popularThumbImage} />
                  ) : (
                    <View style={[styles.heroImageFallback, { backgroundColor: room.accent }]}>
                      <Text style={styles.fallbackLetterSmall}>{room.title.slice(0, 1)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.popularCopy}>
                  <Text style={[styles.popularTitle, index === 0 ? styles.popularTitleActive : null]} numberOfLines={1}>
                    {room.title}
                  </Text>
                  <Text style={[styles.popularMeta, index === 0 ? styles.popularMetaActive : null]} numberOfLines={1}>
                    {room.author}
                  </Text>
                  <View style={styles.readerDots}>
                    <Text style={styles.readerDot}>R</Text>
                    <Text style={styles.readerDot}>B</Text>
                    <Text style={styles.readerDotMore}>+{room.members}</Text>
                  </View>
                </View>
                <Text style={[styles.popularArrow, index === 0 ? styles.popularArrowActive : null]}>→</Text>
              </Link>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today picks</Text>
          <Link href={session ? '/create-room' : '/auth'} style={styles.createRoomLink}>
            + 방 만들기
          </Link>
        </View>

        <View style={styles.galleryList}>
          {galleryRooms.map((room, index) => {
            const coverUrl = getRoomImageUrl(room);

            return (
              <Link key={room.slug} href={`/room/${room.slug}`} style={styles.galleryRoom}>
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
                    <View style={styles.galleryTitleRow}>
                      <Text style={styles.galleryTitle} numberOfLines={2}>
                        {room.title}
                      </Text>
                      <Text style={styles.galleryArrow}>↗</Text>
                    </View>
                    <Text style={styles.galleryMeta}>{room.author} · {room.host}</Text>
                    <Text style={styles.galleryQuestion} numberOfLines={2}>
                      {room.question}
                    </Text>
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
  content: {
    alignSelf: 'center',
    backgroundColor: '#EEF3E8',
    borderRadius: 34,
    marginVertical: 14,
    maxWidth: 390,
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 26,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  greeting: {
    color: '#253123',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  brand: {
    color: '#111910',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statusBadge: {
    backgroundColor: '#FFFFFF',
    color: '#253123',
    borderRadius: 22,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  headerAction: {
    backgroundColor: '#FFFFFF',
    color: '#111910',
    borderRadius: 22,
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  pageTitle: {
    color: '#111910',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  iconText: {
    color: '#111910',
    fontSize: 20,
    fontWeight: '900',
  },
  topicRail: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topicPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    color: '#2A3828',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  topicPillActive: {
    backgroundColor: '#0E271B',
    color: '#FFFFFF',
  },
  heroRoom: {
    borderRadius: 34,
    height: 354,
    marginHorizontal: 20,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  heroRoomImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
    backgroundColor: 'rgba(7, 12, 8, 0.28)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTopMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 16,
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
  heroRoomCopy: {
    alignItems: 'center',
    bottom: 26,
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
  bottomDock: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#0E271B',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: -26,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 2,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
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
    paddingHorizontal: 20,
  },
  popularItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    flexDirection: 'row',
    height: 88,
    overflow: 'hidden',
    paddingHorizontal: 10,
    width: 262,
  },
  popularItemActive: {
    backgroundColor: '#0E271B',
  },
  popularThumb: {
    backgroundColor: '#D7DED2',
    borderRadius: 20,
    height: 62,
    overflow: 'hidden',
    position: 'relative',
    width: 56,
  },
  popularThumbImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  popularCopy: {
    flex: 1,
    paddingHorizontal: 12,
  },
  popularTitle: {
    color: '#172117',
    fontSize: 16,
    fontWeight: '900',
  },
  popularTitleActive: {
    color: '#FFFFFF',
  },
  popularMeta: {
    color: '#71806B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  popularMetaActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  popularArrow: {
    color: '#172117',
    fontSize: 18,
    fontWeight: '900',
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
  },
  galleryRoom: {
    borderRadius: 28,
    height: 286,
    overflow: 'hidden',
    width: '100%',
  },
  galleryImageWrap: {
    bottom: 0,
    height: 286,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryScrim: {
    backgroundColor: 'rgba(7,12,8,0.48)',
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
    bottom: 18,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  galleryTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryTitle: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 32,
  },
  galleryArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  galleryMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 7,
  },
  galleryQuestion: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 12,
  },
  dockItem: {
    alignItems: 'center',
    color: 'rgba(255,255,255,0.62)',
    fontSize: 18,
    fontWeight: '900',
    height: 34,
    lineHeight: 31,
    textAlign: 'center',
    width: 34,
  },
  dockItemActive: {
    backgroundColor: '#DDE9C8',
    borderRadius: 17,
    color: '#0E271B',
    overflow: 'hidden',
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
