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
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { lookupBookByIsbn, searchBooksByTitle, type BookSearchItem } from '../../src/services/books';
import { createRoom } from '../../src/services/rooms';

export default function CreateRoomScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ isbn13?: string }>();
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn13, setIsbn13] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookSearchItem | null>(null);
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchItem[]>([]);
  const [firstQuestion, setFirstQuestion] = useState('');
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookLookupError, setBookLookupError] = useState<string | null>(null);
  const [bookSearchError, setBookSearchError] = useState<string | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  useEffect(() => {
    const scannedIsbn = Array.isArray(params.isbn13) ? params.isbn13[0] : params.isbn13;
    if (scannedIsbn) {
      setIsbn13(scannedIsbn);
      void applyBookLookup(scannedIsbn);
    }
  }, [params.isbn13]);

  const selectBook = (book: BookSearchItem) => {
    setSelectedBook(book);
    setBookSearchQuery(book.title);
    setBookTitle(book.title);
    setAuthor(book.author);
    setIsbn13(book.isbn);
    setBookSearchResults([]);
    setBookLookupError(null);
    setBookSearchError(null);
  };

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

      selectBook(book);
    } catch (error) {
      setBookLookupError(getErrorMessage(error, '도서 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLookingUpBook(false);
    }
  };

  const searchBooks = async () => {
    setBookSearchError(null);
    setBookLookupError(null);

    try {
      setIsSearchingBooks(true);
      setBookSearchResults([]);

      const result = await searchBooksByTitle(bookSearchQuery);
      setBookSearchResults(result.items);

      if (result.items.length === 0) {
        setBookSearchError('검색 결과가 없습니다. 직접 입력으로 계속할 수 있습니다.');
      }
    } catch (error) {
      setBookSearchError(getErrorMessage(error, '책 제목으로 도서를 찾지 못했습니다.'));
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const updateBookSearchQuery = (value: string) => {
    setBookSearchQuery(value);
    setBookSearchResults([]);
    setBookSearchError(null);
  };

  const updateBookTitle = (value: string) => {
    setBookTitle(value);

    if (selectedBook && value !== selectedBook.title) {
      setSelectedBook(null);
      setIsbn13('');
    }
  };

  const updateAuthor = (value: string) => {
    setAuthor(value);

    if (selectedBook && value !== selectedBook.author) {
      setSelectedBook(null);
      setIsbn13('');
    }
  };

  const enterBookroom = async () => {
    if (!session) return;

    if (!bookTitle.trim() || !author.trim()) {
      setEntryError('책 제목과 저자는 꼭 필요합니다.');
      return;
    }

    setIsEntering(true);
    setEntryError(null);

    try {
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
        roomTitle: bookTitle,
        roomSubtitle: author,
        roomDescription: selectedBook?.description ?? '',
        firstQuestion,
        coverPath: null,
      });

      router.replace(`/room/${room.slug}`);
    } catch (error) {
      setEntryError(getErrorMessage(error, '책장에 들어가지 못했습니다.'));
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Find Bookroom"
          subtitle="책을 찾으면 이미 열린 책장으로 들어갑니다."
          title="책장 찾기"
          tone="forest"
        />

        {!session ? (
          <AuthRequired
            title="로그인 후 책장에 머물 수 있습니다."
            copy="내가 남긴 문장과 질문을 내 책자리로 이어갑니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.formPanel}>
              <Text style={styles.label}>책 검색</Text>
              <View style={styles.scanChoice}>
                <View style={styles.scanChoiceCopy}>
                  <Text style={styles.scanChoiceTitle}>ISBN으로 책 찾기</Text>
                  <Text style={styles.scanChoiceText}>
                    바코드를 스캔하면 이미 열린 책장을 먼저 찾습니다.
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
              {bookLookupError ? <Text style={styles.lookupError}>{bookLookupError}</Text> : null}
              <View style={styles.titleSearchRow}>
                <TextInput
                  onChangeText={updateBookSearchQuery}
                  onSubmitEditing={searchBooks}
                  placeholder="책 제목으로 검색"
                  placeholderTextColor="#A49B8D"
                  returnKeyType="search"
                  style={[styles.input, styles.titleSearchInput]}
                  value={bookSearchQuery}
                />
                <Pressable
                  disabled={isSearchingBooks}
                  onPress={searchBooks}
                  style={[styles.titleSearchButton, isSearchingBooks ? styles.uploadButtonDisabled : null]}
                >
                  {isSearchingBooks ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <Text style={styles.titleSearchButtonText}>검색</Text>
                </Pressable>
              </View>
              {bookSearchError ? <Text style={styles.lookupError}>{bookSearchError}</Text> : null}
              {bookSearchResults.length > 0 ? (
                <View style={styles.bookSearchResults}>
                  {bookSearchResults.map((book, index) => (
                    <Pressable
                      key={`${book.source}-${book.isbn}-${index}`}
                      onPress={() => selectBook(book)}
                      style={styles.bookSearchResult}
                    >
                      {book.imageUrl ? (
                        <Image resizeMode="cover" source={{ uri: book.imageUrl }} style={styles.bookSearchResultImage} />
                      ) : (
                        <View style={styles.bookSearchResultImageFallback}>
                          <Text style={styles.bookSearchResultImageText}>BOOK</Text>
                        </View>
                      )}
                      <View style={styles.bookSearchResultCopy}>
                        <Text style={styles.bookSearchResultTitle} numberOfLines={2}>
                          {book.title}
                        </Text>
                        <Text style={styles.bookSearchResultMeta} numberOfLines={1}>
                          {book.author}
                          {book.publisher ? ` · ${book.publisher}` : ''}
                        </Text>
                        <Text style={styles.bookSearchResultIsbn} numberOfLines={1}>
                          ISBN {book.isbn}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={[styles.label, styles.spacedLabel]}>{selectedBook ? '선택한 책' : '직접 입력'}</Text>
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
                    <Text style={styles.selectedBookNote}>이미 열린 책장이 있으면 바로 그곳으로 이동합니다.</Text>
                  </View>
                </View>
              ) : null}
              <TextInput
                onChangeText={updateBookTitle}
                placeholder="책 제목"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={bookTitle}
              />
              <TextInput
                onChangeText={updateAuthor}
                placeholder="저자"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={author}
              />

              <Text style={[styles.label, styles.spacedLabel]}>첫 흔적</Text>
              <TextInput
                multiline
                onChangeText={setFirstQuestion}
                placeholder="이 책이 남긴 질문이 있다면 남겨보세요. 비워도 책장에 머물 수 있습니다."
                placeholderTextColor="#A49B8D"
                style={[styles.input, styles.textArea]}
                value={firstQuestion}
              />
            </View>

            <Pressable
              disabled={isEntering}
              onPress={enterBookroom}
              style={[styles.createButton, isEntering ? styles.uploadButtonDisabled : null]}
            >
              {isEntering ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.createButtonText}>이 책장에 머물기</Text>
            </Pressable>

            {entryError ? (
              <View style={[styles.statusPanel, styles.errorPanel]}>
                <Text style={styles.errorTitle}>입장 실패</Text>
                <Text style={styles.errorCopy}>{entryError}</Text>
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
  titleSearchRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  titleSearchInput: {
    flex: 1,
  },
  titleSearchButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 74,
    paddingHorizontal: 14,
  },
  titleSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  bookSearchResults: {
    backgroundColor: '#F7F2EA',
    borderColor: '#E6DDCF',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bookSearchResult: {
    borderBottomColor: '#E6DDCF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  bookSearchResultImage: {
    borderRadius: 10,
    height: 76,
    width: 52,
  },
  bookSearchResultImageFallback: {
    alignItems: 'center',
    backgroundColor: '#E7DED0',
    borderRadius: 10,
    height: 76,
    justifyContent: 'center',
    width: 52,
  },
  bookSearchResultImageText: {
    color: '#7A6E62',
    fontSize: 10,
    fontWeight: '900',
  },
  bookSearchResultCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  bookSearchResultTitle: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  bookSearchResultMeta: {
    color: '#68716D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  bookSearchResultIsbn: {
    color: '#116653',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
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
  uploadButtonDisabled: {
    opacity: 0.68,
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
  label: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
