import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ReadingLifeBook, UpdateReadingLifeBookInput } from '../services/reading-life';
import { booksomeColors as c } from '../theme/booksome';
import { BookObject } from './book-object';

export function ReadingProgress({ book, onSave }: {
  book: ReadingLifeBook;
  onSave: (input: UpdateReadingLifeBookInput) => Promise<boolean>;
}) {
  const [page, setPage] = useState(String(book.currentPage));
  const [total, setTotal] = useState(book.totalPages ? String(book.totalPages) : '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    setPage(String(book.currentPage)); setTotal(book.totalPages ? String(book.totalPages) : '');
  }, [book.id, book.currentPage, book.totalPages]);

  async function save(finish = false) {
    if (pending.current) return;
    setError(''); setMessage('');
    const currentPage = page.trim() === '' ? 0 : Number(page);
    const totalPages = total.trim() === '' ? null : Number(total);
    if (!Number.isInteger(currentPage) || currentPage < 0 || (totalPages !== null && (!Number.isInteger(totalPages) || totalPages <= 0))) {
      setError('읽은 쪽은 0 이상, 전체 쪽은 1 이상의 숫자로 입력해주세요.'); return;
    }
    if (totalPages !== null && currentPage > totalPages) { setError('읽은 쪽이 전체 쪽보다 많아요. 다시 확인해주세요.'); return; }
    const finished = finish || (totalPages !== null && currentPage === totalPages);
    pending.current = true; setBusy(true);
    try {
      const success = await onSave({
        currentPage: finish && totalPages ? totalPages : currentPage,
        totalPages,
        progressPercent: finished ? 100 : totalPages ? Math.round(currentPage / totalPages * 100) : 0,
        status: finished ? 'finished' : 'reading',
      });
      if (success) setMessage(finished ? '한 권을 다 읽었어요. 아래에서 내가 남긴 것을 만나보세요.' : `${currentPage}쪽까지 저장했어요. 다음에도 여기서 이어가요.`);
      else setError('저장하지 못했어요. 입력한 내용은 그대로 있으니 다시 시도해주세요.');
    } finally { pending.current = false; setBusy(false); }
  }

  return <View style={styles.section}>
    <View style={styles.book}>
      <BookObject width={104} title={book.title} author={book.author} uri={book.externalCoverUrl} tilt={-3} />
      <View style={styles.copy}><Text style={styles.status}>{book.status === 'finished' ? '다 읽은 책' : '함께 읽는 중'}</Text><Text style={styles.title}>{book.title}</Text><Text style={styles.author}>{book.author}</Text></View>
    </View>
    <Text style={styles.label}>어디까지 읽었나요?</Text>
    <View style={styles.fields}>
      <View style={styles.field}><Text style={styles.fieldLabel}>읽은 쪽</Text><TextInput accessibilityLabel="읽은 쪽" keyboardType="number-pad" maxLength={6} value={page} onChangeText={setPage} style={styles.input} /></View>
      <Text style={styles.divider}>/</Text>
      <View style={styles.field}><Text style={styles.fieldLabel}>전체 쪽 · 선택</Text><TextInput accessibilityLabel="전체 쪽 (선택)" keyboardType="number-pad" maxLength={6} placeholder="나중에" placeholderTextColor={c.muted} value={total} onChangeText={setTotal} style={styles.input} /></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.save, busy && styles.disabled]}>{busy ? <ActivityIndicator color={c.white} /> : <Text style={styles.saveText}>저장</Text>}</Pressable>
    </View>
    {book.status === 'reading' ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void save(true)} style={styles.finish}><Text style={styles.finishText}>다 읽었어요 ✓</Text></Pressable> : <Text style={styles.hint}>다시 읽고 있다면 읽은 쪽을 수정하고 저장해주세요.</Text>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 24 },
  book: { flexDirection: 'row', gap: 22, alignItems: 'center', marginBottom: 10 },
  cover: { width: 98, height: 146, borderRadius: 4 },
  coverFallback: { backgroundColor: c.forest, justifyContent: 'center', alignItems: 'center' },
  fallbackText: { color: c.white, fontSize: 13 },
  copy: { flex: 1, gap: 10 },
  status: { color: c.forest, fontSize: 12, fontWeight: '700' },
  title: { color: c.ink, fontSize: 24, lineHeight: 33, fontWeight: '700' },
  author: { color: c.muted, fontSize: 14, lineHeight: 22 },
  label: { color: c.ink, fontSize: 16, fontWeight: '600' },
  fields: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  field: { flex: 1, gap: 8 },
  fieldLabel: { color: c.muted, fontSize: 12 },
  input: { backgroundColor: c.paperStrong, color: c.ink, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 8, fontSize: 18, height: 50 },
  divider: { color: c.muted, paddingBottom: 14 },
  save: { backgroundColor: c.forest, height: 50, minWidth: 62, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  saveText: { color: c.white, fontSize: 14, fontWeight: '700' },
  finish: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  finishText: { color: c.forest, fontSize: 14, fontWeight: '600' },
  hint: { color: c.muted, fontSize: 12, lineHeight: 20 },
  message: { color: c.forest, fontSize: 14, lineHeight: 23 },
  error: { color: c.danger, fontSize: 14, lineHeight: 23 },
  disabled: { opacity: 0.6 },
});
