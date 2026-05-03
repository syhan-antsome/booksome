import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  type PanResponderGestureState,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import {
  calculateReadingProgressPercent,
  createReadingLifeNote,
  deleteReadingLifeBook,
  getReadingLifeBook,
  listReadingLifeNotes,
  setFeaturedReadingLifeBook,
  type ReadingBookStatus,
  type ReadingLifeBook,
  type ReadingLifeNote,
  type ReadingNoteKind,
  type ReadingVisibility,
  type UpdateReadingLifeBookInput,
  updateReadingLifeBook,
} from '../../src/services/reading-life';
import { uploadImageAsset } from '../../src/services/media';

const statusOptions: Array<{ value: ReadingBookStatus; label: string }> = [
  { value: 'reading', label: '읽는 중' },
  { value: 'want_to_read', label: '읽고 싶음' },
  { value: 'finished', label: '완독' },
  { value: 'paused', label: '잠시 멈춤' },
];
const shuttleGrooves = Array.from({ length: 32 }, (_, index) => index);
const shuttleVisualPeriod = 28;
const shuttlePixelsPerPage = 1.5;

const getGestureStartX = (event: GestureResponderEvent, gestureState: PanResponderGestureState) =>
  gestureState.x0 || event.nativeEvent.pageX || 0;

const getGestureCurrentX = (event: GestureResponderEvent, gestureState: PanResponderGestureState) =>
  gestureState.moveX || event.nativeEvent.pageX || gestureState.x0 || 0;

const getShuttleVisualOffset = (deltaX: number) => {
  const shifted = ((deltaX + shuttleVisualPeriod / 2) % shuttleVisualPeriod + shuttleVisualPeriod) % shuttleVisualPeriod;
  return shifted - shuttleVisualPeriod / 2;
};

