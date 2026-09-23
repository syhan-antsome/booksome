import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { ReadingProgress } from '../../src/components/reading-progress';
import { ReadingMemory } from '../../src/components/reading-memory';
import { useReadingDialog } from '../../src/components/reading-dialog';
import { booksomeColors, booksomeLayout } from '../../src/theme/booksome';
import { useAuth } from '../../src/providers/auth-provider';
import {
  createReadingLifeNote,
  deleteReadingLifeBook,
  deleteReadingLifeNote,
  getReadingLifeBook,
  listReadingLifeNotes,
  type ReadingLifeBook,
  type ReadingLifeNote,
  type ReadingVisibility,
  type UpdateReadingLifeBookInput,
  updateReadingLifeBook,
  updateReadingLifeNote,
} from '../../src/services/reading-life';
import { uploadImageAsset } from '../../src/services/media';
import {
  consumeReadingImageCropResult,
  createReadingImageCropRequest,
  type ReadingImageCropAsset,
  type ReadingImageCropTarget,
} from '../../src/state/reading-image-crop';

const highlightNotePrefix = '__booksome_highlight_v2__:';
const legacyHighlightNotePrefix = '__booksome_highlight_v1__:';
const highlightStrokeSize = 22;
const highlightSvgViewBoxSize = 1000;
const highlightStrokeOpacity = 0.34;
const highlightLegacyRectOpacity = 0.16;
const highlightPenColors = [
  { id: 'mint', label: '민트', hex: '#14E7D0' },
  { id: 'lime', label: '라임', hex: '#B9FF45' },
  { id: 'pink', label: '핑크', hex: '#FF6AB7' },
] as const;
const defaultHighlightPenColor = highlightPenColors[0].hex;
type HighlightPenColor = (typeof highlightPenColors)[number]['hex'];

type ComposerMode = 'closed' | 'text' | 'photo' | 'highlight';
type NoteSortDirection = 'desc' | 'asc';
type HighlightPoint = {
  x: number;
  y: number;
};
type HighlightRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type HighlightStroke = {
  color: HighlightPenColor;
  id: string;
  points: HighlightPoint[];
  size: number;
};
type HighlightNoteData = {
  aspectRatio: number | null;
  rects: HighlightRect[];
  strokes: HighlightStroke[];
  text: string | null;
};
type ComposerImageAsset = ReadingImageCropAsset;
type ImageComposerTarget = ReadingImageCropTarget;

