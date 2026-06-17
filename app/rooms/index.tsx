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
  const heroRoom = rooms[0];
  const traceRooms = rooms.slice(0, 5);
  const questionRooms = useMemo(
    () => [...rooms].sort((a, b) => b.question.length - a.question.length).slice(0, 4),
    [rooms],
  );
  const totalReaders = rooms.reduce((total, room) => total + parseMembers(room.members), 0);
  const questionCount = rooms.filter((room) => room.question).length;
  const signboardHeight = Math.round(width * bookroomSignboardRatio);
  const heroHeight = Math.max(460, Math.min(560, width * 1.12));
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
            colors={['rgba(243,242,236,0)', '#F3F2EC']}
            locations={[0.62, 1]}
            pointerEvents="none"
            style={styles.signboardFade}
          />
        </View>

        {heroRoom ? (
          <View style={[styles.hero, { height: heroHeight }]}>
            <HeroMedia room={heroRoom} />
            <LinearGradient
              colors={['rgba(8,18,15,0.18)', 'rgba(8,18,15,0.5)', '#0C211B']}
              locations={[0, 0.47, 1]}
              pointerEvents="none"
              style={styles.heroShade}
            />

            <View style={styles.heroTop}>
              <View>
                <Text style={styles.appName}>BookSome</Text>
                <Text style={styles.appSection}>Bookroom</Text>
              </View>
              <Link asChild href={session ? '/create-room' : '/auth'}>
                <Pressable accessibilityLabel="책장에 책 놓기" style={styles.createIconButton}>
                  <Text style={styles.createIconText}>＋</Text>
                </Pressable>
              </Link>
            </View>

            <View style={styles.heroBookLayer}>
              <View style={styles.heroPosterShadow} />
              <BookCover room={heroRoom} style={styles.heroPoster} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>책이 열어둔 자리</Text>
              <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.heroTitle}>
                {heroRoom.title}
              </Text>
              <Text style={styles.heroAuthor}>{heroRoom.author}</Text>
              <Text numberOfLines={2} style={styles.heroQuestion}>
                “{heroRoom.question}”
              </Text>
              <View style={styles.heroMetaRow}>
                <TraceBadge value={heroRoom.members} label="지나간 독자" />
                <TraceBadge value={`${heroRoom.progress}%`} label="읽기 온도" />
                <TraceBadge value="첫" label="질문" />
              </View>
              <Link asChild href={`/room/${heroRoom.slug}`}>
                <Pressable style={styles.heroAction}>
                  <Text style={styles.heroActionText}>이 책장 보기</Text>
                  <Text style={styles.heroActionArrow}>›</Text>
                </Pressable>
              </Link>
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

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Trace shelf</Text>
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
            <Text style={styles.sectionEyebrow}>All books</Text>
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
                    <Text style={styles.bookRowMetaText}>{room.members} readers</Text>
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

function HeroMedia({ room }: { room: FeaturedRoom }) {
  const coverUrl = getRoomImageUrl(room);

  if (coverUrl) {
    return <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.heroImage} />;
  }

  return <View style={[styles.heroFallback, { backgroundColor: room.accent }]} />;
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

function TraceBadge({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.traceBadge}>
      <Text style={styles.traceBadgeValue}>{value}</Text>
      <Text style={styles.traceBadgeLabel}>{label}</Text>
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
    author: room.subtitle ?? 'BookSome',
    host: room.host_name ?? '첫 독자',
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
    backgroundColor: '#F3F2EC',
    flex: 1,
  },
  content: {
    paddingBottom: 128,
  },
  signboardStage: {
    backgroundColor: '#F3F2EC',
    overflow: 'hidden',
    position: 'relative',
  },
  signboardImage: {
    height: '100%',
    width: '100%',
  },
  signboardFade: {
    bottom: -1,
    height: 88,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  hero: {
    backgroundColor: '#0C211B',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginHorizontal: 16,
    marginBottom: 22,
    marginTop: -4,
    overflow: 'hidden',
    paddingHorizontal: 22,
    position: 'relative',
  },
  heroImage: {
    bottom: 0,
    left: 0,
    opacity: 0.78,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroFallback: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroShade: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 18,
    position: 'relative',
    zIndex: 2,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  appSection: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  createIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  createIconText: {
    color: '#0C211B',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroBookLayer: {
    alignItems: 'center',
    position: 'absolute',
    right: 22,
    top: 118,
    width: 132,
    zIndex: 1,
  },
  heroPoster: {
    borderRadius: 4,
    height: 190,
    width: 124,
  },
  heroPosterShadow: {
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: 12,
    bottom: -14,
    height: 32,
    position: 'absolute',
    width: 112,
  },
  heroCopy: {
    bottom: 30,
    left: 22,
    position: 'absolute',
    right: 22,
    zIndex: 2,
  },
  heroKicker: {
    color: '#E8C982',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 44,
    maxWidth: 210,
  },
  heroAuthor: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  heroQuestion: {
    color: '#F5EAD3',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 24,
    maxWidth: 330,
  },
  heroMetaRow: {
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
    paddingVertical: 13,
  },
  traceBadge: {
    flex: 1,
  },
  traceBadgeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  traceBadgeLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
  },
  heroAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3F2EC',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  heroActionText: {
    color: '#0C211B',
    fontSize: 15,
    fontWeight: '900',
  },
  heroActionArrow: {
    color: '#9F3E39',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  searchStage: {
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
    borderRadius: 22,
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
    marginTop: 30,
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
    marginTop: 34,
    paddingHorizontal: 20,
    paddingVertical: 26,
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
    marginTop: 26,
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
    gap: 12,
    paddingHorizontal: 20,
  },
  bookRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(23,36,31,0.07)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 132,
    overflow: 'hidden',
    padding: 12,
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
    backgroundColor: '#EEF0E8',
    borderRadius: 18,
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
