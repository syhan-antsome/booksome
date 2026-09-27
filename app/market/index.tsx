import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Touch as Pressable, Input as TextInput } from '../../src/components/app-ui';
import { ScreenHeader } from '../../src/components/screen-header';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

import { AuthRequired } from '../../src/components/auth-required';
import { useAuth } from '../../src/providers/auth-provider';
import {
  listMarketListings,
  type MarketListing,
  type MarketListingFilter,
} from '../../src/services/market';

const marketFilters: Array<{ label: string; value: MarketListingFilter }> = [
  { label: '전체', value: 'all' },
  { label: '판매', value: 'sale' },
  { label: '나눔', value: 'free' },
  { label: '찾아요', value: 'wanted' },
];

const activityAreaStorageKey = 'booksome.market.activityArea';

export default function MarketScreen() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<MarketListingFilter>('all');
  const [activityArea, setActivityArea] = useState('');
  const [activityAreaInput, setActivityAreaInput] = useState('');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(activityAreaStorageKey)
      .then((savedArea) => {
        if (!isMounted || !savedArea) return;
        setActivityArea(savedArea);
        setActivityAreaInput(savedArea);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) {
        setListings([]);
        return undefined;
      }

      let isMounted = true;

      setIsLoadingListings(true);
      setListingError(null);

      listMarketListings(filter)
        .then((nextListings) => {
          if (isMounted) setListings(nextListings);
        })
        .catch((error) => {
          if (isMounted) setListingError(getErrorMessage(error, '북마켓 목록을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoadingListings(false);
        });

      return () => {
        isMounted = false;
      };
    }, [filter, session?.user.id]),
  );

  const visibleListings = useMemo(() => {
    const areaTokens = activityArea
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (areaTokens.length === 0) return listings;

    return listings.filter((item) => {
      const area = item.areaLabel.toLowerCase();
      return areaTokens.every((token) => area.includes(token));
    });
  }, [activityArea, listings]);

  const applyActivityArea = () => {
    const nextArea = activityAreaInput.trim();
    setActivityArea(nextArea);

    if (nextArea) {
      void AsyncStorage.setItem(activityAreaStorageKey, nextArea);
    } else {
      void AsyncStorage.removeItem(activityAreaStorageKey);
    }
  };

  const clearActivityArea = () => {
    setActivityArea('');
    setActivityAreaInput('');
    void AsyncStorage.removeItem(activityAreaStorageKey);
  };

  const openNewListing = () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    router.push('/market/new');
  };

  const openMyBookstore = () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    router.push('/market/manage');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="북마켓" subtitle="읽은 책이 다음 독자를 만나는 곳" />
        <View style={{ flexDirection: 'row', gap: 10 }}><Button title="내 거래" variant="secondary" onPress={openMyBookstore} style={{ flex: 1 }} /><Button title="책 내놓기" icon="add-outline" onPress={openNewListing} style={{ flex: 1 }} /></View>

        {!session ? (
          <AuthRequired
            title="북마켓는 로그인 후 이용합니다."
            copy="동네 기반으로 책을 올리고 문의하기 위해 계정이 필요합니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.locationPanel}>
              <View style={styles.locationCopy}>
                <Text style={styles.locationLabel}>활동 지역</Text>
                <TextInput
                  onChangeText={setActivityAreaInput}
                  onSubmitEditing={applyActivityArea}
                  placeholder="예: 서울 마포구, 연남동, 판교역"
                  placeholderTextColor={uiColors.muted}
                  returnKeyType="done"
                  style={styles.locationInput}
                  value={activityAreaInput}
                />
                <Text style={styles.locationHint}>
                  동네 이름을 입력하면 가까운 책을 찾아요.
                </Text>
              </View>
              <View style={styles.locationActions}>
                <Pressable onPress={applyActivityArea} style={styles.locationButton}>
                  <Text style={styles.locationButtonText}>적용</Text>
                </Pressable>
                {activityArea ? (
                  <Pressable onPress={clearActivityArea} style={styles.locationGhostButton}>
                    <Text style={styles.locationGhostText}>전체</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.filterRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {marketFilters.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={[styles.filterChip, filter === item.value ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterText, filter === item.value ? styles.filterTextActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{activityArea ? `${activityArea} 북마켓` : '북마켓'}</Text>
              <Text style={styles.sectionMeta}>{visibleListings.length}권</Text>
            </View>

            {isLoadingListings ? (
              <View style={styles.loadingPanel}>
                <ActivityIndicator color={uiColors.action} />
                <Text style={styles.loadingText}>북마켓 책을 살펴보는 중입니다</Text>
              </View>
            ) : null}

            {listingError ? <Text style={styles.errorText}>{listingError}</Text> : null}

            {!isLoadingListings && visibleListings.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>{activityArea ? '이 지역에는 아직 책이 없습니다' : '아직 올라온 책이 없습니다'}</Text>
                <Text style={styles.emptyCopy}>첫 책을 올리면 북썸 북마켓가 조용히 문을 엽니다.</Text>
              </View>
            ) : null}

            <View style={styles.itemList}>
              {visibleListings.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/market/${item.id}`)}
                  style={styles.marketItem}
                >
                  <View style={styles.bookThumb}>
                    {item.imageUrl ? (
                      <Image resizeMode="cover" source={{ uri: item.imageUrl }} style={styles.bookThumbImage} />
                    ) : (
                      <>
                        <View style={styles.bookSpine} />
                        <Text style={styles.bookThumbText}>BOOK</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.itemLocationLine}>
                      <Text style={styles.itemLocationLabel}>거래 지역</Text>
                      <Text numberOfLines={1} style={styles.itemArea}>
                        {item.areaLabel}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>{formatListingPrice(item)}</Text>
                  </View>
                  <Text style={styles.itemArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatListingPrice(item: MarketListing) {
  if (item.type === 'wanted') return '찾아요';
  if (item.price === 0) return '나눔';
  return `${(item.price ?? 0).toLocaleString('ko-KR')}원`;
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
  content: {
    padding: 20,
    paddingBottom: 124,
  },
  locationPanel: {
    alignItems: 'center',
    backgroundColor: uiColors.accentSoft,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
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
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    minHeight: 34,
    paddingVertical: 0,
  },
  locationHint: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    height: 42,
    justifyContent: 'center',
    width: 58,
  },
  locationActions: {
    alignItems: 'center',
    gap: 8,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  locationGhostButton: {
    alignItems: 'center',
    borderColor: 'rgba(38,37,38,0.16)',
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  locationGhostText: {
    color: uiColors.action,
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    gap: 8,
    marginTop: 20,
    paddingRight: 20,
  },
  filterChip: {
    borderBottomColor: 'rgba(38,37,38,0.14)',
    borderBottomWidth: 2,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  filterChipActive: {
    borderBottomColor: uiColors.action,
  },
  filterText: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: uiColors.action,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 28,
  },
  sectionTitle: {
    color: uiColors.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionMeta: {
    color: uiColors.action,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 18,
  },
  loadingText: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyPanel: {
    borderTopColor: 'rgba(38,37,38,0.14)',
    borderTopWidth: 1,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: uiColors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyCopy: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  errorText: {
    color: uiColors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  itemList: {
    gap: 0,
  },
  marketItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(38,37,38,0.14)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 15,
    paddingVertical: 16,
  },
  bookThumb: {
    alignItems: 'center',
    backgroundColor: uiColors.accentSoft,
    borderRadius: 17,
    height: 82,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 62,
  },
  bookThumbImage: {
    height: '100%',
    width: '100%',
  },
  bookSpine: {
    backgroundColor: uiColors.action,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  bookThumbText: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
  },
  itemCopy: {
    flex: 1,
  },
  itemLocationLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  itemLocationLabel: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
  },
  itemArea: {
    color: uiColors.action,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  itemTitle: {
    color: uiColors.ink,
    fontSize: 17,
    fontWeight: '700',
  },
  itemPrice: {
    color: uiColors.action,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  itemArrow: {
    color: uiColors.action,
    fontSize: 30,
    fontWeight: '700',
    paddingRight: 4,
  },
});
