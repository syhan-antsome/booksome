import { NotoSerifKR_500Medium } from '@expo-google-fonts/noto-serif-kr/500Medium';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import readingLifeSignboardImage from '../../assets/reading-life-signboard.jpg';
import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { getDailyReadingLifeQuote } from '../../src/data/reading-life-quotes';
import { useAuth } from '../../src/providers/auth-provider';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

type BookshelfFilter = 'all' | 'reading' | 'want_to_read' | 'finished' | 'paused';

const recordTypes = [
  { title: '읽는 책', copy: '현재 읽는 책과 진행률을 기록합니다.', section: 'progress' },
  { title: '문장 메모', copy: '오래 남기고 싶은 문장을 모읍니다.', section: 'quote' },
  { title: '사진 메모', copy: '책상, 페이지, 장소까지 독서의 순간을 남깁니다.', section: 'photo' },
];

const bookshelfFilters: Array<{ label: string; value: BookshelfFilter }> = [
  { label: '전체', value: 'all' },
  { label: '읽는 중', value: 'reading' },
  { label: '읽고 싶음', value: 'want_to_read' },
  { label: '완독', value: 'finished' },
  { label: '멈춤', value: 'paused' },
];

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const readingLifeSignboardSource: ImageSourcePropType =
  typeof readingLifeSignboardImage === 'string' ? { uri: readingLifeSignboardImage } : readingLifeSignboardImage;
const readingLifeSignboardRatio = 803 / 1400;

