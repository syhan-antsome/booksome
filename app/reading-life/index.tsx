import { NotoSerifKR_500Medium } from '@expo-google-fonts/noto-serif-kr/500Medium';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getRandomReadingLifeQuote } from '../../src/data/reading-life-quotes';
import { useAuth } from '../../src/providers/auth-provider';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

type BookshelfFilter = 'all' | 'reading' | 'want_to_read' | 'finished' | 'paused';
type CalendarEventType = 'registration' | 'reading';
type ReadingRecordSection = 'progress' | 'quote' | 'photo';

type CalendarEvent = {
  book: ReadingLifeBook;
  type: CalendarEventType;
};

const currentBookActions: Array<{ label: string; section: ReadingRecordSection }> = [
  { label: '기록하기', section: 'progress' },
  { label: '문장 남기기', section: 'quote' },
  { label: '사진 남기기', section: 'photo' },
];

const bookshelfFilters: Array<{ label: string; value: BookshelfFilter }> = [
  { label: '전체', value: 'all' },
  { label: '읽는 중', value: 'reading' },
  { label: '읽고 싶음', value: 'want_to_read' },
  { label: '완독', value: 'finished' },
  { label: '멈춤', value: 'paused' },
];

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
const bookshelfEmptyMessages: Record<BookshelfFilter, string> = {
  all: '아직 등록된 책이 없습니다.',
  reading: '읽는 중인 책이 없습니다.',
  want_to_read: '읽고 싶은 책이 없습니다.',
  finished: '완독한 책이 없습니다.',
  paused: '잠시 쉬는 책이 없습니다.',
};

const readingLifeSignboardSource: ImageSourcePropType =
  typeof readingLifeSignboardImage === 'string' ? { uri: readingLifeSignboardImage } : readingLifeSignboardImage;
