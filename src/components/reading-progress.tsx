import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { clampReadingPage, pageFromDrag, parseReadingPosition } from '../lib/reading-shuttle';
import type { ReadingLifeBook, UpdateReadingLifeBookInput } from '../services/reading-life';
import { booksomeColors as c } from '../theme/booksome';
import { Button, Feedback, Field, Input, Sheet } from './app-ui';
import { BookObject } from './book-object';

export function ReadingProgress({ book, onSave, onGestureChange }: {
  book: ReadingLifeBook; onSave: (input: UpdateReadingLifeBookInput) => Promise<boolean>; onGestureChange?: (dragging: boolean) => void;
}) {
  const [page, setPage] = useState(book.currentPage);
  const [total, setTotal] = useState(book.totalPages);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [direct, setDirect] = useState(false);
  const [directPage, setDirectPage] = useState('');
  const [directTotal, setDirectTotal] = useState('');
  const [directError, setDirectError] = useState('');
  const current = useRef({ page, total, busy });
  current.current = { page, total, busy };
  const dragStart = useRef(page);
  const pending = useRef(false);
  useEffect(() => { setPage(book.currentPage); setTotal(book.totalPages); }, [book.id, book.currentPage, book.totalPages]);
  useEffect(() => () => onGestureChange?.(false), [onGestureChange]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !current.current.busy,
    onMoveShouldSetPanResponder: () => !current.current.busy,
    onPanResponderGrant: () => { dragStart.current = current.current.page; setMessage(''); onGestureChange?.(true); },
    onPanResponderMove: (_, gesture) => setPage(pageFromDrag(dragStart.current, gesture.dx, current.current.total)),
    onPanResponderRelease: () => onGestureChange?.(false),
    onPanResponderTerminate: () => onGestureChange?.(false),
    onPanResponderTerminationRequest: () => false,
  }), [onGestureChange]);
  const delta = page - book.currentPage;
  const adjust = (amount: number) => { if (busy) return; setMessage(''); setPage(value => clampReadingPage(value + amount, total)); };
  const openDirect = () => { setDirectPage(String(page)); setDirectTotal(total ? String(total) : ''); setDirectError(''); setDirect(true); };
  const applyDirect = () => {
    const result = parseReadingPosition(directPage, directTotal);
    if ('error' in result) { setDirectError(result.error); return; }
    setPage(result.currentPage); setTotal(result.totalPages); setMessage(''); setDirect(false);
  };
  async function save(finish = false) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    const finished = finish || (total !== null && page === total);
    const savedPage = finish && total ? total : page;
    try {
      const success = await onSave({ currentPage: savedPage, totalPages: total, status: finished ? 'finished' : 'reading', progressPercent: finished ? 100 : total ? Math.round(savedPage / total * 100) : 0 });
      if (success) setMessage(finished ? '한 권 완독! 이 책과 보낸 시간이 서재에 남았어요.' : delta > 0 ? '오늘 ' + delta + '쪽 읽었어요. ' + savedPage + '쪽까지 저장했어요.' : savedPage + '쪽까지 저장했어요.');
      else setError('저장하지 못했어요. 페이지는 그대로 있으니 다시 시도해주세요.');
    } catch { setError('저장하지 못했어요. 다시 시도해주세요.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <View style={styles.section}>
    <View style={styles.book}><BookObject width={118} title={book.title} author={book.author} uri={book.externalCoverUrl} /><Text style={styles.title}>{book.title}</Text><Text style={styles.author}>{book.author}</Text></View>
    <View style={styles.heading}><Text style={styles.label}>어디까지 읽었나요?</Text>{book.status === 'finished' ? <Text style={styles.finished}>완독한 책</Text> : null}</View>
    <View style={styles.position}><Text testID="reading-page-value" style={styles.page}>{page}<Text style={styles.unit}> 쪽</Text></Text>
      <Text style={styles.delta}>{delta > 0 ? '이전보다 ' + delta + '쪽 더 읽었어요' : delta < 0 ? '읽은 위치를 수정하고 있어요' : total ? '전체 ' + total + '쪽 중, 나의 책갈피' : '전체 쪽수를 몰라도 기록할 수 있어요'}</Text>
    </View>
    <View testID="reading-shuttle" accessibilityRole="adjustable" accessibilityLabel="읽은 페이지 조그셔틀" accessibilityHint="왼쪽으로 밀면 다음 페이지, 오른쪽으로 밀면 이전 페이지"
      accessibilityValue={{ min: 0, ...(total ? { max: total } : {}), now: page, text: page + '쪽' }}
      accessibilityActions={[{ name: 'increment', label: '1쪽 늘리기' }, { name: 'decrement', label: '1쪽 줄이기' }]}
      onAccessibilityAction={event => adjust(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      {...responder.panHandlers} style={styles.shuttle}>
      <View pointerEvents="none" style={[styles.grooves, { transform: [{ translateX: -(page % 5) * 10.2 }] }]}>{Array.from({ length: 51 }, (_, i) => <View key={i} style={[styles.groove, i % 5 === 0 && styles.majorGroove]} />)}</View>
      <View pointerEvents="none" style={styles.indicator}><View style={styles.indicatorLine} /></View>
    </View>
    <Text style={styles.hint}>← 다음 페이지 · 이전 페이지 →</Text>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="1쪽 줄이기" disabled={busy || page === 0} onPress={() => adjust(-1)} style={styles.step}><Ionicons name="remove" size={22} color={c.ink} /><Text style={styles.stepText}>1</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={openDirect} disabled={busy} style={styles.direct}><Text style={styles.directText}>직접 입력</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="1쪽 늘리기" disabled={busy || page === total} onPress={() => adjust(1)} style={styles.step}><Ionicons name="add" size={22} color={c.ink} /><Text style={styles.stepText}>1</Text></Pressable>
    </View>
    <Button title="여기까지 읽었어요" loading={busy} onPress={() => void save()} />
    {message ? <Feedback>{message}</Feedback> : null}{error ? <Feedback error>{error}</Feedback> : null}
    {book.status !== 'finished' ? <Button title="이 책, 다 읽었어요" variant="ghost" disabled={busy} onPress={() => void save(true)} /> : null}
    <Sheet visible={direct} title="책갈피 위치" onClose={() => setDirect(false)}>
      <Field label="읽은 페이지"><Input accessibilityLabel="읽은 페이지" keyboardType="number-pad" value={directPage} maxLength={6} onChangeText={setDirectPage} autoFocus /></Field>
      <Field label="전체 페이지 · 선택" hint="페이지 수를 모르면 비워두세요."><Input accessibilityLabel="전체 페이지" keyboardType="number-pad" value={directTotal} maxLength={6} onChangeText={setDirectTotal} placeholder="아직 몰라요" /></Field>
      <Feedback error>{directError}</Feedback><Button title="이 위치로 맞추기" onPress={applyDirect} />
    </Sheet>
  </View>;
}
const styles = StyleSheet.create({
  section: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.line, gap: 14 },
  book: { alignItems: 'center', paddingTop: 4, paddingBottom: 24, gap: 8, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 8 },
  title: { color: c.ink, fontSize: 23, lineHeight: 32, fontWeight: '800', textAlign: 'center', marginTop: 14 }, author: { color: c.muted, fontSize: 14 },
  heading: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' }, label: { color: c.ink, fontSize: 19, fontWeight: '700' }, finished: { color: c.action, fontSize: 12 },
  position: { alignItems: 'center', paddingTop: 2 }, page: { color: c.accent, fontSize: 58, lineHeight: 78, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  unit: { fontSize: 22, letterSpacing: 0 }, delta: { color: c.muted, fontSize: 13, lineHeight: 21 },
  shuttle: { height: 72, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', ...(Platform.OS === 'web' ? { touchAction: 'none' as const } : {}) },
  grooves: { width: 510, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, groove: { height: 24, width: 1, backgroundColor: '#C9C3BE' }, majorGroove: { height: 38, backgroundColor: '#A79D96' },
  indicator: { position: 'absolute', width: 32, height: 44, backgroundColor: c.accent, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, indicatorLine: { height: 28, width: 2, borderRadius: 1, backgroundColor: c.white },
  hint: { textAlign: 'center', color: c.muted, fontSize: 12, marginTop: -8 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 }, step: { flexDirection: 'row', gap: 2, height: 48, width: 64, borderRadius: 25, backgroundColor: c.subtle, alignItems: 'center', justifyContent: 'center' }, stepText: { color: c.ink, fontSize: 17, fontWeight: '700' }, direct: { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center' }, directText: { color: c.action, fontSize: 14, fontWeight: '600' },
});