export default function ReadingLifeBookScreen() {
  const { id, section } = useLocalSearchParams<{ id?: string; section?: string }>();
  const { session } = useAuth();
  const [book, setBook] = useState<ReadingLifeBook | null>(null);
  const [notes, setNotes] = useState<ReadingLifeNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [isFeaturingBook, setIsFeaturingBook] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [composer, setComposer] = useState<ReadingNoteKind>('quote');
  const [quoteText, setQuoteText] = useState('');
  const [quoteBody, setQuoteBody] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [currentPageInput, setCurrentPageInput] = useState('');
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const shuttleDraftPageRef = useRef<number | null>(null);
  const displayCurrentPageRef = useRef(0);
  const savePageProgressRef = useRef<(nextCurrentPage?: number) => void>(() => {});
  const shuttleDidMoveRef = useRef(false);
  const shuttleStartPageRef = useRef(0);
  const shuttleStartTouchXRef = useRef(0);
  const shuttleVisualOffset = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    if (!book) {
      setCurrentPageInput('');
      setTotalPagesInput('');
      return;
    }

    setCurrentPageInput(book.currentPage > 0 ? String(book.currentPage) : '');
    setTotalPagesInput(book.totalPages ? String(book.totalPages) : '');
  }, [book?.id, book?.currentPage, book?.totalPages]);

  const statusLabel = useMemo(() => {
    return statusOptions.find((option) => option.value === book?.status)?.label ?? '읽는 중';
  }, [book?.status]);
  const totalPageValue = parsePositiveInteger(totalPagesInput);
  const currentPageValue = parseNonNegativeInteger(currentPageInput) ?? 0;
  const displayCurrentPage = totalPageValue ? Math.min(totalPageValue, Math.max(0, currentPageValue)) : book?.currentPage ?? 0;
  const displayProgressPercent = totalPageValue
    ? calculateReadingProgressPercent(displayCurrentPage, totalPageValue)
    : book?.progressPercent ?? 0;
  displayCurrentPageRef.current = displayCurrentPage;

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

  const deleteBook = async () => {
    if (!session?.user.id || !bookId) return;

    setIsDeletingBook(true);
    setErrorMessage(null);

    try {
      await deleteReadingLifeBook(session.user.id, bookId);
      router.replace('/reading-life');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '이 책을 삭제하지 못했습니다.'));
    } finally {
      setIsDeletingBook(false);
    }
  };

  const confirmDeleteBook = () => {
    if (!book) return;

    Alert.alert(
      '이 책을 삭제할까요?',
      `"${book.title}"에 남긴 내용이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          onPress: () => void deleteBook(),
          style: 'destructive',
        },
      ],
    );
  };

  const setFeaturedBook = async () => {
    if (!session?.user.id || !bookId || !book || book.pinnedAt) return;

    setIsFeaturingBook(true);
    setErrorMessage(null);

    try {
      const nextBook = await setFeaturedReadingLifeBook(session.user.id, bookId);
      setBook(nextBook);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '지금 읽는 책으로 설정하지 못했습니다.'));
    } finally {
      setIsFeaturingBook(false);
    }
  };

  const savePageProgress = useCallback((nextCurrentPage?: number) => {
    if (!book) return;

    const currentPage =
      typeof nextCurrentPage === 'number' ? nextCurrentPage : parseNonNegativeInteger(currentPageInput);
    const totalPages = parsePositiveInteger(totalPagesInput);

    if (totalPages === null) {
      setErrorMessage('책의 마지막 페이지 번호를 입력해주세요.');
      return;
    }

    if (currentPage === null) {
      setErrorMessage('현재 읽은 페이지 번호를 입력해주세요.');
      return;
    }

    if (currentPage > totalPages) {
      setErrorMessage('현재 페이지는 마지막 페이지보다 클 수 없습니다.');
      return;
    }

    const progressPercent = calculateReadingProgressPercent(currentPage, totalPages);
    const nextStatus = progressPercent >= 100 ? 'finished' : book.status === 'finished' ? 'reading' : book.status;

    void saveBook({
      currentPage,
      progressPercent,
      status: nextStatus,
      totalPages,
    });
  }, [book, currentPageInput, saveBook, totalPagesInput]);

  useEffect(() => {
    savePageProgressRef.current = savePageProgress;
  }, [savePageProgress]);

  const beginShuttleDrag = useCallback((touchX: number) => {
    shuttleDraftPageRef.current = null;
    shuttleDidMoveRef.current = false;
    shuttleStartPageRef.current = displayCurrentPageRef.current;
    shuttleStartTouchXRef.current = touchX;
    shuttleVisualOffset.stopAnimation();
    shuttleVisualOffset.setValue(0);
  }, [shuttleVisualOffset]);

  const getPageFromShuttleDelta = useCallback(
    (deltaX: number) => {
      if (!totalPageValue) return null;

      const deltaPages = Math.round(deltaX / shuttlePixelsPerPage);
      return Math.min(totalPageValue, Math.max(0, shuttleStartPageRef.current + deltaPages));
    },
    [totalPageValue],
  );

  const updateDraftPageFromShuttle = useCallback(
    (touchX: number) => {
      const deltaX = touchX - shuttleStartTouchXRef.current;
      shuttleVisualOffset.setValue(getShuttleVisualOffset(deltaX));

      if (Math.abs(deltaX) < 1) return shuttleDraftPageRef.current;

      shuttleDidMoveRef.current = true;
      const nextPage = getPageFromShuttleDelta(deltaX);
      if (nextPage === null) return null;

      shuttleDraftPageRef.current = nextPage;
      setCurrentPageInput(String(nextPage));
      setErrorMessage(null);
      return nextPage;
    },
    [getPageFromShuttleDelta, shuttleVisualOffset],
  );

  const finishShuttleDrag = useCallback(
    (touchX: number) => {
      const nextPage = shuttleDidMoveRef.current ? updateDraftPageFromShuttle(touchX) : shuttleDraftPageRef.current;

      Animated.spring(shuttleVisualOffset, {
        damping: 16,
        mass: 0.45,
        stiffness: 190,
        toValue: 0,
        useNativeDriver: true,
      }).start();

      if (shuttleDidMoveRef.current && nextPage !== null) savePageProgressRef.current(nextPage);
    },
    [shuttleVisualOffset, updateDraftPageFromShuttle],
  );

  const shuttleResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(totalPageValue),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Boolean(totalPageValue) &&
          Math.abs(gestureState.moveX - gestureState.x0) > 3 &&
          Math.abs(gestureState.moveX - gestureState.x0) > Math.abs(gestureState.moveY - gestureState.y0),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event, gestureState) => {
          beginShuttleDrag(getGestureStartX(event, gestureState));
        },
        onPanResponderMove: (event, gestureState) => {
          updateDraftPageFromShuttle(getGestureCurrentX(event, gestureState));
        },
        onPanResponderRelease: (event, gestureState) => {
          finishShuttleDrag(getGestureCurrentX(event, gestureState));
        },
        onPanResponderTerminate: (event, gestureState) => {
          finishShuttleDrag(getGestureCurrentX(event, gestureState));
        },
      }),
    [beginShuttleDrag, finishShuttleDrag, totalPageValue, updateDraftPageFromShuttle],
  );

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

      const notePage = parsePageLabel(pageLabel);
      if (book.totalPages && notePage !== null && notePage <= book.totalPages && notePage > book.currentPage) {
        const progressPercent = calculateReadingProgressPercent(notePage, book.totalPages);
        const nextBook = await updateReadingLifeBook(session.user.id, bookId, {
          currentPage: notePage,
          progressPercent,
          status: progressPercent >= 100 ? 'finished' : book.status === 'finished' ? 'reading' : book.status,
          totalPages: book.totalPages,
        });
        setBook(nextBook);
      }

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
          title="나의 책"
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
                <View style={styles.heroBottomActions}>
                  <Pressable
                    disabled={isSaving}
                    onPress={() => saveBook({ visibility: book.visibility === 'public' ? 'private' : 'public' })}
                    style={styles.visibilityButton}
                  >
                    <Text style={styles.visibilityText}>{book.visibility === 'public' ? '공개 기록' : '나만 보기'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={isFeaturingBook || !!book.pinnedAt}
                    onPress={setFeaturedBook}
                    style={[styles.featuredButton, book.pinnedAt ? styles.featuredButtonActive : null]}
                  >
                    {isFeaturingBook ? (
                      <ActivityIndicator color="#103D2B" />
                    ) : (
                      <Text style={[styles.featuredButtonText, book.pinnedAt ? styles.featuredButtonTextActive : null]}>
                        {book.pinnedAt ? '지금 읽는 책' : '지금 읽기로 설정'}
                      </Text>
                    )}
                  </Pressable>
                </View>
                <View style={styles.heroBottomProgress}>
                  <Text style={styles.heroBottomValue}>{displayProgressPercent}%</Text>
                  <Text style={styles.heroBottomPage}>
                    {totalPageValue ? `${displayCurrentPage} / ${totalPageValue}쪽` : '페이지 미설정'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.progressPanel}>
              {totalPageValue ? (
                <View
                  accessibilityLabel="현재 읽은 페이지 조절"
                  style={styles.jogShuttleTouch}
                  {...shuttleResponder.panHandlers}
                >
                  <View style={styles.jogShuttle}>
                    <View style={styles.jogShuttleRidge}>
                      <Animated.View
                        style={[
                          styles.jogShuttleGrooveTrack,
                          { transform: [{ translateX: shuttleVisualOffset }] },
                        ]}
                      >
                        {shuttleGrooves.map((groove) => (
                          <View
                            key={groove}
                            style={[
                              styles.jogShuttleGroove,
                              groove % 2 === 0 ? styles.jogShuttleGrooveDeep : null,
                            ]}
                          />
                        ))}
                      </Animated.View>
                      <LinearGradient
                        colors={['rgba(42,43,38,0.5)', 'rgba(42,43,38,0.08)', 'rgba(42,43,38,0)']}
                        pointerEvents="none"
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.jogShuttleEdgeShade, styles.jogShuttleEdgeShadeLeft]}
                      />
                      <LinearGradient
                        colors={['rgba(42,43,38,0)', 'rgba(42,43,38,0.08)', 'rgba(42,43,38,0.5)']}
                        pointerEvents="none"
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.jogShuttleEdgeShade, styles.jogShuttleEdgeShadeRight]}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.pageSetupPanel}>
                  <View style={styles.pageField}>
                    <Text style={styles.pageFieldLabel}>마지막</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => setTotalPagesInput(value.replace(/[^0-9]/g, ''))}
                      placeholder="312"
                      placeholderTextColor="#A19989"
                      returnKeyType="done"
                      style={styles.pageInput}
                      value={totalPagesInput}
                    />
                  </View>
                  <Pressable disabled={isSaving} onPress={() => savePageProgress(0)} style={styles.pageProgressAction}>
                    {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.pageProgressActionText}>설정</Text>}
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.memoPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>이 책과 나눈 기록</Text>
                <Text style={styles.noteCount}>{notes.length}</Text>
              </View>

              <View style={styles.composerBubble}>
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
                      placeholder="짧은 생각"
                      placeholderTextColor="#9A927F"
                      style={[styles.input, styles.bodyInput]}
                      value={quoteBody}
                    />
                    <Pressable disabled={isSavingNote} onPress={saveQuoteNote} style={styles.primaryAction}>
                      {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>남기기</Text>}
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
                      {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>남기기</Text>}
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.noteStream}>
                {notes.length === 0 ? (
                  <View style={styles.emptyNotesBubble}>
                    <Text style={styles.emptyNotes}>아직 남긴 기록이 없습니다.</Text>
                  </View>
                ) : null}
                {notes.map((note) => (
                  <View key={note.id} style={[styles.noteItem, note.kind === 'photo' ? styles.noteItemPhoto : null]}>
                    <View style={styles.noteHead}>
                      <Text style={styles.noteKind}>{note.kind === 'quote' ? '문장' : '사진'}</Text>
                      <Text style={styles.noteVisibility}>
                        {formatNoteDate(note.createdAt)} · {note.visibility === 'public' ? '공개' : '비공개'}
                      </Text>
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

            <View style={styles.deletePanel}>
              <View style={styles.deleteCopy}>
                <Text style={styles.deleteTitle}>이 책 삭제</Text>
                <Text style={styles.deleteText}>되돌릴 수 없으니 신중히 선택해주세요.</Text>
              </View>
              <Pressable
                disabled={isDeletingBook}
                onPress={confirmDeleteBook}
                style={[styles.deleteButton, isDeletingBook ? styles.deleteButtonDisabled : null]}
              >
                {isDeletingBook ? <ActivityIndicator color="#7D2F22" /> : <Text style={styles.deleteButtonText}>삭제</Text>}
              </Pressable>
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

function parsePositiveInteger(value: string) {
  const normalizedValue = value.replace(/[^0-9]/g, '');
  if (!normalizedValue) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseNonNegativeInteger(value: string) {
  const normalizedValue = value.replace(/[^0-9]/g, '');
  if (!normalizedValue) return 0;

  const parsedValue = Number(normalizedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function parsePageLabel(value: string) {
  const matchedValue = value.match(/\d+/)?.[0];
  if (!matchedValue) return null;

  const parsedValue = Number(matchedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function formatNoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    fontWeight: '800',
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
  heroBottomProgress: {
    alignItems: 'flex-end',
  },
  heroBottomActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
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
  featuredButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(216,190,136,0.18)',
    borderColor: 'rgba(216,190,136,0.34)',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  featuredButtonActive: {
    backgroundColor: '#D8BE88',
  },
  featuredButtonText: {
    color: 'rgba(247,241,229,0.9)',
    fontSize: 12,
    fontWeight: '900',
  },
  featuredButtonTextActive: {
    color: '#103D2B',
  },
  heroBottomValue: {
    color: '#D8BE88',
    fontSize: 26,
    fontWeight: '900',
  },
  heroBottomPage: {
    color: 'rgba(247,241,229,0.7)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  progressPanel: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    paddingBottom: 18,
    paddingTop: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#26372B',
    fontSize: 20,
    fontWeight: '800',
  },
  jogShuttleTouch: {
    minHeight: 62,
    justifyContent: 'center',
  },
  jogShuttle: {
    backgroundColor: '#A7A28F',
    borderColor: '#4C5048',
    borderRadius: 3,
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    padding: 5,
    shadowColor: '#14251B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  jogShuttleRidge: {
    backgroundColor: '#D0CCB9',
    borderColor: '#5C6057',
    borderRadius: 2,
    borderWidth: 1,
    height: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  jogShuttleGrooveTrack: {
    bottom: 0,
    flexDirection: 'row',
    left: -28,
    position: 'absolute',
    right: -28,
    top: 0,
  },
  jogShuttleGroove: {
    backgroundColor: '#A8A693',
    borderLeftColor: 'rgba(255,255,255,0.42)',
    borderLeftWidth: 1,
    borderRightColor: 'rgba(55,57,50,0.42)',
    borderRightWidth: 1,
    flex: 1,
    marginVertical: 3,
  },
  jogShuttleGrooveDeep: {
    backgroundColor: '#858679',
  },
  jogShuttleEdgeShade: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 42,
  },
  jogShuttleEdgeShadeLeft: {
    left: 0,
  },
  jogShuttleEdgeShadeRight: {
    right: 0,
  },
  pageSetupPanel: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
  pageField: {
    flex: 1,
  },
  pageFieldLabel: {
    color: '#7F725E',
    fontSize: 11,
    fontWeight: '800',
  },
  pageInput: {
    borderBottomColor: '#103D2B',
    borderBottomWidth: 2,
    color: '#14251B',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    paddingBottom: 4,
    paddingTop: 2,
  },
  pageProgressAction: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 17,
    height: 36,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  pageProgressActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  memoPanel: {
    marginTop: 18,
    paddingBottom: 8,
    paddingTop: 20,
  },
  noteCount: {
    color: '#116653',
    fontSize: 22,
    fontWeight: '900',
  },
  composerBubble: {
    backgroundColor: 'rgba(247, 241, 229, 0.74)',
    borderColor: 'rgba(16,61,43,0.1)',
    borderRadius: 24,
    borderTopLeftRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  composerTabs: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  composerTab: {
    alignItems: 'center',
    flex: 1,
    height: 42,
    justifyContent: 'center',
  },
  composerTabActive: {
    borderBottomColor: '#103D2B',
    borderBottomWidth: 3,
  },
  composerTabText: {
    color: '#5B675F',
    fontSize: 14,
    fontWeight: '900',
  },
  composerTabTextActive: {
    color: '#103D2B',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
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
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(16,61,43,0.16)',
    borderBottomWidth: 1,
    color: '#14251B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    minHeight: 48,
    paddingHorizontal: 0,
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
    borderRadius: 999,
    height: 46,
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
  noteStream: {
    gap: 12,
    marginTop: 18,
  },
  emptyNotes: {
    color: '#69756D',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  emptyNotesBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247,241,229,0.72)',
    borderRadius: 22,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  noteItem: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247,241,229,0.86)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 24,
    borderTopLeftRadius: 7,
    borderWidth: 1,
    maxWidth: '94%',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noteItemPhoto: {
    backgroundColor: 'rgba(232,239,219,0.94)',
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
    color: '#26372B',
    fontSize: 18,
    fontWeight: '800',
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
  deletePanel: {
    alignItems: 'center',
    borderTopColor: 'rgba(125,47,34,0.18)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 22,
    paddingTop: 18,
  },
  deleteCopy: {
    flex: 1,
  },
  deleteTitle: {
    color: '#7D2F22',
    fontSize: 16,
    fontWeight: '800',
  },
  deleteText: {
    color: '#7D6D60',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: 'rgba(125,47,34,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 14,
  },
  deleteButtonDisabled: {
    opacity: 0.56,
  },
  deleteButtonText: {
    color: '#7D2F22',
    fontSize: 13,
    fontWeight: '900',
  },
});
