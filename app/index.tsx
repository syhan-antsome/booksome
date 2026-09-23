import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookObject } from '../src/components/book-object';
import { Cloth, PaperGrain, PaperSlip, TornEdge } from '../src/components/collector-surfaces';
import { TabPage } from '../src/components/tab-page';
import { readingNoteText } from '../src/lib/reading-memory';
import { useAuth } from '../src/providers/auth-provider';
import { listReadingLifeBooks, listReadingLifeNotes, type ReadingLifeBook, type ReadingLifeNote } from '../src/services/reading-life';
import { booksomeColors as c, booksomeLayout, booksomeType } from '../src/theme/booksome';

export default function TodayScreen() {
  const { session, isLoading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [notes, setNotes] = useState<ReadingLifeNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session) { setBooks([]); setNotes([]); return; }
    setLoading(true); setError('');
    listReadingLifeBooks(session.user.id).then(async items => {
      const book = items.find(item => item.status === 'reading') ?? items[0];
      const records = book ? await listReadingLifeNotes(session.user.id, book.id) : [];
      if (active) { setBooks(items); setNotes([...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '서재를 불러오지 못했습니다.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user.id]));

  const book = books.find(item => item.status === 'reading') ?? books[0];
  const note = notes.find(item => readingNoteText(item) && readingNoteText(item) !== '오늘은 여기까지 읽었어요.');
  const photo = notes.find(item => item.mediaUrl);
  const bookWidth = Math.min(width, booksomeLayout.maxContentWidth) * 0.44;
  const openBook = (compose = false) => book
    ? router.push({ pathname: '/reading-life/[id]', params: { id: book.id, ...(compose ? { section: 'quote' } : {}) } })
    : router.push('/books/add');

  return <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <PaperGrain />
        <View style={styles.header}>
          <Text style={styles.brand}>BookSome</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="책 찾기" onPress={() => router.push('/books/add')} style={styles.search}><Ionicons name="search-outline" size={29} color={c.forest} /></Pressable>
        </View>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>오늘도,{ '\n' }좋은 문장을 만나길</Text>
          <View style={styles.pencilLine} />
        </View>
        {authLoading || loading ? <View style={styles.loading}><ActivityIndicator color={c.forest} /><Text style={styles.muted}>책장을 펼치고 있어요</Text></View> : <View style={styles.bookStage}>
          <View style={styles.bookArt}>
            <PaperSlip style={styles.behindBook}><Text style={styles.behindText}>{book ? '한 권의 책,\n나만의 시간.' : '새로운\n이야기의\n시작.'}</Text></PaperSlip>
            <Pressable accessibilityRole="button" accessibilityLabel={book ? book.title + ' 독서 기록 열기' : '첫 책 찾아보기'} onPress={() => openBook()}>
              <BookObject width={bookWidth} title={book?.title ?? '나의\n첫 책'} author={book?.author} uri={book?.externalCoverUrl} tilt={-5} progress={book?.progressPercent} />
            </Pressable>
          </View>
          <View style={styles.bookCopy}>
            <Text numberOfLines={3} style={[styles.bookTitle, (book?.title.length ?? 0) > 4 && styles.mediumTitle, (book?.title.length ?? 0) > 12 && styles.longTitle]}>{book?.title ?? '나의 첫\n책 한 권'}</Text>
            <Text numberOfLines={2} style={styles.author}>{book?.author ?? '어떤 책을 읽고 있나요?'}</Text>
            {book ? <Text style={styles.position}><Text style={styles.currentPage}>{book.currentPage}</Text>{book.totalPages ? ' / ' + book.totalPages + '쪽' : '쪽까지 읽었어요'}</Text> : <Text style={styles.invitation}>책을 담고,{ '\n' }마음을 남겨요.</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={book ? book.status === 'finished' ? '내 기록 펼치기' : '이어서 기록하기' : '책 찾아보기'} onPress={() => openBook()} style={({ pressed }) => [styles.continue, width < 360 && styles.compactButton, pressed && styles.pressed]}>
              <Text style={[styles.continueText, width < 360 && styles.compactContinue]}>{book ? book.status === 'finished' ? '내 기록 펼치기' : '이어서 기록하기' : '책 찾아보기'}</Text>
              {width >= 360 ? <Ionicons name="arrow-forward" size={17} color={c.paperStrong} /> : null}
            </Pressable>
          </View>
        </View>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
      <Cloth style={styles.collection}>
        <TornEdge color={c.cloth} style={styles.collectionEdge} />
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionTitle}>내가 남긴 문장</Text>
          {book && notes.length > 0 ? <Pressable accessibilityRole="button" onPress={() => openBook()} style={styles.more}><Text style={styles.moreText}>모두 보기</Text><Ionicons name="arrow-forward" size={16} color="#D8DDCA" /></Pressable> : null}
        </View>
        <View style={[styles.noteStage, photo && styles.noteStageWithPhoto]}>
          <Pressable accessibilityRole="button" accessibilityLabel={note ? '내 기록 다시 보기' : '첫 문장 남기기'} onPress={() => openBook(!note)} style={styles.notePressable}>
            <PaperSlip style={[styles.note, photo && styles.noteWithPhoto]}>
              <Text numberOfLines={photo ? 3 : 4} style={styles.quote}>{note ? readingNoteText(note) : book ? '어떤 문장에서\n잠시 멈추었나요?' : '읽고 지나간 책이,\n내 안에 남도록.'}</Text>
              <View style={styles.quoteUnderline} />
              <Text style={styles.page}>{note?.pageLabel ? 'p. ' + note.pageLabel.replace(/^p\.\s*/i, '') : note ? '나의 생각' : '한 문장부터 남겨보세요  →'}</Text>
            </PaperSlip>
          </Pressable>
          {photo?.mediaUrl ? <Pressable accessibilityRole="button" accessibilityLabel="사진 기록 다시 보기" onPress={() => openBook()} style={styles.polaroid}><Image source={{ uri: photo.mediaUrl }} style={styles.photo} resizeMode="cover" /><Text numberOfLines={1} style={styles.photoCaption}>{photo.pageLabel ? 'p. ' + photo.pageLabel : '내가 머문 페이지'}</Text></Pressable> : null}
        </View>
        <Text style={styles.collectionFoot}>{note ? '다시 펼칠 때마다,\n그때의 나를 만나요.' : '나만의 문장과 사진이\n이곳에 차곡차곡 모여요.'}</Text>
        {!session && !authLoading ? <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.login}><Text style={styles.moreText}>이미 기록 중이라면 로그인</Text><Ionicons name="arrow-forward" color="#D8DDCA" size={18} /></Pressable> : null}
      </Cloth>
      {book ? <View style={styles.afterword}>
        <Text style={styles.afterTitle}>이 책과 보낸 이번 주</Text>
        <View style={styles.week}>{weekDays(notes).map(day => <View key={day.label} style={styles.day}><Text style={styles.dayLabel}>{day.label}</Text><View style={[styles.dayMark, day.active && styles.dayActive]}>{day.active ? <Ionicons name="checkmark" color={c.paperStrong} size={15} /> : <Text style={styles.dayDot}>·</Text>}</View></View>)}</View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/library')} style={styles.libraryLink}><Text style={styles.libraryLinkText}>내 서재의 다른 책도 펼쳐보기</Text><Ionicons name="arrow-forward" color={c.forest} size={20} /></Pressable>
      </View> : null}
    </ScrollView>
  </SafeAreaView></TabPage>;
}

function weekDays(notes: ReadingLifeNote[]) {
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const key = (date: Date) => [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
  const active = new Set(notes.map(note => key(new Date(note.createdAt))));
  return ['월', '화', '수', '목', '금', '토', '일'].map((label, index) => {
    const date = new Date(monday); date.setDate(date.getDate() + index);
    return { label, active: active.has(key(date)) };
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  content: { alignSelf: 'center', width: '100%', maxWidth: booksomeLayout.maxContentWidth, paddingBottom: booksomeLayout.bottomNavSpace },
  top: { paddingTop: 12, paddingBottom: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 14 },
  brand: { fontFamily: booksomeType.serif, fontSize: 33, lineHeight: 49, color: c.forest, letterSpacing: -1.5 },
  search: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  greeting: { alignSelf: 'flex-start', marginLeft: 25, marginBottom: 20, transform: [{ rotate: '-5deg' }] },
  greetingText: { fontFamily: booksomeType.serif, fontSize: 18, lineHeight: 27, color: c.forest },
  pencilLine: { width: 116, height: 1.5, backgroundColor: '#8DA580', marginLeft: 47, marginTop: 4, transform: [{ rotate: '-7deg' }] },
  loading: { height: 270, alignItems: 'center', justifyContent: 'center', gap: 16 },
  muted: { color: c.muted, fontSize: 14 },
  bookStage: { flexDirection: 'row', alignItems: 'center', paddingLeft: 26, paddingRight: 16, gap: 20 },
  bookArt: { position: 'relative', paddingVertical: 5 },
  behindBook: { position: 'absolute', top: 58, left: -14, width: '86%', height: '67%', transform: [{ rotate: '-10deg' }], padding: 15 },
  behindText: { fontFamily: booksomeType.serif, color: '#86927E', fontSize: 13, lineHeight: 23 },
  bookCopy: { flex: 1, minWidth: 0, paddingBottom: 6 },
  bookTitle: { fontFamily: booksomeType.serif, color: c.forest, fontSize: 36, lineHeight: 49, letterSpacing: -1 },
  mediumTitle: { fontSize: 28, lineHeight: 40 },
  longTitle: { fontSize: 23, lineHeight: 34 },
  author: { color: '#777E68', fontSize: 13, lineHeight: 21, marginTop: 10 },
  position: { color: '#808573', fontSize: 13, lineHeight: 23, marginTop: 24 },
  currentPage: { color: c.forest, fontWeight: '700', fontSize: 17 },
  invitation: { color: c.muted, fontSize: 14, lineHeight: 23, marginTop: 18 },
  continue: { backgroundColor: c.forest, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 12, marginTop: 18 },
  continueText: { color: c.paperStrong, fontSize: 13, fontWeight: '600', flexShrink: 1, lineHeight: 20 },
  compactContinue: { fontSize: 12 },
  compactButton: { paddingHorizontal: 6 },
  pressed: { opacity: 0.82 },
  error: { color: c.danger, marginHorizontal: 24, marginTop: 18, lineHeight: 22 },
  collection: { paddingHorizontal: 23, paddingTop: 22, paddingBottom: 26 },
  collectionEdge: { position: 'absolute', top: -8, left: 0, right: 0 },
  collectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  collectionTitle: { fontFamily: booksomeType.serif, fontSize: 17, color: '#E1E3D1' },
  more: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 },
  moreText: { color: '#D8DDCA', fontSize: 12, lineHeight: 21 },
  noteStage: { minHeight: 192 },
  noteStageWithPhoto: { minHeight: 280 },
  notePressable: { transform: [{ rotate: '-3deg' }] },
  note: { minHeight: 185, paddingTop: 26, paddingBottom: 22 },
  noteWithPhoto: { paddingRight: 120 },
  quote: { fontFamily: booksomeType.serif, fontSize: 21, lineHeight: 35, color: c.forest, letterSpacing: -0.6 },
  quoteUnderline: { backgroundColor: '#99AF89', height: 1.5, width: '67%', marginTop: 13, transform: [{ rotate: '-2deg' }] },
  page: { color: '#5F7765', fontSize: 12, marginTop: 18, lineHeight: 19 },
  polaroid: { position: 'absolute', right: -8, top: 100, backgroundColor: c.paperStrong, padding: 6, width: 125, transform: [{ rotate: '8deg' }], boxShadow: '0px 6px 12px rgba(0,0,0,.2)' },
  photo: { width: '100%', height: 137 },
  photoCaption: { fontFamily: booksomeType.serif, color: c.forest, fontSize: 10, paddingTop: 8, paddingBottom: 3, textAlign: 'center' },
  collectionFoot: { fontFamily: booksomeType.serif, color: '#AEC0A9', fontSize: 14, lineHeight: 25, marginTop: 24, marginLeft: 5, transform: [{ rotate: '-3deg' }] },
  login: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, minHeight: 44 },
  afterword: { padding: 24, paddingTop: 30 },
  afterTitle: { fontFamily: booksomeType.serif, fontSize: 18, color: c.forest },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 22 },
  day: { alignItems: 'center', gap: 9 },
  dayLabel: { color: c.muted, fontSize: 11 },
  dayMark: { height: 29, width: 29, borderRadius: 15, backgroundColor: '#EEE5BF', alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: c.forest },
  dayDot: { color: '#A4A083' },
  libraryLink: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  libraryLinkText: { fontSize: 13, color: c.forest },
});
