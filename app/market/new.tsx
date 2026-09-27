import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Touch as Pressable, Input as TextInput } from '../../src/components/app-ui';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

import { AuthRequired } from '../../src/components/auth-required';
import { NaverMapPicker } from '../../src/components/naver-map-picker';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import {
  createMarketListing,
  getMarketListing,
  updateMarketListing,
  type MarketListingType,
} from '../../src/services/market';
import { uploadImageAsset } from '../../src/services/media';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

export default function NewMarketItemScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    author?: string;
    coverUrl?: string;
    editId?: string;
    isbn?: string;
    source?: string;
    title?: string;
  }>();
  const editId = getStringParam(params.editId);
  const [type, setType] = useState<MarketListingType>('offer');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceIsbn, setSourceIsbn] = useState<string | null>(null);
  const [sourceCoverUrl, setSourceCoverUrl] = useState<string | null>(null);
  const [selectedReadingBookId, setSelectedReadingBookId] = useState<string | null>(null);
  const [readingBooks, setReadingBooks] = useState<ReadingLifeBook[]>([]);
  const [isLoadingReadingBooks, setIsLoadingReadingBooks] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [conditionLabel, setConditionLabel] = useState('');
  const [description, setDescription] = useState('');
  const [areaLabel, setAreaLabel] = useState('');
  const [isMapPickerVisible, setIsMapPickerVisible] = useState(false);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [isLoadingEditListing, setIsLoadingEditListing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditMode = Boolean(editId);
  const priceValue = useMemo(() => parsePrice(priceInput), [priceInput]);
  const photoPreviewUri = photoAsset?.uri ?? sourceCoverUrl;
  const cleanAreaLabel = getCleanAreaLabel(areaLabel);
  const canSubmit =
    Boolean(session?.user.id) &&
    Boolean(title.trim()) &&
    Boolean(cleanAreaLabel) &&
    (type === 'wanted' || priceValue !== null) &&
    !isSubmitting &&
    !isLoadingEditListing;

  useEffect(() => {
    const scannedTitle = getStringParam(params.title);
    const scannedAuthor = getStringParam(params.author);
    const scannedIsbn = normalizeIsbn(getStringParam(params.isbn) ?? '');
    const scannedCoverUrl = getStringParam(params.coverUrl);

    if (!scannedTitle && !scannedAuthor && !scannedIsbn && !scannedCoverUrl) return;

    if (scannedTitle) setTitle(scannedTitle);
    if (scannedAuthor) setAuthor(scannedAuthor);
    if (scannedIsbn) setSourceIsbn(scannedIsbn);
    if (scannedCoverUrl) setSourceCoverUrl(scannedCoverUrl);
    setPhotoAsset(null);
    setSelectedReadingBookId(null);
  }, [params.author, params.coverUrl, params.isbn, params.title]);

  useEffect(() => {
    if (!editId || !session?.user.id) return;

    let isMounted = true;

    setIsLoadingEditListing(true);
    setErrorMessage(null);

    getMarketListing(editId)
      .then((listing) => {
        if (!isMounted) return;

        if (!listing) {
          setErrorMessage('수정할 책을 찾지 못했습니다.');
          return;
        }

        if (listing.sellerId !== session.user.id) {
          setErrorMessage('내가 올린 책만 수정할 수 있습니다.');
          return;
        }

        setType(listing.type);
        setTitle(listing.title);
        setAuthor(listing.author ?? '');
        setSourceIsbn(listing.isbn13);
        setSourceCoverUrl(listing.imageUrl);
        setSelectedReadingBookId(null);
        setPriceInput(listing.type === 'offer' && listing.price !== null ? String(listing.price) : '');
        setConditionLabel(listing.conditionLabel ?? '');
        setDescription(listing.description ?? '');
        setAreaLabel(listing.areaLabel);
        setPhotoAsset(null);
        setMediaAssetId(listing.mediaAssetId);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getErrorMessage(error, '수정할 책을 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLoadingEditListing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) {
        setReadingBooks([]);
        return undefined;
      }

      let isMounted = true;

      setIsLoadingReadingBooks(true);

      listReadingLifeBooks(session.user.id)
        .then((books) => {
          if (isMounted) setReadingBooks(books);
        })
        .catch((error) => {
          if (isMounted) setErrorMessage(getErrorMessage(error, '내 서재을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoadingReadingBooks(false);
        });

      return () => {
        isMounted = false;
      };
    }, [session?.user.id]),
  );

  const applyReadingBook = (book: ReadingLifeBook) => {
    setSelectedReadingBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setSourceIsbn(book.isbn13);
    setSourceCoverUrl(book.externalCoverUrl);
    setPhotoAsset(null);
    setErrorMessage(null);
  };

  const scanMarketBook = () => {
    router.push({
      pathname: '/scan',
      params: { context: 'market-listing' },
    });
  };

  const choosePhoto = () => {
    Alert.alert('책 사진', '책 상태가 보이는 사진을 등록해주세요.', [
      { text: '앨범에서 선택', onPress: pickPhotoFromLibrary },
      { text: '카메라로 촬영', onPress: takePhoto },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const pickPhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('앨범 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.88,
    });

    if (!result.canceled) {
      setPhotoAsset(result.assets[0] ?? null);
      setErrorMessage(null);
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
      quality: 0.88,
    });

    if (!result.canceled) {
      setPhotoAsset(result.assets[0] ?? null);
      setErrorMessage(null);
    }
  };

  const submit = async () => {
    if (!session?.user.id) return;

    if (!title.trim()) {
      setErrorMessage('책 제목을 입력해주세요.');
      return;
    }

    if (!cleanAreaLabel) {
      setErrorMessage('거래할 지역이나 만날 장소를 다시 선택해주세요.');
      return;
    }

    if (type === 'offer' && priceValue === null) {
      setErrorMessage('판매 가격을 입력해주세요. 나눔은 0원으로 등록합니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const uploaded = photoAsset
        ? await uploadImageAsset({
          kind: 'post-media',
          entityId: `market-${session.user.id}`,
          uri: photoAsset.uri,
          ownerId: session.user.id,
          mimeType: photoAsset.mimeType,
          width: photoAsset.width,
          height: photoAsset.height,
          fileName: photoAsset.fileName,
        })
        : null;

      const imageUrl = uploaded?.mediaUrl ?? sourceCoverUrl ?? null;
      const nextMediaAssetId = uploaded?.id ?? mediaAssetId ?? null;
      const listing = editId
        ? await updateMarketListing({
          sellerId: session.user.id,
          listingId: editId,
          type,
          title,
          author,
          isbn13: sourceIsbn,
          conditionLabel,
          description,
          price: priceValue,
          areaLabel: cleanAreaLabel,
          imageUrl,
          mediaAssetId: nextMediaAssetId,
        })
        : await createMarketListing({
          sellerId: session.user.id,
          type,
          title,
          author,
          isbn13: sourceIsbn,
          conditionLabel,
          description,
          price: priceValue,
          areaLabel: cleanAreaLabel,
          imageUrl,
          mediaAssetId: nextMediaAssetId,
        });

      router.replace(`/market/${listing.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, isEditMode ? '판매글을 수정하지 못했습니다.' : '북마켓에 등록하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 24}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            eyebrow="BookSome Bookstore"
            subtitle={isEditMode ? '책 정보와 거래 지역을 다시 정리합니다.' : '가까운 독자에게 책을 건넵니다.'}
            title={isEditMode ? '판매글 수정' : '책 내놓기'}
            tone="clay"
          />

          {!session ? (
            <AuthRequired
              title="책 내놓기은 로그인 후 가능합니다."
              copy="내 동네, 책 사진, 문의 채팅이 계정에 연결됩니다."
            />
          ) : null}

          {session ? (
            <>
              {isLoadingEditListing ? (
                <View style={styles.editLoading}>
                  <ActivityIndicator color={uiColors.action} />
                  <Text style={styles.editLoadingText}>판매글을 불러오는 중입니다</Text>
                </View>
              ) : null}

              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={() => setType('offer')}
                  style={[styles.modeButton, type === 'offer' ? styles.modeButtonActive : null]}
                >
                  <Text style={[styles.modeText, type === 'offer' ? styles.modeTextActive : null]}>내놓기</Text>
                </Pressable>
                <Pressable
                  onPress={() => setType('wanted')}
                  style={[styles.modeButton, type === 'wanted' ? styles.modeButtonActive : null]}
                >
                  <Text style={[styles.modeText, type === 'wanted' ? styles.modeTextActive : null]}>찾아요</Text>
                </Pressable>
              </View>

              <View style={styles.sourceSection}>
                <View style={styles.sourceHeader}>
                  <View>
                    <Text style={styles.sourceKicker}>책 정보</Text>
                    <Text style={styles.sourceTitle}>내 서재에서 고르거나 ISBN을 스캔하세요</Text>
                  </View>
                  <Pressable onPress={scanMarketBook} style={styles.scanButton}>
                    <Text style={styles.scanButtonText}>스캔</Text>
                  </Pressable>
                </View>

                {isLoadingReadingBooks ? (
                  <View style={styles.sourceLoading}>
                    <ActivityIndicator color={uiColors.action} />
                    <Text style={styles.sourceLoadingText}>내 서재을 불러오는 중입니다</Text>
                  </View>
                ) : null}

                {readingBooks.length > 0 ? (
                  <ScrollView
                    contentContainerStyle={styles.shelfPickerContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {readingBooks.map((book) => (
                      <Pressable
                        key={book.id}
                        onPress={() => applyReadingBook(book)}
                        style={styles.shelfPickItem}
                      >
                        <View
                          style={[
                            styles.shelfPickCover,
                            selectedReadingBookId === book.id ? styles.shelfPickCoverActive : null,
                          ]}
                        >
                          {book.externalCoverUrl ? (
                            <Image resizeMode="cover" source={{ uri: book.externalCoverUrl }} style={styles.shelfPickImage} />
                          ) : (
                            <Text style={styles.shelfPickFallback}>BOOK</Text>
                          )}
                        </View>
                        <Text numberOfLines={2} style={styles.shelfPickTitle}>
                          {book.title}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : !isLoadingReadingBooks ? (
                  <Text style={styles.sourceEmpty}>내 서재에 책이 없으면 ISBN 스캔으로 시작할 수 있습니다.</Text>
                ) : null}
              </View>

              <Pressable onPress={choosePhoto} style={styles.photoBlock}>
                {photoPreviewUri ? (
                  <Image resizeMode="cover" source={{ uri: photoPreviewUri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoEmpty}>
                    <Text style={styles.photoMark}>＋</Text>
                    <Text style={styles.photoText}>책 사진</Text>
                  </View>
                )}
              </Pressable>

              {sourceIsbn ? (
                <Text style={styles.sourceIsbn}>ISBN {sourceIsbn}</Text>
              ) : null}

              <View style={styles.form}>
                <TextInput
                  onChangeText={setTitle}
                  placeholder={type === 'wanted' ? '찾고 싶은 책 제목' : '내놓을 책 제목'}
                  placeholderTextColor={uiColors.muted}
                  style={styles.input}
                  value={title}
                />
                <TextInput
                  onChangeText={setAuthor}
                  placeholder="작가"
                  placeholderTextColor={uiColors.muted}
                  style={styles.input}
                  value={author}
                />
                {type === 'offer' ? (
                  <>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => setPriceInput(value.replace(/[^0-9]/g, ''))}
                      placeholder="가격, 나눔은 0"
                      placeholderTextColor={uiColors.muted}
                      style={styles.input}
                      value={priceInput}
                    />
                    <TextInput
                      onChangeText={setConditionLabel}
                      placeholder="상태 예: 밑줄 조금, 깨끗함"
                      placeholderTextColor={uiColors.muted}
                      style={styles.input}
                      value={conditionLabel}
                    />
                  </>
                ) : null}
                <TextInput
                  multiline
                  onChangeText={setDescription}
                  placeholder={type === 'wanted' ? '왜 찾는지, 원하는 판본이 있는지 적어주세요.' : '책에 대한 짧은 소개나 거래 메모'}
                  placeholderTextColor={uiColors.muted}
                  style={[styles.input, styles.textArea]}
                  value={description}
                />
              </View>

              <View style={styles.locationPanel}>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationLabel}>거래 지역</Text>
                  <TextInput
                    onChangeText={setAreaLabel}
                    placeholder="예: 연남동, 마포구청역, 판교역 근처"
                    placeholderTextColor={uiColors.muted}
                    returnKeyType="done"
                    style={styles.locationInput}
                    value={areaLabel}
                  />
                  <Text style={styles.locationHint}>정확한 주소나 좌표는 저장하지 않아도 됩니다.</Text>
                  {cleanAreaLabel ? (
                    <Text numberOfLines={2} style={styles.locationPreview}>
                      판매책 정보에 표시: {cleanAreaLabel}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => setIsMapPickerVisible(true)} style={styles.locationButton}>
                  <Text style={styles.locationButtonText}>지도</Text>
                </Pressable>
              </View>

              {type === 'offer' && priceValue === 0 ? (
                <Text style={styles.freeHint}>0원으로 등록하면 북마켓에서 나눔으로 표시됩니다.</Text>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable disabled={!canSubmit} onPress={submit} style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : null]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {isEditMode ? '수정 저장하기' : type === 'wanted' ? '찾아요 올리기' : '책 내놓기'}
                  </Text>
                )}
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <NaverMapPicker
        initialArea={areaLabel}
        onClose={() => setIsMapPickerVisible(false)}
        onSelect={(nextAreaLabel) => {
          setAreaLabel(nextAreaLabel);
          setIsMapPickerVisible(false);
        }}
        visible={isMapPickerVisible}
      />
    </SafeAreaView>
  );
}

function parsePrice(value: string) {
  if (!value) return null;
  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function getStringParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeIsbn(value: string) {
  const isbn = value.replace(/[^0-9X]/gi, '').toUpperCase();
  return isbn || null;
}

function getCleanAreaLabel(value: string) {
  const label = value.trim();
  return label && label !== '선택한 지역' && label !== '지도 선택 위치' ? label : '';
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
    backgroundColor: uiColors.background,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 124,
  },
  modeSwitch: {
    borderBottomColor: 'rgba(38,37,38,0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  editLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
  },
  editLoadingText: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  modeButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  modeButtonActive: {
    borderBottomColor: uiColors.action,
  },
  modeText: {
    color: uiColors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  modeTextActive: {
    color: uiColors.action,
  },
  sourceSection: {
    borderBottomColor: 'rgba(38,37,38,0.16)',
    borderBottomWidth: 1,
    paddingBottom: 18,
    paddingTop: 22,
  },
  sourceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  sourceKicker: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
  },
  sourceTitle: {
    color: uiColors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 4,
    maxWidth: 230,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sourceLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sourceLoadingText: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  shelfPickerContent: {
    gap: 14,
    paddingRight: 20,
    paddingTop: 18,
  },
  shelfPickItem: {
    width: 76,
  },
  shelfPickCover: {
    alignItems: 'center',
    backgroundColor: uiColors.subtle,
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 3,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  shelfPickCoverActive: {
    borderColor: uiColors.action,
  },
  shelfPickImage: {
    height: '100%',
    width: '100%',
  },
  shelfPickFallback: {
    color: uiColors.action,
    fontSize: 10,
    fontWeight: '700',
  },
  shelfPickTitle: {
    color: '#4E5A50',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 8,
  },
  sourceEmpty: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 16,
  },
  photoBlock: {
    backgroundColor: uiColors.accentSoft,
    borderRadius: 24,
    height: 168,
    marginTop: 24,
    overflow: 'hidden',
  },
  photoImage: {
    height: '100%',
    width: '100%',
  },
  photoEmpty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  photoMark: {
    color: uiColors.action,
    fontSize: 34,
    fontWeight: '700',
  },
  photoText: {
    color: uiColors.action,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  sourceIsbn: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  form: {
    marginTop: 18,
    gap: 14,
  },
  input: {
    color: uiColors.ink,
    fontSize: 17,
    fontWeight: '800',
    minHeight: 54,
    paddingVertical: 12,
  },
  textArea: {
    lineHeight: 23,
    minHeight: 104,
    textAlignVertical: 'top',
  },
  locationPanel: {
    alignItems: 'center',
    backgroundColor: 'rgba(38,37,38,0.08)',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
    padding: 16,
  },
  locationCopy: {
    flex: 1,
  },
  locationLabel: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
  },
  locationInput: {
    color: uiColors.action,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 3,
    minHeight: 38,
    paddingVertical: 0,
  },
  locationHint: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  locationPreview: {
    color: uiColors.action,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 9,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    height: 42,
    justifyContent: 'center',
    width: 58,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  freeHint: {
    color: uiColors.action,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  errorText: {
    color: uiColors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
