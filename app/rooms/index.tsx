import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, Feedback, Input } from '../../src/components/app-ui';
import { BookObject } from '../../src/components/book-object';
import { BrandLogo } from '../../src/components/brand-logo';
import { TabPage } from '../../src/components/tab-page';
import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import { listReadingLifeBooks } from '../../src/services/reading-life';
import { listBookroomFeed, listFeaturedRooms, type BookroomFeedItem, type RoomSummary } from '../../src/services/rooms';
import { booksomeColors as c, booksomeLayout as layout } from '../../src/theme/booksome';

export default function RoomsScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const { session } = useAuth();
  const [query, setQuery] = useState(params.query ?? '');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [feed, setFeed] = useState<BookroomFeedItem[]>([]);
  const [myTitles, setMyTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([listFeaturedRooms(), listBookroomFeed(), session ? listReadingLifeBooks(session.user.id).catch(() => []) : Promise.resolve([])])
      .then(([nextRooms, nextFeed, books]) => { if (active) { setRooms(nextRooms); setFeed(nextFeed); setMyTitles(books.map(book => book.title)); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '이야기를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user.id, refresh]));
  const keyword = query.trim().toLowerCase();
  const matching = rooms.filter(room => (room.title + ' ' + (room.subtitle ?? '')).toLowerCase().includes(keyword));
  const mine = matching.filter(room => myTitles.includes(room.title));
  const shelf = keyword ? matching : mine.length ? mine : matching;
  const visibleFeed = feed.filter(item => (item.roomTitle + ' ' + item.roomAuthor + ' ' + item.body).toLowerCase().includes(keyword));
  return <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><BrandLogo /></View><Text accessibilityRole="header" style={styles.title}>책 이야기</Text><Text style={styles.subtitle}>같은 책을 읽는 사람들의 생각</Text>
    <View style={styles.search}><Ionicons name="search-outline" color={c.muted} size={21} /><Input accessibilityLabel="책 이야기 검색" placeholder="책 제목이나 저자 검색" value={query} onChangeText={setQuery} style={styles.searchInput} autoCapitalize="none" autoCorrect={false} /></View>
    {loading ? <ActivityIndicator color={c.accent} style={{ marginVertical: 24 }} /> : null}
    {error ? <><Feedback error>{error}</Feedback><Button title="다시 불러오기" variant="ghost" onPress={() => setRefresh(value => value + 1)} /></> : null}
    {shelf.length ? <View style={styles.section}><Text style={styles.sectionTitle}>{keyword ? '찾은 책' : mine.length ? '내 책의 이야기' : '책으로 찾아보기'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>{shelf.map(room => <Pressable key={room.id} accessibilityRole="button" accessibilityLabel={room.title + ' 이야기 보기'} onPress={() => router.push('/room/' + room.slug as '/room/[slug]')} style={styles.book}>
        <BookObject width={112} title={room.title} uri={room.cover_path ? getMediaUrl(room.cover_path) : room.external_cover_url} />
        <Text numberOfLines={2} style={styles.bookTitle}>{room.title}</Text><Text numberOfLines={1} style={styles.meta}>{room.subtitle}</Text>
      </Pressable>)}</ScrollView>
    </View> : null}
    {visibleFeed.length ? <View style={styles.section}><Text style={styles.sectionTitle}>함께 읽는 사람들의 이야기</Text>{visibleFeed.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.roomTitle + '의 이야기 읽기'} onPress={() => router.push('/room/' + item.roomSlug as '/room/[slug]')} style={styles.post}>
      <BookObject width={66} title={item.roomTitle} uri={item.roomCoverPath ? getMediaUrl(item.roomCoverPath) : item.roomExternalCoverUrl} />
      <View style={styles.postCopy}><Text numberOfLines={1} style={styles.postBook}>{item.roomTitle}</Text><Text style={styles.meta}>{item.authorName || '독자'}</Text><Text numberOfLines={3} style={styles.body}>{item.quoteText || item.body}</Text><View style={styles.reactions}><Ionicons name="chatbubble-outline" color={c.muted} size={15} /><Text style={styles.meta}>{item.commentCount}</Text><Ionicons name="heart-outline" color={c.muted} size={15} /><Text style={styles.meta}>{item.reactionCount}</Text></View></View><Ionicons name="chevron-forward" color={c.muted} size={16} />
    </Pressable>)}</View> : !loading && !error ? <EmptyState title={keyword ? '아직 이 책의 이야기가 없어요' : '첫 이야기를 기다리고 있어요'} copy="책을 찾아 감상이나 질문을 남겨보세요. 이곳의 이야기는 다른 독자에게 공개돼요." /> : null}
    <Button title="다른 책 찾아 이야기하기" variant="secondary" icon="search-outline" onPress={() => router.push(session ? '/create-room' : { pathname: '/auth', params: { next: '/rooms' } })} />
    <Text style={styles.privacy}>내 서재의 개인 기록은 자동으로 공개되지 않아요.</Text>
  </ScrollView></SafeAreaView></TabPage>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', padding: 24, paddingBottom: layout.bottomNavSpace + 24 }, header: { minHeight: 44, justifyContent: 'center', marginBottom: 26 },
  title: { color: c.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 43 }, subtitle: { color: c.muted, fontSize: 15, lineHeight: 23, marginTop: 5, marginBottom: 24 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }, searchInput: { borderWidth: 0, flex: 1, minWidth: 0, paddingLeft: 4, backgroundColor: 'transparent' },
  section: { marginTop: 30 }, sectionTitle: { color: c.ink, fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 18 }, rail: { gap: 24, paddingBottom: 12, paddingTop: 3 }, book: { width: 136, paddingLeft: 4 }, bookTitle: { color: c.ink, fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 14, marginBottom: 4 },
  meta: { color: c.muted, fontSize: 12, lineHeight: 19 }, post: { flexDirection: 'row', gap: 17, paddingVertical: 22, borderTopWidth: 1, borderTopColor: c.line }, postCopy: { flex: 1, gap: 5 }, postBook: { color: c.ink, fontSize: 15, fontWeight: '700' }, body: { color: c.ink, fontSize: 14, lineHeight: 23 }, reactions: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 6 }, privacy: { color: c.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 16 },
});
