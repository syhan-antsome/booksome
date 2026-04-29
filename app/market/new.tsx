import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';

export default function NewMarketItemScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ScreenHeader
          eyebrow="Book Market"
          subtitle="사진, 위치, 가격을 연결해 책 물건을 올립니다."
          title="마켓 등록"
          tone="clay"
        />

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>준비할 항목</Text>
          <Text style={styles.previewItem}>책 또는 물품 사진</Text>
          <Text style={styles.previewItem}>거래 방식: 판매 / 교환 / 나눔</Text>
          <Text style={styles.previewItem}>동네 또는 거래 가능 지역</Text>
        </View>
      </View>
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
    flex: 1,
    padding: 20,
    paddingBottom: 124,
  },
  header: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  kicker: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#14251B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copy: {
    color: '#667167',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  previewBox: {
    borderTopColor: 'rgba(143,106,66,0.16)',
    borderTopWidth: 1,
    marginTop: 28,
    paddingTop: 22,
  },
  previewTitle: {
    color: '#103D2B',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 12,
  },
  previewItem: {
    color: '#6C6D5F',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 25,
  },
});
