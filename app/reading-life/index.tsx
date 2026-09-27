import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Feedback } from '../../src/components/app-ui';
import { AuthRequired } from '../../src/components/auth-required';
import { BookObject } from '../../src/components/book-object';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { listReadingLifeBooks, listReadingLifeNotes } from '../../src/services/reading-life';
import { booksomeLayout, booksomeColors as c } from '../../src/theme/booksome';

type Activity = { id: string; bookId: string; title: string; cover: string | null; date: string; label: string };
const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

export default function ReadingCalendarScreen() {
  const { session } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session) { setActivity([]); return; }
    setLoading(true); setError('');
    (async () => {
      const books = await listReadingLifeBooks(session.user.id);
      const events: Activity[] = books.map(book => ({ id: 'book-' + book.id, bookId: book.id, title: book.title, cover: book.externalCoverUrl, date: dateKey(new Date(book.createdAt)), label: '서재에 담았어요' }));
      // Bound concurrency for large libraries; these are actual note dates, not
      // inferred historical reading sessions from the latest book.updatedAt.
      for (let i = 0; i < books.length && active; i += 4) {
        await Promise.all(books.slice(i, i + 4).map(async book => {
          const notes = await listReadingLifeNotes(session.user.id, book.id);
          events.push(...notes.map(note => ({ id: note.id, bookId: book.id, title: book.title, cover: book.externalCoverUrl, date: dateKey(new Date(note.createdAt)), label: note.kind === 'photo' ? '사진을 남겼어요' : '문장과 생각을 남겼어요' })));
        }));
      }
      if (active) setActivity(events);
    })().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '달력을 불러오지 못했어요.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user.id, reload]));
  const marked = useMemo(() => new Set(activity.map(item => item.date)), [activity]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((month.getDay() + days) / 7) * 7 }, (_, i) => i - month.getDay() + 1);
  const entries = activity.filter(item => item.date === selected);
  const moveMonth = (delta: number) => setMonth(value => new Date(value.getFullYear(), value.getMonth() + delta, 1));
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="독서 달력" subtitle="책을 담은 날, 문장과 사진을 남긴 날" />
    {!session ? <AuthRequired title="나의 독서 날짜를 모아요" copy="로그인하면 책과 기록을 남긴 날을 돌아볼 수 있어요." /> : <>
      <View style={styles.month}><Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => moveMonth(-1)} style={styles.arrow}><Ionicons name="chevron-back" size={22} color={c.ink} /></Pressable><Text style={styles.monthTitle}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => moveMonth(1)} style={styles.arrow}><Ionicons name="chevron-forward" size={22} color={c.ink} /></Pressable></View>
      <View style={styles.calendar}>{['일', '월', '화', '수', '목', '금', '토'].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
        {cells.map((day, i) => { const valid = day > 0 && day <= days; const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day)); return <View key={i} style={styles.daySlot}>{valid ? <Pressable accessibilityRole="button" accessibilityLabel={key + (marked.has(key) ? ' 기록 있음' : '')} accessibilityState={{ selected: selected === key }} onPress={() => setSelected(key)} style={[styles.day, selected === key && styles.selected]}><Text style={[styles.dayNumber, selected === key && styles.selectedText]}>{day}</Text><View style={[styles.dot, { opacity: marked.has(key) ? 1 : 0 }, selected === key && { backgroundColor: c.white }]} /></Pressable> : null}</View>; })}
      </View>
      <Button title="오늘로" variant="ghost" onPress={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(dateKey(new Date())); }} />
      {loading ? <ActivityIndicator color={c.accent} /> : null}
      {error ? <><Feedback error>{error}</Feedback><Button title="다시 불러오기" variant="ghost" onPress={() => setReload(value => value + 1)} /></> : null}
      <Text style={styles.section}>{selected.replaceAll('-', '. ')}</Text>
      {entries.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/reading-life/[id]', params: { id: item.bookId } })} style={styles.entry}><BookObject width={48} title={item.title} uri={item.cover} /><View style={styles.entryCopy}><Text style={styles.entryTitle}>{item.title}</Text><Text style={styles.label}>{item.label}</Text></View><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>)}
      {!loading && !error && !entries.length ? <Text style={styles.empty}>이날 남긴 기록은 없어요.{'\n'}다음에 책을 펼칠 때 한 문장을 남겨보세요.</Text> : null}
    </>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { width: '100%', maxWidth: booksomeLayout.maxContentWidth, alignSelf: 'center', padding: 24, paddingBottom: 48 },
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, monthTitle: { color: c.ink, fontSize: 20, fontWeight: '700' }, arrow: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.285%', textAlign: 'center', color: c.muted, fontSize: 12, paddingVertical: 12 }, daySlot: { width: '14.285%', minHeight: 48, alignItems: 'center', marginVertical: 4 }, day: { width: 42, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', gap: 4 }, selected: { backgroundColor: c.action }, dayNumber: { color: c.ink, fontSize: 15 }, selectedText: { color: c.white, fontWeight: '700' }, dot: { backgroundColor: c.accent, width: 4, height: 4, borderRadius: 2 },
  section: { color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 14 }, entry: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 18, borderTopWidth: 1, borderTopColor: c.line }, entryCopy: { flex: 1, gap: 8 }, entryTitle: { color: c.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' }, label: { color: c.muted, fontSize: 13 }, empty: { color: c.muted, fontSize: 14, lineHeight: 24, paddingVertical: 24 },
});