export default function ReadingLifeBookScreen() {
  const { id, section, welcome } = useLocalSearchParams<{ id?: string; section?: string; welcome?: string }>();
  const { session } = useAuth();
  const { show: showDialog, dialog } = useReadingDialog();
  const [book, setBook] = useState<ReadingLifeBook | null>(null);
  const [notes, setNotes] = useState<ReadingLifeNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(welcome === '1');
  const scrollRef = useRef<ScrollView>(null);
  const noteSavePending = useRef(false);
  const [composer, setComposer] = useState<ComposerMode>('closed');
  const [noteText, setNoteText] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [photoBody, setPhotoBody] = useState('');
  const [photoAsset, setPhotoAsset] = useState<ComposerImageAsset | null>(null);
  const [photoAssetChanged, setPhotoAssetChanged] = useState(false);
  const [highlightAsset, setHighlightAsset] = useState<ComposerImageAsset | null>(null);
  const [highlightAssetChanged, setHighlightAssetChanged] = useState(false);
  const [highlightStrokes, setHighlightStrokes] = useState<HighlightStroke[]>([]);
  const [draftHighlightStroke, setDraftHighlightStroke] = useState<HighlightStroke | null>(null);
  const [highlightPenColor, setHighlightPenColor] = useState<HighlightPenColor>(defaultHighlightPenColor);
  const [highlightCanvasSize, setHighlightCanvasSize] = useState({ width: 0, height: 0 });
  const [isHighlightDrawing, setIsHighlightDrawing] = useState(false);
  const highlightDraftStrokeRef = useRef<HighlightStroke | null>(null);
  const pendingCropTokenRef = useRef<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    highlightData: HighlightNoteData;
    uri: string;
  } | null>(null);
  const [noteVisibility, setNoteVisibility] = useState<ReadingVisibility>('private');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteSortDirection, setNoteSortDirection] = useState<NoteSortDirection>('desc');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const bookId = Array.isArray(id) ? id[0] : id;
  const activeSection = Array.isArray(section) ? section[0] : section;
  const highlightAssetAspectRatio = getAssetAspectRatio(highlightAsset);

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
      setComposer('closed');
      return;
    }

    if (activeSection === 'quote') {
      setComposer('text');
    }
  }, [activeSection]);

  const totalPageValue = book?.totalPages ?? null;
  const displayCurrentPage = book?.currentPage ?? 0;
  const displayProgressPercent = book?.progressPercent ?? 0;
  const visibleNotes = useMemo(() => {
    const query = noteSearchQuery.trim().toLowerCase();
    const filteredNotes = query
      ? notes.filter((note) => {
          const searchableText = [
            note.quoteText,
            getVisibleNoteBody(note.body),
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

  const saveBook = async (input: UpdateReadingLifeBookInput) => {
    if (!session?.user.id || !bookId) return false;

    setErrorMessage(null);

    try {
      const nextBook = await updateReadingLifeBook(session.user.id, bookId, input);
      setBook(nextBook);
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '변경 내용을 저장하지 못했습니다.'));
      return false;
    }
  };

  const deleteBook = async () => {
    if (!session?.user.id || !bookId) return;

    setIsDeletingBook(true);
    setErrorMessage(null);

    try {
      await deleteReadingLifeBook(session.user.id, bookId);
      router.replace('/library');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '이 책을 삭제하지 못했습니다.'));
    } finally {
      setIsDeletingBook(false);
    }
  };

  const confirmDeleteBook = () => {
    if (!book) return;

    showDialog(
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

  const resetComposerState = useCallback(() => {
    setComposer('closed');
    setEditingNoteId(null);
    setNoteText('');
    setPhotoBody('');
    setPhotoAsset(null);
    setPhotoAssetChanged(false);
    setHighlightAsset(null);
    setHighlightAssetChanged(false);
    setHighlightStrokes([]);
    setDraftHighlightStroke(null);
    setHighlightPenColor(defaultHighlightPenColor);
    highlightDraftStrokeRef.current = null;
    pendingCropTokenRef.current = null;
    setPageLabel('');
    setNoteVisibility('private');
    setErrorMessage(null);
    setIsHighlightDrawing(false);
  }, []);

  const hasComposerDraft = useCallback(() => {
    if (editingNoteId) return true;
    if (composer === 'text') return Boolean(noteText.trim() || pageLabel.trim());
    if (composer === 'photo') return Boolean(photoAsset || photoBody.trim() || pageLabel.trim());
    if (composer === 'highlight') {
      return Boolean(
        highlightAsset ||
        highlightStrokes.length > 0 ||
        draftHighlightStroke ||
        pageLabel.trim() ||
        photoBody.trim()
      );
    }

    return false;
  }, [composer, draftHighlightStroke, editingNoteId, highlightAsset, highlightStrokes.length, noteText, pageLabel, photoAsset, photoBody]);

  const closeComposerWithConfirm = useCallback(() => {
    if (noteSavePending.current) return;
    if (!hasComposerDraft()) {
      resetComposerState();
      return;
    }

    showDialog('작성 중인 기록을 닫을까요?', '저장하지 않은 내용은 사라집니다.', [
      { text: '계속 작성', style: 'cancel' },
      { text: '닫기', style: 'destructive', onPress: resetComposerState },
    ]);
  }, [hasComposerDraft, resetComposerState, showDialog]);

  const openComposerAfterConfirm = useCallback(
    (openNextComposer: () => void) => {
      if (composer !== 'closed' && hasComposerDraft()) {
        showDialog('작성 중인 기록을 바꿀까요?', '저장하지 않은 내용은 사라집니다.', [
          { text: '계속 작성', style: 'cancel' },
          {
            text: '바꾸기',
            style: 'destructive',
            onPress: () => {
              resetComposerState();
              openNextComposer();
            },
          },
        ]);
        return;
      }

      openNextComposer();
    },
    [composer, hasComposerDraft, resetComposerState, showDialog],
  );

  const openTextComposer = () => {
    openComposerAfterConfirm(() => {
      resetComposerState();
      setComposer('text');
      setErrorMessage(null);
    });
  };

  const openPhotoComposer = (asset: ComposerImageAsset, changed = true) => {
    setComposer('photo');
    setEditingNoteId(null);
    setPhotoAsset(asset);
    setPhotoAssetChanged(changed);
    setHighlightAsset(null);
    setHighlightAssetChanged(false);
    setHighlightStrokes([]);
    setDraftHighlightStroke(null);
    setHighlightPenColor(defaultHighlightPenColor);
    highlightDraftStrokeRef.current = null;
    setPhotoBody('');
    setNoteText('');
    setPageLabel('');
    setNoteVisibility('private');
    setErrorMessage(null);
  };

  const toggleSearch = () => {
    if (isSearchOpen) setNoteSearchQuery('');
    setIsSearchOpen((current) => !current);
  };

  const openHighlightComposer = (asset: ComposerImageAsset, changed = true) => {
    setComposer('highlight');
    setEditingNoteId(null);
    setHighlightAsset(asset);
    setHighlightAssetChanged(changed);
    setHighlightStrokes([]);
    setDraftHighlightStroke(null);
    setHighlightPenColor(defaultHighlightPenColor);
    highlightDraftStrokeRef.current = null;
    setPhotoAsset(null);
    setPhotoAssetChanged(false);
    setPhotoBody('');
    setNoteText('');
    setPageLabel('');
    setNoteVisibility('private');
    setErrorMessage(null);
  };

  const replacePhotoComposerAsset = (asset: ComposerImageAsset) => {
    setPhotoAsset(asset);
    setPhotoAssetChanged(true);
    setErrorMessage(null);
  };

  const replaceHighlightComposerAsset = (asset: ComposerImageAsset) => {
    setHighlightAsset(asset);
    setHighlightAssetChanged(true);
    setHighlightStrokes([]);
    setDraftHighlightStroke(null);
    setHighlightPenColor(defaultHighlightPenColor);
    highlightDraftStrokeRef.current = null;
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

  const changeNotePageLabel = (value: string) => {
    const normalizedValue = value.replace(/[^0-9]/g, '');

    if (!normalizedValue) {
      setPageLabel('');
      setErrorMessage(null);
      return;
    }

    const parsedValue = Number(normalizedValue);
    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
      setPageLabel('');
      return;
    }

    const nextPage = totalPageValue ? Math.min(parsedValue, totalPageValue) : parsedValue;
    setPageLabel(String(nextPage));

    if (totalPageValue && parsedValue > totalPageValue) {
      setErrorMessage(`마지막 페이지는 ${totalPageValue}쪽입니다.`);
      return;
    }

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

  const beginImageCrop = (target: ImageComposerTarget, asset: ComposerImageAsset, shouldReplace = false) => {
    if (!bookId) return;

    const request = createReadingImageCropRequest({
      asset,
      bookId,
      shouldReplace: shouldReplace || Boolean(editingNoteId),
      target,
    });
    pendingCropTokenRef.current = request.token;
    setComposer('closed');
    setErrorMessage(null);
    router.push({
      pathname: '/reading-life/image-crop',
      params: { token: request.token },
    });
  };

  const applySelectedImageAsset = (target: ImageComposerTarget, asset: ComposerImageAsset, shouldReplace = false) => {
    beginImageCrop(target, asset, shouldReplace);
  };

  const chooseComposerImage = async (
    target: ImageComposerTarget,
    source: 'camera' | 'library',
    shouldReplace = false,
  ) => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setErrorMessage('카메라 권한이 필요합니다.');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: false,
      quality: target === 'highlight' ? 0.82 : 0.86,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]) {
      applySelectedImageAsset(target, result.assets[0], shouldReplace);
    }
  };

  const pickHighlightPhoto = (shouldReplace = false) =>
    chooseComposerImage('highlight', 'library', shouldReplace);

  const showImageSourceOptions = (target: ImageComposerTarget, shouldReplace = false) => {
    showDialog('사진 + 글', '사진을 어디에서 가져올까요?', [
      {
        text: '카메라',
        onPress: () => {
          void chooseComposerImage(target, 'camera', shouldReplace);
        },
      },
      {
        text: '갤러리',
        onPress: () => {
          void chooseComposerImage(target, 'library', shouldReplace);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const openPhotoRecordOptions = () => {
    openComposerAfterConfirm(() => {
      resetComposerState();
      setErrorMessage(null);
      showImageSourceOptions('highlight');
    });
  };

  const setCroppedComposerAsset = useCallback((target: ImageComposerTarget, asset: ComposerImageAsset, shouldReplace = false) => {
    if (target === 'highlight') {
      if (shouldReplace || editingNoteId) {
        replaceHighlightComposerAsset(asset);
        setComposer('highlight');
      } else {
        openHighlightComposer(asset);
      }
      return;
    }

    if (shouldReplace || editingNoteId) {
      replacePhotoComposerAsset(asset);
      setComposer('photo');
    } else {
      openPhotoComposer(asset);
    }
  }, [editingNoteId]);

  useFocusEffect(
    useCallback(() => {
      const result = consumeReadingImageCropResult(pendingCropTokenRef.current);

      if (!result) return;

      pendingCropTokenRef.current = null;
      setCroppedComposerAsset(result.target, result.asset, result.shouldReplace);
    }, [setCroppedComposerAsset]),
  );

  const getHighlightPoint = useCallback(
    (event: GestureResponderEvent) => {
      const width = Math.max(1, highlightCanvasSize.width);
      const height = Math.max(1, highlightCanvasSize.height);
      const x = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
      const y = Math.min(1, Math.max(0, event.nativeEvent.locationY / height));
      return { x, y };
    },
    [highlightCanvasSize.height, highlightCanvasSize.width],
  );

  const updateDraftHighlight = useCallback((point: HighlightPoint) => {
    const draftStroke = highlightDraftStrokeRef.current;
    if (!draftStroke) return;

    const nextStroke = addPointToHighlightStroke(draftStroke, point);
    highlightDraftStrokeRef.current = nextStroke;
    setDraftHighlightStroke(nextStroke);
  }, []);

  const finishDraftHighlight = useCallback((point: HighlightPoint) => {
    const draftStroke = highlightDraftStrokeRef.current;
    highlightDraftStrokeRef.current = null;
    setIsHighlightDrawing(false);

    if (!draftStroke) {
      setDraftHighlightStroke(null);
      return;
    }

    const nextStroke = addPointToHighlightStroke(draftStroke, point);
    setDraftHighlightStroke(null);

    if (nextStroke.points.length < 2) {
      return;
    }

    setHighlightStrokes((current) => [...current, nextStroke]);
  }, []);

  const highlightResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          composer === 'highlight' && Boolean(highlightAsset),
        onMoveShouldSetPanResponder: () =>
          composer === 'highlight' && Boolean(highlightAsset),
        onStartShouldSetPanResponderCapture: () =>
          composer === 'highlight' && Boolean(highlightAsset),
        onMoveShouldSetPanResponderCapture: () =>
          composer === 'highlight' && Boolean(highlightAsset),
        onShouldBlockNativeResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const point = getHighlightPoint(event);
          const stroke = createHighlightStroke(point, highlightPenColor);
          highlightDraftStrokeRef.current = stroke;
          setDraftHighlightStroke(stroke);
          setIsHighlightDrawing(true);
        },
        onPanResponderMove: (event) => {
          updateDraftHighlight(getHighlightPoint(event));
        },
        onPanResponderRelease: (event) => {
          finishDraftHighlight(getHighlightPoint(event));
        },
        onPanResponderTerminate: (event) => {
          finishDraftHighlight(getHighlightPoint(event));
        },
      }),
    [composer, finishDraftHighlight, getHighlightPoint, highlightAsset, highlightPenColor, updateDraftHighlight],
  );

  const undoHighlightStroke = () => {
    setHighlightStrokes((current) => current.slice(0, -1));
  };

  const clearHighlightStrokes = () => {
    setHighlightStrokes([]);
    setDraftHighlightStroke(null);
    setHighlightPenColor(defaultHighlightPenColor);
    highlightDraftStrokeRef.current = null;
  };

  const saveHighlightNote = async () => {
    if (!session?.user.id || !bookId || !highlightAsset?.uri) {
      setErrorMessage('기록에 남길 사진을 선택해주세요.');
      return;
    }

    const notePage = getOptionalNotePage();
    if (typeof notePage === 'undefined') return;

    if (noteSavePending.current) return;
    noteSavePending.current = true;
    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const existingNote = editingNoteId ? notes.find((note) => note.id === editingNoteId) : null;
      const uploadAsset = highlightAsset;
      const nextHighlightStrokes = highlightStrokes;
      const uploaded =
        !editingNoteId || highlightAssetChanged
          ? await uploadImageAsset({
              kind: 'post-media',
              entityId: `reading-${bookId}`,
              uri: uploadAsset.uri,
              ownerId: session.user.id,
              mimeType: uploadAsset.mimeType,
              width: uploadAsset.width,
              height: uploadAsset.height,
              fileName: uploadAsset.fileName,
            })
          : null;
      const input = {
        body: createHighlightNoteBody({
          aspectRatio: getAssetAspectRatio(uploadAsset),
          strokes: nextHighlightStrokes,
          text: photoBody.trim() || null,
        }),
        pageLabel: notePage === null ? null : String(notePage),
        currentPageSnapshot: existingNote?.currentPageSnapshot ?? displayCurrentPage,
        progressPercentSnapshot: existingNote?.progressPercentSnapshot ?? displayProgressPercent,
        totalPagesSnapshot: existingNote?.totalPagesSnapshot ?? totalPageValue,
        mediaPath: uploaded?.objectPath ?? existingNote?.mediaPath ?? null,
        mediaUrl: uploaded?.mediaUrl ?? existingNote?.mediaUrl ?? null,
        visibility: noteVisibility,
      };

      if (editingNoteId) {
        const note = await updateReadingLifeNote(session.user.id, editingNoteId, input);
        setNotes((current) => current.map((currentNote) => (currentNote.id === note.id ? note : currentNote)));
      } else {
        const note = await createReadingLifeNote({
          readingBookId: bookId,
          profileId: session.user.id,
          kind: 'photo',
          ...input,
        });
        setNotes((current) => [note, ...current]);
      }
      setSavedMessage(editingNoteId ? '기록을 수정했어요.' : notes.length === 0 ? '첫 기록이 생겼어요. 이 책에 나의 생각이 남았습니다.' : '기록을 남겼어요. 내 서재에서 언제든 다시 볼 수 있어요.');
      setShowWelcome(false);
      resetComposerState();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '사진 기록을 저장하지 못했습니다.'));
    } finally {
      noteSavePending.current = false;
      setIsSavingNote(false);
    }
  };

  const saveTextNote = async () => {
    if (!session?.user.id || !bookId || !book) return;

    const notePage = getOptionalNotePage();
    if (typeof notePage === 'undefined') return;

    if (!noteText.trim()) {
      setErrorMessage('남길 글을 입력해주세요.');
      return;
    }

    if (noteSavePending.current) return;
    noteSavePending.current = true;
    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const existingNote = editingNoteId ? notes.find((note) => note.id === editingNoteId) : null;
      const input = {
        body: noteText.trim(),
        pageLabel: notePage === null ? null : String(notePage),
        currentPageSnapshot: existingNote?.currentPageSnapshot ?? displayCurrentPage,
        progressPercentSnapshot: existingNote?.progressPercentSnapshot ?? displayProgressPercent,
        totalPagesSnapshot: existingNote?.totalPagesSnapshot ?? totalPageValue,
        visibility: noteVisibility,
      };

      if (editingNoteId) {
        const note = await updateReadingLifeNote(session.user.id, editingNoteId, input);
        setNotes((current) => current.map((currentNote) => (currentNote.id === note.id ? note : currentNote)));
      } else {
        const note = await createReadingLifeNote({
          readingBookId: bookId,
          profileId: session.user.id,
          kind: 'quote',
          ...input,
        });
        setNotes((current) => [note, ...current]);
      }
      setSavedMessage(editingNoteId ? '기록을 수정했어요.' : notes.length === 0 ? '첫 기록이 생겼어요. 이 책에 나의 생각이 남았습니다.' : '기록을 남겼어요. 내 서재에서 언제든 다시 볼 수 있어요.');
      setShowWelcome(false);
      resetComposerState();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '글 기록을 저장하지 못했습니다.'));
    } finally {
      noteSavePending.current = false;
      setIsSavingNote(false);
    }
  };

  const pickPhoto = (shouldReplace = false) => chooseComposerImage('photo', 'library', shouldReplace);

  const savePhotoNote = async () => {
    if (!session?.user.id || !bookId || !photoAsset?.uri) {
      setErrorMessage('사진 기록에 남길 이미지를 선택해주세요.');
      return;
    }

    const notePage = getOptionalNotePage();
    if (typeof notePage === 'undefined') return;

    if (noteSavePending.current) return;
    noteSavePending.current = true;
    setIsSavingNote(true);
    setErrorMessage(null);

    try {
      const existingNote = editingNoteId ? notes.find((note) => note.id === editingNoteId) : null;
      const uploadAsset = photoAsset;
      const uploaded =
        !editingNoteId || photoAssetChanged
          ? await uploadImageAsset({
              kind: 'post-media',
              entityId: `reading-${bookId}`,
              uri: uploadAsset.uri,
              ownerId: session.user.id,
              mimeType: uploadAsset.mimeType,
              width: uploadAsset.width,
              height: uploadAsset.height,
              fileName: uploadAsset.fileName,
            })
          : null;
      const input = {
        body: photoBody.trim() || null,
        pageLabel: notePage === null ? null : String(notePage),
        currentPageSnapshot: existingNote?.currentPageSnapshot ?? displayCurrentPage,
        progressPercentSnapshot: existingNote?.progressPercentSnapshot ?? displayProgressPercent,
        totalPagesSnapshot: existingNote?.totalPagesSnapshot ?? totalPageValue,
        mediaPath: uploaded?.objectPath ?? existingNote?.mediaPath ?? null,
        mediaUrl: uploaded?.mediaUrl ?? existingNote?.mediaUrl ?? null,
        visibility: noteVisibility,
      };

      if (editingNoteId) {
        const note = await updateReadingLifeNote(session.user.id, editingNoteId, input);
        setNotes((current) => current.map((currentNote) => (currentNote.id === note.id ? note : currentNote)));
      } else {
        const note = await createReadingLifeNote({
          readingBookId: bookId,
          profileId: session.user.id,
          kind: 'photo',
          ...input,
        });
        setNotes((current) => [note, ...current]);
      }
      setSavedMessage(editingNoteId ? '기록을 수정했어요.' : notes.length === 0 ? '첫 기록이 생겼어요. 이 책에 나의 생각이 남았습니다.' : '기록을 남겼어요. 내 서재에서 언제든 다시 볼 수 있어요.');
      setShowWelcome(false);
      resetComposerState();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '사진 기록을 저장하지 못했습니다.'));
    } finally {
      noteSavePending.current = false;
      setIsSavingNote(false);
    }
  };

  const startEditNote = (note: ReadingLifeNote) => {
    const highlightData = parseHighlightNoteBody(note.body);
    const hasHighlightData = hasHighlightNoteData(highlightData);
    const isAnnotatedPhoto = isHighlightPhotoNoteBody(note.body);

    resetComposerState();
    setEditingNoteId(note.id);
    setNoteVisibility(note.visibility);
    setPageLabel(note.pageLabel ?? '');
    setErrorMessage(null);

    if (note.mediaUrl) {
      const imageAsset: ComposerImageAsset = {
        uri: note.mediaUrl,
        width: highlightData.aspectRatio ? highlightData.aspectRatio * 1000 : null,
        height: highlightData.aspectRatio ? 1000 : null,
        mimeType: 'image/jpeg',
      };

      if (isAnnotatedPhoto || hasHighlightData) {
        setComposer('highlight');
        setHighlightAsset(imageAsset);
        setHighlightAssetChanged(false);
        setHighlightStrokes(highlightData.strokes);
        setHighlightPenColor(highlightData.strokes[0]?.color ?? defaultHighlightPenColor);
        setPhotoBody(highlightData.text ?? '');
        setDraftHighlightStroke(null);
        highlightDraftStrokeRef.current = null;
        return;
      }

      setComposer('photo');
      setPhotoAsset(imageAsset);
      setPhotoAssetChanged(false);
      setPhotoBody(note.body ?? '');
      return;
    }

    setComposer('text');
    setNoteText(getVisibleNoteBody(note.body) ?? note.quoteText ?? '');
  };

  const deleteNote = async (note: ReadingLifeNote) => {
    if (!session?.user.id) return;

    setDeletingNoteId(note.id);
    setErrorMessage(null);

    try {
      await deleteReadingLifeNote(session.user.id, note.id);
      setNotes((current) => current.filter((currentNote) => currentNote.id !== note.id));
      if (editingNoteId === note.id) {
        resetComposerState();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '기록을 삭제하지 못했습니다.'));
    } finally {
      setDeletingNoteId(null);
    }
  };

  const confirmDeleteNote = (note: ReadingLifeNote) => {
    showDialog('이 기록을 삭제할까요?', '삭제한 기록은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteNote(note) },
    ]);
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
          onChangeText={changeNotePageLabel}
          placeholder="선택"
          placeholderTextColor="#9A927F"
          style={styles.notePageInput}
          value={pageLabel}
        />
        <Text style={styles.notePageUnit}>쪽</Text>
      </View>
      <Text style={styles.notePageHint}>비워두면 현재 읽은 위치가 저장됩니다.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        alwaysBounceVertical
        contentContainerStyle={styles.content}
        scrollEnabled={!isHighlightDrawing}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <ScreenHeader title="나의 책" tone="paper" />

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
            {showWelcome && notes.length === 0 ? <View style={styles.welcomePanel}>
              <Text style={styles.welcomeTitle}>내 서재에 담았어요.</Text>
              <Text style={styles.welcomeCopy}>어떤 마음으로 이 책을 펼쳤나요? 한 문장부터 남겨보세요.</Text>
              <Pressable accessibilityRole="button" onPress={openTextComposer} style={styles.welcomeAction}><Text style={styles.welcomeActionText}>첫 기록 남기기</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setShowWelcome(false)} style={styles.laterAction}><Text style={styles.welcomeCopy}>책을 조금 더 읽고 남길게요</Text></Pressable>
            </View> : null}
            {savedMessage ? <View accessibilityLiveRegion="polite" style={styles.savedPanel}><Text style={styles.savedText}>{savedMessage}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/library')} style={styles.laterAction}><Text style={styles.welcomeActionTextDark}>내 서재에서 다시 보기 →</Text></Pressable></View> : null}
            <ReadingProgress book={book} onSave={saveBook} />
            {book.status === 'finished' ? <ReadingMemory book={book} notes={notes} onWrite={openTextComposer} /> : null}

            <View style={styles.memoPanel}>
              <View style={styles.memoHeader}>
                <View>
                  <Text style={styles.memoTitle}>나의 기록</Text>
                  <Text style={styles.memoSubtitle}>{notes.length}개의 기록 조각</Text>
                </View>
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

              <View style={styles.captureDock}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSavingNote}
                  onPress={openPhotoRecordOptions}
                  style={({ pressed }) => [
                    styles.captureAction,
                    styles.captureActionPhoto,
                    pressed ? styles.captureActionPressed : null,
                    isSavingNote ? styles.captureActionDisabled : null,
                  ]}
                >
                  <View style={[styles.captureActionIcon, styles.captureActionIconPhoto]}>
                    <Text style={[styles.captureActionMark, styles.captureActionMarkPhoto]}>◉</Text>
                  </View>
                  <Text style={[styles.captureActionTitle, styles.captureActionTitlePhoto]}>사진 + 글</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={openTextComposer}
                  style={({ pressed }) => [
                    styles.captureAction,
                    styles.captureActionWriting,
                    pressed ? styles.captureActionPressed : null,
                  ]}
                >
                  <View style={[styles.captureActionIcon, styles.captureActionIconWriting]}>
                    <Text style={[styles.captureActionMark, styles.captureActionMarkWriting]}>✎</Text>
                  </View>
                  <Text style={[styles.captureActionTitle, styles.captureActionTitleWriting]}>문장과 생각</Text>
                </Pressable>
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

              <View style={styles.noteStream}>
                {notes.length === 0 ? (
                  <View style={styles.emptyNotesBubble}>
                    <Text style={styles.emptyNotes}>어떤 대목에서 잠시 멈췄나요? 한 문장만 남겨도 좋아요.</Text>
                  </View>
                ) : null}
                {notes.length > 0 && visibleNotes.length === 0 ? (
                  <View style={styles.emptyNotesBubble}>
                    <Text style={styles.emptyNotes}>검색된 기록이 없습니다.</Text>
                  </View>
                ) : null}
                {visibleNotes.map((note, index) => {
                  const pageBadge = formatNotePageBadge(note);
                  const noteHighlightData = parseHighlightNoteBody(note.body);
                  const visibleNoteBody = getVisibleNoteBody(note.body);
                  const hasHighlightData = hasHighlightNoteData(noteHighlightData);
                  const isAnnotatedPhoto = isHighlightPhotoNoteBody(note.body);
                  const shouldRespectPhotoAspect = isAnnotatedPhoto && Boolean(noteHighlightData.aspectRatio);

                  return (
                    <View key={note.id} style={styles.noteTimelineRow}>
                      <View style={styles.noteTimelineRail}>
                        <View style={styles.noteTimelineDot} />
                        {index < visibleNotes.length - 1 ? <View style={styles.noteTimelineLine} /> : null}
                      </View>
                      <View style={[styles.noteItem, note.kind === 'photo' ? styles.noteItemPhoto : null]}>
                        <View style={styles.noteHead}>
                          {pageBadge ? (
                            <View style={styles.notePageBadge}>
                              <Text style={styles.notePageBadgeText}>{pageBadge}</Text>
                            </View>
                          ) : (
                            <View />
                          )}
                          <View style={styles.noteMetaActions}>
                            <Text style={styles.noteVisibility}>
                              {[formatNoteDate(note.createdAt), note.visibility === 'public' ? '공개' : '비공개']
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                            <View style={styles.noteActionRow}>
                              <Pressable onPress={() => startEditNote(note)} style={styles.noteActionButton}>
                                <Text style={styles.noteActionText}>수정</Text>
                              </Pressable>
                              <Pressable
                                disabled={deletingNoteId === note.id}
                                onPress={() => confirmDeleteNote(note)}
                                style={[styles.noteActionButton, styles.noteActionDelete]}
                              >
                                <Text style={[styles.noteActionText, styles.noteActionDeleteText]}>
                                  {deletingNoteId === note.id ? '삭제 중' : '삭제'}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                        {note.mediaUrl ? (
                          <Pressable
                            onPress={() => setPreviewImage({ highlightData: noteHighlightData, uri: note.mediaUrl ?? '' })}
                            style={[
                              styles.noteImageFrame,
                              shouldRespectPhotoAspect
                                ? { aspectRatio: noteHighlightData.aspectRatio ?? 1, height: undefined }
                                : null,
                            ]}
                          >
                            <Image
                              resizeMode={shouldRespectPhotoAspect ? 'contain' : 'cover'}
                              source={{ uri: note.mediaUrl }}
                              style={styles.noteImage}
                            />
                            {hasHighlightData ? <HighlightOverlay data={noteHighlightData} /> : null}
                          </Pressable>
                        ) : null}
                        {note.quoteText ? (
                          <View style={styles.noteQuoteHighlight}>
                            <Text style={styles.noteQuote}>“{note.quoteText}”</Text>
                          </View>
                        ) : null}
                        {visibleNoteBody ? <Text style={styles.noteBody}>{visibleNoteBody}</Text> : null}
                      </View>
                    </View>
                  );
                })}
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

        {session && !isLoading && !book && !errorMessage ? <View style={styles.welcomePanel}><Text style={styles.welcomeTitle}>이 책을 찾을 수 없어요.</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/library')} style={styles.laterAction}><Text style={styles.welcomeActionTextDark}>내 서재로 돌아가기</Text></Pressable></View> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={closeComposerWithConfirm}
        presentationStyle="pageSheet"
        visible={Boolean(book) && composer !== 'closed'}
      >
        <SafeAreaView style={styles.composerModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.composerKeyboardView}
          >
            <View style={styles.composerModalTop}>
              <View>
                <Text style={styles.composerModalEyebrow}>
                  {editingNoteId ? '기록 수정' : book?.title}
                </Text>
                <Text style={styles.composerModalTitle}>
                  {composer === 'highlight'
                      ? '사진 + 글'
                      : composer === 'photo'
                        ? '사진 + 글'
                        : '문장과 생각 남기기'}
                </Text>
              </View>
              <Pressable onPress={closeComposerWithConfirm} style={styles.composerModalClose}>
                <Text style={styles.composerModalCloseText}>닫기</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.composerModalContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isHighlightDrawing}
              showsVerticalScrollIndicator={false}
            >
              {errorMessage ? <Text accessibilityRole="alert" style={styles.errorText}>{errorMessage}</Text> : null}
              {composer === 'text' ? (
                <View style={styles.composerBox}>
                  {pageInputField}
                  <TextInput
                    multiline
                    onChangeText={setNoteText}
                    accessibilityLabel="문장이나 생각"
                    placeholder="기억하고 싶은 문장, 지금 떠오른 생각…"
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
                    {isSavingNote ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionText}>{editingNoteId ? '수정 저장' : '남기기'}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {composer === 'photo' ? (
                <View style={styles.composerBox}>
                  {photoAsset?.uri ? (
                    <Pressable onPress={() => pickPhoto(true)} style={styles.photoPicker}>
                      <Image resizeMode="cover" source={{ uri: photoAsset.uri }} style={styles.photoPreview} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => pickPhoto(true)} style={styles.photoPicker}>
                      <>
                        <Text style={styles.photoPickerIcon}>＋</Text>
                        <Text style={styles.photoPickerText}>사진 선택</Text>
                      </>
                    </Pressable>
                  )}
                  <View style={styles.imageToolRow}>
                    <Pressable onPress={() => chooseComposerImage('photo', 'camera', true)} style={styles.imageToolButton}>
                      <Text style={styles.imageToolText}>다시 찍기</Text>
                    </Pressable>
                    <Pressable onPress={() => pickPhoto(true)} style={styles.imageToolButton}>
                      <Text style={styles.imageToolText}>갤러리</Text>
                    </Pressable>
                  </View>
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
                    {isSavingNote ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionText}>{editingNoteId ? '수정 저장' : '남기기'}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {composer === 'highlight' ? (
                <View style={styles.composerBox}>
                  {highlightAsset?.uri ? (
                    <>
                      <View
                        collapsable={false}
                        onLayout={(event) => setHighlightCanvasSize(event.nativeEvent.layout)}
                        renderToHardwareTextureAndroid
                        style={[
                          styles.highlightEditor,
                          highlightAssetAspectRatio ? { aspectRatio: highlightAssetAspectRatio } : null,
                        ]}
                        {...highlightResponder.panHandlers}
                      >
                        <Image resizeMode="contain" source={{ uri: highlightAsset.uri }} style={styles.highlightEditorImage} />
                        <View
                          pointerEvents="none"
                          style={styles.highlightDrawLayer}
                        >
                          <HighlightOverlay
                            data={{
                              aspectRatio: highlightAssetAspectRatio,
                              rects: [],
                              strokes: [...highlightStrokes, ...(draftHighlightStroke ? [draftHighlightStroke] : [])],
                              text: null,
                            }}
                          />
                        </View>
                      </View>
                      <Text style={styles.highlightGuideText}>
                        사진 위를 손가락으로 쓸면 형광펜처럼 남아요. 칠하지 않고 사진만 저장해도 됩니다.
                      </Text>
                      <View style={styles.highlightColorRow}>
                        <Text style={styles.highlightColorLabel}>색상</Text>
                        <View style={styles.highlightColorChoices}>
                          {highlightPenColors.map((color) => {
                            const isSelected = highlightPenColor === color.hex;

                            return (
                              <Pressable
                                accessibilityLabel={`${color.label} 형광펜`}
                                key={color.id}
                                onPress={() => setHighlightPenColor(color.hex)}
                                style={[
                                  styles.highlightColorChoice,
                                  isSelected ? styles.highlightColorChoiceActive : null,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.highlightColorSwatch,
                                    { backgroundColor: color.hex },
                                  ]}
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  ) : (
                    <Pressable onPress={() => pickHighlightPhoto(true)} style={styles.photoPicker}>
                      <>
                        <Text style={styles.photoPickerIcon}>＋</Text>
                        <Text style={styles.photoPickerText}>사진 선택</Text>
                      </>
                    </Pressable>
                  )}

                  <View style={styles.highlightToolRow}>
                    <Pressable
                      disabled={highlightStrokes.length === 0}
                      onPress={undoHighlightStroke}
                      style={[styles.highlightTool, highlightStrokes.length === 0 ? styles.captureActionDisabled : null]}
                    >
                      <Text style={styles.highlightToolText}>되돌리기</Text>
                    </Pressable>
                    <Pressable
                      disabled={highlightStrokes.length === 0}
                      onPress={clearHighlightStrokes}
                      style={[styles.highlightTool, highlightStrokes.length === 0 ? styles.captureActionDisabled : null]}
                    >
                      <Text style={styles.highlightToolText}>지우기</Text>
                    </Pressable>
                  </View>
                  {pageInputField}
                  <TextInput
                    multiline
                    onChangeText={setPhotoBody}
                    placeholder="사진과 함께 남길 글"
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
                  <Pressable
                    disabled={isSavingNote || !highlightAsset?.uri}
                    onPress={saveHighlightNote}
                    style={[
                      styles.primaryAction,
                      isSavingNote || !highlightAsset?.uri
                        ? styles.captureActionDisabled
                        : null,
                    ]}
                  >
                    {isSavingNote ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryActionText}>{editingNoteId ? '수정 저장' : '사진 저장'}</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
        transparent
        visible={Boolean(previewImage)}
      >
        <SafeAreaView style={styles.imageViewer}>
          <View style={styles.imageViewerTop}>
            <Text style={styles.imageViewerTitle}>기록 보기</Text>
            <Pressable onPress={() => setPreviewImage(null)} style={styles.imageViewerClose}>
              <Text style={styles.imageViewerCloseText}>닫기</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.imageViewerContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
          >
            {previewImage ? (
              <View
                style={[
                  styles.imageViewerFrame,
                  previewImage.highlightData.aspectRatio
                    ? { aspectRatio: previewImage.highlightData.aspectRatio }
                    : null,
                ]}
              >
                <Image resizeMode="contain" source={{ uri: previewImage.uri }} style={styles.imageViewerImage} />
                {hasHighlightNoteData(previewImage.highlightData) ? (
                  <HighlightOverlay data={previewImage.highlightData} />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {dialog}
      <BottomNavigation active="library" />
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

function formatNoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatNotePageBadge(note: ReadingLifeNote) {
  if (note.pageLabel) return `${note.pageLabel}쪽 기록`;
  if (note.currentPageSnapshot > 0) return `${note.currentPageSnapshot}쪽 기록`;
  if (note.progressPercentSnapshot > 0) return `${note.progressPercentSnapshot}% 기록`;

  return '';
}

function createHighlightStroke(point: HighlightPoint, color: HighlightPenColor): HighlightStroke {
  return {
    color,
    id: `stroke-${Date.now()}`,
    points: [point],
    size: highlightStrokeSize,
  };
}

function addPointToHighlightStroke(stroke: HighlightStroke, point: HighlightPoint): HighlightStroke {
  const lastPoint = stroke.points[stroke.points.length - 1];
  if (!lastPoint) {
    return {
      ...stroke,
      points: [point],
    };
  }

  const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
  if (distance < 0.0015) {
    return stroke;
  }

  const steps = Math.max(1, Math.ceil(distance / 0.0045));
  const nextPoints = [...stroke.points];

  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    nextPoints.push({
      x: lastPoint.x + (point.x - lastPoint.x) * ratio,
      y: lastPoint.y + (point.y - lastPoint.y) * ratio,
    });
  }

  return {
    ...stroke,
    points: nextPoints.slice(-1400),
  };
}

function createHighlightNoteBody(data: { aspectRatio: number | null; strokes: HighlightStroke[]; text?: string | null }) {
  return `${highlightNotePrefix}${JSON.stringify(data)}`;
}

function parseHighlightNoteBody(body: string | null): HighlightNoteData {
  if (!body) {
    return emptyHighlightNoteData();
  }

  if (body.startsWith(highlightNotePrefix)) {
    try {
      const payload = JSON.parse(body.slice(highlightNotePrefix.length)) as {
        aspectRatio?: unknown;
        rects?: unknown[];
        strokes?: unknown[];
        text?: unknown;
      };

      return {
        aspectRatio: isPositiveNumber(payload.aspectRatio) ? payload.aspectRatio : null,
        rects: (payload.rects ?? []).filter(isValidHighlightRect),
        strokes: (payload.strokes ?? []).filter(isValidHighlightStroke),
        text: normalizeOptionalText(payload.text),
      };
    } catch {
      return emptyHighlightNoteData();
    }
  }

  if (body.startsWith(legacyHighlightNotePrefix)) {
    try {
      const payload = JSON.parse(body.slice(legacyHighlightNotePrefix.length)) as { rects?: unknown[] };
      return {
        aspectRatio: null,
        rects: (payload.rects ?? []).filter(isValidHighlightRect),
        strokes: [],
        text: null,
      };
    } catch {
      return emptyHighlightNoteData();
    }
  }

  return emptyHighlightNoteData();
}

function emptyHighlightNoteData(): HighlightNoteData {
  return {
    aspectRatio: null,
    rects: [],
    strokes: [],
    text: null,
  };
}

function hasHighlightNoteData(data: HighlightNoteData) {
  return data.rects.length > 0 || data.strokes.length > 0;
}

function isHighlightPhotoNoteBody(body: string | null) {
  return Boolean(
    body?.startsWith(highlightNotePrefix) || body?.startsWith(legacyHighlightNotePrefix),
  );
}

function getVisibleNoteBody(body: string | null) {
  if (!body) return null;
  if (body.startsWith(highlightNotePrefix) || body.startsWith(legacyHighlightNotePrefix)) {
    return parseHighlightNoteBody(body).text;
  }
  return body;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function isValidHighlightRect(value: unknown): value is HighlightRect {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const rect = value as Partial<HighlightRect>;

  return (
    typeof rect.id === 'string' &&
    isNormalizedNumber(rect.x) &&
    isNormalizedNumber(rect.y) &&
    isNormalizedNumber(rect.width) &&
    isNormalizedNumber(rect.height)
  );
}

function isValidHighlightStroke(value: unknown): value is HighlightStroke {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const stroke = value as Partial<HighlightStroke>;

  return (
    typeof stroke.id === 'string' &&
    isHighlightPenColor(stroke.color) &&
    typeof stroke.size === 'number' &&
    Number.isFinite(stroke.size) &&
    stroke.size > 0 &&
    stroke.size <= 40 &&
    Array.isArray(stroke.points) &&
    stroke.points.length > 0 &&
    stroke.points.every(isValidHighlightPoint)
  );
}

function isHighlightPenColor(value: unknown): value is HighlightPenColor {
  return typeof value === 'string' && highlightPenColors.some((color) => color.hex === value);
}

function isValidHighlightPoint(value: unknown): value is HighlightPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const point = value as Partial<HighlightPoint>;
  return isNormalizedNumber(point.x) && isNormalizedNumber(point.y);
}

function isNormalizedNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getAssetAspectRatio(asset: ComposerImageAsset | null) {
  if (!asset?.width || !asset.height || asset.width <= 0 || asset.height <= 0) {
    return null;
  }

  return asset.width / asset.height;
}

function HighlightOverlay({ data }: { data: HighlightNoteData }) {
  return (
    <View pointerEvents="none" style={styles.highlightOverlay}>
      <Svg pointerEvents="none" preserveAspectRatio="none" style={styles.highlightSvg} viewBox="0 0 1000 1000">
        {data.rects.map((rect) => (
          <Rect
            key={rect.id}
            fill={defaultHighlightPenColor}
            height={rect.height * highlightSvgViewBoxSize}
            opacity={highlightLegacyRectOpacity}
            rx={8}
            width={rect.width * highlightSvgViewBoxSize}
            x={rect.x * highlightSvgViewBoxSize}
            y={rect.y * highlightSvgViewBoxSize}
          />
        ))}
        {data.strokes.map((stroke) => {
          const strokePath = getHighlightStrokePath(stroke.points);
          const strokeWidth = Math.max(42, stroke.size * 3.05);

          return strokePath ? (
            <Path
              d={strokePath}
              fill="none"
              key={stroke.id}
              opacity={highlightStrokeOpacity}
              stroke={stroke.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
            />
          ) : null;
        })}
      </Svg>
    </View>
  );
}

function getHighlightStrokePath(points: HighlightPoint[]) {
  if (points.length === 0) return '';

  const [firstPoint, ...restPoints] = points;
  const firstX = firstPoint.x * highlightSvgViewBoxSize;
  const firstY = firstPoint.y * highlightSvgViewBoxSize;

  return restPoints.reduce(
    (path, point) => `${path} L ${point.x * highlightSvgViewBoxSize} ${point.y * highlightSvgViewBoxSize}`,
    `M ${firstX} ${firstY}`,
  );
}

const styles = StyleSheet.create({
  welcomePanel: { backgroundColor: booksomeColors.forestSoft, borderRadius: 12, padding: 22, gap: 14, marginBottom: 22 },
  welcomeTitle: { color: booksomeColors.forest, fontSize: 23, fontWeight: '700' },
  welcomeCopy: { color: booksomeColors.muted, fontSize: 14, lineHeight: 23 },
  welcomeAction: { backgroundColor: booksomeColors.forest, alignItems: 'center', padding: 15, borderRadius: 8 },
  welcomeActionText: { color: booksomeColors.white, fontSize: 15, fontWeight: '700' },
  welcomeActionTextDark: { color: booksomeColors.forest, fontSize: 14, fontWeight: '700' },
  laterAction: { minHeight: 44, justifyContent: 'center' },
  savedPanel: { paddingVertical: 18, gap: 5 },
  savedText: { color: booksomeColors.forest, fontSize: 17, fontWeight: '600', lineHeight: 26 },
  safeArea: {
    backgroundColor: booksomeColors.paper,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: booksomeLayout.maxContentWidth,
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 190,
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
  memoPanel: {
    marginTop: 24,
    paddingBottom: 8,
  },
  memoHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memoTitle: {
    color: '#14251B',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  memoSubtitle: {
    color: '#778171',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 2,
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
  captureDock: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  captureAction: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 78,
    overflow: 'hidden',
    paddingHorizontal: 15,
    paddingVertical: 15,
    position: 'relative',
  },
  captureActionPhoto: {
    backgroundColor: booksomeColors.paperStrong,
    borderColor: booksomeColors.line,
  },
  captureActionWriting: {
    backgroundColor: booksomeColors.forestSoft,
    borderColor: booksomeColors.forestSoft,
  },
  captureActionPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  captureActionGloss: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    height: 4,
    left: 16,
    position: 'absolute',
    right: 16,
    top: 0,
  },
  captureActionDisabled: {
    opacity: 0.52,
  },
  captureActionIcon: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  captureActionIconPhoto: {
    backgroundColor: '#103D2B',
    borderColor: 'rgba(16,61,43,0.28)',
  },
  captureActionIconWriting: {
    backgroundColor: '#103D2B',
    borderColor: 'rgba(16,61,43,0.28)',
  },
  captureActionMark: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 25,
  },
  captureActionMarkPhoto: {
    color: '#FFFFFF',
  },
  captureActionMarkWriting: {
    color: '#FFFFFF',
  },
  captureActionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  captureActionTitlePhoto: {
    color: '#103D2B',
  },
  captureActionTitleWriting: {
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
  composerModal: {
    backgroundColor: booksomeColors.paper,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    flex: 1,
  },
  composerKeyboardView: {
    flex: 1,
  },
  composerModalTop: {
    alignItems: 'center',
    borderBottomColor: 'rgba(16,61,43,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 12,
  },
  composerModalEyebrow: {
    color: '#8B7653',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  composerModalTitle: {
    color: '#14251B',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 2,
  },
  composerModalClose: {
    alignItems: 'center',
    backgroundColor: '#F7F1E5',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  composerModalCloseText: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  composerModalContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 42,
    paddingTop: 18,
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
    minHeight: 156,
    padding: 16,
    backgroundColor: booksomeColors.paperStrong,
    borderColor: booksomeColors.line,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: booksomeColors.forest,
    borderRadius: 10,
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
  imageToolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageToolButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  imageToolText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  highlightEditor: {
    backgroundColor: '#E8DEC9',
    borderRadius: 20,
    minHeight: 220,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  highlightEditorImage: {
    height: '100%',
    width: '100%',
  },
  highlightGuideText: {
    color: '#6D766F',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: -2,
    paddingHorizontal: 2,
  },
  highlightColorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  highlightColorLabel: {
    color: '#6D766F',
    fontSize: 12,
    fontWeight: '900',
  },
  highlightColorChoices: {
    flexDirection: 'row',
    gap: 9,
  },
  highlightColorChoice: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.07)',
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  highlightColorChoiceActive: {
    borderColor: '#103D2B',
    backgroundColor: 'rgba(247,241,229,0.72)',
  },
  highlightColorSwatch: {
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  highlightDrawLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 4,
  },
  highlightOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  highlightSvg: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  highlightToolRow: {
    flexDirection: 'row',
    gap: 8,
  },
  highlightTool: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  highlightToolText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  noteStream: {
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
  noteTimelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  noteTimelineRail: {
    alignItems: 'center',
    width: 18,
  },
  noteTimelineDot: {
    backgroundColor: '#D8BE88',
    borderColor: '#103D2B',
    borderRadius: 999,
    borderWidth: 2,
    height: 13,
    marginTop: 21,
    width: 13,
  },
  noteTimelineLine: {
    backgroundColor: 'rgba(16,61,43,0.16)',
    flex: 1,
    marginTop: 4,
    minHeight: 34,
    width: 2,
  },
  noteItem: {
    backgroundColor: 'rgba(247,241,229,0.92)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    marginBottom: 14,
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
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  noteMetaActions: {
    alignItems: 'flex-end',
    flex: 1,
    gap: 7,
  },
  noteVisibility: {
    color: '#9A8D78',
    fontSize: 11,
    fontWeight: '900',
  },
  noteActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  noteActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  noteActionDelete: {
    backgroundColor: 'rgba(125,47,34,0.08)',
  },
  noteActionText: {
    color: '#103D2B',
    fontSize: 11,
    fontWeight: '900',
  },
  noteActionDeleteText: {
    color: '#7D2F22',
  },
  noteImageFrame: {
    borderRadius: 20,
    height: 224,
    marginTop: 14,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  noteImage: {
    borderRadius: 20,
    height: '100%',
    width: '100%',
  },
  noteQuoteHighlight: {
    backgroundColor: 'rgba(247,208,82,0.34)',
    borderLeftColor: '#D8BE88',
    borderLeftWidth: 4,
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  noteQuote: {
    color: '#26372B',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 27,
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
  imageViewer: {
    backgroundColor: 'rgba(10,16,12,0.96)',
    flex: 1,
  },
  imageViewerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  imageViewerTitle: {
    color: '#F7F1E5',
    fontSize: 15,
    fontWeight: '900',
  },
  imageViewerClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,241,229,0.12)',
    borderColor: 'rgba(247,241,229,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  imageViewerCloseText: {
    color: '#F7F1E5',
    fontSize: 13,
    fontWeight: '900',
  },
  imageViewerContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  imageViewerFrame: {
    backgroundColor: '#0F1511',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  imageViewerImage: {
    height: '100%',
    width: '100%',
  },
});