const readingLifeSignboardRatio = 803 / 1400;
const bookshelfEndThreshold = 16;

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
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [readingQuote, setReadingQuote] = useState(() => getRandomReadingLifeQuote());
  const [showBookshelfMoreCue, setShowBookshelfMoreCue] = useState(false);
  const bookshelfScrollMetrics = useRef({ contentWidth: 0, offsetX: 0, viewportWidth: 0 });

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

  useEffect(() => {
    setSelectedCalendarDateKey(null);
  }, [calendarMonth]);

  useFocusEffect(
    useCallback(() => {
      setReadingQuote((currentQuote) => getRandomReadingLifeQuote(currentQuote.text));
    }, []),
  );

  const updateBookshelfMoreCue = useCallback((nextMetrics: Partial<typeof bookshelfScrollMetrics.current>) => {
    const metrics = { ...bookshelfScrollMetrics.current, ...nextMetrics };
    bookshelfScrollMetrics.current = metrics;

    const isScrollable = metrics.contentWidth > metrics.viewportWidth + bookshelfEndThreshold;
    const isAtEnd = metrics.offsetX + metrics.viewportWidth >= metrics.contentWidth - bookshelfEndThreshold;
    const shouldShow = isScrollable && !isAtEnd;

    setShowBookshelfMoreCue((current) => (current === shouldShow ? current : shouldShow));
  }, []);

  const currentBook = books.find((book) => book.pinnedAt) ?? books.find((book) => book.status === 'reading') ?? books[0] ?? null;
  const filteredBooks = useMemo(() => {
    if (bookshelfFilter === 'all') return books;
    return books.filter((book) => book.status === bookshelfFilter);
  }, [books, bookshelfFilter]);

  useEffect(() => {
    updateBookshelfMoreCue({ offsetX: 0 });
  }, [filteredBooks.length, updateBookshelfMoreCue]);

  const selectedShelfBook =
    filteredBooks.find((book) => book.id === selectedShelfBookId) ??
    filteredBooks[0] ??
    null;
  const bookshelfEmptyMessage = bookshelfEmptyMessages[bookshelfFilter];
  const calendarDays = useMemo(() => buildReadingCalendarDays(books, calendarMonth), [books, calendarMonth]);
  const selectedCalendarEvents = useMemo(
    () => getCalendarEventsForDate(books, selectedCalendarDateKey),
    [books, selectedCalendarDateKey],
  );
  const isViewingCurrentMonth = isSameMonth(calendarMonth, new Date());
  const signHeroHeight = Math.round(width * readingLifeSignboardRatio);
  const openCurrentBookAction = useCallback(
    (section: ReadingRecordSection) => {
      if (currentBook) {
        router.push({
          pathname: '/reading-life/[id]',
          params: { id: currentBook.id, section },
        });
        return;
      }

      router.push(session ? '/scan' : '/auth');
    },
    [currentBook, session],
  );

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
        </View>

        <View style={styles.signIntro}>
          <Text style={[styles.dailyQuoteText, quoteFontsLoaded ? styles.dailyQuoteTextSerif : null]}>
            “{readingQuote.text}”
          </Text>
        </View>

        {!session ? (
          <AuthRequired
            title="독서생활은 로그인 후 기록됩니다."
            copy="내 책, 진행률, 메모와 사진 기록을 안전하게 보관하기 위해 계정이 필요합니다."
          />
        ) : null}

        <View style={styles.currentBook}>
          <View style={styles.currentBookHeader}>
            <Text style={styles.currentBookSectionTitle}>지금 읽는 책</Text>
            {currentBook ? <Text style={styles.currentBookPercent}>{currentBook.progressPercent}%</Text> : null}
          </View>

          <Pressable
            disabled={!currentBook}
            onPress={() => {
              if (currentBook) router.push(`/reading-life/${currentBook.id}`);
            }}
            style={styles.currentBookBody}
          >
            <View style={styles.bookCover}>
              {currentBook?.externalCoverUrl ? (
                <Image resizeMode="cover" source={{ uri: currentBook.externalCoverUrl }} style={styles.bookCoverImage} />
              ) : (
                <Text style={styles.bookCoverText}>BOOK</Text>
              )}
            </View>
            <View style={styles.bookCopy}>
              <Text style={styles.bookState}>
                {currentBook ? getCurrentBookStatusText(currentBook) : '기록을 기다리는 중'}
              </Text>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {currentBook?.title ?? '아직 기록된 책이 없어요'}
              </Text>
              {currentBook ? <Text style={styles.bookAuthor}>{currentBook.author}</Text> : null}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${currentBook?.progressPercent ?? 0}%` }]} />
              </View>
              {currentBook?.totalPages ? (
                <Text style={styles.bookHint}>{getCurrentBookHint(currentBook)}</Text>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.currentBookActions}>
            {currentBook ? (
              currentBookActions.map((action, index) => (
                <Pressable
                  key={action.section}
                  onPress={() => openCurrentBookAction(action.section)}
                  style={[
                    styles.currentBookAction,
                    index === 0 ? styles.currentBookActionPrimary : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.currentBookActionText,
                      index === 0 ? styles.currentBookActionTextPrimary : null,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Pressable onPress={() => router.push(session ? '/scan' : '/auth')} style={styles.currentBookEmptyAction}>
                <Text style={styles.currentBookActionTextPrimary}>책 등록하기</Text>
              </Pressable>
            )}
          </View>
        </View>

        {isLoadingBooks ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#103D2B" />
            <Text style={styles.loadingText}>나의 책장을 불러오는 중입니다</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.calendarSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.calendarTitleBlock}>
              <Text style={styles.calendarTitle}>읽은 날들</Text>
              <View style={styles.calendarLegend}>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarDot, styles.calendarDotRegister]} />
                  <Text style={styles.calendarLegendText}>책을 만난 날</Text>
                </View>
                <View style={styles.calendarLegendItem}>
                  <View style={[styles.calendarDot, styles.calendarDotReading]} />
                  <Text style={styles.calendarLegendText}>읽은 날</Text>
                </View>
              </View>
            </View>
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
                style={styles.calendarMonthLabelButton}
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
            {calendarDays.map((day) => {
              const hasEvents = day.hasRegistration || day.hasReading;
              const isSelectable = hasEvents;
              const isSelected = selectedCalendarDateKey === day.key;

              return (
                <Pressable
                  disabled={!isSelectable}
                  key={day.key}
                  onPress={() => setSelectedCalendarDateKey(day.key)}
                  style={[
                    styles.calendarDay,
                    day.isToday ? styles.calendarDayToday : null,
                    isSelected ? styles.calendarDaySelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      hasEvents ? styles.calendarDayTextWithEvents : null,
                      !day.isCurrentMonth ? styles.calendarDayTextMuted : null,
                      day.isToday ? styles.calendarDayTextToday : null,
                      isSelected ? styles.calendarDayTextSelected : null,
                    ]}
                  >
                    {day.label}
                  </Text>
                  <View style={styles.calendarDots}>
                    {day.hasRegistration ? (
                      <View
                        style={[
                          styles.calendarDot,
                          styles.calendarDotRegister,
                        ]}
                      />
                    ) : null}
                    {day.hasReading ? (
                      <View
                        style={[
                          styles.calendarDot,
                          styles.calendarDotReading,
                        ]}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {selectedCalendarDateKey ? (
            <View style={styles.calendarDetail}>
              <View style={styles.calendarDetailHeader}>
                <Text style={styles.calendarDetailDate}>{formatCalendarDateLabel(selectedCalendarDateKey)}</Text>
                <Pressable accessibilityLabel="선택한 날짜 닫기" onPress={() => setSelectedCalendarDateKey(null)}>
                  <Text style={styles.calendarDetailClose}>×</Text>
                </Pressable>
              </View>
              {selectedCalendarEvents.map((event) => (
                <Pressable
                  key={`${event.type}-${event.book.id}`}
                  onPress={() => router.push(`/reading-life/${event.book.id}`)}
                  style={styles.calendarEventItem}
                >
                  <View
                    style={[
                      styles.calendarEventMark,
                      event.type === 'registration' ? styles.calendarEventMarkRegister : styles.calendarEventMarkReading,
                    ]}
                  />
                  <View style={styles.calendarEventCopy}>
                    <Text style={styles.calendarEventType}>{event.type === 'registration' ? '책 등록' : '독서'}</Text>
                    <Text numberOfLines={1} style={styles.calendarEventTitle}>
                      {event.book.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.calendarEventMeta}>
                      {formatCalendarEventMeta(event)}
                    </Text>
                  </View>
                  <Text style={styles.calendarEventArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {session ? (
          <View style={styles.myBooks}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.shelfTitleGroup}>
                <Text style={styles.sectionTitle}>내 책장</Text>
                <Text style={styles.sectionCount}>{filteredBooks.length} / {books.length}권</Text>
              </View>
              <Link asChild href="/scan">
                <Pressable accessibilityLabel="책 등록" style={styles.shelfAddButton}>
                  <Text style={styles.shelfAddButtonText}>＋</Text>
                </Pressable>
              </Link>
            </View>

            {books.length > 0 ? (
              <>
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
                <View style={styles.bookshelfFrame}>
                  {filteredBooks.length > 0 ? (
                    <ScrollView
                      key={bookshelfFilter}
                      contentContainerStyle={styles.bookshelfContent}
                      horizontal
                      onContentSizeChange={(contentWidth) => updateBookshelfMoreCue({ contentWidth })}
                      onLayout={(event) =>
                        updateBookshelfMoreCue({ viewportWidth: event.nativeEvent.layout.width })
                      }
                      onScroll={(event) =>
                        updateBookshelfMoreCue({ offsetX: Math.max(0, event.nativeEvent.contentOffset.x) })
                      }
                      scrollEventThrottle={16}
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
                                <Text style={styles.pinnedFlagText}>지금</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.shelfTitle} numberOfLines={2}>
                            {book.title}
                          </Text>
                          <Text style={styles.shelfMeta} numberOfLines={1}>
                            {getShelfBookMeta(book)}
                          </Text>
                          {shouldShowShelfProgress(book) ? (
                            <View style={styles.shelfProgressTrack}>
                              <View style={[styles.shelfProgressFill, { width: `${book.progressPercent}%` }]} />
                            </View>
                          ) : null}
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.shelfEmptyState}>
                      <Text style={styles.shelfEmptyText}>{bookshelfEmptyMessage}</Text>
                    </View>
                  )}
                  {filteredBooks.length > 3 && showBookshelfMoreCue ? (
                    <LinearGradient
                      colors={['rgba(238, 241, 223, 0)', 'rgba(238, 241, 223, 0.96)']}
                      end={{ x: 1, y: 0.5 }}
                      pointerEvents="none"
                      start={{ x: 0, y: 0.5 }}
                      style={styles.bookshelfMoreFade}
                    >
                      <View style={styles.bookshelfMoreCue}>
                        <Text style={styles.bookshelfMoreArrow}>›</Text>
                      </View>
                    </LinearGradient>
                  ) : null}
                </View>
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
              </>
            ) : (
              <View style={styles.emptyShelf}>
                <Text style={styles.emptyShelfText}>책을 스캔해 첫 책을 올려두세요.</Text>
              </View>
            )}
          </View>
        ) : null}

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
  return `${book.currentPage} / ${book.totalPages}쪽 · ${book.progressPercent}%까지 읽었습니다.`;
}

function getCurrentBookStatusText(book: ReadingLifeBook) {
  if (book.status === 'want_to_read') return '곧 읽을 책';
  if (book.status === 'finished') return '완독한 책';
  if (book.status === 'paused') return '잠시 쉬는 책';

  return '이어 읽는 중';
}

function getStatusLabel(book: ReadingLifeBook) {
  if (book.pinnedAt) return '지금 읽는 책';
  if (book.status === 'reading') return '읽는 중';
  if (book.status === 'want_to_read') return '읽고 싶음';
  if (book.status === 'finished') return '완독';
  return '잠시 쉼';
}

function getShelfBookMeta(book: ReadingLifeBook) {
  if (book.status === 'finished') return '완독';
  if (book.status === 'want_to_read') return '읽고 싶음';
  if (book.status === 'paused') return '잠시 쉼';
  if (book.totalPages) return `${book.progressPercent}%`;

  return '읽는 중';
}

function shouldShowShelfProgress(book: ReadingLifeBook) {
  return book.status === 'reading' && Boolean(book.totalPages);
}

function formatCalendarMonth(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCalendarDateLabel(dateKey: string) {
  const date = dateFromKey(dateKey);

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${weekdayLabels[date.getDay()]}요일`;
}

