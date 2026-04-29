import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import {
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
import { BackButton } from '../../src/components/back-button';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { useAuth } from '../../src/providers/auth-provider';

const marketItems = [
  {
    area: '동네 책장',
    price: '나눔',
    title: '깨끗한 문학동네 소설 3권',
  },
  {
    area: '북카페 앞',
    price: '8,000원',
    title: '데미안 민음사 세계문학',
  },
  {
    area: '책모임 굿즈',
    price: '교환',
    title: '독서 기록 노트와 북마크',
  },
];

const bookstoreSignboardSource: ImageSourcePropType =
  typeof bookstoreSignboardImage === 'string' ? { uri: bookstoreSignboardImage } : bookstoreSignboardImage;
const bookstoreSignboardRatio = 803 / 1400;

export default function MarketScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const bookstoreHeroHeight = Math.round(width * bookstoreSignboardRatio);

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
            <BackButton />
            <Link asChild href={session ? '/market/new' : '/auth'}>
              <Pressable accessibilityLabel="책가게 등록" style={styles.bookstoreHeroAction}>
                <Text style={styles.bookstoreHeroActionText}>＋</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.bookstoreIntro}>
          <Text style={styles.bookstoreEyebrow}>BOOKSOME BOOKSTORE</Text>
          <Text numberOfLines={2} style={styles.bookstoreIntroText}>
            읽은 책을 나누고, 다음 독자를 만납니다.
          </Text>
        </View>

        <View style={styles.marketSwitch}>
          <Text style={styles.marketSwitchActive}>중고책</Text>
          <Text style={styles.marketSwitchItem}>교환</Text>
          <Text style={styles.marketSwitchItem}>나눔</Text>
          <Text style={styles.marketSwitchItem}>굿즈</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>근처 책가게</Text>
          <Text style={styles.sectionMeta}>preview</Text>
        </View>

        <View style={styles.itemList}>
          {marketItems.map((item) => (
            <Pressable key={item.title} style={styles.marketItem}>
              <View style={styles.bookThumb}>
                <View style={styles.bookSpine} />
                <Text style={styles.bookThumbText}>BOOK</Text>
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemArea}>{item.area}</Text>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemPrice}>{item.price}</Text>
              </View>
              <Text style={styles.itemArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNavigation active="market" />
    </SafeAreaView>
  );
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
    justifyContent: 'space-between',
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
    height: 70,
    marginTop: 8,
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
    height: 48,
    lineHeight: 24,
    marginTop: 6,
    maxWidth: 270,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sellButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  sellButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  hero: {
    backgroundColor: '#8F6A42',
    borderRadius: 32,
    minHeight: 224,
    padding: 24,
  },
  kicker: {
    color: '#F2DDA7',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
    maxWidth: 286,
  },
  copy: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 292,
  },
  marketSwitch: {
    borderBottomColor: 'rgba(143,106,66,0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  marketSwitchActive: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  marketSwitchItem: {
    color: '#7D6B55',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 15,
    paddingVertical: 12,
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