export default function ReadingLifeScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [quoteFontsLoaded] = useFonts({ NotoSerifKR_500Medium });
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookshelfFilter, setBookshelfFilter] = useState<BookshelfFilter>('all');
  const [selectedShelfBookId, setSelectedShelfBookId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setBooks([]);
      return;
    }

    setIsLoadingBooks(true);
    setLoadError(null);

    listReadingLifeBooks(session.user.id)
      .then((nextBooks) => {
        if (isMounted) setBooks(nextBooks);
      })
      .catch((error) => {
        if (isMounted) setLoadError(getErrorMessage(error, '독서생활 기록을 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLoadingBooks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const currentBook = books.find((book) => book.pinnedAt) ?? books.find((book) => book.status === 'reading') ?? books[0] ?? null;
  const filteredBooks = useMemo(() => {
    if (bookshelfFilter === 'all') return books;
    return books.filter((book) => book.status === bookshelfFilter);
  }, [books, bookshelfFilter]);
  const selectedShelfBook =
    books.find((book) => book.id === selectedShelfBookId) ??
    filteredBooks[0] ??
    currentBook;
  const calendarDays = useMemo(() => buildReadingCalendarDays(books, calendarMonth), [books, calendarMonth]);
  const dailyQuote = useMemo(() => getDailyReadingLifeQuote(), []);
  const isViewingCurrentMonth = isSameMonth(calendarMonth, new Date());
  const signHeroHeight = Math.round(width * readingLifeSignboardRatio);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.signHero, { height: signHeroHeight }]}>
          <Image resizeMode="contain" source={readingLifeSignboardSource} style={styles.signHeroImage} />
          <LinearGradient
            colors={['rgba(238, 241, 223, 0)', 'rgba(238, 241, 223, 0.38)', '#EEF1DF']}
            locations={[0, 0.48, 1]}
            pointerEvents="none"
            style={styles.signHeroGradient}
          />

          <View style={styles.signHeroTop}>
            <Link asChild href={session ? '/scan' : '/auth'}>
              <Pressable accessibilityLabel="책 스캔" style={styles.signHeroAction}>
                <Text style={styles.signHeroActionText}>＋</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.signIntro}>
          <Text style={[styles.dailyQuoteText, quoteFontsLoaded ? styles.dailyQuoteTextSerif : null]}>
            “{dailyQuote.text}”
          </Text>
        </View>

        {!session ? (
          <AuthRequired
            title="독서생활은 로그인 후 기록됩니다."
            copy="내 책, 진행률, 메모와 사진 기록을 안전하게 보관하기 위해 계정이 필요합니다."
          />
        ) : null}

        <View style={styles.calendarSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>독서달력</Text>
            <View style={styles.calendarMonthControl}>
              <Pressable
                accessibilityLabel="이전 달"
                onPress={() => setCalendarMonth((month) => addMonths(month, -1))}
                style={styles.calendarMonthButton}
              >
                <Text style={styles.calendarMonthButtonText}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="이번 달로 이동"
                disabled={isViewingCurrentMonth}
                onPress={() => setCalendarMonth(startOfMonth(new Date()))}
              >
                <Text style={[styles.calendarMonthText, isViewingCurrentMonth ? styles.calendarMonthTextCurrent : null]}>
                  {formatCalendarMonth(calendarMonth)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="다음 달"
                disabled={isViewingCurrentMonth}
                onPress={() => setCalendarMonth((month) => addMonths(month, 1))}
                style={[styles.calendarMonthButton, isViewingCurrentMonth ? styles.calendarMonthButtonDisabled : null]}
              >
                <Text
                  style={[
                    styles.calendarMonthButtonText,
                    isViewingCurrentMonth ? styles.calendarMonthButtonTextDisabled : null,
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.calendarWeekdays}>
            {weekdayLabels.map((weekday) => (
              <Text key={weekday} style={styles.calendarWeekday}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => (
              <View
                key={day.key}
                style={[
                  styles.calendarDay,
                  !day.isCurrentMonth ? styles.calendarDayMuted : null,
                  day.isToday ? styles.calendarDayToday : null,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    !day.isCurrentMonth ? styles.calendarDayTextMuted : null,
                    day.isToday ? styles.calendarDayTextToday : null,
                  ]}
                >
                  {day.label}
                </Text>
                <View style={styles.calendarDots}>
                  {day.hasRegistration ? <View style={[styles.calendarDot, styles.calendarDotRegister]} /> : null}
                  {day.hasReading ? <View style={[styles.calendarDot, styles.calendarDotReading]} /> : null}
                </View>
              </View>
            ))}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarDot, styles.calendarDotRegister]} />
              <Text style={styles.calendarLegendText}>등록</Text>
            </View>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarDot, styles.calendarDotReading]} />
              <Text style={styles.calendarLegendText}>독서</Text>
            </View>
          </View>
        </View>

        <Pressable
          disabled={!currentBook}
          onPress={() => {
            if (currentBook) router.push(`/reading-life/${currentBook.id}`);
          }}
          style={styles.currentBook}
        >
          <View style={styles.bookCover}>
            {currentBook?.externalCoverUrl ? (
              <Image resizeMode="cover" source={{ uri: currentBook.externalCoverUrl }} style={styles.bookCoverImage} />
            ) : (
              <Text style={styles.bookCoverText}>BOOK</Text>
            )}
          </View>
          <View style={styles.bookCopy}>
            <Text style={styles.bookState}>{currentBook?.pinnedAt ? '대표로 읽는 책' : '현재 읽는 책'}</Text>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {currentBook?.title ?? '아직 기록된 책이 없어요'}
            </Text>
            {currentBook ? <Text style={styles.bookAuthor}>{currentBook.author}</Text> : null}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${currentBook?.progressPercent ?? 0}%` }]} />
            </View>
            <Text style={styles.bookHint}>
              {currentBook ? getCurrentBookHint(currentBook) : '책을 추가하면 진행률과 메모가 여기에 모입니다.'}
            </Text>
          </View>
        </Pressable>

        {isLoadingBooks ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#103D2B" />
            <Text style={styles.loadingText}>나의 책장을 불러오는 중입니다</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {books.length > 0 ? (
          <View style={styles.myBooks}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>내 책장</Text>
              <Text style={styles.sectionCount}>{filteredBooks.length} / {books.length}권</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.shelfFilterContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {bookshelfFilters.map((filter) => (
                <Pressable
                  key={filter.value}
                  onPress={() => {
                    setBookshelfFilter(filter.value);
                    setSelectedShelfBookId(null);
                  }}
                  style={[styles.shelfFilter, bookshelfFilter === filter.value ? styles.shelfFilterActive : null]}
                >
                  <Text
                    style={[
                      styles.shelfFilterText,
                      bookshelfFilter === filter.value ? styles.shelfFilterTextActive : null,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView
              contentContainerStyle={styles.bookshelfContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {filteredBooks.map((book) => (
                <Pressable
                  key={book.id}
                  onPress={() => setSelectedShelfBookId(book.id)}
                  style={styles.shelfBook}
                >
                  <View
                    style={[
                      styles.shelfCover,
                      book.pinnedAt ? styles.shelfCoverPinned : null,
                      selectedShelfBook?.id === book.id ? styles.shelfCoverSelected : null,
                    ]}
                  >
                    {book.externalCoverUrl ? (
                      <Image resizeMode="cover" source={{ uri: book.externalCoverUrl }} style={styles.shelfCoverImage} />
                    ) : (
                      <Text style={styles.shelfCoverText}>BOOK</Text>
                    )}
                    {book.pinnedAt ? (
                      <View style={styles.pinnedFlag}>
                        <Text style={styles.pinnedFlagText}>대표</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.shelfTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.shelfMeta} numberOfLines={1}>
                    {book.totalPages ? `${book.progressPercent}%` : book.status === 'finished' ? '완독' : '읽는 중'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.bookshelfBoard} />
            {selectedShelfBook ? (
              <View style={styles.shelfPreview}>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewState}>{getStatusLabel(selectedShelfBook)}</Text>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {selectedShelfBook.title}
                  </Text>
                  <Text style={styles.previewMeta} numberOfLines={1}>
                    {getCurrentBookHint(selectedShelfBook)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/reading-life/${selectedShelfBook.id}`)}
                  style={styles.previewButton}
                >
                  <Text style={styles.previewButtonText}>상세보기</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.recordList}>
          {recordTypes.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => {
                if (currentBook) {
                  router.push({
                    pathname: '/reading-life/[id]',
                    params: { id: currentBook.id, section: item.section },
                  });
                  return;
                }

                router.push(session ? '/scan' : '/auth');
              }}
              style={styles.recordItem}
            >
              <View style={styles.recordMark} />
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>{item.title}</Text>
                <Text style={styles.recordText}>{item.copy}</Text>
              </View>
              <Text style={styles.recordArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNavigation active="reading-life" />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

function getCurrentBookHint(book: ReadingLifeBook) {
  if (book.totalPages) {
    return `${book.currentPage} / ${book.totalPages}쪽 · ${book.progressPercent}%까지 읽었습니다.`;
  }

  return '이제 진행률, 문장, 사진 메모를 이어서 붙일 수 있습니다.';
}

function getStatusLabel(book: ReadingLifeBook) {
  if (book.pinnedAt) return '대표 책';
  if (book.status === 'reading') return '읽는 중';
  if (book.status === 'want_to_read') return '읽고 싶음';
  if (book.status === 'finished') return '완독';
  return '잠시 멈춤';
}

function formatCalendarMonth(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildReadingCalendarDays(books: ReadingLifeBook[], visibleMonth: Date) {
  const today = new Date();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());
  const registrationDates = new Set(books.map((book) => toDateKey(new Date(book.createdAt))));
  const readingDates = new Set(
    books
      .filter((book) => book.progressPercent > 0 || book.currentPage > 0)
      .map((book) => toDateKey(new Date(book.updatedAt))),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = toDateKey(date);

    return {
      hasReading: readingDates.has(key),
      hasRegistration: registrationDates.has(key),
      isCurrentMonth: date.getMonth() === month,
      isToday: key === toDateKey(today),
      key,
      label: String(date.getDate()),
    };
  });
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#EEF1DF',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 124,
  },
  signHero: {
    marginHorizontal: -20,
    marginTop: -20,
    overflow: 'hidden',
    position: 'relative',
  },
  signHeroImage: {
    height: '100%',
    width: '100%',
  },
  signHeroGradient: {
    bottom: -1,
    height: 118,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  signHeroTop: {
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
  signHeroAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.92)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  signHeroActionText: {
    color: '#103D2B',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  signIntro: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    marginTop: 4,
    paddingBottom: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dailyQuoteText: {
    color: '#26372B',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 25,
    maxWidth: 286,
    textAlign: 'center',
  },
  dailyQuoteTextSerif: {
    fontFamily: 'NotoSerifKR_500Medium',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  addButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  hero: {
    backgroundColor: '#103D2B',
    borderRadius: 32,
    minHeight: 232,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  heroCopy: {
    maxWidth: 240,
    zIndex: 2,
  },
  kicker: {
    color: '#D8BE88',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copy: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  mascot: {
    bottom: -8,
    height: 116,
    position: 'absolute',
    right: 8,
    width: 142,
  },
  statsRow: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(16,61,43,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 2,
  },
  statItem: {
    flex: 1,
    paddingVertical: 17,
  },
  statValue: {
    color: '#103D2B',
    fontSize: 27,
    fontWeight: '900',
  },
  statLabel: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  currentBook: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    paddingVertical: 20,
  },
  bookCover: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 16,
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  bookCoverImage: {
    height: '100%',
    width: '100%',
  },
  bookCoverText: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  bookCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  bookState: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  bookTitle: {
    color: '#26372B',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 5,
  },
  bookAuthor: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  progressTrack: {
    backgroundColor: '#E5DCC9',
    borderRadius: 4,
    height: 8,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#103D2B',
    height: '100%',
    width: '12%',
  },
  bookHint: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 9,
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  loadingText: {
    color: '#435049',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  calendarSection: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    marginTop: 2,
    paddingBottom: 20,
  },
  calendarMonthControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  calendarMonthButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  calendarMonthButtonDisabled: {
    opacity: 0.32,
  },
  calendarMonthButtonText: {
    color: '#103D2B',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  calendarMonthButtonTextDisabled: {
    color: '#7B877D',
  },
  calendarMonthText: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 54,
    textAlign: 'center',
  },
  calendarMonthTextCurrent: {
    color: '#103D2B',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginTop: 16,
  },
  calendarWeekday: {
    color: '#8F6A42',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  calendarDay: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  calendarDayMuted: {
    opacity: 0.28,
  },
  calendarDayToday: {
    backgroundColor: 'rgba(16,61,43,0.1)',
    borderRadius: 18,
  },
  calendarDayText: {
    color: '#26372B',
    fontSize: 13,
    fontWeight: '800',
  },
  calendarDayTextMuted: {
    color: '#8E998D',
  },
  calendarDayTextToday: {
    color: '#103D2B',
    fontWeight: '900',
  },
  calendarDots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 3,
  },
  calendarDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  calendarDotRegister: {
    backgroundColor: '#8F6A42',
  },
  calendarDotReading: {
    backgroundColor: '#116653',
  },
  calendarLegend: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  calendarLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  calendarLegendText: {
    color: '#72806E',
    fontSize: 11,
    fontWeight: '800',
  },
  myBooks: {
    marginTop: 24,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#26372B',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionCount: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  shelfFilterContent: {
    gap: 8,
    paddingRight: 20,
    paddingTop: 14,
  },
  shelfFilter: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.16)',
    borderBottomWidth: 1,
    minWidth: 58,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  shelfFilterActive: {
    borderBottomColor: '#103D2B',
    borderBottomWidth: 3,
  },
  shelfFilterText: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
  },
  shelfFilterTextActive: {
    color: '#103D2B',
    fontWeight: '900',
  },
  bookshelfContent: {
    gap: 18,
    paddingRight: 20,
    paddingTop: 18,
  },
  shelfBook: {
    width: 104,
  },
  shelfCover: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 13,
    height: 138,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 92,
  },
  shelfCoverPinned: {
    borderColor: '#103D2B',
    borderWidth: 2,
  },
  shelfCoverSelected: {
    transform: [{ translateY: -5 }],
  },
  shelfCoverImage: {
    height: '100%',
    width: '100%',
  },
  shelfCoverText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  pinnedFlag: {
    backgroundColor: '#103D2B',
    borderRadius: 999,
    bottom: 7,
    left: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
  },
  pinnedFlagText: {
    color: '#F7F1E5',
    fontSize: 10,
    fontWeight: '900',
  },
  shelfTitle: {
    color: '#26372B',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 10,
    width: 92,
  },
  shelfMeta: {
    color: '#72806E',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    width: 92,
  },
  bookshelfBoard: {
    backgroundColor: 'rgba(143,106,66,0.2)',
    borderRadius: 999,
    height: 9,
    marginTop: 8,
  },
  shelfPreview: {
    alignItems: 'center',
    borderTopColor: 'rgba(16,61,43,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewState: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  previewTitle: {
    color: '#26372B',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 4,
  },
  previewMeta: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  previewButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 17,
    height: 42,
    justifyContent: 'center',
    minWidth: 82,
    paddingHorizontal: 14,
  },
  previewButtonText: {
    color: '#F7F1E5',
    fontSize: 13,
    fontWeight: '900',
  },
  myBookItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
  },
  myBookImage: {
    borderRadius: 14,
    height: 78,
    width: 54,
  },
  myBookFallback: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 14,
    height: 78,
    justifyContent: 'center',
    width: 54,
  },
  myBookFallbackText: {
    color: '#103D2B',
    fontSize: 10,
    fontWeight: '900',
  },
  myBookCopy: {
    flex: 1,
  },
  myBookTitle: {
    color: '#26372B',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  myBookMeta: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  recordList: {
    marginTop: 20,
  },
  recordItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
  },
  recordMark: {
    backgroundColor: '#103D2B',
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  recordCopy: {
    flex: 1,
  },
  recordTitle: {
    color: '#26372B',
    fontSize: 17,
    fontWeight: '800',
  },
  recordText: {
    color: '#72806E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 3,
  },
  recordArrow: {
    color: '#103D2B',
    fontSize: 30,
    fontWeight: '900',
  },
});