function formatCalendarEventMeta(event: CalendarEvent) {
  if (event.type === 'registration') {
    return event.book.author ? `${event.book.author} · 등록됨` : '등록됨';
  }

  if (event.book.totalPages) {
    return `${event.book.currentPage} / ${event.book.totalPages}쪽 · ${event.book.progressPercent}%`;
  }

  return '독서 기록 있음';
}

function getCalendarEventsForDate(books: ReadingLifeBook[], dateKey: string | null) {
  if (!dateKey) return [];

  return books.flatMap((book) => {
    const events: CalendarEvent[] = [];

    if (toDateKey(new Date(book.createdAt)) === dateKey) {
      events.push({ book, type: 'registration' });
    }

    if ((book.progressPercent > 0 || book.currentPage > 0) && toDateKey(new Date(book.updatedAt)) === dateKey) {
      events.push({ book, type: 'reading' });
    }

    return events;
  });
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
    const isCurrentMonth = date.getMonth() === month;

    return {
      hasReading: readingDates.has(key),
      hasRegistration: registrationDates.has(key),
      isCurrentMonth,
      isToday: key === toDateKey(today),
      key,
      label: String(date.getDate()),
    };
  });
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
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
    marginTop: 14,
    paddingBottom: 20,
    paddingTop: 4,
  },
  currentBookHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentBookSectionTitle: {
    color: '#26372B',
    fontSize: 20,
    fontWeight: '800',
  },
  currentBookPercent: {
    color: '#8F6A42',
    fontSize: 13,
    fontWeight: '900',
  },
  currentBookBody: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
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
  currentBookActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  currentBookAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderRadius: 18,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  currentBookActionPrimary: {
    backgroundColor: '#103D2B',
  },
  currentBookEmptyAction: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 19,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  currentBookActionText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  currentBookActionTextPrimary: {
    color: '#F7F1E5',
    fontSize: 12,
    fontWeight: '900',
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
    marginTop: 22,
    paddingBottom: 20,
  },
  calendarTitleBlock: {
    flex: 1,
    paddingRight: 14,
  },
  calendarTitle: {
    color: '#26372B',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
  },
  calendarMonthControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 36,
  },
  calendarMonthButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 61, 43, 0.1)',
    borderColor: 'rgba(16, 61, 43, 0.12)',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  calendarMonthButtonDisabled: {
    backgroundColor: 'rgba(16, 61, 43, 0.04)',
    borderColor: 'rgba(16, 61, 43, 0.06)',
  },
  calendarMonthButtonText: {
    color: '#103D2B',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  calendarMonthButtonTextDisabled: {
    color: 'rgba(16, 61, 43, 0.28)',
  },
  calendarMonthLabelButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    minWidth: 70,
  },
  calendarMonthText: {
    color: '#8F6A42',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
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
    height: 36,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  calendarDayToday: {
    backgroundColor: 'rgba(16,61,43,0.1)',
    borderRadius: 18,
  },
  calendarDaySelected: {
    backgroundColor: '#103D2B',
    borderRadius: 18,
  },
  calendarDayText: {
    color: '#26372B',
    fontSize: 13,
    fontWeight: '800',
  },
  calendarDayTextWithEvents: {
    color: '#0A3627',
    fontSize: 15,
    fontWeight: '900',
  },
  calendarDayTextMuted: {
    color: '#8E998D',
  },
  calendarDayTextToday: {
    color: '#103D2B',
    fontWeight: '900',
  },
  calendarDayTextSelected: {
    color: '#F7F1E5',
  },
  calendarDots: {
    flexDirection: 'row',
    gap: 4,
    height: 9,
    marginTop: 4,
  },
  calendarDot: {
    borderColor: 'rgba(238, 241, 223, 0.85)',
    borderRadius: 4,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  calendarDotRegister: {
    backgroundColor: '#B76E2B',
  },
  calendarDotReading: {
    backgroundColor: '#00805E',
  },
  calendarLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
    marginTop: 7,
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
  calendarDetail: {
    borderTopColor: 'rgba(16,61,43,0.12)',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 14,
  },
  calendarDetailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calendarDetailDate: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  calendarDetailClose: {
    color: '#8F6A42',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
    paddingLeft: 16,
  },
  calendarEventItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  calendarEventMark: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  calendarEventMarkRegister: {
    backgroundColor: '#8F6A42',
  },
  calendarEventMarkReading: {
    backgroundColor: '#116653',
  },
  calendarEventCopy: {
    flex: 1,
  },
  calendarEventType: {
    color: '#8F6A42',
    fontSize: 10,
    fontWeight: '900',
  },
  calendarEventTitle: {
    color: '#26372B',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  calendarEventMeta: {
    color: '#72806E',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  calendarEventArrow: {
    color: '#103D2B',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 26,
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
  shelfTitleGroup: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  shelfAddButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  shelfAddButtonText: {
    color: '#F7F1E5',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 26,
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
    paddingRight: 68,
    paddingTop: 18,
  },
  bookshelfFrame: {
    marginRight: -20,
    position: 'relative',
  },
  shelfEmptyState: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    justifyContent: 'center',
    marginRight: 20,
    minHeight: 212,
    paddingTop: 18,
  },
  shelfEmptyText: {
    color: '#72806E',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyShelf: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    justifyContent: 'center',
    minHeight: 176,
    paddingHorizontal: 22,
  },
  emptyShelfText: {
    color: '#72806E',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  bookshelfMoreFade: {
    alignItems: 'flex-end',
    bottom: 0,
    justifyContent: 'center',
    paddingRight: 14,
    position: 'absolute',
    right: 0,
    top: 18,
    width: 86,
  },
  bookshelfMoreCue: {
    alignItems: 'center',
    backgroundColor: 'rgba(238, 241, 223, 0.9)',
    borderColor: 'rgba(16,61,43,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bookshelfMoreArrow: {
    color: '#103D2B',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
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
  shelfProgressTrack: {
    backgroundColor: 'rgba(16,61,43,0.12)',
    borderRadius: 999,
    height: 4,
    marginTop: 6,
    overflow: 'hidden',
    width: 92,
  },
  shelfProgressFill: {
    backgroundColor: '#103D2B',
    borderRadius: 999,
    height: '100%',
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
});
