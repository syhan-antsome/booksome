import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import {
  getMarketListing,
  getOrCreateMarketThread,
  type MarketListing,
} from '../../src/services/market';

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const listingId = Array.isArray(id) ? id[0] : id;
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningThread, setIsOpeningThread] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMine = Boolean(session?.user.id && listing?.sellerId === session.user.id);

  useFocusEffect(
    useCallback(() => {
      if (!listingId) return undefined;

      let isMounted = true;

      setIsLoading(true);
      setErrorMessage(null);

      getMarketListing(listingId)
        .then((nextListing) => {
          if (isMounted) setListing(nextListing);
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
    }, [listingId]),
  );

  const openInquiry = async () => {
    if (!session?.user.id) {
      router.push('/auth');
      return;
    }

    if (!listing) return;

    setIsOpeningThread(true);
    setErrorMessage(null);

    try {
      const thread = await getOrCreateMarketThread(session.user.id, listing);
      router.push(`/market/chat/${thread.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '문의방을 열지 못했습니다.'));
    } finally {
      setIsOpeningThread(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="BookSome Bookstore"
          subtitle="가까운 독자와 직접 이야기합니다."
          title="책가게"
          tone="clay"
        />

        {!session ? (
          <AuthRequired
            title="책가게 문의는 로그인 후 가능합니다."
            copy="안전한 대화와 거래 상태 관리를 위해 계정이 필요합니다."
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator color="#103D2B" />
            <Text style={styles.loadingText}>책 정보를 펼치는 중입니다</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {listing ? (
          <>
            <View style={styles.photoStage}>
              {listing.imageUrl ? (
                <Image resizeMode="cover" source={{ uri: listing.imageUrl }} style={styles.photo} />
              ) : (
                <View style={styles.photoFallback}>
                  <Text style={styles.photoFallbackText}>BOOK</Text>
                </View>
              )}
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>{listing.title}</Text>
              {listing.author ? <Text style={styles.author}>{listing.author}</Text> : null}
              <Text style={styles.price}>{formatListingPrice(listing)}</Text>
              <View style={styles.locationBlock}>
                <Text style={styles.locationLabel}>거래 지역</Text>
                <Text style={styles.locationValue}>{listing.areaLabel}</Text>
              </View>
            </View>

            <View style={styles.metaLine}>
              <Text style={styles.metaText}>{listing.type === 'wanted' ? '찾아요' : listing.price === 0 ? '나눔' : '판매'}</Text>
              {listing.conditionLabel ? <Text style={styles.metaText}>{listing.conditionLabel}</Text> : null}
              <Text style={styles.metaText}>{formatDate(listing.createdAt)}</Text>
            </View>

            {listing.description ? (
              <View style={styles.descriptionBlock}>
                <Text style={styles.description}>{listing.description}</Text>
              </View>
            ) : null}

            {isMine ? (
              <View style={styles.ownerActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/market/new',
                      params: { editId: listing.id },
                    })
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>수정하기</Text>
                </Pressable>
                <Text style={styles.ownerHint}>거래 지역, 가격, 책 사진을 다시 정리할 수 있습니다.</Text>
              </View>
            ) : (
              <Pressable
                disabled={isOpeningThread}
                onPress={openInquiry}
                style={styles.inquiryButton}
              >
                {isOpeningThread ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.inquiryText}>문의하기</Text>
                )}
              </Pressable>
            )}
          </>
        ) : null}
      </ScrollView>
      <BottomNavigation active="market" />
    </SafeAreaView>
  );
}

function formatListingPrice(item: MarketListing) {
  if (item.type === 'wanted') return '찾아요';
  if (item.price === 0) return '나눔';
  return `${(item.price ?? 0).toLocaleString('ko-KR')}원`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}.${date.getDate()}`;
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
  content: {
    padding: 20,
    paddingBottom: 124,
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: '#526154',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  photoStage: {
    backgroundColor: '#D8BE88',
    borderRadius: 30,
    minHeight: 318,
    overflow: 'hidden',
  },
  photo: {
    height: 318,
    width: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    height: 318,
    justifyContent: 'center',
  },
  photoFallbackText: {
    color: '#103D2B',
    fontSize: 18,
    fontWeight: '900',
  },
  titleBlock: {
    borderBottomColor: 'rgba(143,106,66,0.18)',
    borderBottomWidth: 1,
    paddingBottom: 20,
    paddingTop: 22,
  },
  title: {
    color: '#14251B',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: 8,
  },
  author: {
    color: '#667167',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  price: {
    color: '#103D2B',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 14,
  },
  locationBlock: {
    borderTopColor: 'rgba(143,106,66,0.16)',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 14,
  },
  locationLabel: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  locationValue: {
    color: '#103D2B',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginTop: 5,
  },
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 16,
  },
  metaText: {
    color: '#7D6B55',
    fontSize: 13,
    fontWeight: '900',
  },
  descriptionBlock: {
    paddingVertical: 12,
  },
  description: {
    color: '#364338',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 25,
  },
  inquiryButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 56,
  },
  inquiryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  ownerActions: {
    marginTop: 24,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 56,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  ownerHint: {
    color: '#667167',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
    textAlign: 'center',
  },
});
