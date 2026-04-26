import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { BackButton } from '../../src/components/back-button';
import { useAuth } from '../../src/providers/auth-provider';
import { lookupBookByIsbn, type BookSearchItem } from '../../src/services/books';
import { uploadImageAsset } from '../../src/services/media';
import type { UploadedMediaAsset } from '../../src/services/media';
import { createRoom } from '../../src/services/rooms';

export default function CreateRoomScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ isbn13?: string }>();
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn13, setIsbn13] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookSearchItem | null>(null);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomSubtitle, setRoomSubtitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [firstQuestion, setFirstQuestion] = useState('');
  const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadedCover, setUploadedCover] = useState<UploadedMediaAsset | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [bookLookupError, setBookLookupError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const scannedIsbn = Array.isArray(params.isbn13) ? params.isbn13[0] : params.isbn13;
    if (scannedIsbn) {
      setIsbn13(scannedIsbn);
      void applyBookLookup(scannedIsbn);
    }
  }, [params.isbn13]);

  const applyBookLookup = async (isbn: string) => {
    setIsLookingUpBook(true);
    setBookLookupError(null);

    try {
      const result = await lookupBookByIsbn(isbn);
      const book = result.items[0] ?? null;

      if (!book) {
        setBookLookupError('ISBN으로 찾은 도서 정보가 없습니다.');
        setSelectedBook(null);
        return;
      }

      setSelectedBook(book);
      setBookTitle((value) => value || book.title);
      setAuthor((value) => value || book.author);
      setRoomTitle((value) => value || book.title);
      setRoomDescription((value) => value || book.description);
    } catch (error) {
      setBookLookupError(getErrorMessage(error, '도서 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLookingUpBook(false);
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled) {
      const asset = result.assets[0] ?? null;
      setCoverAsset(asset);
      setCoverUri(asset?.uri ?? null);
      setUploadedCover(null);
      setUploadError(null);
    }
  };

  const uploadCover = async () => {
    if (!session || !coverAsset?.uri) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const media = await uploadSelectedCover();
      setUploadedCover(media);
    } catch (error) {
      setUploadError(getErrorMessage(error, '커버 업로드에 실패했습니다.'));
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSelectedCover = async () => {
    if (!session || !coverAsset?.uri) {
      throw new Error('업로드할 커버 이미지가 없습니다.');
    }

    return uploadImageAsset({
      kind: 'room-cover',
      entityId: `draft-${session.user.id}`,
      uri: coverAsset.uri,
      ownerId: session.user.id,
      mimeType: coverAsset.mimeType,
      width: coverAsset.width,
      height: coverAsset.height,
      fileName: coverAsset.fileName,
    });
  };

  const createReadingRoom = async () => {
    if (!session) return;

    if (!bookTitle.trim() || !author.trim() || !firstQuestion.trim()) {
      setCreateError('책 제목, 저자, 첫 질문은 꼭 필요합니다.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const cover =
        uploadedCover ?? (coverAsset?.uri ? await uploadSelectedCover() : null);

      if (cover) {
        setUploadedCover(cover);
      }

      const room = await createRoom({
        bookTitle,
        author,
        isbn13,
        externalCoverUrl: selectedBook?.imageUrl ?? null,
        publisher: selectedBook?.publisher ?? null,
        publishedDate: selectedBook?.publishedDate ?? null,
        sourcePayload: selectedBook
          ? {
              source: selectedBook.source,
              title: selectedBook.title,
              author: selectedBook.author,
              publisher: selectedBook.publisher,
              publishedDate: selectedBook.publishedDate,
              isbn: selectedBook.isbn,
              imageUrl: selectedBook.imageUrl,
              link: selectedBook.link,
              description: selectedBook.description,
            }
          : null,
        roomTitle: roomTitle || bookTitle,
        roomSubtitle,
        roomDescription,
        firstQuestion,
        founderId: session.user.id,
        coverPath: cover?.objectPath ?? null,
      });

      router.replace(`/room/${room.slug}`);
    } catch (error) {
      setCreateError(getErrorMessage(error, '북룸 생성에 실패했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton />
        </View>

        <Text style={styles.title}>당신이 사랑하는 책의 첫 번째 방장이 되어보세요.</Text>
        <Text style={styles.copy}>
          직접 입력하거나 책 뒷면의 ISBN을 스캔해 북룸의 책을 설정할 수 있습니다.
        </Text>

        {!session ? (
          <AuthRequired
            title="북룸 생성은 로그인 후 열립니다."
            copy="Host 역할과 운영 권한을 계정에 연결해야 북룸 개설과 관리 기능이 이어질 수 있습니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.formPanel}>
              <Text style={styles.label}>Book</Text>
              <View style={styles.scanChoice}>
                <View style={styles.scanChoiceCopy}>
                  <Text style={styles.scanChoiceTitle}>ISBN으로 책 설정</Text>
                  <Text style={styles.scanChoiceText}>
                    바코드를 스캔하면 책 고유번호를 북룸에 연결합니다.
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/scan',
                      params: { context: 'create-room' },
                    })
                  }
                  style={styles.scanButton}
                >
                  <Text style={styles.scanButtonIcon}>⌕</Text>
                </Pressable>
              </View>
              {isbn13 ? (
                <View style={styles.isbnChip}>
                  <Text style={styles.isbnLabel}>ISBN</Text>
                  <Text style={styles.isbnValue}>{isbn13}</Text>
                  <Pressable onPress={() => setIsbn13('')} hitSlop={10}>
                    <Text style={styles.isbnRemove}>×</Text>
                  </Pressable>
                </View>
              ) : null}
              {isLookingUpBook ? (
                <View style={styles.lookupPanel}>
                  <ActivityIndicator color="#116653" />
                  <Text style={styles.lookupText}>도서 정보를 불러오는 중입니다</Text>
                </View>
              ) : null}
              {selectedBook ? (
                <View style={styles.selectedBookPanel}>
                  {selectedBook.imageUrl ? (
                    <Image resizeMode="cover" source={{ uri: selectedBook.imageUrl }} style={styles.selectedBookImage} />
                  ) : (
                    <View style={styles.selectedBookImageFallback}>
                      <Text style={styles.selectedBookImageText}>BOOK</Text>
                    </View>
                  )}
                  <View style={styles.selectedBookCopy}>
                    <Text style={styles.selectedBookTitle} numberOfLines={2}>
                      {selectedBook.title}
                    </Text>
                    <Text style={styles.selectedBookMeta} numberOfLines={1}>
                      {selectedBook.author}
                      {selectedBook.publisher ? ` · ${selectedBook.publisher}` : ''}
                    </Text>
                    <Text style={styles.selectedBookNote}>이 책 정보가 북룸에 저장됩니다.</Text>
                  </View>
                </View>
              ) : null}
              {bookLookupError ? <Text style={styles.lookupError}>{bookLookupError}</Text> : null}
              <TextInput
                onChangeText={setBookTitle}
                placeholder="책 제목"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={bookTitle}
              />
              <TextInput
                onChangeText={setAuthor}
                placeholder="저자"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={author}
              />

              <Text style={[styles.label, styles.spacedLabel]}>북룸</Text>
              <TextInput
                onChangeText={setRoomTitle}
                placeholder="북룸 제목"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={roomTitle}
              />
              <TextInput
                onChangeText={setRoomSubtitle}
                placeholder="짧은 부제"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={roomSubtitle}
              />
              <TextInput
                multiline
                onChangeText={setRoomDescription}
                placeholder="북룸 소개"
                placeholderTextColor="#A49B8D"
                style={[styles.input, styles.textArea]}
                value={roomDescription}
              />
              <TextInput
                multiline
                onChangeText={setFirstQuestion}
                placeholder="방장이 던질 첫 질문"
                placeholderTextColor="#A49B8D"
                style={[styles.input, styles.textArea]}
                value={firstQuestion}
              />
            </View>

            <Pressable onPress={pickCover} style={styles.coverPicker}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} />
              ) : (
                <>
                  <Text style={styles.coverTitle}>북룸 커버 선택</Text>
                  <Text style={styles.coverCopy}>사진 보관함에서 커버 이미지를 불러옵니다.</Text>
                </>
              )}
            </Pressable>

            {coverUri ? (
              <Pressable
                disabled={isUploading}
                onPress={uploadCover}
                style={[styles.uploadButton, isUploading ? styles.uploadButtonDisabled : null]}
              >
                {isUploading ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={styles.uploadButtonText}>
                  {uploadedCover ? 'R2 업로드 다시 실행' : 'R2에 커버 업로드'}
                </Text>
              </Pressable>
            ) : null}

            {uploadedCover ? (
              <View style={styles.statusPanel}>
                <Text style={styles.statusTitle}>업로드 완료</Text>
                <Text style={styles.statusCopy}>{uploadedCover.objectPath}</Text>
              </View>
            ) : null}

            {uploadError ? (
              <View style={[styles.statusPanel, styles.errorPanel]}>
                <Text style={styles.errorTitle}>업로드 실패</Text>
                <Text style={styles.errorCopy}>{uploadError}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={isCreating}
              onPress={createReadingRoom}
              style={[styles.createButton, isCreating ? styles.uploadButtonDisabled : null]}
            >
              {isCreating ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.createButtonText}>북룸 생성</Text>
            </Pressable>

            {createError ? (
              <View style={[styles.statusPanel, styles.errorPanel]}>
                <Text style={styles.errorTitle}>생성 실패</Text>
                <Text style={styles.errorCopy}>{createError}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  header: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#142326',
    fontSize: 33,
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
  coverPicker: {
    alignItems: 'center',
    backgroundColor: '#113F35',
    borderRadius: 30,
    height: 330,
    justifyContent: 'center',
    marginTop: 30,
    overflow: 'hidden',
    padding: 28,
  },
  formPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 24,
    padding: 18,
  },
  scanChoice: {
    alignItems: 'center',
    backgroundColor: '#F2ECE1',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
    padding: 14,
  },
  scanChoiceCopy: {
    flex: 1,
  },
  scanChoiceTitle: {
    color: '#142326',
    fontSize: 16,
    fontWeight: '900',
  },
  scanChoiceText: {
    color: '#66716E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  scanButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  isbnChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#123D31',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  isbnLabel: {
    color: '#F4D38A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  isbnValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  isbnRemove: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  lookupPanel: {
    alignItems: 'center',
    backgroundColor: '#F2ECE1',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  lookupText: {
    color: '#5E6766',
    fontSize: 13,
    fontWeight: '800',
  },
  selectedBookPanel: {
    alignItems: 'center',
    backgroundColor: '#123D31',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 13,
    padding: 12,
  },
  selectedBookImage: {
    borderRadius: 14,
    height: 108,
    width: 74,
  },
  selectedBookImageFallback: {
    alignItems: 'center',
    backgroundColor: '#E7DED0',
    borderRadius: 14,
    height: 108,
    justifyContent: 'center',
    width: 74,
  },
  selectedBookImageText: {
    color: '#7A6E62',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedBookCopy: {
    flex: 1,
  },
  selectedBookTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  selectedBookMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  selectedBookNote: {
    color: '#F4D38A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
  },
  lookupError: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  spacedLabel: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F7F2EA',
    borderColor: '#E6DDCF',
    borderRadius: 16,
    borderWidth: 1,
    color: '#142326',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  uploadButtonDisabled: {
    opacity: 0.68,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  statusPanel: {
    backgroundColor: '#E8F4EF',
    borderColor: '#B8D8CC',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  statusTitle: {
    color: '#116653',
    fontSize: 15,
    fontWeight: '900',
  },
  statusCopy: {
    color: '#33514A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  errorPanel: {
    backgroundColor: '#FFF0EA',
    borderColor: '#F3C2AE',
  },
  errorTitle: {
    color: '#A43D20',
    fontSize: 15,
    fontWeight: '900',
  },
  errorCopy: {
    color: '#7C3B29',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  coverCopy: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 10,
    textAlign: 'center',
  },
  label: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
