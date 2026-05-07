import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { createMarketListing, type MarketListingType } from '../../src/services/market';
import { uploadImageAsset } from '../../src/services/media';
import { listReadingLifeBooks, type ReadingLifeBook } from '../../src/services/reading-life';

type DraftLocation = {
  areaLabel: string;
  latitude: number;
  longitude: number;
};

export default function NewMarketItemScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    author?: string;
    coverUrl?: string;
    isbn?: string;
    source?: string;
    title?: string;
  }>();
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
  const [draftLocation, setDraftLocation] = useState<DraftLocation | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [photoAsset, setPhotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const priceValue = useMemo(() => parsePrice(priceInput), [priceInput]);
  const photoPreviewUri = photoAsset?.uri ?? sourceCoverUrl;
  const canSubmit =
    Boolean(session?.user.id) &&
    Boolean(title.trim()) &&
    Boolean(draftLocation) &&
    (type === 'wanted' || priceValue !== null) &&
    !isSubmitting;

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
          if (isMounted) setErrorMessage(getErrorMessage(error, '내 책장을 불러오지 못했습니다.'));
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

  const requestLocation = async () => {
    setIsRequestingLocation(true);
    setErrorMessage(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setErrorMessage('책가게 등록에는 거래 가능한 동네 위치가 필요합니다.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const areaLabel = await resolveAreaLabel(position.coords.latitude, position.coords.longitude);

      setDraftLocation({
        areaLabel,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '현재 위치를 확인하지 못했습니다.'));
    } finally {
      setIsRequestingLocation(false);
    }
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
    if (!session?.user.id || !draftLocation) return;

    if (!title.trim()) {
      setErrorMessage('책 제목을 입력해주세요.');
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

      const listing = await createMarketListing({
        sellerId: session.user.id,
        type,
        title,
        author,
        isbn13: sourceIsbn,
        conditionLabel,
        description,
        price: priceValue,
        areaLabel: draftLocation.areaLabel,
        latitude: draftLocation.latitude,
        longitude: draftLocation.longitude,
        imageUrl: uploaded?.mediaUrl ?? sourceCoverUrl ?? null,
        mediaAssetId: uploaded?.id ?? null,
      });

      router.replace(`/market/${listing.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '책가게에 등록하지 못했습니다.'));
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
            subtitle="가까운 독자에게 책을 건넵니다."
            title="책가게 등록"
            tone="clay"
          />

          {!session ? (
            <AuthRequired
              title="책가게 등록은 로그인 후 가능합니다."
              copy="내 동네, 책 사진, 문의 채팅이 계정에 연결됩니다."
            />
          ) : null}

          {session ? (
            <>
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
                    <Text style={styles.sourceTitle}>내 책장에서 고르거나 ISBN을 스캔하세요</Text>
                  </View>
                  <Pressable onPress={scanMarketBook} style={styles.scanButton}>
                    <Text style={styles.scanButtonText}>스캔</Text>
                  </Pressable>
                </View>

                {isLoadingReadingBooks ? (
                  <View style={styles.sourceLoading}>
                    <ActivityIndicator color="#103D2B" />
                    <Text style={styles.sourceLoadingText}>내 책장을 불러오는 중입니다</Text>
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
                  <Text style={styles.sourceEmpty}>내 책장에 책이 없으면 ISBN 스캔으로 시작할 수 있습니다.</Text>
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
                  placeholderTextColor="#9B917E"
                  style={styles.input}
                  value={title}
                />
                <TextInput
                  onChangeText={setAuthor}
                  placeholder="작가"
                  placeholderTextColor="#9B917E"
                  style={styles.input}
                  value={author}
                />
                {type === 'offer' ? (
                  <>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => setPriceInput(value.replace(/[^0-9]/g, ''))}
                      placeholder="가격, 나눔은 0"
                      placeholderTextColor="#9B917E"
                      style={styles.input}
                      value={priceInput}
                    />
                    <TextInput
                      onChangeText={setConditionLabel}
                      placeholder="상태 예: 밑줄 조금, 깨끗함"
                      placeholderTextColor="#9B917E"
                      style={styles.input}
                      value={conditionLabel}
                    />
                  </>
                ) : null}
                <TextInput
                  multiline
                  onChangeText={setDescription}
                  placeholder={type === 'wanted' ? '왜 찾는지, 원하는 판본이 있는지 적어주세요.' : '책에 대한 짧은 소개나 거래 메모'}
                  placeholderTextColor="#9B917E"
                  style={[styles.input, styles.textArea]}
                  value={description}
                />
              </View>

              <View style={styles.locationPanel}>
                <View style={styles.locationCopy}>
                  <Text style={styles.locationLabel}>거래 동네</Text>
                  <Text style={styles.locationTitle}>{draftLocation?.areaLabel ?? '위치 확인 필요'}</Text>
                </View>
                <Pressable
                  disabled={isRequestingLocation}
                  onPress={requestLocation}
                  style={styles.locationButton}
                >
                  {isRequestingLocation ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.locationButtonText}>위치</Text>
                  )}
                </Pressable>
              </View>

              {type === 'offer' && priceValue === 0 ? (
                <Text style={styles.freeHint}>0원으로 등록하면 책가게에서 나눔으로 표시됩니다.</Text>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable disabled={!canSubmit} onPress={submit} style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : null]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>{type === 'wanted' ? '찾아요 올리기' : '책 내놓기'}</Text>
                )}
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavigation active="market" />
    </SafeAreaView>
  );
}

async function resolveAreaLabel(latitude: number, longitude: number) {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const parts = [place?.city, place?.district, place?.subregion].filter(Boolean);
    return parts.slice(0, 2).join(' ') || '내 주변';
  } catch {
    return '내 주변';
  }
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
    backgroundColor: '#F6EEE1',
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
    borderBottomColor: 'rgba(143,106,66,0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  modeButtonActive: {
    borderBottomColor: '#103D2B',
  },
  modeText: {
    color: '#7D6B55',
    fontSize: 14,
    fontWeight: '900',
  },
  modeTextActive: {
    color: '#103D2B',
  },
  sourceSection: {
    borderBottomColor: 'rgba(143,106,66,0.16)',
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
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  sourceTitle: {
    color: '#14251B',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 4,
    maxWidth: 230,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sourceLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sourceLoadingText: {
    color: '#526154',
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
    backgroundColor: '#D8BE88',
    borderColor: 'transparent',
    borderRadius: 16,
    borderWidth: 3,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  shelfPickCoverActive: {
    borderColor: '#103D2B',
  },
  shelfPickImage: {
    height: '100%',
    width: '100%',
  },
  shelfPickFallback: {
    color: '#103D2B',
    fontSize: 10,
    fontWeight: '900',
  },
  shelfPickTitle: {
    color: '#4E5A50',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 8,
  },
  sourceEmpty: {
    color: '#667167',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 16,
  },
  photoBlock: {
    backgroundColor: '#D8BE88',
    borderRadius: 30,
    height: 220,
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
    color: '#103D2B',
    fontSize: 34,
    fontWeight: '900',
  },
  photoText: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
  },
  sourceIsbn: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
  },
  form: {
    marginTop: 18,
  },
  input: {
    borderBottomColor: 'rgba(143,106,66,0.22)',
    borderBottomWidth: 1,
    color: '#14251B',
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
    backgroundColor: 'rgba(16,61,43,0.08)',
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
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  locationTitle: {
    color: '#103D2B',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 58,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  freeHint: {
    color: '#8F6A42',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 22,
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
    fontWeight: '900',
  },
});
