import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../src/components/auth-required';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { formatReadingPagePosition } from '../src/lib/reading-format';
import { useAuth } from '../src/providers/auth-provider';
import {
  listReadingLifeBooks,
  listReadingLifeNotes,
  type ReadingLifeBook,
  type ReadingLifeNote,
} from '../src/services/reading-life';
import { booksomeColors, booksomeLayout } from '../src/theme/booksome';

export default function TodayScreen() {
  const { isLoading: isAuthLoading, profile, session } = useAuth();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [notes, setNotes] = useState<ReadingLifeNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const userId = session?.user.id;

      if (!userId) {
        setBooks([]);
        setNotes([]);
        setIsLoading(false);
        return undefined;
      }

      setIsLoading(true);
      setLoadError('');
      listReadingLifeBooks(userId)
        .then(async (nextBooks) => {
          const current = nextBooks.find((book) => book.status === 'reading') ?? nextBooks[0] ?? null;
          const nextNotes = current ? await listReadingLifeNotes(userId, current.id) : [];
          if (!isMounted) return;
          setBooks(nextBooks);
          setNotes(nextNotes.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
        })
        .catch((error) => {
          if (isMounted) setLoadError(error instanceof Error ? error.message : '오늘의 독서를 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [session?.user.id]),
  );

  const currentBook = books.find((book) => book.status === 'reading') ?? books[0] ?? null;
  const weeklyActivity = useMemo(() => buildWeeklyActivity(notes, currentBook), [currentBook, notes]);
  const recentNotes = notes.slice(0, 2);
  const readingBookCount = books.filter((book) => book.status === 'reading').length;
  const displayName = profile?.display_name ?? '북썸 독자';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{getGreeting()}, {displayName}님</Text>
            <Text style={styles.pageTitle}>오늘</Text>
          </View>
          <Text style={styles.wordmark}>BookSome</Text>
        </View>

        {!isAuthLoading && !session ? (
          <AuthRequired
            title="나만의 독서 기록을 시작해보세요."
            copy="책과 문장, 읽은 페이지를 안전하게 보관하려면 로그인이 필요합니다."
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={booksomeColors.forest} />
            <Text style={styles.loadingText}>오늘의 책을 펼치는 중입니다</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {session ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>오늘의 독서</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/scan')} style={styles.textAction}>
                <Text style={styles.textActionLabel}>새 책 등록</Text>
                <Ionicons color={booksomeColors.forest} name="chevron-forward" size={15} />
              </Pressable>
            </View>

            {currentBook ? (
              <View style={styles.currentBookSection}>
                <Pressable
                  accessibilityLabel={`${currentBook.title} 독서 기록 열기`}
                  onPress={() => router.push(`/reading-life/${currentBook.id}`)}
                  style={styles.currentBookRow}
                >
                  <BookCover book={currentBook} style={styles.currentCover} />
                  <View style={styles.currentBookCopy}>
                    <Text numberOfLines={2} style={styles.currentBookTitle}>{currentBook.title}</Text>
                    <Text numberOfLines={1} style={styles.currentBookAuthor}>{currentBook.author}</Text>
                    <View style={styles.progressHeading}>
                      <Text style={styles.progressPercent}>{currentBook.progressPercent}%</Text>
                      <Text style={styles.pageProgress}>{formatReadingPagePosition(currentBook)}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${currentBook.progressPercent}%` }]} />
                    </View>
                    <View style={styles.continueButton}>
                      <Ionicons color={booksomeColors.white} name="create-outline" size={17} />
                      <Text style={styles.continueButtonText}>이어 기록하기</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => router.push('/scan')} style={styles.emptyBook}>
                <View style={styles.emptyIcon}>
                  <Ionicons color={booksomeColors.forest} name="barcode-outline" size={27} />
                </View>
                <View style={styles.emptyCopy}>
                  <Text style={styles.emptyTitle}>오늘 읽을 책을 등록해보세요</Text>
                  <Text style={styles.emptyBody}>바코드를 비추면 내 서재와 첫 기록이 바로 열립니다.</Text>
                </View>
                <Ionicons color={booksomeColors.forest} name="chevron-forward" size={19} />
              </Pressable>
            )}

            <View style={styles.weekSection}>
              <View style={styles.weekHeading}>
                <Text style={styles.sectionTitle}>이번 주</Text>
                <Text style={styles.weekSummary}>기록 {weeklyActivity.noteCount}개 · 읽는 책 {readingBookCount}권</Text>
              </View>
              <View style={styles.weekDays}>
                {weeklyActivity.days.map((day) => (
                  <View key={day.key} style={styles.weekDay}>
                    <Text style={[styles.weekdayLabel, day.isToday ? styles.weekdayLabelToday : null]}>{day.label}</Text>
                    <View style={[styles.dayMark, day.isActive ? styles.dayMarkActive : null, day.isToday ? styles.dayMarkToday : null]}>
                      {day.isActive ? <Ionicons color={booksomeColors.white} name="checkmark" size={15} /> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 기록</Text>
                {currentBook ? (
                  <Pressable onPress={() => router.push(`/reading-life/${currentBook.id}`)} style={styles.textAction}>
                    <Text style={styles.textActionLabel}>전체 보기</Text>
                    <Ionicons color={booksomeColors.forest} name="chevron-forward" size={15} />
                  </Pressable>
                ) : null}
              </View>
              {recentNotes.length ? (
                <View style={styles.noteList}>
                  {recentNotes.map((note) => <RecentNote key={note.id} note={note} />)}
                </View>
              ) : (
                <Pressable
                  disabled={!currentBook}
                  onPress={() => currentBook && router.push(`/reading-life/${currentBook.id}`)}
                  style={styles.emptyNotes}
                >
                  <Ionicons color={booksomeColors.ochre} name="bookmark-outline" size={22} />
                  <Text style={styles.emptyNotesText}>
                    {currentBook ? '첫 문장이나 생각을 남겨보세요.' : '책을 등록하면 기록이 여기에 모입니다.'}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <BottomNavigation active="today" />
    </SafeAreaView>
  );
}

function BookCover({ book, style }: { book: ReadingLifeBook; style: object }) {
  if (book.externalCoverUrl) {
    return <Image resizeMode="cover" source={{ uri: book.externalCoverUrl }} style={style} />;
  }
  return (
    <View style={[style, styles.coverFallback]}>
      <Text numberOfLines={3} style={styles.coverFallbackTitle}>{book.title}</Text>
    </View>
  );
}

function RecentNote({ note }: { note: ReadingLifeNote }) {
  const isQuote = Boolean(note.quoteText);
  const text = note.quoteText || note.body || '사진으로 남긴 독서 기록';
  return (
    <View style={styles.noteRow}>
      <View style={[styles.noteIcon, isQuote ? styles.noteIconQuote : styles.noteIconThought]}>
        <Ionicons
          color={isQuote ? booksomeColors.forest : booksomeColors.ochre}
          name={isQuote ? 'chatbox-ellipses-outline' : 'create-outline'}
          size={19}
        />
      </View>
      <View style={styles.noteCopy}>
        <View style={styles.noteMetaRow}>
          <Text style={[styles.noteKind, isQuote ? null : styles.noteKindThought]}>{isQuote ? '문장' : '생각'}</Text>
          <Text style={styles.noteDate}>{formatNoteDate(note.createdAt)}</Text>
        </View>
        <Text numberOfLines={3} style={styles.noteText}>{isQuote ? `“${text}”` : text}</Text>
        {note.pageLabel ? <Text style={styles.notePage}>p. {note.pageLabel.replace(/^p\.\s*/i, '')}</Text> : null}
      </View>
    </View>
  );
}

function buildWeeklyActivity(notes: ReadingLifeNote[], currentBook: ReadingLifeBook | null) {
  const today = new Date();
  const monday = new Date(today);
  const day = today.getDay();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const activeKeys = new Set(
    notes
      .map((note) => new Date(note.createdAt))
      .filter((date) => date >= monday)
      .map(toDateKey),
  );
  if (currentBook && new Date(currentBook.updatedAt) >= monday) activeKeys.add(toDateKey(new Date(currentBook.updatedAt)));
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const todayKey = toDateKey(today);
  return {
    noteCount: notes.filter((note) => new Date(note.createdAt) >= monday).length,
    days: labels.map((label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const key = toDateKey(date);
      return { key, label, isActive: activeKeys.has(key), isToday: key === todayKey };
    }),
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return '좋은 아침이에요';
  if (hour < 18) return '오늘도 반가워요';
  return '편안한 저녁이에요';
}

function formatNoteDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const prefix = toDateKey(date) === toDateKey(now) ? '오늘' : `${date.getMonth() + 1}.${date.getDate()}`;
  return `${prefix} · ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: booksomeColors.paper, flex: 1 },
  content: {
    alignSelf: 'center',
    maxWidth: booksomeLayout.maxContentWidth,
    paddingBottom: booksomeLayout.bottomNavSpace + 24,
    paddingHorizontal: booksomeLayout.pageGutter,
    paddingTop: 18,
    width: '100%',
  },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  headerCopy: { flex: 1, minWidth: 0 },
  greeting: { color: booksomeColors.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  pageTitle: { color: booksomeColors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  wordmark: { color: booksomeColors.forest, fontFamily: 'serif', fontSize: 21, fontWeight: '700', marginTop: 12 },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 48 },
  loadingText: { color: booksomeColors.muted, fontSize: 13, fontWeight: '700' },
  errorText: { color: booksomeColors.danger, fontSize: 13, lineHeight: 19, marginBottom: 18 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: booksomeColors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4 },
  textAction: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 34, paddingLeft: 10 },
  textActionLabel: { color: booksomeColors.forest, fontSize: 12, fontWeight: '800' },
  currentBookSection: { borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 24 },
  currentBookRow: { flexDirection: 'row', gap: 18 },
  currentCover: { backgroundColor: '#D8D0C1', borderRadius: 4, height: 164, width: 108 },
  coverFallback: { alignItems: 'center', backgroundColor: booksomeColors.forest, justifyContent: 'center', padding: 10 },
  coverFallbackTitle: { color: booksomeColors.white, fontFamily: 'serif', fontSize: 14, fontWeight: '700', lineHeight: 19, textAlign: 'center' },
  currentBookCopy: { flex: 1, minWidth: 0, paddingTop: 5 },
  currentBookTitle: { color: booksomeColors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  currentBookAuthor: { color: booksomeColors.muted, fontSize: 14, marginTop: 6 },
  progressHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  progressPercent: { color: booksomeColors.forest, fontFamily: 'serif', fontSize: 28, fontWeight: '700' },
  pageProgress: { color: booksomeColors.muted, fontSize: 11, fontWeight: '700', paddingBottom: 4 },
  progressTrack: { backgroundColor: '#E4DED3', borderRadius: 3, height: 5, marginTop: 5, overflow: 'hidden' },
  progressFill: { backgroundColor: booksomeColors.forest, borderRadius: 3, height: '100%' },
  continueButton: { alignItems: 'center', backgroundColor: booksomeColors.forest, borderRadius: 8, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 17, minHeight: 42 },
  continueButtonText: { color: booksomeColors.white, fontSize: 13, fontWeight: '900' },
  emptyBook: { alignItems: 'center', borderColor: booksomeColors.line, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 17 },
  emptyIcon: { alignItems: 'center', backgroundColor: booksomeColors.forestSoft, borderRadius: 8, height: 48, justifyContent: 'center', width: 48 },
  emptyCopy: { flex: 1, minWidth: 0 },
  emptyTitle: { color: booksomeColors.ink, fontSize: 15, fontWeight: '900' },
  emptyBody: { color: booksomeColors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  weekSection: { borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 23, paddingTop: 23 },
  weekHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  weekSummary: { color: booksomeColors.forest, fontSize: 12, fontWeight: '800' },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', flex: 1, gap: 8 },
  weekdayLabel: { color: booksomeColors.muted, fontSize: 11, fontWeight: '700' },
  weekdayLabelToday: { color: booksomeColors.forest, fontWeight: '900' },
  dayMark: { alignItems: 'center', backgroundColor: '#E9E3D8', borderRadius: 16, height: 29, justifyContent: 'center', width: 29 },
  dayMarkActive: { backgroundColor: booksomeColors.forest },
  dayMarkToday: { borderColor: booksomeColors.ochre, borderWidth: 2 },
  recentSection: { paddingTop: 23 },
  noteList: { gap: 0 },
  noteRow: { alignItems: 'flex-start', borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 13, paddingVertical: 15 },
  noteIcon: { alignItems: 'center', borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  noteIconQuote: { backgroundColor: booksomeColors.forestSoft },
  noteIconThought: { backgroundColor: booksomeColors.ochreSoft },
  noteCopy: { flex: 1, minWidth: 0 },
  noteMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 7 },
  noteKind: { color: booksomeColors.forest, fontSize: 12, fontWeight: '900' },
  noteKindThought: { color: booksomeColors.ochre },
  noteDate: { color: booksomeColors.muted, fontSize: 11 },
  noteText: { color: booksomeColors.ink, fontFamily: 'serif', fontSize: 15, lineHeight: 23 },
  notePage: { color: booksomeColors.muted, fontSize: 11, marginTop: 7 },
  emptyNotes: { alignItems: 'center', borderColor: booksomeColors.line, borderRadius: 9, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', padding: 22 },
  emptyNotesText: { color: booksomeColors.muted, fontSize: 13, fontWeight: '700' },
});
