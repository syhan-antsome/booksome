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

type RoomFilter = 'all' | 'reading' | 'question' | 'new';
const bookroomSignboardRatio = 803 / 1400;
const bookroomSignboardSource = bookroomSignboardImage as ImageSourcePropType;

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
        setRemoteRooms([]);
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
  const featuredRoom = rooms[0];
  const traceRooms = rooms.slice(0, 5);
  const questionRooms = useMemo(
    () => [...rooms].sort((a, b) => b.question.length - a.question.length).slice(0, 4),
    [rooms],
  );
  const totalReaders = rooms.reduce((total, room) => total + parseMembers(room.members), 0);
  const questionCount = rooms.filter((room) => room.question).length;
  const signboardHeight = Math.round(width * bookroomSignboardRatio);
  const filterItems: { key: RoomFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'reading', label: '머무는 책' },
    { key: 'question', label: '질문' },
    { key: 'new', label: '새 책장' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.signboardStage, { height: signboardHeight }]}>
          <Image resizeMode="cover" source={bookroomSignboardSource} style={styles.signboardImage} />
          <LinearGradient
            colors={['rgba(250,249,244,0)', '#FAF9F4']}
            locations={[0.62, 1]}
            pointerEvents="none"
            style={styles.signboardFade}
          />
        </View>

        {featuredRoom ? (
          <View style={styles.introStage}>
            <View style={styles.introTopRow}>
              <View style={styles.introHeadingBlock}>
                <Text style={styles.introEyebrow}>BOOKROOM</Text>
                <Text style={styles.introTitle}>책 한 권이 여는 자리</Text>
              </View>
              <Link asChild href={session ? '/create-room' : '/auth'}>
                <Pressable accessibilityLabel="책장에 책 놓기" style={styles.createShelfButton}>
                  <Text style={styles.createShelfIcon}>＋</Text>
                </Pressable>
              </Link>
            </View>

            <Link asChild href={`/room/${featuredRoom.slug}`}>
              <Pressable style={styles.featuredBook}>
                <View style={styles.featuredCoverWrap}>
                  <BookCover room={featuredRoom} style={styles.featuredCover} />
                </View>
                <View style={styles.featuredCopy}>
                  <Text style={styles.featuredKicker}>오늘 머무는 책</Text>
                  <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.84} style={styles.featuredTitle}>
                    {featuredRoom.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.featuredAuthor}>
                    {featuredRoom.author}
                  </Text>
                  <Text numberOfLines={3} style={styles.featuredQuestion}>
                    “{featuredRoom.question}”
                  </Text>
                  <View style={styles.featuredMetaLine}>
                    <Text style={styles.featuredMetaText}>{featuredRoom.members}명의 독자</Text>
                    <Text style={styles.featuredMetaDot}>·</Text>
                    <Text style={styles.featuredMetaText}>{featuredRoom.progress}% 읽기 온도</Text>
                  </View>
                </View>
              </Pressable>
            </Link>

            <View style={styles.indexStrip}>
              <View style={styles.indexItem}>
                <Text style={styles.indexValue}>{rooms.length}</Text>
                <Text style={styles.indexLabel}>열린 책장</Text>
              </View>
              <View style={styles.indexDivider} />
              <View style={styles.indexItem}>
                <Text style={styles.indexValue}>{formatReaderCount(totalReaders)}</Text>
                <Text style={styles.indexLabel}>지나간 독자</Text>
              </View>
              <View style={styles.indexDivider} />
              <View style={styles.indexItem}>
                <Text style={styles.indexValue}>{questionCount}</Text>
                <Text style={styles.indexLabel}>남은 질문</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.searchStage}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>책장을 찾기</Text>
            <Text style={styles.searchMeta}>{isLoadingRooms ? '불러오는 중' : `${rooms.length}권`}</Text>
          </View>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder="책 제목, 저자, 질문으로 찾기"
              placeholderTextColor="rgba(33,42,37,0.42)"
              style={styles.searchInput}
              value={query}
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>TRACE SHELF</Text>
            <Text style={styles.sectionTitle}>지금 문장이 머무는 책</Text>
          </View>
          <Text style={styles.sectionMeta}>책별 흔적</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.traceRail}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {traceRooms.map((room) => (
            <Link asChild href={`/room/${room.slug}`} key={room.slug}>
              <Pressable style={styles.traceBook}>
                <BookCover room={room} style={styles.traceCover} />
                <Text numberOfLines={2} style={styles.traceTitle}>
                  {room.title}
                </Text>
                <Text numberOfLines={1} style={styles.traceAuthor}>
                  {room.author}
                </Text>
                <View style={styles.traceLine} />
                <Text style={styles.traceReaders}>{room.members}명이 머문 책</Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>

        <View style={styles.questionPanel}>
          <View style={styles.questionPanelHeader}>
            <Text style={styles.questionPanelTitle}>책이 남긴 질문</Text>
            <Text style={styles.questionPanelMeta}>읽은 뒤에 남는 것들</Text>
          </View>
          {questionRooms.map((room, index) => (
            <Link asChild href={`/room/${room.slug}`} key={room.slug}>
              <Pressable style={styles.questionRow}>
                <Text style={styles.questionNumber}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.questionCopy}>
                  <Text numberOfLines={2} style={styles.questionText}>
                    {room.question}
                  </Text>
                  <Text numberOfLines={1} style={styles.questionBook}>
                    {room.title} · {room.author}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>

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
          <View>
            <Text style={styles.sectionEyebrow}>ALL BOOKS</Text>
            <Text style={styles.sectionTitle}>모든 책장</Text>
          </View>
          <Text style={styles.sectionMeta}>{filteredRooms.length}권</Text>
        </View>

        <View style={styles.roomList}>
          {filteredRooms.map((room) => (
            <Link asChild href={`/room/${room.slug}`} key={room.slug}>
              <Pressable style={styles.bookRow}>
                <BookCover room={room} style={styles.bookRowCover} />
                <View style={styles.bookRowCopy}>
                  <Text numberOfLines={1} style={styles.bookRowTitle}>
                    {room.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.bookRowAuthor}>
                    {room.author}
                  </Text>
                  <Text numberOfLines={2} style={styles.bookRowQuestion}>
                    {room.question}
                  </Text>
                  <View style={styles.bookRowMeta}>
                    <Text style={styles.bookRowMetaText}>{room.members}명의 독자</Text>
                    <Text style={styles.bookRowDot}>·</Text>
                    <Text style={styles.bookRowMetaText}>{room.progress}%</Text>
                  </View>
                </View>
                <View style={styles.bookRowArrow}>
                  <Text style={styles.bookRowArrowText}>›</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>

        {filteredRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>아직 열린 책장이 없어요</Text>
            <Text style={styles.emptyCopy}>다른 책 제목이나 저자 이름으로 다시 찾아보세요.</Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation active="rooms" />
    </SafeAreaView>
  );
}

function BookCover({ room, style }: { room: FeaturedRoom; style: object }) {
  const coverUrl = getRoomImageUrl(room);

  if (coverUrl) {
    return <Image resizeMode="cover" source={{ uri: coverUrl }} style={style} />;
  }

  return (
    <View style={[style, styles.coverFallback, { backgroundColor: room.accent }]}>
      <Text style={styles.coverFallbackText}>BOOK</Text>
    </View>
  );
}

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

  if (filter === 'reading') {
    return nextRooms.filter((room) => room.progress > 0 && room.progress < 100);
  }

  if (filter === 'question') {
    return nextRooms.filter((room) => Boolean(room.question));
  }

  if (filter === 'new') {
    return [...nextRooms].reverse();
  }

  return nextRooms;
}

function parseMembers(value: string) {
  if (value.endsWith('k')) {
    return Number(value.replace('k', '')) * 1000;
  }

  return Number(value.replace(/,/g, '')) || 0;
}

function formatReaderCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return String(value);
}

function toFeaturedRoom(room: RoomSummary): FeaturedRoom {
  return {
    slug: room.slug,
    title: room.title,
    author: room.subtitle ?? '작가 미상',
    host: room.host_name ?? '첫 독자',
    members: room.member_count.toLocaleString(),
    accent: room.accent_color,
    progress: room.progress_percent,
    next: room.next_event ?? '첫 읽기 흔적을 기다리고 있습니다',
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
    backgroundColor: '#FAF9F4',
    flex: 1,
  },
  content: {
    paddingBottom: 128,
  },
  signboardStage: {
    backgroundColor: '#FAF9F4',
    overflow: 'hidden',
    position: 'relative',
  },
  signboardImage: {
    height: '100%',
    width: '100%',
  },
  signboardFade: {
    bottom: -1,
    height: 108,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  introStage: {
    marginTop: -8,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  introTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  introHeadingBlock: {
    flex: 1,
    paddingRight: 16,
  },
  introEyebrow: {
    color: '#A14A3F',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 7,
  },
  introTitle: {
    color: '#17241F',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34,
  },
  createShelfButton: {
    alignItems: 'center',
    backgroundColor: '#17241F',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  createShelfIcon: {
    color: '#FAF9F4',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  featuredBook: {
    alignItems: 'flex-end',
    borderBottomColor: 'rgba(23,36,31,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 27,
    paddingBottom: 24,
  },
  featuredCoverWrap: {
    shadowColor: '#1A140F',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  featuredCover: {
    borderRadius: 3,
    height: 168,
    width: 112,
  },
  featuredCopy: {
    flex: 1,
    marginLeft: 20,
    paddingBottom: 2,
  },
  featuredKicker: {
    color: '#A14A3F',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  featuredTitle: {
    color: '#17241F',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 35,
  },
  featuredAuthor: {
    color: '#9D493E',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 7,
  },
  featuredQuestion: {
    color: '#414C45',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 18,
  },
  featuredMetaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  featuredMetaText: {
    color: '#7A8179',
    fontSize: 11,
    fontWeight: '900',
  },
  featuredMetaDot: {
    color: '#A7ADA6',
    fontSize: 11,
    fontWeight: '900',
    marginHorizontal: 7,
  },
  searchStage: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  searchHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchTitle: {
    color: '#17241F',
    fontSize: 18,
    fontWeight: '900',
  },
  searchMeta: {
    color: '#A14A3F',
    fontSize: 12,
    fontWeight: '900',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(23,36,31,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 15,
  },
  searchIcon: {
    color: '#17241F',
    fontSize: 20,
    fontWeight: '900',
  },
  searchInput: {
    color: '#17241F',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 48,
  },
  indexStrip: {
    alignSelf: 'center',
    borderBottomColor: 'rgba(23,36,31,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(23,36,31,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
  },
  indexItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 18,
  },
  indexDivider: {
    backgroundColor: 'rgba(23,36,31,0.12)',
    width: 1,
  },
  indexValue: {
    color: '#17241F',
    fontSize: 25,
    fontWeight: '900',
  },
  indexLabel: {
    color: '#71776F',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 34,
    paddingHorizontal: 20,
  },
  sectionEyebrow: {
    color: '#A14A3F',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#17241F',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionMeta: {
    color: '#737B73',
    fontSize: 12,
    fontWeight: '900',
  },
  traceRail: {
    gap: 16,
    paddingHorizontal: 20,
    paddingRight: 34,
  },
  traceBook: {
    width: 146,
  },
  traceCover: {
    borderRadius: 4,
    height: 208,
    width: 140,
  },
  traceTitle: {
    color: '#17241F',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 14,
  },
  traceAuthor: {
    color: '#6F766F',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  traceLine: {
    backgroundColor: '#17241F',
    height: 2,
    marginTop: 12,
    width: 26,
  },
  traceReaders: {
    color: '#9D493E',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 9,
  },
  questionPanel: {
    backgroundColor: '#182A32',
    marginTop: 38,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  questionPanelHeader: {
    marginBottom: 8,
  },
  questionPanelTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  questionPanelMeta: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  questionRow: {
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 15,
    paddingVertical: 18,
  },
  questionNumber: {
    color: '#E8C982',
    fontSize: 14,
    fontWeight: '900',
    width: 28,
  },
  questionCopy: {
    flex: 1,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  questionBook: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  filterRail: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 20,
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(23,36,31,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: '#17241F',
    borderColor: '#17241F',
  },
  filterText: {
    color: '#697169',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  roomList: {
    paddingHorizontal: 20,
  },
  bookRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(23,36,31,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 132,
    paddingVertical: 16,
  },
  bookRowCover: {
    borderRadius: 3,
    height: 108,
    width: 72,
  },
  bookRowCopy: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  bookRowTitle: {
    color: '#17241F',
    fontSize: 19,
    fontWeight: '900',
  },
  bookRowAuthor: {
    color: '#9D493E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  bookRowQuestion: {
    color: '#59615A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 8,
  },
  bookRowMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 9,
  },
  bookRowMetaText: {
    color: '#7D857D',
    fontSize: 11,
    fontWeight: '900',
  },
  bookRowDot: {
    color: '#A7ADA6',
    fontSize: 11,
    fontWeight: '900',
    marginHorizontal: 6,
  },
  bookRowArrow: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bookRowArrowText: {
    color: '#17241F',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 29,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverFallbackText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyBox: {
    alignItems: 'center',
    borderColor: 'rgba(23,36,31,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: '#17241F',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyCopy: {
    color: '#737B73',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
});
