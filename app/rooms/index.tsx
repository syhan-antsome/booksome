import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import bookroomSignboardImage from '../../assets/bookroom-signboard.jpg';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { featuredRooms, type FeaturedRoom } from '../../src/data/rooms';
import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../../src/services/rooms';

const bookroomSignboardSource: ImageSourcePropType =
  typeof bookroomSignboardImage === 'string' ? { uri: bookroomSignboardImage } : bookroomSignboardImage;
const bookroomSignboardRatio = 803 / 1400;

export default function RoomsScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RoomFilter>('all');

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsLoadingRooms(true);

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
          setIsLoadingRooms(false);
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
  const filteredRooms = useMemo(
    () => filterRooms(rooms, query, activeFilter),
    [activeFilter, query, rooms],
  );
  const heroRoom = rooms[0];
  const joinedRooms = session ? rooms.slice(0, 2) : [];
  const recommendedRooms = rooms.slice(0, 4);
  const filterItems: { key: RoomFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'active', label: '활동중' },
    { key: 'new', label: '새 방' },
    { key: 'popular', label: '인기' },
  ];
  const bookroomHeroHeight = Math.round(width * bookroomSignboardRatio);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.bookroomHero, { height: bookroomHeroHeight }]}>
          <Image resizeMode="contain" source={bookroomSignboardSource} style={styles.bookroomHeroImage} />
          <LinearGradient
            colors={['rgba(247, 241, 229, 0)', 'rgba(247, 241, 229, 0.38)', '#F7F1E5']}
            locations={[0, 0.48, 1]}
            pointerEvents="none"
            style={styles.bookroomHeroGradient}
          />

          <View style={styles.bookroomHeroTop}>
            <Link asChild href={session ? '/create-room' : '/auth'}>
              <Pressable accessibilityLabel="북룸 만들기" style={styles.bookroomHeroAction}>
                <Text style={styles.bookroomHeroActionText}>＋</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.bookroomIntro}>
          <Text style={styles.bookroomEyebrow}>BOOKSOME BOOKROOM</Text>
          <Text numberOfLines={2} style={styles.bookroomIntroText}>
            같은 책을 읽는 사람들의 대화가 열립니다.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="책, 저자, 방 이름 검색"
            placeholderTextColor="rgba(20,37,27,0.44)"
            style={styles.searchInput}
            value={query}
          />
        </View>

        {heroRoom ? (
          <Link asChild href={`/room/${heroRoom.slug}`}>
            <Pressable style={styles.spotlight}>
              <RoomSpotlightMedia room={heroRoom} />
              <View style={styles.spotlightScrim} />
              <View style={styles.spotlightCopy}>
                <Text style={styles.spotlightKicker}>오늘의 북룸</Text>
                <Text style={styles.spotlightTitle} numberOfLines={2}>
                  {heroRoom.title}
                </Text>
                <Text style={styles.spotlightMeta} numberOfLines={1}>
                  {heroRoom.author} · {heroRoom.members}명
                </Text>
              </View>
            </Pressable>
          </Link>
        ) : null}

        <View style={styles.portalGrid}>
          <View style={styles.portalTileDark}>
            <Text style={styles.portalValue}>{rooms.length}</Text>
            <Text style={styles.portalLabel}>열린 북룸</Text>
          </View>
          <View style={styles.portalTile}>
            <Text style={styles.portalValueDark}>{joinedRooms.length}</Text>
            <Text style={styles.portalLabelDark}>참여 중</Text>
          </View>
          <View style={styles.portalTile}>
            <Text style={styles.portalValueDark}>3</Text>
            <Text style={styles.portalLabelDark}>오늘 질문</Text>
          </View>
        </View>

        {joinedRooms.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>내 북룸</Text>
              <Text style={styles.sectionMeta}>이어 읽기</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.joinedRail}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {joinedRooms.map((room) => (
                <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                  <Pressable style={styles.joinedCard}>
                    <Text style={styles.joinedTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <View style={styles.joinedProgressTrack}>
                      <View style={[styles.joinedProgressFill, { width: `${Math.max(8, room.progress)}%` }]} />
                    </View>
                    <Text style={styles.joinedMeta}>{room.progress}% 진행</Text>
                  </Pressable>
                </Link>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>추천 북룸</Text>
          <Text style={styles.sectionMeta}>이미지 카드</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.recommendRail}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {recommendedRooms.map((room) => {
            const coverUrl = getRoomImageUrl(room);

            return (
              <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                <Pressable style={styles.recommendCard}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.recommendImage} />
                  ) : (
                    <View style={[styles.recommendFallback, { backgroundColor: room.accent }]} />
                  )}
                  <View style={styles.recommendScrim} />
                  <Text style={styles.recommendTitle} numberOfLines={2}>
                    {room.title}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </ScrollView>

        <View style={styles.filterRail}>
          {filterItems.map((item) => {
            const isActive = activeFilter === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveFilter(item.key)}
                style={[styles.filterChip, isActive ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>전체 북룸</Text>
          <Text style={styles.sectionMeta}>{isLoadingRooms ? '불러오는 중' : `${filteredRooms.length}개`}</Text>
        </View>

        <View style={styles.roomList}>
          {filteredRooms.map((room) => {
            const coverUrl = getRoomImageUrl(room);

            return (
              <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                <Pressable style={styles.roomItem}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.roomImage} />
                  ) : (
                    <View style={[styles.roomFallback, { backgroundColor: room.accent }]} />
                  )}
                  <View style={styles.roomScrim} />
                  <View style={styles.roomCopy}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.roomAuthor} numberOfLines={1}>
                      {room.author} · {room.members}명
                    </Text>
                    <Text style={styles.roomQuestion} numberOfLines={2}>
                      {room.question}
                    </Text>
                  </View>
                  <View style={styles.roomArrow}>
                    <Text style={styles.roomArrowText}>›</Text>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </View>

        {filteredRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
            <Text style={styles.emptyCopy}>다른 책 제목이나 저자 이름으로 다시 찾아보세요.</Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation active="rooms" />
    </SafeAreaView>
  );
}

function RoomSpotlightMedia({ room }: { room: FeaturedRoom }) {
  const coverUrl = getRoomImageUrl(room);

  if (coverUrl) {
    return <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.spotlightImage} />;
  }

  return <View style={[styles.spotlightFallback, { backgroundColor: room.accent }]} />;
}

type RoomFilter = 'all' | 'active' | 'new' | 'popular';

function filterRooms(rooms: FeaturedRoom[], query: string, filter: RoomFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  let nextRooms = rooms;

  if (normalizedQuery) {
    nextRooms = nextRooms.filter((room) =>
      [room.title, room.author, room.host, room.question]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }

  if (filter === 'active') {
    return nextRooms.filter((room) => room.progress > 0 && room.progress < 100);
  }

  if (filter === 'new') {
    return [...nextRooms].reverse();
  }

  if (filter === 'popular') {
    return [...nextRooms].sort((a, b) => parseMembers(b.members) - parseMembers(a.members));
  }

  return nextRooms;
}

function parseMembers(value: string) {
  if (value.endsWith('k')) {
    return Number(value.replace('k', '')) * 1000;
  }

  return Number(value.replace(/,/g, '')) || 0;
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
    coverUrl: room.external_cover_url ?? null,
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
    backgroundColor: '#F7F1E5',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 124,
  },
  bookroomHero: {
    marginHorizontal: -20,
    marginTop: -20,
    overflow: 'hidden',
    position: 'relative',
  },
  bookroomHeroImage: {
    height: '100%',
    width: '100%',
  },
  bookroomHeroGradient: {
    bottom: -1,
    height: 118,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bookroomHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  bookroomHeroAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.92)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  bookroomHeroActionText: {
    color: '#103D2B',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  bookroomIntro: {
    height: 70,
    marginTop: 8,
  },
  bookroomEyebrow: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bookroomIntroText: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
    height: 48,
    lineHeight: 24,
    marginTop: 6,
    maxWidth: 270,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  createButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  kicker: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#14251B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copy: {
    color: '#667167',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  searchIcon: {
    color: '#103D2B',
    fontSize: 20,
    fontWeight: '900',
  },
  searchInput: {
    color: '#14251B',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 44,
  },
  spotlight: {
    backgroundColor: '#103D2B',
    borderRadius: 34,
    height: 238,
    marginTop: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  spotlightImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  spotlightFallback: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  spotlightScrim: {
    backgroundColor: 'rgba(4, 14, 8, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  spotlightCopy: {
    bottom: 24,
    left: 22,
    position: 'absolute',
    right: 24,
  },
  spotlightKicker: {
    color: '#F2DDA7',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  spotlightTitle: {
    color: '#FFFFFF',
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 37,
  },
  spotlightMeta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 9,
  },
  portalGrid: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(16,61,43,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
  },
  portalTileDark: {
    flex: 1,
    paddingVertical: 16,
  },
  portalTile: {
    flex: 1,
    paddingVertical: 16,
  },
  portalValue: {
    color: '#103D2B',
    fontSize: 27,
    fontWeight: '900',
  },
  portalLabel: {
    color: '#74806F',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  portalValueDark: {
    color: '#103D2B',
    fontSize: 27,
    fontWeight: '900',
  },
  portalLabelDark: {
    color: '#74806F',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 28,
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  joinedRail: {
    gap: 12,
    paddingRight: 20,
  },
  joinedCard: {
    borderBottomColor: 'rgba(16,61,43,0.14)',
    borderBottomWidth: 1,
    paddingVertical: 16,
    width: 178,
  },
  joinedTitle: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
  },
  joinedProgressTrack: {
    backgroundColor: '#E9DFC8',
    borderRadius: 4,
    height: 8,
    marginTop: 16,
    overflow: 'hidden',
  },
  joinedProgressFill: {
    backgroundColor: '#103D2B',
    height: '100%',
  },
  joinedMeta: {
    color: '#74806F',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 9,
  },
  recommendRail: {
    gap: 12,
    paddingRight: 20,
  },
  recommendCard: {
    backgroundColor: '#103D2B',
    borderRadius: 26,
    height: 172,
    overflow: 'hidden',
    position: 'relative',
    width: 140,
  },
  recommendImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  recommendFallback: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  recommendScrim: {
    backgroundColor: 'rgba(4, 14, 8, 0.36)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  recommendTitle: {
    bottom: 16,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    left: 14,
    lineHeight: 23,
    position: 'absolute',
    right: 14,
  },
  filterRail: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 26,
  },
  filterChip: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderBottomColor: '#103D2B',
  },
  filterText: {
    color: '#697566',
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#103D2B',
  },
  roomList: {
    gap: 10,
  },
  roomItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 112,
    overflow: 'hidden',
    position: 'relative',
  },
  roomImage: {
    borderRadius: 18,
    bottom: 14,
    height: 84,
    left: 0,
    position: 'absolute',
    top: 14,
    width: 84,
  },
  roomFallback: {
    borderRadius: 18,
    bottom: 14,
    height: 84,
    left: 0,
    position: 'absolute',
    top: 14,
    width: 84,
  },
  roomScrim: {
    display: 'none',
  },
  roomCopy: {
    bottom: 16,
    left: 102,
    position: 'absolute',
    right: 58,
    top: 16,
  },
  roomTitle: {
    color: '#14251B',
    fontSize: 19,
    fontWeight: '900',
  },
  roomAuthor: {
    color: '#8F6A42',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  roomQuestion: {
    color: '#697566',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 8,
  },
  roomArrow: {
    alignItems: 'center',
    backgroundColor: '#EEF1DF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 38,
    width: 36,
  },
  roomArrowText: {
    color: '#103D2B',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 12,
    padding: 22,
  },
  emptyTitle: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyCopy: {
    color: '#697566',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
});
