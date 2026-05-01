import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { lookupBookByIsbn, type BookSearchItem } from '../../src/services/books';
import { uploadImageAsset } from '../../src/services/media';
import { addBookToReadingLife } from '../../src/services/reading-life';

export default function ScanResultScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ context?: string; isbn?: string }>();
  const [bookResults, setBookResults] = useState<BookSearchItem[]>([]);
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [bookLookupError, setBookLookupError] = useState<string | null>(null);
  const [isAddingToReadingLife, setIsAddingToReadingLife] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const [customCoverAsset, setCustomCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const rawIsbn = Array.isArray(params.isbn) ? params.isbn[0] : params.isbn;
  const normalizedIsbn = useMemo(() => normalizeIsbn(rawIsbn ?? ''), [rawIsbn]);
  const isRoomContext = params.context === 'create-room';
  const selectedBook = bookResults[0] ?? null;
  const coverPreviewUri = customCoverAsset?.uri ?? selectedBook?.imageUrl ?? null;
  const totalPagesValue = useMemo(() => parsePositiveInteger(totalPagesInput), [totalPagesInput]);
  const canUseBook =
    !!session &&
    !!selectedBook &&
    !isLookingUpBook &&
    !isAddingToReadingLife &&
    (isRoomContext || totalPagesValue !== null);

  useEffect(() => {
    let isMounted = true;

    if (!normalizedIsbn) {
      setBookLookupError('스캔된 ISBN이 없습니다. 다시 스캔해주세요.');
      setBookResults([]);
      return;
    }

    setIsLookingUpBook(true);
    setBookLookupError(null);
    setCoverError(null);
    setCustomCoverAsset(null);
    setBookResults([]);

    lookupBookByIsbn(normalizedIsbn)
      .then((result) => {
        if (!isMounted) return;
        setBookResults(result.items);
        if (result.items.length === 0) {
          setBookLookupError('ISBN으로 찾은 도서 정보가 없습니다. 다시 스캔해보세요.');
        }
      })
      .catch((error) => {
        if (isMounted) setBookLookupError(getErrorMessage(error, '도서 정보를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLookingUpBook(false);
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedIsbn]);

  const returnToScanner = () => {
    router.replace({
      pathname: '/scan',
      params: isRoomContext ? { context: 'create-room' } : {},
    });
  };

  const cancelRegistration = () => {
    router.replace(isRoomContext ? '/create-room' : '/reading-life');
  };

  const useScannedBook = async () => {
    if (!session || !selectedBook) return;

    if (isRoomContext) {
      router.replace({
        pathname: '/create-room',
        params: { isbn13: selectedBook.isbn || normalizedIsbn },
      });
      return;
    }

    if (!totalPagesValue) {
      setRegistrationError('책의 마지막 페이지 번호를 입력해주세요.');
      return;
    }

    setIsAddingToReadingLife(true);
    setRegistrationError(null);
    setCoverError(null);

    try {
      const customCover = customCoverAsset ? await uploadCustomCover() : null;
      const externalCoverUrl = customCover?.mediaUrl ?? selectedBook.imageUrl ?? null;

      await addBookToReadingLife(session.user.id, selectedBook, {
        externalCoverUrl,
        totalPages: totalPagesValue,
      });
      router.replace('/reading-life');
    } catch (error) {
      setRegistrationError(getErrorMessage(error, '내 책장에 등록하지 못했습니다.'));
    } finally {
      setIsAddingToReadingLife(false);
    }
  };

  const chooseCoverSource = () => {
    if (isRoomContext) return;

    Alert.alert('표지 변경', '앨범에서 고르거나 바로 촬영해서 책장 표지로 사용할 수 있습니다.', [
      { text: '앨범에서 선택', onPress: pickCoverFromLibrary },
      { text: '카메라로 촬영', onPress: takeCoverPhoto },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const pickCoverFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setCoverError('앨범 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setCustomCoverAsset(result.assets[0] ?? null);
      setCoverError(null);
    }
  };

  const takeCoverPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setCoverError('카메라 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setCustomCoverAsset(result.assets[0] ?? null);
      setCoverError(null);
    }
  };

  const uploadCustomCover = async () => {
    if (!session || !customCoverAsset?.uri) {
      throw new Error('업로드할 표지 이미지가 없습니다.');
    }

    return uploadImageAsset({
      kind: 'post-media',
      entityId: `book-cover-${session.user.id}`,
      uri: customCoverAsset.uri,
      ownerId: session.user.id,
      mimeType: customCoverAsset.mimeType,
      width: customCoverAsset.width,
      height: customCoverAsset.height,
      fileName: customCoverAsset.fileName,
    });
  };

  const scrollToPageInput = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 160);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 24}
        style={styles.keyboardView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            action={
              <Pressable onPress={returnToScanner} style={styles.rescanHeaderButton}>
                <Text style={styles.rescanHeaderButtonText}>⌕</Text>
              </Pressable>
            }
            eyebrow="ISBN Result"
            subtitle={isRoomContext ? '도서 정보를 확인하고 북룸으로 가져갑니다.' : '도서 정보를 확인하고 마지막 페이지를 입력합니다.'}
            title="스캔 결과"
            tone="paper"
          />

          {!session ? (
            <AuthRequired
              title="스캔 결과는 로그인 후 사용할 수 있습니다."
              copy="독서생활과 북룸에 책 정보를 연결하기 위해 계정이 필요합니다."
            />
          ) : null}

          {session ? (
            <>
              <View style={styles.isbnLine}>
                <Text style={styles.isbnLabel}>ISBN</Text>
                <Text style={styles.isbnValue}>{normalizedIsbn || '-'}</Text>
              </View>

              {isLookingUpBook ? (
                <View style={styles.loadingPanel}>
                  <ActivityIndicator color="#116653" />
                  <Text style={styles.loadingText}>도서 정보를 찾고 있습니다</Text>
                </View>
              ) : null}

              {selectedBook ? (
                <View style={styles.bookPanel}>
                  <Pressable
                    disabled={isRoomContext}
                    onPress={chooseCoverSource}
                    style={({ pressed }) => [
                      styles.coverWrap,
                      !isRoomContext ? styles.coverWrapEditable : null,
                      pressed ? styles.coverWrapPressed : null,
                    ]}
                  >
                    {coverPreviewUri ? (
                      <Image resizeMode="cover" source={{ uri: coverPreviewUri }} style={styles.coverImage} />
                    ) : (
                      <Text style={styles.coverFallback}>BOOK</Text>
                    )}
                    {!isRoomContext ? (
                      <View style={styles.coverEditBadge}>
                        <Text style={styles.coverEditBadgeText}>{customCoverAsset ? '변경됨' : '표지 변경'}</Text>
                      </View>
                    ) : null}
                  </Pressable>

                  <View style={styles.bookCopy}>
                    <Text style={styles.bookKicker}>찾은 책</Text>
                    <Text style={styles.bookTitle}>{selectedBook.title}</Text>
                    <Text style={styles.bookMeta}>
                      {selectedBook.author}
                      {selectedBook.publisher ? ` · ${selectedBook.publisher}` : ''}
                    </Text>
                    {selectedBook.description ? (
                      <Text numberOfLines={5} style={styles.bookDescription}>
                        {selectedBook.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {selectedBook && !isRoomContext ? (
                <View style={styles.pagePanel}>
                  <Text style={styles.pageLabel}>마지막 페이지</Text>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => setTotalPagesInput(value.replace(/[^0-9]/g, ''))}
                    onFocus={scrollToPageInput}
                    placeholder="예: 312"
                    placeholderTextColor="#9B917E"
                    returnKeyType="done"
                    style={styles.pageInput}
                    value={totalPagesInput}
                  />
                  <Text style={styles.pageHint}>
                    앞으로 현재 페이지를 입력하면 이 마지막 페이지를 기준으로 진행률이 계산됩니다.
                  </Text>
                </View>
              ) : null}

              {bookLookupError ? <Text style={styles.errorText}>{bookLookupError}</Text> : null}
              {coverError ? <Text style={styles.errorText}>{coverError}</Text> : null}
              {registrationError ? <Text style={styles.errorText}>{registrationError}</Text> : null}

              <View style={styles.actions}>
                <Pressable onPress={returnToScanner} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>다시 스캔</Text>
                </Pressable>
                <Pressable
                  disabled={!canUseBook}
                  onPress={useScannedBook}
                  style={[styles.primaryButton, !canUseBook ? styles.disabledButton : null]}
                >
                  {isAddingToReadingLife ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isRoomContext ? '북룸 책으로 사용' : '내 책장에 등록'}
                    </Text>
                  )}
                </Pressable>
              </View>

              <Pressable onPress={cancelRegistration} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{isRoomContext ? '북룸 책 설정 취소' : '등록 취소'}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, '').toUpperCase();
}

function parsePositiveInteger(value: string) {
  const normalizedValue = value.replace(/[^0-9]/g, '');
  if (!normalizedValue) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
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
    backgroundColor: '#F7F2EA',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 140,
  },
  rescanHeaderButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  rescanHeaderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  isbnLine: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingBottom: 14,
  },
  isbnLabel: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  isbnValue: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '800',
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
  bookPanel: {
    borderBottomColor: 'rgba(16,61,43,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 18,
    marginTop: 22,
    paddingBottom: 22,
  },
  coverWrap: {
    alignItems: 'center',
    backgroundColor: '#E4D5B7',
    borderRadius: 20,
    height: 178,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 118,
  },
  coverWrapEditable: {
    borderColor: 'rgba(16, 61, 43, 0.18)',
    borderWidth: 1,
  },
  coverWrapPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  coverFallback: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '900',
  },
  coverEditBadge: {
    backgroundColor: 'rgba(16, 61, 43, 0.9)',
    borderRadius: 999,
    bottom: 8,
    left: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
    right: 8,
  },
  coverEditBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  bookCopy: {
    flex: 1,
    minWidth: 0,
  },
  bookKicker: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  bookTitle: {
    color: '#26372B',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 7,
  },
  bookMeta: {
    color: '#6C776F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
  },
  bookDescription: {
    color: '#58645B',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 12,
  },
  pagePanel: {
    marginTop: 24,
  },
  pageLabel: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  pageInput: {
    borderBottomColor: '#103D2B',
    borderBottomWidth: 2,
    color: '#142326',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    marginTop: 4,
    paddingBottom: 6,
    paddingTop: 6,
  },
  pageHint: {
    color: '#6C776F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E2D8C9',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.48,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(125,75,53,0.07)',
    borderColor: 'rgba(125,75,53,0.22)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  cancelButtonText: {
    color: '#7D4B35',
    fontSize: 14,
    fontWeight: '800',
  },
});
