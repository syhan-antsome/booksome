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
  type ReadingLifeBook,
  type ReadingLifeNote,
  type ReadingVisibility,
  type UpdateReadingLifeBookInput,
  updateReadingLifeBook,
} from '../../src/services/reading-life';
import { uploadImageAsset } from '../../src/services/media';

const shuttleGrooves = Array.from({ length: 32 }, (_, index) => index);
const shuttleVisualPeriod = 28;
const shuttlePixelsPerPage = 1.5;

type ComposerMode = 'closed' | 'choice' | 'text' | 'photo';
type NoteSortDirection = 'desc' | 'asc';

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
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerMode>('closed');
  const [noteText, setNoteText] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [currentPageInput, setCurrentPageInput] = useState('');
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const [isShuttleDragging, setIsShuttleDragging] = useState(false);
  const [isShuttleUnlocked, setIsShuttleUnlocked] = useState(false);
  const [shuttleDeltaPage, setShuttleDeltaPage] = useState(0);
  const [undoProgress, setUndoProgress] = useState<{ fromPage: number; toPage: number } | null>(null);
  const shuttleDraftPageRef = useRef<number | null>(null);
  const displayCurrentPageRef = useRef(0);
  const savePageProgressRef = useRef<(nextCurrentPage?: number) => void>(() => {});
  const shuttleDidMoveRef = useRef(false);
  const shuttleStartPageRef = useRef(0);
  const shuttleStartTouchXRef = useRef(0);
  const shuttleVisualOffset = useRef(new Animated.Value(0)).current;
  const undoProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuttleUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [photoBody, setPhotoBody] = useState('');
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [noteVisibility, setNoteVisibility] = useState<ReadingVisibility>('private');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteSortDirection, setNoteSortDirection] = useState<NoteSortDirection>('desc');

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
      setComposer('choice');
      return;
    }

    if (activeSection === 'quote') {
      setComposer('text');
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

  const totalPageValue = parsePositiveInteger(totalPagesInput);
  const currentPageValue = parseNonNegativeInteger(currentPageInput) ?? 0;
  const displayCurrentPage = totalPageValue ? Math.min(totalPageValue, Math.max(0, currentPageValue)) : book?.currentPage ?? 0;
  const displayProgressPercent = totalPageValue
    ? calculateReadingProgressPercent(displayCurrentPage, totalPageValue)
    : book?.progressPercent ?? 0;
  const visibleNotes = useMemo(() => {
    const query = noteSearchQuery.trim().toLowerCase();
    const filteredNotes = query
      ? notes.filter((note) => {
          const searchableText = [
            note.quoteText,
            note.body,
            note.pageLabel,
            note.currentPageSnapshot > 0 ? `${note.currentPageSnapshot}쪽` : null,
            note.progressPercentSnapshot > 0 ? `${note.progressPercentSnapshot}%` : null,
            note.kind === 'photo' ? '사진' : note.quoteText ? '문장' : '글',
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchableText.includes(query);
        })
      : notes;

    return [...filteredNotes].sort((firstNote, secondNote) => {
      const firstTime = new Date(firstNote.createdAt).getTime();
      const secondTime = new Date(secondNote.createdAt).getTime();
      return noteSortDirection === 'desc' ? secondTime - firstTime : firstTime - secondTime;
    });
  }, [noteSearchQuery, noteSortDirection, notes]);
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
    const nextStatus = progressPercent >= 100 ? 'finished' : 'reading';

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

  useEffect(
    () => () => {
      if (undoProgressTimerRef.current) clearTimeout(undoProgressTimerRef.current);
      if (shuttleUnlockTimerRef.current) clearTimeout(shuttleUnlockTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setIsShuttleUnlocked(false);
    if (shuttleUnlockTimerRef.current) {
      clearTimeout(shuttleUnlockTimerRef.current);
      shuttleUnlockTimerRef.current = null;
    }
  }, [book?.id, totalPageValue]);

  const lockShuttle = useCallback(() => {
    if (shuttleUnlockTimerRef.current) {
      clearTimeout(shuttleUnlockTimerRef.current);
      shuttleUnlockTimerRef.current = null;
    }
    setIsShuttleUnlocked(false);
  }, []);

  const unlockShuttle = useCallback(() => {
    if (!totalPageValue) return;

    if (shuttleUnlockTimerRef.current) clearTimeout(shuttleUnlockTimerRef.current);
    setIsShuttleUnlocked(true);
    setErrorMessage(null);
    shuttleUnlockTimerRef.current = setTimeout(() => {
      setIsShuttleUnlocked(false);
      shuttleUnlockTimerRef.current = null;
    }, 7000);
  }, [totalPageValue]);

  const showUndoProgress = useCallback((fromPage: number, toPage: number) => {
    if (fromPage === toPage) return;

    if (undoProgressTimerRef.current) clearTimeout(undoProgressTimerRef.current);
    setUndoProgress({ fromPage, toPage });
    undoProgressTimerRef.current = setTimeout(() => {
      setUndoProgress(null);
      undoProgressTimerRef.current = null;
    }, 5000);
  }, []);

  const undoShuttleProgress = useCallback(() => {
    if (!undoProgress) return;

    if (undoProgressTimerRef.current) clearTimeout(undoProgressTimerRef.current);
    undoProgressTimerRef.current = null;
    setUndoProgress(null);
    setCurrentPageInput(String(undoProgress.fromPage));
    setErrorMessage(null);
    savePageProgressRef.current(undoProgress.fromPage);
  }, [undoProgress]);

  const beginShuttleDrag = useCallback((touchX: number) => {
    shuttleDraftPageRef.current = null;
    shuttleDidMoveRef.current = false;
    shuttleStartPageRef.current = displayCurrentPageRef.current;
    shuttleStartTouchXRef.current = touchX;
    setIsShuttleDragging(true);
    setShuttleDeltaPage(0);
    setUndoProgress(null);
    if (undoProgressTimerRef.current) {
      clearTimeout(undoProgressTimerRef.current);
      undoProgressTimerRef.current = null;
    }
    if (shuttleUnlockTimerRef.current) {
      clearTimeout(shuttleUnlockTimerRef.current);
      shuttleUnlockTimerRef.current = null;
    }
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
      setShuttleDeltaPage(nextPage - shuttleStartPageRef.current);
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

      setIsShuttleDragging(false);
      setShuttleDeltaPage(0);
      lockShuttle();

      if (shuttleDidMoveRef.current && nextPage !== null && nextPage !== shuttleStartPageRef.current) {
        showUndoProgress(shuttleStartPageRef.current, nextPage);
        savePageProgressRef.current(nextPage);
      }
    },
    [lockShuttle, shuttleVisualOffset, showUndoProgress, updateDraftPageFromShuttle],
  );

  const shuttleResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(totalPageValue && isShuttleUnlocked),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Boolean(totalPageValue) &&
          isShuttleUnlocked &&
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
    [beginShuttleDrag, finishShuttleDrag, isShuttleUnlocked, totalPageValue, updateDraftPageFromShuttle],
  );

  const openComposerChoice = () => {
    setComposer((current) => (current === 'choice' ? 'closed' : 'choice'));
    setErrorMessage(null);
  };

  const toggleSearch = () => {
    if (isSearchOpen) setNoteSearchQuery('');
    setIsSearchOpen((current) => !current);
  };

  const openTextComposer = () => {
    setComposer('text');
    setNoteText('');
    setPhotoBody('');
    setPhotoAsset(null);
    setPageLabel('');
    setErrorMessage(null);
  };

  const openPhotoComposer = (asset: ImagePicker.ImagePickerAsset) => {
    setComposer('photo');
    setPhotoAsset(asset);
    setPhotoBody('');
    setNoteText('');
    setPageLabel('');
    setErrorMessage(null);
  };

  const useCurrentPositionForNote = () => {
    if (displayCurrentPage <= 0) {
      setErrorMessage('현재 읽은 페이지가 아직 없습니다.');
      return;
    }

    setPageLabel(String(displayCurrentPage));
    setErrorMessage(null);
  };

  const getOptionalNotePage = () => {
    const hasPageLabel = pageLabel.replace(/[^0-9]/g, '').length > 0;

    if (!hasPageLabel) return null;

    const notePage = parsePositiveInteger(pageLabel);

    if (notePage === null) {
      setErrorMessage('기록 페이지는 1쪽 이상으로 입력해주세요.');
      return undefined;
    }

    if (totalPageValue && notePage > totalPageValue) {
      setErrorMessage('기록한 페이지는 마지막 페이지보다 클 수 없습니다.');
      return undefined;
    }

    return notePage;
  };

  const saveTextNote = async () => {
    if (!session?.user.id || !bookId || !book) return;

    const notePage = getOptionalNotePage();
    if (typeof notePage === 'undefined') return;

    if (!noteText.trim()) {
      setErrorMessage('남길 글을 입력해주세요.');
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const note = await createReadingLifeNote({
        readingBookId: bookId,
        profileId: session.user.id,
        kind: 'quote',
        body: noteText.trim(),
        pageLabel: notePage === null ? null : String(notePage),
        currentPageSnapshot: displayCurrentPage,
        progressPercentSnapshot: displayProgressPercent,
        totalPagesSnapshot: totalPageValue,
        visibility: noteVisibility,
      });
      setNotes((current) => [note, ...current]);
      setNoteText('');
      setPageLabel('');
      setComposer('closed');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '글 기록을 저장하지 못했습니다.'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('카메라 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled && result.assets[0]) {
      openPhotoComposer(result.assets[0]);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled && result.assets[0]) {
      openPhotoComposer(result.assets[0]);
    }
  };

  const savePhotoNote = async () => {
    if (!session?.user.id || !bookId || !photoAsset?.uri) {
      setErrorMessage('사진 기록에 남길 이미지를 선택해주세요.');
      return;
    }

    const notePage = getOptionalNotePage();
    if (typeof notePage === 'undefined') return;

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
        body: photoBody.trim() || null,
        pageLabel: notePage === null ? null : String(notePage),
        currentPageSnapshot: displayCurrentPage,
        progressPercentSnapshot: displayProgressPercent,
        totalPagesSnapshot: totalPageValue,
        mediaPath: uploaded.objectPath,
        mediaUrl: uploaded.mediaUrl,
        visibility: noteVisibility,
      });
      setNotes((current) => [note, ...current]);
      setPhotoBody('');
      setPhotoAsset(null);
      setPageLabel('');
      setComposer('closed');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '사진 기록을 저장하지 못했습니다.'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const pageInputField = (
    <View style={styles.notePageField}>
      <View style={styles.notePageHeader}>
        <Text style={styles.notePageFieldLabel}>기록 페이지</Text>
        <Pressable onPress={useCurrentPositionForNote} style={styles.notePageUseCurrentButton}>
          <Text style={styles.notePageUseCurrentText}>현재 위치 넣기</Text>
        </Pressable>
      </View>
      <View style={styles.notePageInputRow}>
        <TextInput
          keyboardType="number-pad"
          onChangeText={(value) => setPageLabel(value.replace(/[^0-9]/g, ''))}
          placeholder="선택"
          placeholderTextColor="#9A927F"
          style={styles.notePageInput}
          value={pageLabel}
        />
        <Text style={styles.notePageUnit}>쪽</Text>
      </View>
      <Text style={styles.notePageHint}>
        비워도 저장됩니다. 저장 순간의 현재 읽은 위치는 자동으로 함께 남습니다.
      </Text>
    </View>
  );

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
                {totalPageValue ? (
                  <View style={styles.pageReadout}>
                    <Text style={styles.currentPageValue}>{displayCurrentPage}</Text>
                    <Text style={styles.totalPageValue}>/ {totalPageValue}쪽</Text>
                  </View>
                ) : (
                  <Text style={styles.heroBottomPage}>페이지 미설정</Text>
                )}
                <View style={styles.heroBottomProgress}>
                  <Text style={styles.heroBottomValue}>{displayProgressPercent}%</Text>
                  <Text style={styles.heroBottomLabel}>읽음</Text>
                </View>
              </View>

              <View style={styles.progressPanel}>
                {totalPageValue ? (
                  <View
                    accessibilityLabel="현재 읽은 페이지 조절"
                    style={styles.jogShuttleTouch}
                    {...shuttleResponder.panHandlers}
                  >
                    {isShuttleDragging ? (
                      <View style={styles.shuttleDeltaRow}>
                        <Text style={styles.shuttlePreviousText}>이전 {shuttleStartPageRef.current}쪽</Text>
                        {shuttleDeltaPage !== 0 ? (
                          <Text style={styles.shuttleDeltaText}>
                            {shuttleDeltaPage > 0 ? '+' : ''}
                            {shuttleDeltaPage}쪽
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
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
                          colors={['rgba(27,28,25,0.72)', 'rgba(27,28,25,0.22)', 'rgba(27,28,25,0)']}
                          pointerEvents="none"
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={[styles.jogShuttleEdgeShade, styles.jogShuttleEdgeShadeLeft]}
                        />
                        <LinearGradient
                          colors={['rgba(27,28,25,0)', 'rgba(27,28,25,0.22)', 'rgba(27,28,25,0.72)']}
                          pointerEvents="none"
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={[styles.jogShuttleEdgeShade, styles.jogShuttleEdgeShadeRight]}
                        />
                      </View>
                    </View>
                    {!isShuttleUnlocked && !isShuttleDragging ? (
                      <Pressable
                        accessibilityLabel="조그셔틀 잠금 해제"
                        onPress={unlockShuttle}
                        style={styles.shuttleGuard}
                      >
                        <LinearGradient
                          colors={['rgba(7,20,15,0.36)', 'rgba(7,20,15,0.2)', 'rgba(247,241,229,0.18)']}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={styles.shuttleGuardSurface}
                        >
                          <Text style={styles.shuttleGuardTitle}>읽은 페이지를 바꾸려면</Text>
                          <Text style={styles.shuttleGuardText}>한 번 터치한 뒤 조그셔틀을 이용하세요</Text>
                        </LinearGradient>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.pageSetupPanel}>
                    <View style={styles.pageField}>
                      <Text style={styles.pageFieldLabel}>마지막</Text>
                      <TextInput
                        keyboardType="number-pad"
                        onChangeText={(value) => setTotalPagesInput(value.replace(/[^0-9]/g, ''))}
                        placeholder="312"
                        placeholderTextColor="rgba(247,241,229,0.42)"
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
            </View>

            <View style={styles.memoPanel}>
              <View style={styles.memoToolbar}>
                <Pressable onPress={openComposerChoice} style={styles.writeButton}>
                  <Text style={styles.writeButtonText}>✎</Text>
                </Pressable>
                <View style={styles.memoTools}>
                  <Pressable
                    onPress={toggleSearch}
                    style={[styles.memoToolButton, isSearchOpen ? styles.memoToolButtonActive : null]}
                  >
                    <Text style={[styles.memoToolText, isSearchOpen ? styles.memoToolTextActive : null]}>찾기</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setNoteSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
                    style={styles.memoToolButton}
                  >
                    <Text style={styles.memoToolText}>{noteSortDirection === 'desc' ? '최신순' : '오래된순'}</Text>
                  </Pressable>
                </View>
              </View>

              {isSearchOpen ? (
                <TextInput
                  onChangeText={setNoteSearchQuery}
                  placeholder="문장, 메모, 페이지 검색"
                  placeholderTextColor="#9A927F"
                  style={styles.searchInput}
                  value={noteSearchQuery}
                />
              ) : null}

              {composer !== 'closed' ? (
                <View style={styles.composerBubble}>
                  {composer === 'choice' ? (
                    <View style={styles.captureChoices}>
                      <Pressable onPress={takePhoto} style={styles.captureChoice}>
                        <Text style={styles.captureChoiceTitle}>카메라</Text>
                        <Text style={styles.captureChoiceText}>지금 찍기</Text>
                      </Pressable>
                      <Pressable onPress={pickPhoto} style={styles.captureChoice}>
                        <Text style={styles.captureChoiceTitle}>갤러리</Text>
                        <Text style={styles.captureChoiceText}>사진 고르기</Text>
                      </Pressable>
                      <Pressable onPress={openTextComposer} style={styles.captureChoice}>
                        <Text style={styles.captureChoiceTitle}>글</Text>
                        <Text style={styles.captureChoiceText}>문장과 생각</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {composer === 'text' ? (
                    <View style={styles.composerBox}>
                      {pageInputField}
                      <TextInput
                        multiline
                        onChangeText={setNoteText}
                        placeholder="남겨두고 싶은 문장이나 생각"
                        placeholderTextColor="#9A927F"
                        style={[styles.input, styles.bodyInput]}
                        value={noteText}
                      />
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
                      <Pressable disabled={isSavingNote} onPress={saveTextNote} style={styles.primaryAction}>
                        {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>남기기</Text>}
                      </Pressable>
                    </View>
                  ) : null}

                  {composer === 'photo' ? (
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
                      {pageInputField}
                      <TextInput
                        multiline
                        onChangeText={setPhotoBody}
                        placeholder="사진과 함께 남길 생각"
                        placeholderTextColor="#9A927F"
                        style={[styles.input, styles.bodyInput]}
                        value={photoBody}
                      />
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
                      <Pressable disabled={isSavingNote} onPress={savePhotoNote} style={styles.primaryAction}>
                        {isSavingNote ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>남기기</Text>}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.noteStream}>
                {notes.length === 0 ? (
                  <View style={styles.emptyNotesBubble}>
                    <Text style={styles.emptyNotes}>아직 남긴 기록이 없습니다.</Text>
                  </View>
                ) : null}
                {notes.length > 0 && visibleNotes.length === 0 ? (
                  <View style={styles.emptyNotesBubble}>
                    <Text style={styles.emptyNotes}>검색된 기록이 없습니다.</Text>
                  </View>
                ) : null}
                {visibleNotes.map((note) => (
                  <View key={note.id} style={[styles.noteItem, note.kind === 'photo' ? styles.noteItemPhoto : null]}>
                    <View style={styles.noteHead}>
                      {note.pageLabel ? (
                        <View style={styles.notePageBadge}>
                          <Text style={styles.notePageBadgeText}>{note.pageLabel}쪽</Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      <Text style={styles.noteVisibility}>
                        {[formatNoteDate(note.createdAt), formatNoteProgressSnapshot(note), note.visibility === 'public' ? '공개' : '비공개']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {note.mediaUrl ? (
                      <Image resizeMode="cover" source={{ uri: note.mediaUrl }} style={styles.noteImage} />
                    ) : null}
                    {note.quoteText ? <Text style={styles.noteQuote}>“{note.quoteText}”</Text> : null}
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
      {undoProgress ? (
        <View style={styles.undoToast}>
          <Text style={styles.undoToastText}>{undoProgress.toPage}쪽으로 기록했어요</Text>
          <Pressable onPress={undoShuttleProgress} style={styles.undoToastButton}>
            <Text style={styles.undoToastButtonText}>되돌리기</Text>
          </Pressable>
        </View>
      ) : null}
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

function formatNoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatNoteProgressSnapshot(note: ReadingLifeNote) {
  if (note.totalPagesSnapshot && note.currentPageSnapshot > 0) {
    return `당시 ${note.currentPageSnapshot}/${note.totalPagesSnapshot}쪽`;
  }

  if (note.currentPageSnapshot > 0) {
    return `당시 ${note.currentPageSnapshot}쪽`;
  }

  if (note.progressPercentSnapshot > 0) {
    return `당시 ${note.progressPercentSnapshot}%`;
  }

  return '';
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
  heroBottomValue: {
    color: '#D8BE88',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  heroBottomLabel: {
    color: 'rgba(247,241,229,0.54)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  heroBottomPage: {
    color: 'rgba(247,241,229,0.76)',
    fontSize: 14,
    fontWeight: '800',
  },
  pageReadout: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 5,
  },
  currentPageValue: {
    color: '#F7F1E5',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  totalPageValue: {
    color: 'rgba(247,241,229,0.62)',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 22,
    paddingBottom: 5,
  },
  progressPanel: {
    backgroundColor: 'rgba(4,18,13,0.35)',
    borderColor: 'rgba(247,241,229,0.1)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  jogShuttleTouch: {
    justifyContent: 'center',
    minHeight: 60,
    position: 'relative',
  },
  shuttleDeltaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
    paddingHorizontal: 4,
  },
  shuttlePreviousText: {
    color: 'rgba(247,241,229,0.6)',
    fontSize: 11,
    fontWeight: '800',
  },
  shuttleDeltaText: {
    color: '#D8BE88',
    fontSize: 13,
    fontWeight: '900',
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
    width: 168,
  },
  jogShuttleEdgeShadeLeft: {
    left: 0,
  },
  jogShuttleEdgeShadeRight: {
    right: 0,
  },
  shuttleGuard: {
    alignItems: 'stretch',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5,
  },
  shuttleGuardSurface: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
    minHeight: 52,
    paddingHorizontal: 12,
    shadowColor: '#11150F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  shuttleGuardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.32)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shuttleGuardText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    color: 'rgba(247,241,229,0.66)',
    fontSize: 11,
    fontWeight: '800',
  },
  pageInput: {
    borderBottomColor: 'rgba(216,190,136,0.78)',
    borderBottomWidth: 2,
    color: '#F7F1E5',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    paddingBottom: 4,
    paddingTop: 2,
  },
  pageProgressAction: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 17,
    height: 36,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  pageProgressActionText: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  memoPanel: {
    marginTop: 22,
    paddingBottom: 8,
  },
  memoToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  writeButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderColor: 'rgba(216,190,136,0.34)',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#102519',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 56,
  },
  writeButtonText: {
    color: '#D8BE88',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  memoTools: {
    flexDirection: 'row',
    gap: 8,
  },
  memoToolButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,241,229,0.72)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  memoToolButtonActive: {
    backgroundColor: '#D8BE88',
  },
  memoToolText: {
    color: '#4E5B53',
    fontSize: 12,
    fontWeight: '900',
  },
  memoToolTextActive: {
    color: '#103D2B',
  },
  searchInput: {
    backgroundColor: 'rgba(247,241,229,0.78)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 19,
    borderWidth: 1,
    color: '#14251B',
    fontSize: 14,
    fontWeight: '800',
    height: 48,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  composerBubble: {
    backgroundColor: 'rgba(247,241,229,0.72)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  captureChoices: {
    flexDirection: 'row',
    gap: 9,
  },
  captureChoice: {
    backgroundColor: '#EFE7D7',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  captureChoiceTitle: {
    color: '#103D2B',
    fontSize: 15,
    fontWeight: '900',
  },
  captureChoiceText: {
    color: '#6D766F',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 6,
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
  notePageField: {
    backgroundColor: 'rgba(16,61,43,0.06)',
    borderColor: 'rgba(16,61,43,0.1)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notePageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notePageFieldLabel: {
    color: '#6D766F',
    fontSize: 11,
    fontWeight: '900',
  },
  notePageUseCurrentButton: {
    backgroundColor: 'rgba(16,61,43,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notePageUseCurrentText: {
    color: '#103D2B',
    fontSize: 11,
    fontWeight: '900',
  },
  notePageInputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  notePageInput: {
    color: '#103D2B',
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    padding: 0,
  },
  notePageUnit: {
    color: '#6D766F',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 23,
    paddingBottom: 3,
  },
  notePageHint: {
    color: '#6D766F',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 6,
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
    gap: 14,
    marginTop: 20,
  },
  emptyNotes: {
    color: '#69756D',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
  },
  emptyNotesBubble: {
    backgroundColor: 'rgba(247,241,229,0.68)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noteItem: {
    backgroundColor: 'rgba(247,241,229,0.92)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#213728',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  noteItemPhoto: {
    backgroundColor: 'rgba(248,244,235,0.96)',
    borderColor: 'rgba(143,106,66,0.12)',
  },
  noteHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteVisibility: {
    color: '#9A8D78',
    fontSize: 11,
    fontWeight: '900',
  },
  noteImage: {
    borderRadius: 20,
    height: 224,
    marginTop: 14,
    width: '100%',
  },
  noteQuote: {
    color: '#26372B',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 14,
  },
  notePageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(216,190,136,0.32)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  notePageBadgeText: {
    color: '#6F5530',
    fontSize: 11,
    fontWeight: '900',
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
  undoToast: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.96)',
    borderColor: 'rgba(216,190,136,0.34)',
    borderRadius: 22,
    borderWidth: 1,
    bottom: 108,
    elevation: 10,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    position: 'absolute',
    right: 20,
    shadowColor: '#102519',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    zIndex: 30,
  },
  undoToastText: {
    color: '#F7F1E5',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  undoToastButton: {
    backgroundColor: '#D8BE88',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  undoToastButtonText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
});
