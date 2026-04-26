import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BackButton } from '../../src/components/back-button';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { useAuth } from '../../src/providers/auth-provider';
import {
  getReadingLifeBook,
  type ReadingBookStatus,
  type ReadingLifeBook,
  updateReadingLifeBook,
} from '../../src/services/reading-life';

const statusOptions: Array<{ value: ReadingBookStatus; label: string; copy: string }> = [
  { value: 'reading', label: '읽는 중', copy: '지금 곁에 두고 읽는 책' },
  { value: 'want_to_read', label: '읽고 싶음', copy: '다음에 펼칠 책' },
  { value: 'finished', label: '완독', copy: '끝까지 함께한 책' },
  { value: 'paused', label: '잠시 멈춤', copy: '나중에 다시 만날 책' },
];

const progressMarks = [0, 25, 50, 75, 100];

export default function ReadingLifeBookScreen() {
  const { id, section } = useLocalSearchParams<{ id?: string; section?: string }>();
  const { session } = useAuth();
  const [book, setBook] = useState<ReadingLifeBook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bookId = Array.isArray(id) ? id[0] : id;
  const activeSection = Array.isArray(section) ? section[0] : section;

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id || !bookId) {
      setBook(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    getReadingLifeBook(session.user.id, bookId)
      .then((nextBook) => {
        if (isMounted) setBook(nextBook);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getErrorMessage(error, '책 정보를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookId, session?.user.id]);

  const statusLabel = useMemo(() => {
    return statusOptions.find((option) => option.value === book?.status)?.label ?? '읽는 중';
  }, [book?.status]);

  const saveBook = async (input: { status?: ReadingBookStatus; progressPercent?: number }) => {
    if (!session?.user.id || !bookId) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const nextBook = await updateReadingLifeBook(session.user.id, bookId, input);
      setBook(nextBook);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '변경 내용을 저장하지 못했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const setProgress = (progressPercent: number) => {
    const nextStatus = progressPercent >= 100 ? 'finished' : book?.status === 'finished' ? 'reading' : book?.status;
    void saveBook({ progressPercent, status: nextStatus });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.header}>
          <BackButton />
          <Pressable onPress={() => router.push('/scan')} style={styles.scanButton}>
            <Text style={styles.scanButtonText}>＋</Text>
          </Pressable>
        </View>

        {!session ? (
          <AuthRequired
            title="독서생활은 로그인 후 기록됩니다."
            copy="책 진행률과 메모는 내 계정에 연결되어 저장됩니다."
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#103D2B" />
            <Text style={styles.loadingText}>책장을 펼치는 중입니다</Text>
          </View>
        ) : null}

        {book ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.coverShell}>
                  {book.externalCoverUrl ? (
                    <Image resizeMode="contain" source={{ uri: book.externalCoverUrl }} style={styles.coverImage} />
                  ) : (
                    <Text style={styles.coverFallback}>BOOK</Text>
                  )}
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.kicker}>{statusLabel}</Text>
                  <Text style={styles.title} numberOfLines={3}>
                    {book.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={2}>
                    {book.author}
                    {book.publisher ? ` · ${book.publisher}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.heroBottom}>
                <Text style={styles.heroBottomLabel}>My reading</Text>
                <Text style={styles.heroBottomValue}>{book.progressPercent}%</Text>
              </View>
            </View>

            <View style={styles.progressPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>읽은 만큼 남기기</Text>
                <Text style={styles.progressValue}>{book.progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${book.progressPercent}%` }]} />
              </View>
              <View style={styles.progressMarks}>
                {progressMarks.map((mark) => (
                  <Pressable
                    disabled={isSaving}
                    key={mark}
                    onPress={() => setProgress(mark)}
                    style={[styles.progressMark, book.progressPercent === mark ? styles.progressMarkActive : null]}
                  >
                    <Text
                      style={[
                        styles.progressMarkText,
                        book.progressPercent === mark ? styles.progressMarkTextActive : null,
                      ]}
                    >
                      {mark}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.statusPanel}>
              <Text style={styles.sectionTitle}>책의 현재 위치</Text>
              <View style={styles.statusList}>
                {statusOptions.map((option) => (
                  <Pressable
                    disabled={isSaving}
                    key={option.value}
                    onPress={() =>
                      saveBook({
                        status: option.value,
                        progressPercent: option.value === 'finished' ? 100 : book.progressPercent,
                      })
                    }
                    style={[styles.statusItem, book.status === option.value ? styles.statusItemActive : null]}
                  >
                    <View>
                      <Text style={[styles.statusTitle, book.status === option.value ? styles.statusTitleActive : null]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.statusCopy, book.status === option.value ? styles.statusCopyActive : null]}>
                        {option.copy}
                      </Text>
                    </View>
                    <Text style={[styles.statusCheck, book.status === option.value ? styles.statusCheckActive : null]}>
                      {book.status === option.value ? '✓' : '○'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.memoPanel}>
              <Text style={styles.sectionTitle}>
                {activeSection === 'quote'
                  ? '문장 메모'
                  : activeSection === 'photo'
                    ? '사진 메모'
                    : '다음 기록'}
              </Text>
              <Text style={styles.memoCopy}>
                오늘은 진행률과 읽는 상태를 먼저 저장할 수 있습니다. 다음 단계에서 문장 메모와 사진 메모를 이 공간에 바로 붙이겠습니다.
              </Text>
            </View>

            <View style={styles.nextPanel}>
              <Text style={styles.sectionTitle}>곧 열릴 기록</Text>
              <View style={styles.nextList}>
                <View style={styles.nextItem}>
                  <Text style={styles.nextMark}>“</Text>
                  <View style={styles.nextCopy}>
                    <Text style={styles.nextTitle}>문장 저장</Text>
                    <Text style={styles.nextText}>오래 남기고 싶은 문장을 책과 함께 묶습니다.</Text>
                  </View>
                </View>
                <View style={styles.nextItem}>
                  <Text style={styles.nextMark}>▧</Text>
                  <View style={styles.nextCopy}>
                    <Text style={styles.nextTitle}>사진 메모</Text>
                    <Text style={styles.nextText}>페이지, 장소, 순간을 독서 기록에 붙입니다.</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 190,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  scanButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  loadingText: {
    color: '#435049',
    fontSize: 14,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#103D2B',
    borderRadius: 30,
    overflow: 'hidden',
    padding: 16,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  coverShell: {
    alignItems: 'center',
    backgroundColor: '#F5E8B2',
    borderRadius: 20,
    height: 178,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 116,
  },
  coverImage: {
    height: 166,
    width: 104,
  },
  coverFallback: {
    color: '#103D2B',
    fontSize: 16,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: '#D8BE88',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 9,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 30,
  },
  author: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 10,
  },
  heroBottom: {
    alignItems: 'center',
    borderTopColor: 'rgba(247,241,229,0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
  },
  heroBottomLabel: {
    color: 'rgba(247,241,229,0.72)',
    fontSize: 13,
    fontWeight: '900',
  },
  heroBottomValue: {
    color: '#D8BE88',
    fontSize: 26,
    fontWeight: '900',
  },
  progressPanel: {
    backgroundColor: '#F8F3E9',
    borderRadius: 26,
    marginTop: 16,
    padding: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 20,
    fontWeight: '900',
  },
  progressValue: {
    color: '#116653',
    fontSize: 24,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#E3D9C7',
    borderRadius: 999,
    height: 10,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#116653',
    height: '100%',
  },
  progressMarks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  progressMark: {
    alignItems: 'center',
    backgroundColor: '#E8DEC9',
    borderRadius: 16,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  progressMarkActive: {
    backgroundColor: '#116653',
  },
  progressMarkText: {
    color: '#5B675F',
    fontSize: 13,
    fontWeight: '900',
  },
  progressMarkTextActive: {
    color: '#FFFFFF',
  },
  statusPanel: {
    marginTop: 18,
  },
  statusList: {
    gap: 10,
    marginTop: 12,
  },
  statusItem: {
    alignItems: 'center',
    backgroundColor: '#F8F3E9',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusItemActive: {
    backgroundColor: '#103D2B',
  },
  statusTitle: {
    color: '#14251B',
    fontSize: 16,
    fontWeight: '900',
  },
  statusTitleActive: {
    color: '#FFFFFF',
  },
  statusCopy: {
    color: '#72806E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  statusCopyActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  statusCheck: {
    color: '#9A8D78',
    fontSize: 20,
    fontWeight: '900',
  },
  statusCheckActive: {
    color: '#D8BE88',
  },
  memoPanel: {
    backgroundColor: '#F8F3E9',
    borderRadius: 26,
    marginTop: 18,
    padding: 18,
  },
  memoCopy: {
    color: '#5B675F',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 9,
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  nextPanel: {
    marginTop: 20,
  },
  nextList: {
    gap: 10,
    marginTop: 12,
  },
  nextItem: {
    alignItems: 'center',
    backgroundColor: '#F8F3E9',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  nextMark: {
    color: '#116653',
    fontSize: 26,
    fontWeight: '900',
    width: 32,
  },
  nextCopy: {
    flex: 1,
  },
  nextTitle: {
    color: '#14251B',
    fontSize: 16,
    fontWeight: '900',
  },
  nextText: {
    color: '#6E786F',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
  },
});
