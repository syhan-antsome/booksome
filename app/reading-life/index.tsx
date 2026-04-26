import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import sseomdiReadingImage from '../../assets/sseomdi-reading.png';
import { AuthRequired } from '../../src/components/auth-required';
import { BackButton } from '../../src/components/back-button';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { useAuth } from '../../src/providers/auth-provider';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

const sseomdiReadingSource = toImageSource(sseomdiReadingImage);

const recordTypes = [
  { title: '읽는 책', copy: '현재 읽는 책과 진행률을 기록합니다.' },
  { title: '문장 메모', copy: '오래 남기고 싶은 문장을 모읍니다.' },
  { title: '사진 메모', copy: '책상, 페이지, 장소까지 독서의 순간을 남깁니다.' },
];

export default function ReadingLifeScreen() {
  const { session } = useAuth();
  const [books, setBooks] = useState<ReadingLifeBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setBooks([]);
      return;
    }

    setIsLoadingBooks(true);
    setLoadError(null);

    listReadingLifeBooks(session.user.id)
      .then((nextBooks) => {
        if (isMounted) setBooks(nextBooks);
      })
      .catch((error) => {
        if (isMounted) setLoadError(getErrorMessage(error, '독서생활 기록을 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLoadingBooks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const currentBook = books.find((book) => book.status === 'reading') ?? books[0] ?? null;
  const readingStats = [
    { label: '읽는 중', value: String(books.filter((book) => book.status === 'reading').length) },
    { label: '문장 메모', value: '0' },
    { label: '사진 기록', value: '0' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton />
          <Link asChild href={session ? '/scan' : '/auth'}>
            <Pressable style={styles.addButton}>
              <Text style={styles.addButtonText}>＋</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>MY READING LIFE</Text>
            <Text style={styles.title}>나의 독서생활</Text>
            <Text style={styles.copy}>
              읽는 책, 남긴 문장, 조용한 사진 메모까지 나만의 책 생활을 쌓아갑니다.
            </Text>
          </View>
          <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.mascot} />
        </View>

        {!session ? (
          <AuthRequired
            title="독서생활은 로그인 후 기록됩니다."
            copy="내 책, 진행률, 메모와 사진 기록을 안전하게 보관하기 위해 계정이 필요합니다."
          />
        ) : null}

        <View style={styles.statsRow}>
          {readingStats.map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.currentBook}>
          <View style={styles.bookCover}>
            {currentBook?.externalCoverUrl ? (
              <Image resizeMode="cover" source={{ uri: currentBook.externalCoverUrl }} style={styles.bookCoverImage} />
            ) : (
              <Text style={styles.bookCoverText}>BOOK</Text>
            )}
          </View>
          <View style={styles.bookCopy}>
            <Text style={styles.bookState}>현재 읽는 책</Text>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {currentBook?.title ?? '아직 기록된 책이 없어요'}
            </Text>
            {currentBook ? <Text style={styles.bookAuthor}>{currentBook.author}</Text> : null}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${currentBook?.progressPercent ?? 0}%` }]} />
            </View>
            <Text style={styles.bookHint}>
              {currentBook ? '이제 진행률, 문장, 사진 메모를 이어서 붙일 수 있습니다.' : '책을 추가하면 진행률과 메모가 여기에 모입니다.'}
            </Text>
          </View>
        </View>

        {isLoadingBooks ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#103D2B" />
            <Text style={styles.loadingText}>나의 책장을 불러오는 중입니다</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {books.length > 0 ? (
          <View style={styles.myBooks}>
            <Text style={styles.sectionTitle}>내 책장</Text>
            {books.map((book) => (
              <View key={book.id} style={styles.myBookItem}>
                {book.externalCoverUrl ? (
                  <Image resizeMode="cover" source={{ uri: book.externalCoverUrl }} style={styles.myBookImage} />
                ) : (
                  <View style={styles.myBookFallback}>
                    <Text style={styles.myBookFallbackText}>BOOK</Text>
                  </View>
                )}
                <View style={styles.myBookCopy}>
                  <Text style={styles.myBookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.myBookMeta} numberOfLines={1}>
                    {book.author}
                    {book.publisher ? ` · ${book.publisher}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.recordList}>
          {recordTypes.map((item) => (
            <Pressable key={item.title} style={styles.recordItem}>
              <View style={styles.recordMark} />
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>{item.title}</Text>
                <Text style={styles.recordText}>{item.copy}</Text>
              </View>
              <Text style={styles.recordArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNavigation active="reading-life" />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#EEF1DF',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 124,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  addButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  hero: {
    backgroundColor: '#103D2B',
    borderRadius: 32,
    minHeight: 232,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
  },
  heroCopy: {
    maxWidth: 240,
    zIndex: 2,
  },
  kicker: {
    color: '#D8BE88',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copy: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  mascot: {
    bottom: -8,
    height: 116,
    position: 'absolute',
    right: 8,
    width: 142,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  statItem: {
    backgroundColor: '#F8F3E9',
    borderRadius: 22,
    flex: 1,
    padding: 16,
  },
  statValue: {
    color: '#103D2B',
    fontSize: 27,
    fontWeight: '900',
  },
  statLabel: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  currentBook: {
    backgroundColor: '#F8F3E9',
    borderRadius: 30,
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    padding: 18,
  },
  bookCover: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 16,
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  bookCoverImage: {
    height: '100%',
    width: '100%',
  },
  bookCoverText: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  bookCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  bookState: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  bookTitle: {
    color: '#14251B',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: 5,
  },
  bookAuthor: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  progressTrack: {
    backgroundColor: '#E5DCC9',
    borderRadius: 4,
    height: 8,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#103D2B',
    height: '100%',
    width: '12%',
  },
  bookHint: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 9,
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  loadingText: {
    color: '#435049',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  myBooks: {
    gap: 10,
    marginTop: 18,
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  myBookItem: {
    alignItems: 'center',
    backgroundColor: '#F8F3E9',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    padding: 12,
  },
  myBookImage: {
    borderRadius: 14,
    height: 78,
    width: 54,
  },
  myBookFallback: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 14,
    height: 78,
    justifyContent: 'center',
    width: 54,
  },
  myBookFallbackText: {
    color: '#103D2B',
    fontSize: 10,
    fontWeight: '900',
  },
  myBookCopy: {
    flex: 1,
  },
  myBookTitle: {
    color: '#14251B',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  myBookMeta: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  recordList: {
    gap: 10,
    marginTop: 16,
  },
  recordItem: {
    alignItems: 'center',
    backgroundColor: '#F8F3E9',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  recordMark: {
    backgroundColor: '#103D2B',
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  recordCopy: {
    flex: 1,
  },
  recordTitle: {
    color: '#14251B',
    fontSize: 17,
    fontWeight: '900',
  },
  recordText: {
    color: '#72806E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 3,
  },
  recordArrow: {
    color: '#103D2B',
    fontSize: 30,
    fontWeight: '900',
  },
});
