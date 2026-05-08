import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  listMarketThreadSummaries,
  listMyMarketListings,
  updateMarketListingStatus,
  type MarketListing,
  type MarketListingStatus,
  type MarketThreadSummary,
} from '../../src/services/market';

type ManageTab = 'threads' | 'listings';

const tabs: Array<{ label: string; value: ManageTab }> = [
  { label: '문의함', value: 'threads' },
  { label: '내 책', value: 'listings' },
];

export default function MarketManageScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<ManageTab>('threads');
  const [threads, setThreads] = useState<MarketThreadSummary[]>([]);
  const [myListings, setMyListings] = useState<MarketListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadManageData = useCallback(() => {
    if (!session?.user.id) {
      setThreads([]);
      setMyListings([]);
      return undefined;
    }

    let isMounted = true;

    setIsLoading(true);
    setErrorMessage(null);

    Promise.all([
      listMarketThreadSummaries(session.user.id),
      listMyMarketListings(session.user.id),
    ])
      .then(([nextThreads, nextListings]) => {
        if (!isMounted) return;
        setThreads(nextThreads);
        setMyListings(nextListings);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getErrorMessage(error, '내 책가게 정보를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  useFocusEffect(loadManageData);

  const changeListingStatus = async (listing: MarketListing, status: MarketListingStatus) => {
    if (!session?.user.id) return;

    setIsUpdatingId(listing.id);
    setErrorMessage(null);

    try {
      const nextListing = await updateMarketListingStatus(session.user.id, listing.id, status);
      setMyListings((current) =>
        current.map((item) => (item.id === nextListing.id ? nextListing : item)),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '책 상태를 변경하지 못했습니다.'));
    } finally {
      setIsUpdatingId(null);
    }
  };

  const confirmHideListing = (listing: MarketListing) => {
    Alert.alert('목록에서 숨길까요?', '숨긴 책은 공개 목록에서 보이지 않습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '숨기기',
        onPress: () => void changeListingStatus(listing, 'hidden'),
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="My Bookstore"
          subtitle="문의와 내가 올린 책을 한곳에서 봅니다."
          title="내 책가게"
          tone="clay"
        />

        {!session ? (
          <AuthRequired
            title="내 책가게는 로그인 후 사용할 수 있습니다."
            copy="내가 보낸 문의와 올린 책이 계정에 연결됩니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.tabRail}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  style={[styles.tabButton, activeTab === tab.value ? styles.tabButtonActive : null]}
                >
                  <Text style={[styles.tabText, activeTab === tab.value ? styles.tabTextActive : null]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoading ? (
              <View style={styles.loadingPanel}>
                <ActivityIndicator color="#103D2B" />
                <Text style={styles.loadingText}>책가게를 정리하는 중입니다</Text>
              </View>
            ) : null}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {activeTab === 'threads' ? (
              <View style={styles.listBlock}>
                {threads.length === 0 && !isLoading ? (
                  <View style={styles.emptyBlock}>
                    <Text style={styles.emptyTitle}>아직 문의가 없습니다</Text>
                    <Text style={styles.emptyCopy}>책 상세에서 문의를 시작하면 이곳에 모입니다.</Text>
                  </View>
                ) : null}

                {threads.map((summary) => (
                  <Pressable
                    key={summary.thread.id}
                    onPress={() => router.push(`/market/chat/${summary.thread.id}`)}
                    style={styles.threadRow}
                  >
                    <View style={styles.threadThumb}>
                      {summary.listing?.imageUrl ? (
                        <Image resizeMode="cover" source={{ uri: summary.listing.imageUrl }} style={styles.thumbImage} />
                      ) : (
                        <Text style={styles.thumbText}>BOOK</Text>
                      )}
                    </View>
                    <View style={styles.threadCopy}>
                      <Text style={styles.threadRole}>
                        {summary.thread.sellerId === session.user.id ? '받은 문의' : '보낸 문의'}
                      </Text>
                      <Text numberOfLines={1} style={styles.rowTitle}>
                        {summary.listing?.title ?? '삭제된 책'}
                      </Text>
                      <Text numberOfLines={1} style={styles.rowMeta}>
                        {summary.latestMessage?.body ?? '아직 메시지가 없습니다'}
                      </Text>
                    </View>
                    <Text style={styles.rowTime}>{formatShortDate(summary.latestMessage?.createdAt ?? summary.thread.updatedAt)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.listBlock}>
                {myListings.length === 0 && !isLoading ? (
                  <View style={styles.emptyBlock}>
                    <Text style={styles.emptyTitle}>올린 책이 없습니다</Text>
                    <Text style={styles.emptyCopy}>책가게에 첫 책을 내놓아 보세요.</Text>
                  </View>
                ) : null}

                {myListings.map((listing) => (
                  <View key={listing.id} style={styles.myListingRow}>
                    <Pressable
                      onPress={() => router.push(`/market/${listing.id}`)}
                      style={styles.myListingMain}
                    >
                      <View style={styles.threadThumb}>
                        {listing.imageUrl ? (
                          <Image resizeMode="cover" source={{ uri: listing.imageUrl }} style={styles.thumbImage} />
                        ) : (
                          <Text style={styles.thumbText}>BOOK</Text>
                        )}
                      </View>
                      <View style={styles.threadCopy}>
                        <Text style={styles.threadRole}>{formatListingStatus(listing.status)}</Text>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                          {listing.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowMeta}>
                          {formatListingPrice(listing)}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowLocation}>
                          거래 지역 · {listing.areaLabel}
                        </Text>
                      </View>
                    </Pressable>

                    <ScrollView
                      contentContainerStyle={styles.statusActions}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/market/new',
                            params: { editId: listing.id },
                          })
                        }
                        style={styles.statusAction}
                      >
                        <Text style={styles.statusActionText}>수정</Text>
                      </Pressable>
                      {listing.status !== 'available' ? (
                        <Pressable
                          disabled={isUpdatingId === listing.id}
                          onPress={() => void changeListingStatus(listing, 'available')}
                          style={styles.statusAction}
                        >
                          <Text style={styles.statusActionText}>판매중</Text>
                        </Pressable>
                      ) : null}
                      {listing.status !== 'reserved' ? (
                        <Pressable
                          disabled={isUpdatingId === listing.id}
                          onPress={() => void changeListingStatus(listing, 'reserved')}
                          style={styles.statusAction}
                        >
                          <Text style={styles.statusActionText}>예약중</Text>
                        </Pressable>
                      ) : null}
                      {listing.status !== 'completed' ? (
                        <Pressable
                          disabled={isUpdatingId === listing.id}
                          onPress={() => void changeListingStatus(listing, 'completed')}
                          style={styles.statusAction}
                        >
                          <Text style={styles.statusActionText}>완료</Text>
                        </Pressable>
                      ) : null}
                      {listing.status !== 'hidden' ? (
                        <Pressable
                          disabled={isUpdatingId === listing.id}
                          onPress={() => confirmHideListing(listing)}
                          style={[styles.statusAction, styles.statusActionDanger]}
                        >
                          <Text style={[styles.statusActionText, styles.statusActionDangerText]}>숨김</Text>
                        </Pressable>
                      ) : null}
                    </ScrollView>
                  </View>
                ))}
              </View>
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

function formatListingStatus(status: MarketListingStatus) {
  if (status === 'available') return '판매중';
  if (status === 'reserved') return '예약중';
  if (status === 'completed') return '완료';
  return '숨김';
}

function formatShortDate(value: string) {
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
  tabRail: {
    borderBottomColor: 'rgba(143,106,66,0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  tabButtonActive: {
    borderBottomColor: '#103D2B',
  },
  tabText: {
    color: '#7D6B55',
    fontSize: 14,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#103D2B',
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 18,
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
  listBlock: {
    marginTop: 20,
  },
  emptyBlock: {
    borderTopColor: 'rgba(143,106,66,0.16)',
    borderTopWidth: 1,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: '#103D2B',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyCopy: {
    color: '#667167',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  threadRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(143,106,66,0.14)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
  },
  threadThumb: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
    borderRadius: 16,
    height: 70,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  thumbText: {
    color: '#103D2B',
    fontSize: 10,
    fontWeight: '900',
  },
  threadCopy: {
    flex: 1,
    minWidth: 0,
  },
  threadRole: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  rowTitle: {
    color: '#14251B',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  rowMeta: {
    color: '#667167',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  rowLocation: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  rowTime: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  myListingRow: {
    borderBottomColor: 'rgba(143,106,66,0.14)',
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  myListingMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  statusActions: {
    gap: 8,
    paddingLeft: 68,
    paddingTop: 12,
  },
  statusAction: {
    backgroundColor: 'rgba(16,61,43,0.09)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  statusActionDanger: {
    backgroundColor: 'rgba(164,61,32,0.08)',
  },
  statusActionText: {
    color: '#103D2B',
    fontSize: 12,
    fontWeight: '900',
  },
  statusActionDangerText: {
    color: '#A43D20',
  },
});
