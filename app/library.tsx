import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, Feedback } from '../src/components/app-ui';
import { BookObject } from '../src/components/book-object';
import { BrandLogo } from '../src/components/brand-logo';
import { TabPage } from '../src/components/tab-page';
import { useAuth } from '../src/providers/auth-provider';
import { listReadingLifeBooks, listReadingLifeNoteCounts, type ReadingLifeBook } from '../src/services/reading-life';
import { booksomeColors as c, booksomeLayout as layout } from '../src/theme/booksome';

type Filter = 'reading' | 'finished' | 'all';
const filters: { key: Filter; label: string }[] = [{ key: 'reading', label: '읽는 중' }, { key: 'finished', label: '완독' }, { key: 'all', label: '전체' }];

export default function LibraryScreen() {
  const { session, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('reading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session) { setBooks([]); setCounts({}); return; }
    setLoading(true); setError('');
    Promise.all([listReadingLifeBooks(session.user.id), listReadingLifeNoteCounts(session.user.id)])
      .then(([items, noteCounts]) => { if (active) { setBooks(items); setCounts(noteCounts); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '서재를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user.id, refresh]));
  const current = books.find(book => book.status === 'reading');
  const shelf = books.filter(book => (filter === 'all' || book.status === filter) && !(filter === 'reading' && current?.id === book.id));
  const bookWidth = Math.min(132, (Math.min(width, layout.maxContentWidth) - 112) / 2);
  const shelfWidth = Math.min(104, bookWidth);
  const open = (book: ReadingLifeBook, record = false) => router.push({ pathname: '/reading-life/[id]', params: { id: book.id, ...(record ? { section: 'progress' } : {}) } });
  return <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading && books.length > 0} onRefresh={() => setRefresh(value => value + 1)} tintColor={c.accent} />}>
      <View style={styles.header}><BrandLogo /><Pressable accessibilityRole="button" accessibilityLabel="책 추가" onPress={() => router.push('/books/add')} style={styles.add}><Ionicons name="add" size={28} color={c.white} /></Pressable></View>
      <Text accessibilityRole="header" style={styles.heading}>내 서재</Text><Text style={styles.subtitle}>지금 읽는 이야기를 이어가요</Text>
      {authLoading || (loading && !books.length) ? <ActivityIndicator style={styles.loader} color={c.accent} /> : null}
      {error ? <View style={styles.error}><Feedback error>{error}</Feedback><Button title="다시 불러오기" variant="ghost" onPress={() => setRefresh(value => value + 1)} /></View> : null}
      {current ? <View style={styles.stage}>
        <Pressable accessibilityRole="button" accessibilityLabel={current.title + ' 나의 책 열기'} onPress={() => open(current)} style={styles.current}>
          <BookObject width={bookWidth} title={current.title} author={current.author} uri={current.externalCoverUrl} />
          <View style={styles.currentCopy}><Text numberOfLines={3} style={styles.currentTitle}>{current.title}</Text><Text numberOfLines={2} style={styles.author}>{current.author}</Text>
            <Text style={styles.page}><Text style={styles.pageNumber}>{current.currentPage}</Text>{current.totalPages ? ' / ' + current.totalPages + '쪽' : '쪽까지 읽었어요'}</Text>
            {current.totalPages ? <View style={styles.track}><View style={[styles.fill, { width: (Math.min(100, Math.max(0, current.progressPercent)) + '%') as DimensionValue }]} /></View> : null}
          </View>
        </Pressable>
        <Button title="오늘 읽었어요" onPress={() => open(current, true)} />
      </View> : !authLoading && !loading && !error ? <EmptyState mascot title={session ? '다음 이야기를 만나볼까요?' : '내 책이 쌓이는 즐거움'} copy={session ? '지금 읽는 책을 담고, 오늘의 페이지를 남겨보세요.' : '읽는 책과 마음에 남은 문장을 한곳에 모아보세요.'} action="첫 책 찾아보기" onAction={() => router.push('/books/add')} /> : null}
      {session ? <>
        <View accessibilityRole="tablist" style={styles.filters}>{filters.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterSelected]}><Text style={[styles.filterText, filter === item.key && styles.filterTextSelected]}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.grid}>{shelf.map(book => <Pressable key={book.id} accessibilityRole="button" accessibilityLabel={book.title + ' 나의 책 열기'} onPress={() => open(book)} style={styles.tile}>
          <BookObject width={shelfWidth} title={book.title} author={book.author} uri={book.externalCoverUrl} />
          <Text numberOfLines={2} style={styles.bookTitle}>{book.title}</Text><Text numberOfLines={1} style={styles.bookAuthor}>{book.author}</Text>
          <Text style={styles.bookMeta}>{book.status === 'finished' ? '완독 · 기록 ' + (counts[book.id] ?? 0) + '개' : book.currentPage + '쪽까지'}</Text>
        </Pressable>)}</View>
        {!loading && !error && !shelf.length ? <Text style={styles.emptyShelf}>{current && filter === 'reading' ? '지금 읽는 한 권부터 차곡차곡.' : filter === 'finished' ? '다 읽은 책은 이곳에 모여요.' : '책을 담으면 나만의 서재가 시작돼요.'}</Text> : null}
      </> : !authLoading ? <Button title="이미 기록 중이라면 로그인" variant="ghost" onPress={() => router.push('/auth')} /> : null}
    </ScrollView>
  </SafeAreaView></TabPage>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: layout.bottomNavSpace + 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, add: { width: 44, height: 44, backgroundColor: c.accent, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heading: { color: c.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.2, lineHeight: 43 }, subtitle: { color: c.muted, fontSize: 15, lineHeight: 23, marginTop: 5, marginBottom: 18 },
  stage: { backgroundColor: c.accentSoft, borderRadius: 24, padding: 16, gap: 14 }, current: { flexDirection: 'row', gap: 20, alignItems: 'center' }, currentCopy: { flex: 1, minWidth: 0 },
  currentTitle: { color: c.ink, fontSize: 21, lineHeight: 29, fontWeight: '800', letterSpacing: -0.6 }, author: { color: c.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  page: { color: c.muted, fontSize: 12, lineHeight: 25, marginTop: 23 }, pageNumber: { color: c.ink, fontSize: 19, fontWeight: '700' },
  track: { height: 5, backgroundColor: '#F0D4C9', borderRadius: 3, marginTop: 8, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: c.accent, borderRadius: 3 },
  filters: { flexDirection: 'row', marginTop: 6, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: c.line },
  filter: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, filterSelected: { borderBottomColor: c.accent },
  filterText: { color: c.muted, fontSize: 14, fontWeight: '600' }, filterTextSelected: { color: c.action, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 28 }, tile: { width: '46%', alignItems: 'center' },
  bookTitle: { color: c.ink, fontSize: 15, lineHeight: 22, fontWeight: '700', alignSelf: 'stretch', marginTop: 16 }, bookAuthor: { color: c.muted, fontSize: 12, marginTop: 5, alignSelf: 'stretch' }, bookMeta: { color: c.action, fontSize: 11, marginTop: 7, alignSelf: 'stretch' },
  emptyShelf: { color: c.muted, fontSize: 14, lineHeight: 24, paddingVertical: 28, textAlign: 'center' }, loader: { marginVertical: 45 }, error: { gap: 8, marginBottom: 20 },
});
