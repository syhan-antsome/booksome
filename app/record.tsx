import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../src/components/auth-required';
import { TabPage } from '../src/components/tab-page';
import { PaperGrain } from '../src/components/collector-surfaces';
import { BookObject } from '../src/components/book-object';
import { formatReadingPagePosition } from '../src/lib/reading-format';
import { useAuth } from '../src/providers/auth-provider';
import { listReadingLifeBooks, type ReadingLifeBook } from '../src/services/reading-life';
import { booksomeColors, booksomeLayout, booksomeType } from '../src/theme/booksome';

export default function RecordScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const userId = session?.user.id;
      if (!userId) {
        setBooks([]);
        return undefined;
      }
      setIsLoading(true);
      setLoadError('');
      listReadingLifeBooks(userId)
        .then((nextBooks) => {
          if (isMounted) setBooks(nextBooks.filter((book) => book.status === 'reading'));
        })
        .catch((error) => {
          if (isMounted) setLoadError(error instanceof Error ? error.message : '읽는 책을 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
      return () => {
        isMounted = false;
      };
    }, [session?.user.id]),
  );

  return (
    <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><PaperGrain />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>BookSome</Text>
          <Text style={styles.pageTitle}>기록하기</Text>
          <Text style={styles.subtitle}>지금 펼쳐둔 책을 선택하세요.</Text>
        </View>

        {!isAuthLoading && !session ? (
          <AuthRequired title="기록은 로그인 후 남길 수 있습니다." copy="내 문장과 생각을 안전하게 보관해보세요." />
        ) : null}
        {isLoading ? <ActivityIndicator color={booksomeColors.forest} style={styles.loader} /> : null}
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {session ? (
          <>
            <View style={styles.bookList}>
              {books.map((book, index) => (
                <Pressable
                  key={book.id}
                  onPress={() => router.push({ pathname: '/reading-life/[id]', params: { id: book.id, section: 'quote' } })}
                  style={[styles.bookRow, index === 0 ? styles.bookRowFirst : null]}
                >
                  <BookObject width={88} title={book.title} author={book.author} uri={book.externalCoverUrl} tilt={-3} />
                  <View style={styles.bookCopy}>
                    {index === 0 ? <Text style={styles.recommendedLabel}>최근 읽은 책</Text> : null}
                    <Text numberOfLines={2} style={styles.bookTitle}>{book.title}</Text>
                    <Text numberOfLines={1} style={styles.bookAuthor}>{book.author}</Text>
                    <Text style={styles.bookProgress}>{book.progressPercent}% · {formatReadingPagePosition(book)}</Text>
                    <View style={styles.actionsPreview}>
                      <View style={styles.actionPreview}><Ionicons color={booksomeColors.forest} name="reader-outline" size={15} /><Text style={styles.actionPreviewText}>페이지</Text></View>
                      <View style={styles.actionPreview}><Ionicons color={booksomeColors.forest} name="bookmark-outline" size={15} /><Text style={styles.actionPreviewText}>문장</Text></View>
                      <View style={styles.actionPreview}><Ionicons color={booksomeColors.forest} name="camera-outline" size={15} /><Text style={styles.actionPreviewText}>사진</Text></View>
                    </View>
                  </View>
                  <Ionicons color={booksomeColors.muted} name="chevron-forward" size={20} />
                </Pressable>
              ))}
              {!isLoading && books.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons color={booksomeColors.ochre} name="book-outline" size={30} />
                  <Text style={styles.emptyTitle}>읽는 중인 책이 없습니다.</Text>
                  <Text style={styles.emptyBody}>새 책을 등록하면 페이지와 문장 기록을 시작할 수 있습니다.</Text>
                </View>
              ) : null}
            </View>

            <Pressable accessibilityRole="button" onPress={() => router.push('/books/add')} style={styles.addBookButton}>
              <Ionicons color={booksomeColors.forest} name="search-outline" size={22} />
              <View style={styles.addBookCopy}>
                <Text style={styles.addBookTitle}>새 책 등록</Text>
                <Text style={styles.addBookBody}>바코드 또는 검색으로 책을 추가합니다.</Text>
              </View>
              <Ionicons color={booksomeColors.forest} name="chevron-forward" size={19} />
            </Pressable>
          </>
        ) : null}
      </ScrollView>

    </SafeAreaView></TabPage>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: booksomeColors.paper, flex: 1 },
  content: { alignSelf: 'center', maxWidth: booksomeLayout.maxContentWidth, paddingBottom: booksomeLayout.bottomNavSpace + 24, paddingHorizontal: booksomeLayout.pageGutter, paddingTop: 18, width: '100%' },
  header: { marginBottom: 26, backgroundColor: booksomeColors.cloth, marginHorizontal: -20, marginTop: -18, padding: 26, paddingTop: 30, paddingBottom: 32 },
  wordmark: { color: '#CAD6BB', fontFamily: booksomeType.serif, fontSize: 18, marginBottom: 24 },
  pageTitle: { color: booksomeColors.paperStrong, fontFamily: booksomeType.serif, fontSize: 30, letterSpacing: -1 },
  subtitle: { color: '#CCD7C0', fontSize: 14, marginTop: 12 },
  loader: { marginVertical: 48 },
  errorText: { color: booksomeColors.danger, fontSize: 13, marginBottom: 18 },
  bookList: { gap: 0 },
  bookRow: { alignItems: 'center', borderBottomColor: booksomeColors.line, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: booksomeColors.paperStrong, flexDirection: 'row', gap: 20, padding: 18, marginBottom: 16 },
  bookRowFirst: { paddingTop: 18 },
  cover: { backgroundColor: '#D8D0C1', borderRadius: 3, height: 124, width: 82 },
  coverFallback: { alignItems: 'center', backgroundColor: booksomeColors.forest, justifyContent: 'center', padding: 8 },
  coverFallbackText: { color: booksomeColors.white, fontFamily: 'serif', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  bookCopy: { flex: 1, minWidth: 0 },
  recommendedLabel: { color: booksomeColors.ochre, fontSize: 10, fontWeight: '700', marginBottom: 5 },
  bookTitle: { color: booksomeColors.ink, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  bookAuthor: { color: booksomeColors.muted, fontSize: 12, marginTop: 4 },
  bookProgress: { color: booksomeColors.forest, fontSize: 11, fontWeight: '600', marginTop: 8 },
  actionsPreview: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionPreview: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionPreviewText: { color: booksomeColors.muted, fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', borderColor: booksomeColors.line, borderRadius: 10, borderWidth: 1, padding: 30 },
  emptyTitle: { color: booksomeColors.ink, fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyBody: { color: booksomeColors.muted, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 260, textAlign: 'center' },
  addBookButton: { alignItems: 'center', borderColor: booksomeColors.forest, borderRadius: 9, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 24, padding: 16 },
  addBookCopy: { flex: 1 },
  addBookTitle: { color: booksomeColors.forest, fontSize: 14, fontWeight: '700' },
  addBookBody: { color: booksomeColors.muted, fontSize: 11, marginTop: 4 },
});
