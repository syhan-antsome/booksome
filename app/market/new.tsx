import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '../../src/components/bottom-navigation';

export default function NewMarketItemScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.kicker}>BOOK MARKET</Text>
        <Text style={styles.title}>책마켓 등록</Text>
        <Text style={styles.copy}>
          중고책, 교환, 나눔, 굿즈를 등록하는 화면입니다. 다음 단계에서 사진 업로드, 위치, 가격,
          거래 상태를 연결합니다.
        </Text>

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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingVertical: 8,
  },
  backText: {
    color: '#103D2B',
    fontSize: 15,
    fontWeight: '900',
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
    backgroundColor: '#FFF9EF',
    borderRadius: 28,
    marginTop: 28,
    padding: 22,
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
