import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { lookupBookByIsbn, searchBooksByTitle, type BookSearchItem } from '../../src/services/books';
import { addBookToReadingLife, getReadingLifeBookByIsbn } from '../../src/services/reading-life';
import { booksomeColors as c, booksomeLayout as layout } from '../../src/theme/booksome';

export default function AddBookScreen() {
  const params = useLocalSearchParams<{ query?: string | string[] }>();
  const initialQuery = Array.isArray(params.query) ? params.query[0] : params.query;
  const { session } = useAuth();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [searched, setSearched] = useState('');
  const [books, setBooks] = useState<BookSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const request = useRef(0);
  const savingRef = useRef(false);

  async function search(value = query) {
    const text = value.trim();
    if (text.length < 2) { setError('책 제목이나 저자를 두 글자 이상 입력해주세요.'); return; }
    const id = ++request.current;
    setLoading(true); setError(''); setBooks([]); setSearched(text);
    try {
      const isbn = text.replace(/[-\s]/g, '');
      const result = /^(\d{13}|\d{9}[\dXx])$/.test(isbn)
        ? await lookupBookByIsbn(isbn) : await searchBooksByTitle(text);
      if (id === request.current) setBooks(result.items);
    } catch (cause) {
      if (id === request.current) setError(cause instanceof Error ? cause.message : '책을 찾지 못했습니다. 다시 시도해주세요.');
    } finally { if (id === request.current) setLoading(false); }
  }

  useEffect(() => {
    if (initialQuery?.trim()) { setQuery(initialQuery); void search(initialQuery); }
    return () => { request.current++; };
  }, [initialQuery]);

  async function add(book: BookSearchItem) {
    if (!session) {
      router.push({ pathname: '/auth', params: { next: `/books/add?query=${encodeURIComponent(book.isbn || book.title)}` } });
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(book.isbn); setError('');
    try {
      const existing = await getReadingLifeBookByIsbn(session.user.id, book.isbn);
      const saved = existing ?? await addBookToReadingLife(session.user.id, book);
      router.replace({ pathname: '/reading-life/[id]', params: { id: saved.id, ...(existing ? {} : { welcome: '1' }) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '책을 등록하지 못했습니다. 다시 시도해주세요.');
    } finally { savingRef.current = false; setSaving(null); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="책 찾기" tone="paper" />
        <Text style={styles.intro}>제목으로 찾아 내 서재에 담아보세요.{ '\n' }페이지 수는 나중에 입력해도 괜찮아요.</Text>
        <View style={styles.search}>
          <TextInput accessibilityLabel="책 제목, 저자 또는 ISBN" autoCapitalize="none" placeholder="책 제목, 저자 또는 ISBN" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} returnKeyType="search" style={styles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel="책 검색" disabled={loading} onPress={() => void search()} style={styles.searchButton}>
            {loading ? <ActivityIndicator color={c.white} /> : <Ionicons name="search" color={c.white} size={21} />}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/scan')} style={styles.scan}>
          <Ionicons name="barcode-outline" color={c.forest} size={22} /><Text style={styles.scanText}>종이책이 옆에 있다면 바코드로 찾기</Text>
        </Pressable>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.hint}>책을 찾고 있어요…</Text> : null}
        {!loading && searched && !books.length && !error ? <Text style={styles.hint}>‘{searched}’ 검색 결과가 없어요.{ '\n' }짧은 제목이나 저자 이름으로 다시 찾아보세요.</Text> : null}
        {!searched ? <View style={styles.invitation}>
          <Text style={styles.invitationTitle}>한 권, 한 문장부터.</Text>
          <Text style={styles.intro}>지금 읽는 책을 담고 마음에 남은 문장이나 생각을 적어보세요. 기본은 나만 보는 기록이에요.</Text>
        </View> : null}
        {books.map((book, index) => <View key={`${book.isbn}-${index}`} style={styles.book}>
          {book.imageUrl ? <Image accessibilityLabel={`${book.title} 표지`} source={{ uri: book.imageUrl }} style={styles.cover} /> : <View style={[styles.cover, styles.fallback]}><Ionicons name="book-outline" size={28} color={c.forest} /></View>}
          <View style={styles.copy}>
            <Text style={styles.title}>{book.title}</Text><Text style={styles.meta}>{[book.author, book.publisher].filter(Boolean).join(' · ')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${book.title} 내 서재에 담기`} disabled={saving !== null || !book.isbn} onPress={() => void add(book)} style={[styles.add, (saving !== null || !book.isbn) && styles.disabled]}>
              {saving === book.isbn ? <ActivityIndicator color={c.forest} /> : <Text style={styles.addText}>{book.isbn ? '내 서재에 담기' : 'ISBN 정보가 없는 책'}</Text>}
            </Pressable>
          </View>
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  content: { alignSelf: 'center', width: '100%', maxWidth: 560, padding: layout.pageGutter, paddingBottom: 50, gap: 18 },
  intro: { fontSize: 15, lineHeight: 24, color: c.muted },
  search: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, minWidth: 0, backgroundColor: c.paperStrong, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 15, fontSize: 16, color: c.ink },
  searchButton: { backgroundColor: c.forest, borderRadius: 10, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, minHeight: 44 },
  scanText: { color: c.forest, fontSize: 13, flex: 1, lineHeight: 20 },
  hint: { color: c.muted, fontSize: 15, lineHeight: 25, paddingVertical: 20 },
  error: { color: c.danger, fontSize: 14, lineHeight: 22 },
  invitation: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 34, gap: 14 },
  invitationTitle: { color: c.forest, fontSize: 26, fontWeight: '700' },
  book: { flexDirection: 'row', gap: 18, paddingVertical: 20, borderTopWidth: 1, borderTopColor: c.line },
  cover: { width: 78, height: 116, borderRadius: 3 },
  fallback: { backgroundColor: c.forestSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 9 },
  title: { color: c.ink, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  meta: { color: c.muted, fontSize: 12, lineHeight: 19 },
  add: { alignSelf: 'flex-start', backgroundColor: c.forestSoft, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  addText: { color: c.forest, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
