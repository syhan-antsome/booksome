import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Touch as Pressable, Input as TextInput } from '../../src/components/app-ui';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

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
        coverPath: null,
      });

      router.replace(`/room/${room.slug}`);
    } catch (error) {
      setEntryError(getErrorMessage(error, '책 이야기를 열지 못했습니다.'));
    } finally {
      setIsEntering(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Find Bookroom"
          subtitle="책을 찾아 감상과 질문을 나눠보세요."
          title="책 이야기 찾기"
          tone="forest"
        />

        {!session ? (
          <AuthRequired
            title="다른 독자와 이야기해요"
            copy="로그인하고 같은 책을 읽는 사람들과 생각을 나눠보세요."
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
                    책 뒷면을 스캔해서 이 책의 이야기를 찾아요.
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
                  <ActivityIndicator color={uiColors.action} />
                  <Text style={styles.lookupText}>도서 정보를 불러오는 중입니다</Text>
                </View>
              ) : null}
              {bookLookupError ? <Text style={styles.lookupError}>{bookLookupError}</Text> : null}
              <View style={styles.titleSearchRow}>
                <TextInput
                  onChangeText={updateBookSearchQuery}
                  onSubmitEditing={searchBooks}
                  placeholder="책 제목으로 검색"
                  placeholderTextColor={uiColors.muted}
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
                    <Text style={styles.selectedBookNote}>이미 열린 이야기가 있으면 그곳으로 연결돼요.</Text>
                  </View>
                </View>
              ) : null}
              <TextInput
                onChangeText={updateBookTitle}
                placeholder="책 제목"
                placeholderTextColor={uiColors.muted}
                style={styles.input}
                value={bookTitle}
              />
              <TextInput
                onChangeText={updateAuthor}
                placeholder="저자"
                placeholderTextColor={uiColors.muted}
                style={styles.input}
                value={author}
              />
            </View>

            <Pressable
              disabled={isEntering}
              onPress={enterBookroom}
              style={[styles.createButton, isEntering ? styles.uploadButtonDisabled : null]}
            >
              {isEntering ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.createButtonText}>책 이야기 시작하기</Text>
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
    backgroundColor: uiColors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  formPanel: {
    gap: 18,
    marginTop: 24,
  },
  scanChoice: {
    alignItems: 'center',
    backgroundColor: uiColors.background,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
    padding: 14,
  },
  scanChoiceCopy: {
    flex: 1,
  },
  scanChoiceTitle: {
    color: uiColors.ink,
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: uiColors.action,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  scanButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  isbnChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: uiColors.ink,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  isbnLabel: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  isbnValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  isbnRemove: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  lookupPanel: {
    alignItems: 'center',
    backgroundColor: uiColors.background,
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
    backgroundColor: uiColors.accentSoft,
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
    backgroundColor: uiColors.line,
    borderRadius: 14,
    height: 108,
    justifyContent: 'center',
    width: 74,
  },
  selectedBookImageText: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedBookCopy: {
    flex: 1,
  },
  selectedBookTitle: {
    color: uiColors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  selectedBookMeta: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  selectedBookNote: {
    color: uiColors.action,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  lookupError: {
    color: uiColors.danger,
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
    backgroundColor: uiColors.action,
    borderRadius: 24,
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
    fontWeight: '700',
  },
  bookSearchResults: {
    backgroundColor: uiColors.background,
    borderColor: uiColors.line,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bookSearchResult: {
    borderBottomColor: uiColors.line,
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
    backgroundColor: uiColors.line,
    borderRadius: 10,
    height: 76,
    justifyContent: 'center',
    width: 52,
  },
  bookSearchResultImageText: {
    color: uiColors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  bookSearchResultCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  bookSearchResultTitle: {
    color: uiColors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  bookSearchResultMeta: {
    color: '#68716D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  bookSearchResultIsbn: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  spacedLabel: {
    marginTop: 10,
  },
  input: {
    backgroundColor: uiColors.background,
    borderColor: uiColors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: uiColors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.68,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
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
    fontWeight: '700',
  },
  statusPanel: {
    backgroundColor: uiColors.accentSoft,
    borderColor: uiColors.accentSoft,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  errorPanel: {
    backgroundColor: uiColors.accentSoft,
    borderColor: uiColors.accentSoft,
  },
  errorTitle: {
    color: uiColors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  errorCopy: {
    color: '#7C3B29',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  label: {
    color: uiColors.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
