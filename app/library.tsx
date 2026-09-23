import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../src/components/auth-required';
import { TabPage } from '../src/components/tab-page';
import { Cloth, PaperGrain } from '../src/components/collector-surfaces';
import { BookObject } from '../src/components/book-object';
import { formatReadingPagePosition } from '../src/lib/reading-format';
import { useAuth } from '../src/providers/auth-provider';
import {
  listReadingLifeBooks,
  listReadingLifeNoteCounts,
  type ReadingLifeBook,
} from '../src/services/reading-life';
import { booksomeColors, booksomeLayout, booksomeType } from '../src/theme/booksome';

type ShelfFilter = 'reading' | 'finished' | 'all';

const filters: Array<{ key: ShelfFilter; label: string }> = [
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '완독' },
  { key: 'all', label: '전체' },
];

export default function LibraryScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<ShelfFilter>('reading');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const userId = session?.user.id;
      if (!userId) {
        setBooks([]);
        setNoteCounts({});
        return undefined;
      }

      setIsLoading(true);
      setLoadError('');
      Promise.all([listReadingLifeBooks(userId), listReadingLifeNoteCounts(userId)])
        .then(([nextBooks, nextNoteCounts]) => {
          if (!isMounted) return;
          setBooks(nextBooks);
          setNoteCounts(nextNoteCounts);
        })
        .catch((error) => {
          if (isMounted) setLoadError(error instanceof Error ? error.message : '내 서재를 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [session?.user.id]),
  );

  const currentBook = books.find((book) => book.status === 'reading') ?? null;
  const filteredBooks = useMemo(
    () => books.filter((book) => filter === 'all' || book.status === filter),
    [books, filter],
  );
  const shelfBooks = filter === 'reading' && currentBook
    ? filteredBooks.filter((book) => book.id !== currentBook.id)
    : filteredBooks;

  return (
    <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><PaperGrain />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>BookSome</Text>
          <Text style={styles.pageTitle}>내 서재</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="책 검색 및 등록" onPress={() => router.push('/books/add')} style={styles.headerButton}>
            <Ionicons color={booksomeColors.ink} name="search-outline" size={25} />
          </Pressable>
        </View>

        <View accessibilityRole="tablist" style={styles.filterRail}>
          {filters.map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filterButton, selected ? styles.filterButtonActive : null]}
              >
                <Text style={[styles.filterLabel, selected ? styles.filterLabelActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!isAuthLoading && !session ? (
          <AuthRequired title="내 서재는 로그인 후 열립니다." copy="읽는 책과 완독 기록을 한곳에 보관해보세요." />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={booksomeColors.forest} />
            <Text style={styles.loadingText}>책장을 정리하는 중입니다</Text>
          </View>
        ) : null}
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {session && currentBook && filter === 'reading' ? (
          <Pressable onPress={() => router.push(`/reading-life/${currentBook.id}`)} style={styles.featuredBook}>
            <BookObject title={currentBook.title} author={currentBook.author} uri={currentBook.externalCoverUrl} width={104} tilt={-4} />
            <View style={styles.featuredCopy}>
              <Text style={styles.featuredLabel}>지금 읽는 책</Text>
              <Text numberOfLines={2} style={styles.featuredTitle}>{currentBook.title}</Text>
              <Text numberOfLines={1} style={styles.featuredAuthor}>{currentBook.author}</Text>
              <View style={styles.featuredProgressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${currentBook.progressPercent}%` }]} />
                </View>
                <Text style={styles.featuredPercent}>{currentBook.progressPercent}%</Text>
              </View>
              <Text style={styles.featuredMeta}>
                {formatReadingPagePosition(currentBook)} · 메모 {noteCounts[currentBook.id] ?? 0}개
              </Text>
            </View>
            <Ionicons color={booksomeColors.muted} name="chevron-forward" size={20} />
          </Pressable>
        ) : null}

        {session ? (
          <Cloth style={styles.shelfSection}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>{filter === 'reading' ? '읽는 중' : filter === 'finished' ? '완독한 책' : '모든 책'}</Text>
              <Text style={styles.bookCount}>{filteredBooks.length}권</Text>
            </View>

            {shelfBooks.length ? (
              <View style={styles.bookGrid}>
                {shelfBooks.map((book) => (
                  <Pressable key={book.id} onPress={() => router.push(`/reading-life/${book.id}`)} style={styles.bookTile}>
                    <BookObject title={book.title} author={book.author} uri={book.externalCoverUrl} width={119} tilt={-2} />
                    <Text numberOfLines={2} style={styles.gridTitle}>{book.title}</Text>
                    <Text numberOfLines={1} style={styles.gridAuthor}>{book.author}</Text>
                    <Text style={[styles.gridState, book.status === 'finished' ? styles.gridStateFinished : null]}>
                      {book.status === 'finished'
                        ? `내가 남긴 기록 ${noteCounts[book.id] ?? 0}개 · 다시 보기`
                        : `${book.progressPercent}% · ${formatReadingPagePosition(book)}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : filter === 'reading' && currentBook ? (
              <Text style={styles.emptyTitle}>지금 읽는 이 한 권부터, 나의 기록을 쌓아보세요.</Text>
            ) : (
              <View style={styles.emptyShelf}>
                <Ionicons color={booksomeColors.ochre} name="library-outline" size={28} />
                <Text style={styles.emptyTitle}>
                  {filter === 'finished' ? '아직 완독한 책이 없습니다.' : books.length ? '다 읽은 책은 완독 탭에 모여 있어요.' : '첫 책을 담으면 나의 서재가 시작됩니다.'}
                </Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/books/add')} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>책 등록하기</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.libraryTools}>
              <Pressable onPress={() => router.push('/reading-life')} style={styles.toolRow}>
                <View style={styles.toolIcon}>
                  <Ionicons color={booksomeColors.forest} name="calendar-clear-outline" size={22} />
                </View>
                <View style={styles.toolCopy}>
                  <Text style={styles.toolTitle}>독서 달력</Text>
                  <Text style={styles.toolBody}>책을 만난 날과 기록한 날을 돌아보세요.</Text>
                </View>
                <Ionicons color={booksomeColors.muted} name="chevron-forward" size={19} />
              </Pressable>
            </View>
          </Cloth>
        ) : null}
      </ScrollView>

    </SafeAreaView></TabPage>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: booksomeColors.paper, flex: 1 },
  content: { alignSelf: 'center', maxWidth: booksomeLayout.maxContentWidth, paddingBottom: booksomeLayout.bottomNavSpace + 24, paddingHorizontal: booksomeLayout.pageGutter, paddingTop: 18, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  wordmark: { color: booksomeColors.forest, flex: 1, fontFamily: 'serif', fontSize: 17, fontWeight: '700' },
  pageTitle: { color: booksomeColors.forest, fontFamily: booksomeType.serif, fontSize: 27, textAlign: 'center' },
  headerButton: { alignItems: 'flex-end', flex: 1, justifyContent: 'center', minHeight: 44 },
  filterRail: { borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginBottom: 22 },
  filterButton: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 45 },
  filterButtonActive: { borderBottomColor: booksomeColors.forest, borderBottomWidth: 3 },
  filterLabel: { color: booksomeColors.muted, fontSize: 14, fontWeight: '700' },
  filterLabelActive: { color: booksomeColors.forest, fontWeight: '700' },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 52 },
  loadingText: { color: booksomeColors.muted, fontSize: 13, fontWeight: '700' },
  errorText: { color: booksomeColors.danger, fontSize: 13, marginBottom: 16 },
  featuredBook: { alignItems: 'center', borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 15, paddingBottom: 22 },
  featuredCover: { backgroundColor: '#D8D0C1', borderRadius: 3, height: 142, width: 94 },
  featuredCopy: { flex: 1, minWidth: 0 },
  featuredLabel: { color: booksomeColors.ochre, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  featuredTitle: { color: booksomeColors.ink, fontSize: 20, fontWeight: '700', lineHeight: 25 },
  featuredAuthor: { color: booksomeColors.muted, fontSize: 13, marginTop: 5 },
  featuredProgressRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 16 },
  progressTrack: { backgroundColor: '#E3DDD2', borderRadius: 4, flex: 1, height: 5, overflow: 'hidden' },
  progressFill: { backgroundColor: booksomeColors.forest, height: '100%' },
  featuredPercent: { color: booksomeColors.forest, fontFamily: 'serif', fontSize: 19, fontWeight: '700' },
  featuredMeta: { color: booksomeColors.muted, fontSize: 10.5, marginTop: 10 },
  shelfSection: { paddingTop: 28, paddingHorizontal: 20, paddingBottom: 26, marginTop: 22, marginHorizontal: -20, backgroundColor: booksomeColors.cloth },
  sectionHeading: { alignItems: 'baseline', flexDirection: 'row', gap: 6, marginBottom: 18 },
  sectionTitle: { color: booksomeColors.paperStrong, fontFamily: booksomeType.serif, fontSize: 19 },
  bookCount: { color: '#CDD6BC', fontSize: 12 },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 26 },
  bookTile: { width: '46%', alignItems: 'center', paddingTop: 12 },
  gridCover: { alignSelf: 'center', backgroundColor: '#D8D0C1', borderRadius: 3, height: 190, width: 126 },
  gridTitle: { color: booksomeColors.paperStrong, fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 15, textAlign: 'center' },
  gridAuthor: { color: '#CBD7C0', fontSize: 12, marginTop: 5, textAlign: 'center' },
  gridState: { color: '#DDD5A8', fontSize: 11, marginTop: 8, textAlign: 'center' },
  gridStateFinished: { color: '#E5D59B' },
  coverFallback: { alignItems: 'center', backgroundColor: booksomeColors.forest, justifyContent: 'center', padding: 12 },
  coverFallbackText: { color: booksomeColors.white, fontFamily: 'serif', fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  emptyShelf: { alignItems: 'center', borderColor: booksomeColors.line, borderRadius: 10, borderWidth: 1, gap: 10, padding: 28 },
  emptyTitle: { color: '#DBE2CE', fontSize: 13, lineHeight: 22 },
  emptyButton: { backgroundColor: booksomeColors.forest, borderRadius: 7, marginTop: 4, paddingHorizontal: 18, paddingVertical: 10 },
  emptyButtonText: { color: booksomeColors.white, fontSize: 12, fontWeight: '700' },
  libraryTools: { borderTopColor: booksomeColors.line, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 30, paddingTop: 18 },
  toolRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 },
  toolIcon: { alignItems: 'center', backgroundColor: booksomeColors.forestSoft, borderRadius: 8, height: 43, justifyContent: 'center', width: 43 },
  toolCopy: { flex: 1 },
  toolTitle: { color: booksomeColors.paperStrong, fontSize: 14, fontWeight: '600' },
  toolBody: { color: '#CBD7C0', fontSize: 12, marginTop: 4 },
});
