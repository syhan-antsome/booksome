import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import readingLifeSignboardImage from '../../assets/reading-life-signboard.jpg';
import { AuthRequired } from '../../src/components/auth-required';
import { BackButton } from '../../src/components/back-button';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { useAuth } from '../../src/providers/auth-provider';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

const recordTypes = [
  { title: '읽는 책', copy: '현재 읽는 책과 진행률을 기록합니다.', section: 'progress' },
  { title: '문장 메모', copy: '오래 남기고 싶은 문장을 모읍니다.', section: 'quote' },
  { title: '사진 메모', copy: '책상, 페이지, 장소까지 독서의 순간을 남깁니다.', section: 'photo' },
];

const readingLifeSignboardSource: ImageSourcePropType =
  typeof readingLifeSignboardImage === 'string' ? { uri: readingLifeSignboardImage } : readingLifeSignboardImage;
const readingLifeSignboardRatio = 803 / 1400;

export default function ReadingLifeScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
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
  const signHeroHeight = Math.round(width * readingLifeSignboardRatio);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.signHero, { height: signHeroHeight }]}>
          <Image resizeMode="contain" source={readingLifeSignboardSource} style={styles.signHeroImage} />
          <LinearGradient
            colors={['rgba(238, 241, 223, 0)', 'rgba(238, 241, 223, 0.38)', '#EEF1DF']}
            locations={[0, 0.48, 1]}
            pointerEvents="none"
            style={styles.signHeroGradient}
          />

          <View style={styles.signHeroTop}>
            <BackButton />
            <Link asChild href={session ? '/scan' : '/auth'}>
              <Pressable accessibilityLabel="책 스캔" style={styles.signHeroAction}>
                <Text style={styles.signHeroActionText}>＋</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.signIntro}>
          <Text style={styles.signHeroEyebrow}>MY READING LIFE</Text>
          <Text style={styles.signHeroText}>읽고 있는 책과 오늘의 문장을 조용히 쌓아둡니다.</Text>
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

        <Pressable
          disabled={!currentBook}
          onPress={() => {
            if (currentBook) router.push(`/reading-life/${currentBook.id}`);
          }}
          style={styles.currentBook}
        >
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
        </Pressable>

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
              <Pressable
                key={book.id}
                onPress={() => router.push(`/reading-life/${book.id}`)}
                style={styles.myBookItem}
              >
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
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.recordList}>
          {recordTypes.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => {
                if (currentBook) {
                  router.push({
                    pathname: '/reading-life/[id]',
                    params: { id: currentBook.id, section: item.section },
                  });
                  return;
                }

                router.push(session ? '/scan' : '/auth');
              }}
              style={styles.recordItem}
            >
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
  signHero: {
    marginHorizontal: -20,
    marginTop: -20,
    overflow: 'hidden',
    position: 'relative',
  },
  signHeroImage: {
    height: '100%',
    width: '100%',
  },
  signHeroGradient: {
    bottom: -1,
    height: 118,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  signHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  signHeroAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.92)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  signHeroActionText: {
    color: '#103D2B',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  signIntro: {
    marginTop: 8,
  },
  signHeroEyebrow: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  signHeroText: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: 6,
    maxWidth: 270,
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
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(16,61,43,0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: 2,
  },
  statItem: {
    flex: 1,
    paddingVertical: 17,
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
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    paddingVertical: 20,
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
    marginTop: 24,
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  myBookItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
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
    marginTop: 20,
  },
  recordItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
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
