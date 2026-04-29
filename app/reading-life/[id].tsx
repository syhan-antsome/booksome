import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import {
  createReadingLifeNote,
  getReadingLifeBook,
  listReadingLifeNotes,
  type ReadingBookStatus,
  type ReadingLifeBook,
  type ReadingLifeNote,
  type ReadingNoteKind,
  type ReadingVisibility,
  type UpdateReadingLifeBookInput,
  updateReadingLifeBook,
} from '../../src/services/reading-life';
import { uploadImageAsset } from '../../src/services/media';

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
  const [notes, setNotes] = useState<ReadingLifeNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [composer, setComposer] = useState<ReadingNoteKind>('quote');
  const [quoteText, setQuoteText] = useState('');
  const [quoteBody, setQuoteBody] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [photoBody, setPhotoBody] = useState('');
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [noteVisibility, setNoteVisibility] = useState<ReadingVisibility>('private');

  const bookId = Array.isArray(id) ? id[0] : id;
  const activeSection = Array.isArray(section) ? section[0] : section;

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id || !bookId) {
      setBook(null);
      setNotes([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      getReadingLifeBook(session.user.id, bookId),
      listReadingLifeNotes(session.user.id, bookId),
    ])
      .then(([nextBook, nextNotes]) => {
        if (!isMounted) return;
        setBook(nextBook);
        setNotes(nextNotes);
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

  useEffect(() => {
    if (activeSection === 'photo') {
      setComposer('photo');
      return;
    }

    if (activeSection === 'quote') {
      setComposer('quote');
    }
  }, [activeSection]);

  const statusLabel = useMemo(() => {
    return statusOptions.find((option) => option.value === book?.status)?.label ?? '읽는 중';
  }, [book?.status]);

  const saveBook = async (input: UpdateReadingLifeBookInput) => {
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

  const saveQuoteNote = async () => {
    if (!session?.user.id || !bookId || !book) return;

    if (!quoteText.trim() && !quoteBody.trim()) {
      setErrorMessage('남길 문장이나 생각을 입력해주세요.');
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const note = await createReadingLifeNote({
        readingBookId: bookId,
        profileId: session.user.id,
        kind: 'quote',
        quoteText,
        body: quoteBody,
        pageLabel,
        visibility: noteVisibility,
      });
      setNotes((current) => [note, ...current]);
      setQuoteText('');
      setQuoteBody('');
      setPageLabel('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '문장 메모를 저장하지 못했습니다.'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled) {
      setPhotoAsset(result.assets[0] ?? null);
    }
  };

  const savePhotoNote = async () => {
    if (!session?.user.id || !bookId || !photoAsset?.uri) {
      setErrorMessage('사진 메모에 남길 이미지를 선택해주세요.');
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const uploaded = await uploadImageAsset({
        kind: 'post-media',
        entityId: `reading-${bookId}`,
        uri: photoAsset.uri,
        ownerId: session.user.id,
        mimeType: photoAsset.mimeType,
        width: photoAsset.width,
        height: photoAsset.height,
        fileName: photoAsset.fileName,
      });
      const note = await createReadingLifeNote({
        readingBookId: bookId,
        profileId: session.user.id,
        kind: 'photo',
        body: photoBody,
        mediaPath: uploaded.objectPath,
        mediaUrl: uploaded.mediaUrl,
        visibility: noteVisibility,
      });
      setNotes((current) => [note, ...current]);
      setPhotoBody('');
      setPhotoAsset(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '사진 메모를 저장하지 못했습니다.'));
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <ScreenHeader
          action={
            <Pressable onPress={() => router.push('/scan')} style={styles.scanButton}>
              <Text style={styles.scanButtonText}>＋</Text>
            </Pressable>
          }
          eyebrow="Reading Note"
          subtitle="진행률, 문장, 사진을 이 책에 쌓습니다."
          title="책 기록"
          tone="paper"
        />

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
                <Pressable
                  disabled={isSaving}
                  onPress={() => saveBook({ visibility: book.visibility === 'public' ? 'private' : 'public' })}
                  style={styles.visibilityButton}
                >
                  <Text style={styles.visibilityText}>{book.visibility === 'public' ? '공개 기록' : '나만 보기'}</Text>
                </Pressable>
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>오늘의 기록</Text>
                <Text style={styles.noteCount}>{notes.length}</Text>
              </View>

              <View style={styles.composerTabs}>
                <Pressable
                  onPress={() => setComposer('quote')}
                  style={[styles.composerTab, composer === 'quote' ? styles.composerTabActive : null]}
                >
                  <Text style={[styles.composerTabText, composer === 'quote' ? styles.composerTabTextActive : null]}>
                    문장
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setComposer('photo')}
                  style={[styles.composerTab, composer === 'photo' ? styles.composerTabActive : null]}
                >
                  <Text style={[styles.composerTabText, composer === 'photo' ? styles.composerTabTextActive : null]}>
                    사진
                  </Text>
                </Pressable>
              </View>

              <View style={styles.visibilityRow}>
                <Pressable
                  onPress={() => setNoteVisibility('private')}
                  style={[styles.visibilityChoice, noteVisibility === 'private' ? styles.visibilityChoiceActive : null]}
                >
                  <Text
                    style={[
                      styles.visibilityChoiceText,
                      noteVisibility === 'private' ? styles.visibilityChoiceTextActive : null,
                    ]}
                  >
                    나만 보기
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setNoteVisibility('public')}
                  style={[styles.visibilityChoice, noteVisibility === 'public' ? styles.visibilityChoiceActive : null]}
                >
                  <Text
                    style={[
                      styles.visibilityChoiceText,
                      noteVisibility === 'public' ? styles.visibilityChoiceTextActive : null,
                    ]}
                  >
                    공개
                  </Text>
                </Pressable>
              </View>

              {composer === 'quote' ? (
                <View style={styles.composerBox}>
                  <TextInput
                    multiline
                    onChangeText={setQuoteText}
                    placeholder="마음에 남은 문장"
                    placeholderTextColor="#9A927F"
                    style={[styles.input, styles.quoteInput]}
                    value={quoteText}
                  />
                  <TextInput
                    onChangeText={setPageLabel}
                    placeholder="페이지 또는 챕터"
                    placeholderTextColor="#9A927F"
                    style={styles.input}
                    value={pageLabel}
                  />
                  <TextInput
                    multiline
                    onChangeText={setQuoteBody}
                    placeholder="이 문장이 왜 남았나요?"
                    placeholderTextColor="#9A927F"
                    style={[styles.input, styles.bodyInput]}
                    value={quoteBody}
                  />
                  <Pressable disabled={isSavingNote} onPress={saveQuoteNote} style={styles.primaryAction}>
                    {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>문장 저장</Text>}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.composerBox}>
                  <Pressable onPress={pickPhoto} style={styles.photoPicker}>
                    {photoAsset?.uri ? (
                      <Image resizeMode="cover" source={{ uri: photoAsset.uri }} style={styles.photoPreview} />
                    ) : (
                      <>
                        <Text style={styles.photoPickerIcon}>＋</Text>
                        <Text style={styles.photoPickerText}>사진 선택</Text>
                      </>
                    )}
                  </Pressable>
                  <TextInput
                    multiline
                    onChangeText={setPhotoBody}
                    placeholder="사진과 함께 남길 생각"
                    placeholderTextColor="#9A927F"
                    style={[styles.input, styles.bodyInput]}
                    value={photoBody}
                  />
                  <Pressable disabled={isSavingNote} onPress={savePhotoNote} style={styles.primaryAction}>
                    {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>사진 메모 저장</Text>}
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.timelinePanel}>
              <Text style={styles.sectionTitle}>쌓인 기록</Text>
              <View style={styles.timelineList}>
                {notes.length === 0 ? (
                  <Text style={styles.emptyNotes}>아직 남긴 기록이 없습니다. 첫 문장이나 사진을 남겨보세요.</Text>
                ) : null}
                {notes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <View style={styles.noteHead}>
                      <Text style={styles.noteKind}>{note.kind === 'quote' ? '문장' : '사진'}</Text>
                      <Text style={styles.noteVisibility}>{note.visibility === 'public' ? '공개' : '비공개'}</Text>
                    </View>
                    {note.mediaUrl ? (
                      <Image resizeMode="cover" source={{ uri: note.mediaUrl }} style={styles.noteImage} />
                    ) : null}
                    {note.quoteText ? <Text style={styles.noteQuote}>“{note.quoteText}”</Text> : null}
                    {note.pageLabel ? <Text style={styles.notePage}>{note.pageLabel}</Text> : null}
                    {note.body ? <Text style={styles.noteBody}>{note.body}</Text> : null}
                  </View>
                ))}
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
  visibilityButton: {
    backgroundColor: 'rgba(247,241,229,0.12)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  visibilityText: {
    color: 'rgba(247,241,229,0.86)',
    fontSize: 12,
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
  noteCount: {
    color: '#116653',
    fontSize: 22,
    fontWeight: '900',
  },
  composerTabs: {
    backgroundColor: '#E8DEC9',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
    padding: 5,
  },
  composerTab: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  composerTabActive: {
    backgroundColor: '#103D2B',
  },
  composerTabText: {
    color: '#5B675F',
    fontSize: 14,
    fontWeight: '900',
  },
  composerTabTextActive: {
    color: '#FFFFFF',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  visibilityChoice: {
    alignItems: 'center',
    backgroundColor: '#ECE4D4',
    borderRadius: 16,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  visibilityChoiceActive: {
    backgroundColor: '#D8BE88',
  },
  visibilityChoiceText: {
    color: '#6E786F',
    fontSize: 12,
    fontWeight: '900',
  },
  visibilityChoiceTextActive: {
    color: '#103D2B',
  },
  composerBox: {
    gap: 10,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFF9EE',
    borderRadius: 18,
    color: '#14251B',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  quoteInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  bodyInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  photoPicker: {
    alignItems: 'center',
    backgroundColor: '#E8DEC9',
    borderRadius: 22,
    height: 174,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPickerIcon: {
    color: '#103D2B',
    fontSize: 34,
    fontWeight: '900',
  },
  photoPickerText: {
    color: '#5B675F',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  photoPreview: {
    height: '100%',
    width: '100%',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  timelinePanel: {
    marginTop: 20,
  },
  timelineList: {
    gap: 10,
    marginTop: 12,
  },
  emptyNotes: {
    color: '#69756D',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  noteItem: {
    backgroundColor: '#F8F3E9',
    borderRadius: 22,
    padding: 16,
  },
  noteHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteKind: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
  },
  noteVisibility: {
    color: '#9A8D78',
    fontSize: 11,
    fontWeight: '900',
  },
  noteImage: {
    borderRadius: 18,
    height: 210,
    marginTop: 12,
    width: '100%',
  },
  noteQuote: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 12,
  },
  notePage: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  noteBody: {
    color: '#5B675F',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 8,
  },
});
