import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { readingMemory, readingNoteBody, readingNoteText } from '../lib/reading-memory';
import type { ReadingLifeBook, ReadingLifeNote } from '../services/reading-life';
import { booksomeColors as c, booksomeType } from '../theme/booksome';
import { Cloth, PaperSlip } from './collector-surfaces';

export function ReadingMemory({ book, notes, onWrite }: {
  book: ReadingLifeBook;
  notes: ReadingLifeNote[];
  onWrite: () => void;
}) {
  const memory = readingMemory(notes);
  return (
    <Cloth style={styles.sheet}>
      <Text style={styles.title}>이 책에서 내가 남긴 것</Text>
      <Text style={styles.subtitle}>{book.title}을 덮고, 내 생각을 펼쳐보세요.</Text>
      <Text style={styles.count}>{memory.noteCount}개의 기록 · 사진 {memory.photoCount}장</Text>
      {memory.passages.length ? memory.passages.map(note => (
        <PaperSlip key={note.id} style={styles.passage}>
          <Text selectable style={styles.text}>{readingNoteText(note)}</Text>
          {note.quoteText && readingNoteBody(note.body) ? <Text selectable style={styles.thought}>{readingNoteBody(note.body)}</Text> : null}
          <Text style={styles.meta}>
            {note.pageLabel ? `${note.pageLabel}쪽 · ` : ''}
            {new Date(note.createdAt).toLocaleDateString('ko-KR')}
          </Text>
        </PaperSlip>
      )) : <Text style={styles.empty}>가장 오래 기억하고 싶은 것은 무엇인가요?{ '\n' }한 문장만 남겨도 이 책을 다시 떠올릴 수 있어요.</Text>}
      {notes.some(note => note.kind === 'photo' && note.mediaUrl) ? (
        <View style={styles.photos}>{notes.filter(note => note.kind === 'photo' && note.mediaUrl).map(note => (
          <Image accessibilityLabel="이 책에 남긴 사진" key={note.id} source={{ uri: note.mediaUrl! }} style={styles.photo} />
        ))}</View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onWrite} style={styles.action}>
        <Text style={styles.actionText}>다 읽고 난 생각 남기기</Text>
      </Pressable>
      <Text style={styles.privacy}>이 회고는 나에게만 보여요. 각 기록의 공개 설정은 바뀌지 않습니다.</Text>
    </Cloth>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 22, gap: 20, marginVertical: 24, marginHorizontal: -20 },
  title: { color: c.paperStrong, fontFamily: booksomeType.serif, fontSize: 23, lineHeight: 35 },
  subtitle: { color: '#CDDAC6', fontSize: 14, lineHeight: 22 },
  count: { color: '#E3D8B6', fontSize: 13 },
  passage: { paddingVertical: 22, gap: 14, transform: [{ rotate: '-1deg' }] },
  text: { color: c.forest, fontFamily: booksomeType.serif, fontSize: 18, lineHeight: 31 },
  meta: { color: c.muted, fontSize: 12 },
  thought: { color: c.muted, fontSize: 15, lineHeight: 25 },
  empty: { color: c.paperStrong, fontFamily: booksomeType.serif, fontSize: 16, lineHeight: 29, paddingVertical: 16 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 130, height: 160, borderRadius: 4 },
  action: { backgroundColor: c.paperStrong, padding: 15, alignItems: 'center', borderRadius: 26 },
  actionText: { color: c.forest, fontSize: 15, fontWeight: '600' },
  privacy: { color: '#CDDAC6', fontSize: 12, lineHeight: 19 },
});
