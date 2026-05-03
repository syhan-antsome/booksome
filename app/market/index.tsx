import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import bookstoreSignboardImage from '../../assets/bookstore-signboard.jpg';
import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { useAuth } from '../../src/providers/auth-provider';
import {
  listMarketListings,
  type MarketListing,
  type MarketListingFilter,
} from '../../src/services/market';

type MarketLocation = {
  latitude: number;
  longitude: number;
  areaLabel: string;
};

const marketFilters: Array<{ label: string; value: MarketListingFilter }> = [
  { label: '전체', value: 'all' },
  { label: '판매', value: 'sale' },
  { label: '나눔', value: 'free' },
  { label: '찾아요', value: 'wanted' },
];

const bookstoreSignboardSource: ImageSourcePropType =
  typeof bookstoreSignboardImage === 'string' ? { uri: bookstoreSignboardImage } : bookstoreSignboardImage;
const bookstoreSignboardRatio = 803 / 1400;

export default function MarketScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<MarketListingFilter>('all');
  const [marketLocation, setMarketLocation] = useState<MarketLocation | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const bookstoreHeroHeight = Math.round(width * bookstoreSignboardRatio);

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
          if (isMounted) setListingError(getErrorMessage(error, '책가게 목록을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoadingListings(false);
        });

      return () => {
        isMounted = false;
      };
    }, [filter, session?.user.id]),
  );

  const sortedListings = useMemo(() => {
    if (!marketLocation) return listings;

    return [...listings].sort((left, right) => {
      return getDistanceKm(marketLocation, left) - getDistanceKm(marketLocation, right);
    });
  }, [listings, marketLocation]);

  const requestMarketLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationError('책가게는 가까운 사람과 만나기 위해 위치 권한이 필요합니다.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const areaLabel = await resolveAreaLabel(position.coords.latitude, position.coords.longitude);

      setMarketLocation({
        areaLabel,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      setLocationError(getErrorMessage(error, '현재 위치를 확인하지 못했습니다.'));
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const openNewListing = () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    router.push('/market/new');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.bookstoreHero, { height: bookstoreHeroHeight }]}>
          <Image resizeMode="contain" source={bookstoreSignboardSource} style={styles.bookstoreHeroImage} />
          <LinearGradient
            colors={['rgba(246, 238, 225, 0)', 'rgba(246, 238, 225, 0.38)', '#F6EEE1']}
            locations={[0, 0.48, 1]}
            pointerEvents="none"
            style={styles.bookstoreHeroGradient}
          />

          <View style={styles.bookstoreHeroTop}>
            <Pressable accessibilityLabel="책가게 등록" onPress={openNewListing} style={styles.bookstoreHeroAction}>
              <Text style={styles.bookstoreHeroActionText}>＋</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.bookstoreIntro}>
          <Text style={styles.bookstoreEyebrow}>BOOKSOME BOOKSTORE</Text>
          <Text numberOfLines={2} style={styles.bookstoreIntroText}>
            읽은 책을 건네고, 가까운 다음 독자를 만납니다.
          </Text>
        </View>

        {!session ? (
          <AuthRequired
            title="책가게는 로그인 후 이용합니다."
            copy="동네 기반으로 책을 올리고 문의하기 위해 계정이 필요합니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.locationPanel}>
              <View style={styles.locationCopy}>
                <Text style={styles.locationLabel}>내 동네</Text>
                <Text style={styles.locationTitle}>
                  {marketLocation ? marketLocation.areaLabel : '위치를 확인해주세요'}
                </Text>
                <Text style={styles.locationHint}>
                  책가게는 가까운 사람과 직접 약속하는 방식으로 운영됩니다.
                </Text>
              </View>
              <Pressable
                disabled={isRequestingLocation}
                onPress={requestMarketLocation}
                style={styles.locationButton}
              >
                {isRequestingLocation ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.locationButtonText}>위치</Text>
                )}
              </Pressable>
            </View>

            {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

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
              <Text style={styles.sectionTitle}>근처 책가게</Text>
              <Text style={styles.sectionMeta}>{sortedListings.length}권</Text>
            </View>

            {isLoadingListings ? (
              <View style={styles.loadingPanel}>
                <ActivityIndicator color="#103D2B" />
                <Text style={styles.loadingText}>근처 책을 살펴보는 중입니다</Text>
              </View>
            ) : null}

            {listingError ? <Text style={styles.errorText}>{listingError}</Text> : null}

            {!isLoadingListings && sortedListings.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>아직 가까운 책이 없습니다</Text>
                <Text style={styles.emptyCopy}>첫 책을 올리면 이 동네의 책가게가 시작됩니다.</Text>
              </View>
            ) : null}

            <View style={styles.itemList}>
              {sortedListings.map((item) => (
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
                    <Text style={styles.itemArea}>
                      {item.areaLabel}
                      {marketLocation && item.latitude && item.longitude
                        ? ` · ${formatDistance(getDistanceKm(marketLocation, item))}`
                        : ''}
                    </Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemPrice}>{formatListingPrice(item)}</Text>
                  </View>
                  <Text style={styles.itemArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
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

function formatListingPrice(item: MarketListing) {
  if (item.type === 'wanted') return '찾아요';
  if (item.price === 0) return '나눔';
  return `${(item.price ?? 0).toLocaleString('ko-KR')}원`;
}

function getDistanceKm(origin: MarketLocation, item: MarketListing) {
  if (!item.latitude || !item.longitude) return Number.POSITIVE_INFINITY;

  const earthRadiusKm = 6371;
  const latDelta = toRadians(item.latitude - origin.latitude);
  const lonDelta = toRadians(item.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const itemLat = toRadians(item.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) * Math.cos(itemLat) * Math.sin(lonDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))}m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`;
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
  bookstoreHero: {
    marginHorizontal: -20,
    marginTop: -20,
    overflow: 'hidden',
    position: 'relative',
  },
  bookstoreHeroImage: {
    height: '100%',
    width: '100%',
  },
  bookstoreHeroGradient: {
    bottom: -1,
    height: 118,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  bookstoreHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 3,
  },
  bookstoreHeroAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.92)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  bookstoreHeroActionText: {
    color: '#103D2B',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  bookstoreIntro: {
    marginTop: 8,
    paddingBottom: 8,
  },
  bookstoreEyebrow: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bookstoreIntroText: {
    color: '#14251B',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: 6,
    maxWidth: 310,
  },
  locationPanel: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,61,43,0.08)',
    borderColor: 'rgba(16,61,43,0.08)',
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
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
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },
  locationHint: {
    color: '#667167',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
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
  filterRow: {
    gap: 8,
    marginTop: 20,
    paddingRight: 20,
  },
  filterChip: {
    borderBottomColor: 'rgba(143,106,66,0.14)',
    borderBottomWidth: 2,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  filterChipActive: {
    borderBottomColor: '#103D2B',
  },
  filterText: {
    color: '#7D6B55',
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#103D2B',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 28,
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
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
  emptyPanel: {
    borderTopColor: 'rgba(143,106,66,0.14)',
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
  errorText: {
    color: '#A43D20',
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
    borderBottomColor: 'rgba(143,106,66,0.14)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 15,
    paddingVertical: 16,
  },
  bookThumb: {
    alignItems: 'center',
    backgroundColor: '#D8BE88',
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
    backgroundColor: '#103D2B',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  bookThumbText: {
    color: '#103D2B',
    fontSize: 11,
    fontWeight: '900',
  },
  itemCopy: {
    flex: 1,
  },
  itemArea: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  itemTitle: {
    color: '#14251B',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  itemPrice: {
    color: '#103D2B',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 7,
  },
  itemArrow: {
    color: '#103D2B',
    fontSize: 30,
    fontWeight: '900',
    paddingRight: 4,
  },
});
