import { useMemo, useState } from 'react';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
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
import { addBookToReadingLife } from '../../src/services/reading-life';

export default function ScanScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ context?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<BarcodeScanningResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [bookLookupError, setBookLookupError] = useState<string | null>(null);
  const [bookResults, setBookResults] = useState<BookSearchItem[]>([]);
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [isAddingToReadingLife, setIsAddingToReadingLife] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [totalPagesInput, setTotalPagesInput] = useState('');
  const isGranted = permission?.granted;
  const isRoomContext = params.context === 'create-room';
  const scannedCode = scanResult?.data ?? '';
  const normalizedCode = useMemo(() => scannedCode.replace(/[^0-9X]/gi, ''), [scannedCode]);
  const looksLikeIsbn = scanResult?.type === 'ean13' && /^(978|979)\d{10}$/.test(normalizedCode);
  const selectedBook = bookResults[0] ?? null;
  const totalPagesValue = useMemo(() => parsePositiveInteger(totalPagesInput), [totalPagesInput]);
  const needsPageCount = !isRoomContext && !!selectedBook;
  const canUseScannedBook =
    looksLikeIsbn &&
    !isLookingUpBook &&
    !isAddingToReadingLife &&
    !!selectedBook &&
    (!needsPageCount || totalPagesValue !== null);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setScanResult(result);
    setBookResults([]);
    setBookLookupError(null);
    setRegistrationError(null);
    setTotalPagesInput('');

    const isbn = normalizeIsbn(result.data);
    if (result.type === 'ean13' && /^(978|979)\d{10}$/.test(isbn)) {
      void lookupScannedBook(isbn);
    }
  };

  const resetScanner = () => {
    setCameraError(null);
    setBookLookupError(null);
    setRegistrationError(null);
    setBookResults([]);
    setTotalPagesInput('');
    setScanResult(null);
  };

  const useScannedBook = async () => {
    if (!looksLikeIsbn || !selectedBook || !session) return;

    if (isRoomContext) {
      router.replace({
        pathname: '/create-room',
        params: { isbn13: selectedBook.isbn },
      });
      return;
    }

    if (!totalPagesValue) {
      setRegistrationError('책의 마지막 페이지 번호를 입력해주세요.');
      return;
    }

    setIsAddingToReadingLife(true);
    setRegistrationError(null);

    try {
      await addBookToReadingLife(session.user.id, selectedBook, { totalPages: totalPagesValue });
      router.replace('/reading-life');
    } catch (error) {
      setRegistrationError(getErrorMessage(error, '독서생활에 등록하지 못했습니다.'));
    } finally {
      setIsAddingToReadingLife(false);
    }
  };

  const lookupScannedBook = async (isbn: string) => {
    setIsLookingUpBook(true);
    setBookLookupError(null);

    try {
      const result = await lookupBookByIsbn(isbn);
      setBookResults(result.items);
      if (result.items.length === 0) {
        setBookLookupError('검색 결과가 없습니다. 다른 바코드를 다시 스캔해보세요.');
      }
    } catch (error) {
      setBookLookupError(getErrorMessage(error, '도서 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLookingUpBook(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ScreenHeader
          eyebrow="ISBN Scanner"
          subtitle={isRoomContext ? '바코드로 북룸의 책을 설정합니다.' : '스캔한 책을 나의 독서생활에 담습니다.'}
          title="책 스캔"
          tone="ink"
        />

        {!session ? (
          <AuthRequired
            title="ISBN 스캔은 로그인 후 사용할 수 있습니다."
            copy="내가 스캔한 책을 독서생활 기록에 저장하고 진행률과 메모를 이어가기 위해 로그인이 필요합니다."
          />
        ) : null}

        {session ? (
          <View style={styles.scannerFrame}>
            {isGranted ? (
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
                onMountError={(event) => setCameraError(event.message)}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={styles.permissionPanel}>
                <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
                <Text style={styles.permissionCopy}>책 뒷면의 ISBN 바코드를 읽기 위해 카메라 접근을 허용해주세요.</Text>
                <Pressable onPress={requestPermission} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>권한 요청</Text>
                </Pressable>
              </View>
            )}

            {isGranted ? (
              <View pointerEvents="none" style={styles.scannerOverlay}>
                <View style={styles.scanBox}>
                  <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                  <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                </View>
                <Text style={styles.scanGuide}>ISBN 바코드를 프레임 안에 맞춰주세요</Text>
              </View>
            ) : null}

            {cameraError ? (
              <View pointerEvents="box-none" style={styles.resultLayer}>
                <View style={styles.resultPanel}>
                  <Text style={styles.resultEyebrow}>CAMERA ERROR</Text>
                  <Text style={styles.resultTitle}>카메라를 열지 못했습니다</Text>
                  <Text style={styles.resultCopy}>{cameraError}</Text>
                  <Pressable onPress={resetScanner} style={styles.resultButton}>
                    <Text style={styles.resultButtonText}>다시 시도</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {scanResult ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
                style={styles.resultLayer}
              >
                <ScrollView
                  contentContainerStyle={styles.resultScrollContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  style={styles.resultScroll}
                >
                  <View style={styles.resultPanel}>
                    <Text style={styles.resultEyebrow}>{looksLikeIsbn ? 'ISBN FOUND' : 'BARCODE FOUND'}</Text>
                    <Text style={styles.resultTitle}>{normalizedCode || scannedCode}</Text>
                    <Text style={styles.resultCopy}>
                      {looksLikeIsbn ? '책 ISBN으로 인식했습니다. 도서 정보를 조회하고 있습니다.' : `인식 형식: ${scanResult.type}. 책 ISBN이 맞는지 확인해주세요.`}
                    </Text>
                    {isLookingUpBook ? (
                      <View style={styles.lookupLoading}>
                        <ActivityIndicator color="#116653" />
                        <Text style={styles.lookupLoadingText}>도서 정보를 찾고 있습니다</Text>
                      </View>
                    ) : null}
                    {selectedBook ? (
                      <View style={styles.bookResultCard}>
                        {selectedBook.imageUrl ? (
                          <Image resizeMode="cover" source={{ uri: selectedBook.imageUrl }} style={styles.bookResultImage} />
                        ) : (
                          <View style={styles.bookResultImageFallback}>
                            <Text style={styles.bookResultImageText}>BOOK</Text>
                          </View>
                        )}
                        <View style={styles.bookResultCopy}>
                          <Text style={styles.bookResultTitle} numberOfLines={2}>
                            {selectedBook.title}
                          </Text>
                          <Text style={styles.bookResultMeta} numberOfLines={1}>
                            {selectedBook.author}
                            {selectedBook.publisher ? ` · ${selectedBook.publisher}` : ''}
                          </Text>
                          <Text style={styles.bookResultIsbn}>{selectedBook.isbn}</Text>
                        </View>
                      </View>
                    ) : null}
                    {selectedBook && !isRoomContext ? (
                      <View style={styles.pageCountPanel}>
                        <View style={styles.pageCountHead}>
                          <Text style={styles.pageCountLabel}>마지막 페이지</Text>
                          <Text style={styles.pageCountHint}>진행률 계산 기준</Text>
                        </View>
                        <TextInput
                          keyboardType="number-pad"
                          onChangeText={(value) => setTotalPagesInput(value.replace(/[^0-9]/g, ''))}
                          placeholder="예: 312"
                          placeholderTextColor="#928979"
                          returnKeyType="done"
                          style={styles.pageCountInput}
                          value={totalPagesInput}
                        />
                      </View>
                    ) : null}
                    {bookLookupError ? <Text style={styles.lookupError}>{bookLookupError}</Text> : null}
                    {registrationError ? <Text style={styles.lookupError}>{registrationError}</Text> : null}
                    <View style={styles.resultActions}>
                      <Pressable onPress={resetScanner} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>다시 스캔</Text>
                      </Pressable>
                      <Pressable
                        disabled={!canUseScannedBook}
                        onPress={useScannedBook}
                        style={[
                          styles.resultButton,
                          !canUseScannedBook ? styles.disabledButton : null,
                        ]}
                      >
                        <Text style={styles.resultButtonText}>
                          {isAddingToReadingLife ? '등록 중' : isRoomContext ? '북룸 책으로 사용' : '독서생활에 등록'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : null}
          </View>
        ) : null}

        {session ? (
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>MVP note</Text>
            <Text style={styles.tipCopy}>
              {isRoomContext
                ? '스캔된 ISBN은 북룸 생성 화면의 책 정보에 임시로 적용됩니다.'
                : '스캔된 책은 나의 독서생활에 저장되고, 이후 진행률과 메모를 이어서 붙일 수 있습니다.'}
            </Text>
          </View>
        ) : null}
      </View>
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
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  lookupLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  lookupLoadingText: {
    color: '#556260',
    fontSize: 13,
    fontWeight: '800',
  },
  bookResultCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 10,
  },
  bookResultImage: {
    borderRadius: 12,
    height: 88,
    width: 62,
  },
  bookResultImageFallback: {
    alignItems: 'center',
    backgroundColor: '#E7DED0',
    borderRadius: 12,
    height: 88,
    justifyContent: 'center',
    width: 62,
  },
  bookResultImageText: {
    color: '#7A6E62',
    fontSize: 11,
    fontWeight: '900',
  },
  bookResultCopy: {
    flex: 1,
  },
  bookResultTitle: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  bookResultMeta: {
    color: '#66716E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  bookResultIsbn: {
    color: '#116653',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
  },
  pageCountPanel: {
    borderTopColor: 'rgba(20,35,38,0.1)',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 13,
  },
  pageCountHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageCountLabel: {
    color: '#142326',
    fontSize: 13,
    fontWeight: '900',
  },
  pageCountHint: {
    color: '#7E877F',
    fontSize: 11,
    fontWeight: '700',
  },
  pageCountInput: {
    borderBottomColor: '#116653',
    borderBottomWidth: 2,
    color: '#142326',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
    paddingBottom: 5,
    paddingTop: 5,
  },
  lookupError: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#142326',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
  },
  copy: {
    color: '#5E6766',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 12,
  },
  scannerFrame: {
    backgroundColor: '#142326',
    borderRadius: 30,
    flex: 1,
    marginTop: 28,
    minHeight: 390,
    overflow: 'hidden',
  },
  scanBox: {
    height: 150,
    position: 'relative',
    width: '74%',
  },
  scannerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scanCorner: {
    borderColor: '#F4D38A',
    height: 42,
    position: 'absolute',
    width: 42,
  },
  scanCornerTopLeft: {
    borderLeftWidth: 4,
    borderTopWidth: 4,
    left: 0,
    top: 0,
  },
  scanCornerTopRight: {
    borderRightWidth: 4,
    borderTopWidth: 4,
    right: 0,
    top: 0,
  },
  scanCornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: 0,
    left: 0,
  },
  scanCornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: 0,
    right: 0,
  },
  scanGuide: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 8,
  },
  resultLayer: {
    bottom: 18,
    justifyContent: 'flex-end',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 0,
  },
  resultScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 72,
  },
  resultScroll: {
    flex: 1,
  },
  resultPanel: {
    backgroundColor: 'rgba(247, 242, 234, 0.96)',
    borderRadius: 24,
    padding: 18,
    width: '100%',
  },
  resultEyebrow: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  resultTitle: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 5,
  },
  resultCopy: {
    color: '#556260',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  resultButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.48,
  },
  resultButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E2D8C9',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#142326',
    fontSize: 14,
    fontWeight: '900',
  },
  permissionPanel: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  permissionCopy: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 10,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#F7F2EA',
    borderRadius: 17,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  permissionButtonText: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
  },
  tip: {
    backgroundColor: '#ECE5D8',
    borderRadius: 22,
    marginTop: 18,
    padding: 18,
  },
  tipTitle: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
  },
  tipCopy: {
    color: '#4E5958',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
});
