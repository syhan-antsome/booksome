import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { koreaRegions } from '../../src/data/korea-regions';
import { useAuth } from '../../src/providers/auth-provider';
import { searchBooksByTitle, type BookSearchItem } from '../../src/services/books';
import { createMeetup } from '../../src/services/meetups';

export default function NewMeetupScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    bookAuthor?: string;
    bookCoverUrl?: string;
    bookIsbn?: string;
    bookPublisher?: string;
    bookTitle?: string;
    bookTranslator?: string;
    meetupCity?: string;
    meetupDescription?: string;
    meetupDistrict?: string;
    meetupProvince?: string;
    meetupTitle?: string;
  }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchItem | null>(null);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookSearchError, setBookSearchError] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [regionScroll, setRegionScroll] = useState({ contentWidth: 0, layoutWidth: 0, offsetX: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedRegion = useMemo(
    () => koreaRegions.find((region) => region.province === selectedProvince) ?? null,
    [selectedProvince],
  );
  const city = useMemo(
    () => [selectedProvince, selectedDistrict].filter(Boolean).join(' '),
    [selectedDistrict, selectedProvince],
  );
  const canSubmit = useMemo(
    () =>
      Boolean(session?.user.id) &&
      Boolean(title.trim()) &&
      Boolean(selectedProvince && selectedDistrict) &&
      !isSubmitting,
    [isSubmitting, selectedDistrict, selectedProvince, session?.user.id, title],
  );
  const canScrollRegion = regionScroll.contentWidth > regionScroll.layoutWidth + 4;
  const showRegionScrollLeft = canScrollRegion && regionScroll.offsetX > 8;
  const showRegionScrollRight =
    canScrollRegion && regionScroll.offsetX < regionScroll.contentWidth - regionScroll.layoutWidth - 8;

  useEffect(() => {
    const nextTitle = getStringParam(params.meetupTitle);
    const nextDescription = getStringParam(params.meetupDescription);
    const nextProvince = getStringParam(params.meetupProvince);
    const nextDistrict = getStringParam(params.meetupDistrict);
    const nextBookTitle = getStringParam(params.bookTitle);

    if (nextTitle) setTitle(nextTitle);
    if (nextDescription) setDescription(nextDescription);
    if (nextProvince) setSelectedProvince(nextProvince);
    if (nextDistrict) setSelectedDistrict(nextDistrict);

    if (nextBookTitle) {
      const scannedBook: BookSearchItem = {
        author: getStringParam(params.bookAuthor),
        description: '',
        imageUrl: getStringParam(params.bookCoverUrl) || null,
        isbn: getStringParam(params.bookIsbn),
        link: null,
        publishedDate: '',
        publisher: getStringParam(params.bookPublisher),
        source: 'naver',
        sourcePayload: null,
        title: nextBookTitle,
        translator: getStringParam(params.bookTranslator) || null,
      };

      setSelectedBook(scannedBook);
      setBookSearchQuery(scannedBook.title);
      setBookSearchResults([]);
    }
  }, [
    params.bookAuthor,
    params.bookCoverUrl,
    params.bookIsbn,
    params.bookPublisher,
    params.bookTitle,
    params.bookTranslator,
    params.meetupDescription,
    params.meetupDistrict,
    params.meetupProvince,
    params.meetupTitle,
  ]);

  const searchBooks = async () => {
    setBookSearchError(null);
    setBookSearchResults([]);

    try {
      setIsSearchingBooks(true);
      const result = await searchBooksByTitle(bookSearchQuery);
      setBookSearchResults(result.items);

      if (result.items.length === 0) {
        setBookSearchError('검색 결과가 없습니다.');
      }
    } catch (error) {
      setBookSearchError(getErrorMessage(error, '책을 찾지 못했습니다.'));
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const selectBook = (book: BookSearchItem) => {
    setSelectedBook(book);
    setBookSearchQuery(book.title);
    setBookSearchResults([]);
    setBookSearchError(null);
  };

  const chooseProvince = (province: string) => {
    setSelectedProvince(province);
    setSelectedDistrict('');
  };

  const submitMeetup = async () => {
    if (!session?.user.id) {
      router.push('/auth');
      return;
    }

    if (!title.trim() || !selectedProvince || !selectedDistrict) {
      setErrorMessage('이름과 지역은 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createMeetup({
        hostId: session.user.id,
        title,
        startingBookTitle: selectedBook?.title ?? null,
        startingBookAuthor: selectedBook?.author ?? null,
        startingBookPublisher: selectedBook?.publisher ?? null,
        startingBookTranslator: selectedBook?.translator ?? null,
        startingBookIsbn: selectedBook?.isbn ?? null,
        startingBookCoverUrl: selectedBook?.imageUrl ?? null,
        city,
        description,
      });
      router.replace('/meetups');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '북모임을 만들지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="새 모임" tone="ink" />

          {!session ? (
            <AuthRequired
              title="로그인 후 만들 수 있습니다."
              copy="닉네임으로 활동하는 계정이 필요합니다."
            />
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>이름</Text>
                <View style={styles.fieldBody}>
                  <TextInput
                    onChangeText={setTitle}
                    placeholder="모임 이름을 적어 주세요."
                    placeholderTextColor="#8A918C"
                    style={styles.input}
                    value={title}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.fieldTopRow}>
                  <Text style={styles.label}>시작 책</Text>
                  <Link
                    asChild
                    href={{
                      pathname: '/scan',
                      params: {
                        context: 'meetup-book',
                        meetupDescription: description,
                        meetupDistrict: selectedDistrict,
                        meetupProvince: selectedProvince,
                        meetupTitle: title,
                      },
                    }}
                  >
                    <Pressable accessibilityLabel="ISBN 스캔" style={styles.iconAction}>
                      <Text style={styles.iconActionText}>⌕</Text>
                    </Pressable>
                  </Link>
                </View>
                <View style={styles.fieldBody}>
                  {selectedBook ? (
                    <View style={styles.selectedBook}>
                      {selectedBook.imageUrl ? (
                        <Image source={{ uri: selectedBook.imageUrl }} style={styles.selectedBookCover} />
                      ) : null}
                      <View style={styles.selectedBookCopy}>
                        <Text numberOfLines={1} style={styles.selectedBookTitle}>
                          {selectedBook.title}
                        </Text>
                        {getBookMetaText(selectedBook) ? (
                          <Text numberOfLines={1} style={styles.selectedBookMeta}>
                            {getBookMetaText(selectedBook)}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable hitSlop={8} onPress={() => setSelectedBook(null)}>
                        <Text style={styles.clearBookText}>×</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.searchRow}>
                    <TextInput
                      onChangeText={(value) => {
                        setBookSearchQuery(value);
                        setBookSearchResults([]);
                        setBookSearchError(null);
                      }}
                      onSubmitEditing={searchBooks}
                      placeholder="책 이름 검색"
                      placeholderTextColor="#8A918C"
                      returnKeyType="search"
                      style={[styles.input, styles.searchInput]}
                      value={bookSearchQuery}
                    />
                    <Pressable disabled={isSearchingBooks} onPress={searchBooks} style={styles.searchButton}>
                      {isSearchingBooks ? (
                        <ActivityIndicator color="#142326" />
                      ) : (
                        <Text style={styles.searchButtonText}>검색</Text>
                      )}
                    </Pressable>
                  </View>
                  {bookSearchError ? <Text style={styles.inlineErrorText}>{bookSearchError}</Text> : null}
                  {bookSearchResults.length > 0 ? (
                    <View style={styles.bookResults}>
                      {bookSearchResults.map((book) => (
                        <Pressable
                          key={`${book.source}-${book.isbn}-${book.title}`}
                          onPress={() => selectBook(book)}
                          style={styles.bookResult}
                        >
                          {book.imageUrl ? <Image source={{ uri: book.imageUrl }} style={styles.bookResultCover} /> : null}
                          <View style={styles.bookResultCopy}>
                            <Text numberOfLines={1} style={styles.bookResultTitle}>
                              {book.title}
                            </Text>
                            {getBookMetaText(book) ? (
                              <Text numberOfLines={1} style={styles.bookResultMeta}>
                                {getBookMetaText(book)}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>지역</Text>
                <View style={styles.fieldBody}>
                  <Text style={styles.subLabel}>시도</Text>
                  <View style={styles.regionRailWrap}>
                    {showRegionScrollLeft ? (
                      <LinearGradient
                        colors={['#F9F6F0', 'rgba(249,246,240,0)']}
                        pointerEvents="none"
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.regionFade, styles.regionFadeLeft]}
                      />
                    ) : null}
                    <ScrollView
                      contentContainerStyle={styles.regionRailContent}
                      horizontal
                      onContentSizeChange={(contentWidth) =>
                        setRegionScroll((current) => ({ ...current, contentWidth }))
                      }
                      onLayout={(event) => {
                        const layoutWidth = event.nativeEvent.layout.width;
                        setRegionScroll((current) => ({ ...current, layoutWidth }));
                      }}
                      onScroll={(event) => {
                        const offsetX = Math.max(0, event.nativeEvent.contentOffset.x);
                        setRegionScroll((current) => ({ ...current, offsetX }));
                      }}
                      scrollEventThrottle={16}
                      showsHorizontalScrollIndicator={false}
                      style={styles.regionRail}
                    >
                      {koreaRegions.map((region) => {
                        const isActive = selectedProvince === region.province;

                        return (
                          <Pressable
                            key={region.province}
                            onPress={() => chooseProvince(region.province)}
                            style={[styles.regionChip, isActive ? styles.regionChipActive : null]}
                          >
                            <Text style={[styles.regionChipText, isActive ? styles.regionChipTextActive : null]}>
                              {region.province}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    {showRegionScrollRight ? (
                      <LinearGradient
                        colors={['rgba(249,246,240,0)', '#F9F6F0']}
                        pointerEvents="none"
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.regionFade, styles.regionFadeRight]}
                      />
                    ) : null}
                  </View>
                  {selectedRegion ? (
                    <>
                      <Text style={[styles.subLabel, styles.districtLabel]}>시군구</Text>
                      <View style={styles.districtGrid}>
                        {selectedRegion.districts.map((district) => {
                          const isActive = selectedDistrict === district;

                          return (
                            <Pressable
                              key={district}
                              onPress={() => setSelectedDistrict(district)}
                              style={[styles.districtChip, isActive ? styles.districtChipActive : null]}
                            >
                              <Text style={[styles.districtChipText, isActive ? styles.districtChipTextActive : null]}>
                                {district}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>소개</Text>
                <View style={styles.fieldBody}>
                  <TextInput
                    multiline
                    onChangeText={setDescription}
                    placeholder="이 모임에 대한 소개를 알려주세요."
                    placeholderTextColor="#8A918C"
                    style={[styles.input, styles.textArea]}
                    textAlignVertical="top"
                    value={description}
                  />
                </View>
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable
                disabled={!canSubmit}
                onPress={submitMeetup}
                style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : null]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>만들기</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavigation active="meetups" />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getBookMetaText(book: BookSearchItem) {
  return [
    book.author,
    book.publisher,
    book.translator ? `${book.translator} 옮김` : null,
  ]
    .filter(Boolean)
    .join(' · ');
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
    padding: 20,
    paddingBottom: 112,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 7,
  },
  fieldTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#7B837E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  subLabel: {
    color: '#8A918C',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
  },
  districtLabel: {
    marginTop: 12,
  },
  fieldBody: {
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderColor: 'rgba(20,35,38,0.1)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  iconAction: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  iconActionText: {
    color: '#142326',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 21,
  },
  input: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '400',
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 3,
  },
  selectedBook: {
    alignItems: 'center',
    borderBottomColor: 'rgba(20,35,38,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 6,
    paddingBottom: 9,
  },
  selectedBookCover: {
    borderRadius: 3,
    height: 50,
    width: 36,
  },
  selectedBookCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedBookTitle: {
    color: '#142326',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  selectedBookMeta: {
    color: '#697370',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 2,
  },
  clearBookText: {
    color: '#8C3E38',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    alignItems: 'center',
    minHeight: 34,
    justifyContent: 'center',
    minWidth: 46,
  },
  searchButtonText: {
    color: '#142326',
    fontSize: 13,
    fontWeight: '500',
  },
  inlineErrorText: {
    color: '#8C3E38',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 4,
  },
  bookResults: {
    borderTopColor: 'rgba(20,35,38,0.08)',
    borderTopWidth: 1,
    marginTop: 7,
  },
  bookResult: {
    alignItems: 'center',
    borderBottomColor: 'rgba(20,35,38,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingVertical: 8,
  },
  bookResultCover: {
    borderRadius: 3,
    height: 44,
    width: 32,
  },
  bookResultCopy: {
    flex: 1,
    minWidth: 0,
  },
  bookResultTitle: {
    color: '#142326',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  bookResultMeta: {
    color: '#697370',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 2,
  },
  regionRailWrap: {
    marginHorizontal: -11,
    position: 'relative',
  },
  regionRail: {
    marginHorizontal: 0,
  },
  regionRailContent: {
    paddingHorizontal: 11,
    paddingRight: 40,
  },
  regionFade: {
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 34,
    zIndex: 2,
  },
  regionFadeLeft: {
    left: 0,
  },
  regionFadeRight: {
    right: 0,
  },
  regionChip: {
    borderBottomColor: 'rgba(20,35,38,0.16)',
    borderBottomWidth: 1,
    marginRight: 13,
    paddingBottom: 7,
    paddingTop: 4,
  },
  regionChipActive: {
    borderBottomColor: '#142326',
  },
  regionChipText: {
    color: '#6A7473',
    fontSize: 13,
    fontWeight: '400',
  },
  regionChipTextActive: {
    color: '#142326',
    fontWeight: '600',
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
  },
  districtChip: {
    borderColor: 'rgba(20,35,38,0.12)',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  districtChipActive: {
    backgroundColor: '#142326',
    borderColor: '#142326',
  },
  districtChipText: {
    color: '#53615E',
    fontSize: 12,
    fontWeight: '400',
  },
  districtChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textArea: {
    lineHeight: 21,
    minHeight: 96,
  },
  errorText: {
    color: '#8C3E38',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 6,
    height: 42,
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#AEB5AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
