import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { useAuth } from '../../src/providers/auth-provider';

export default function MeetupsScreen() {
  const { session } = useAuth();
  const [status, setStatus] = useState('아직 위치 권한을 요청하지 않았습니다.');

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setStatus('위치 권한이 거부되었습니다. 지역명 수동 선택 플로우를 제공합니다.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setStatus(
      `현재 위치 기준으로 주변 모임을 탐색할 준비가 되었습니다. (${location.coords.latitude.toFixed(
        3,
      )}, ${location.coords.longitude.toFixed(3)})`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>내 주변에서 함께 읽는 사람들을 찾습니다.</Text>
        <Text style={styles.copy}>
          초기에는 정밀 위치보다 도시와 동네 단위로 독서 모임, 서점, 북카페 기반 북룸을 추천합니다.
        </Text>

        {!session ? (
          <AuthRequired
            title="주변 독서 모임은 로그인 후 추천됩니다."
            copy="내 위치와 관심 장르, 참여한 북룸을 연결해 더 정확한 지역 모임을 보여주기 위해 계정이 필요합니다."
          />
        ) : null}

        {session ? (
        <Pressable onPress={requestLocation} style={styles.locationAction}>
          <Text style={styles.locationActionText}>위치 기반 모임 찾기</Text>
        </Pressable>
        ) : null}

        {session ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Location status</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
        ) : null}

        <View style={styles.meetupCard}>
          <Text style={styles.meetupCity}>Seoul</Text>
          <Text style={styles.meetupTitle}>목요일 밤, 데미안 함께 읽기</Text>
          <Text style={styles.meetupCopy}>강남 북카페 · 12명 참여 예정 · Host Mina</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 18,
    paddingVertical: 8,
  },
  backText: {
    color: '#116653',
    fontSize: 15,
    fontWeight: '900',
  },
  title: {
    color: '#142326',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
  },
  copy: {
    color: '#5E6766',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 12,
  },
  locationAction: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 19,
    marginTop: 28,
    paddingVertical: 16,
  },
  locationActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statusBox: {
    backgroundColor: '#ECE5D8',
    borderRadius: 22,
    marginTop: 18,
    padding: 18,
  },
  statusLabel: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
  },
  statusText: {
    color: '#4E5958',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
  meetupCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 22,
    padding: 22,
  },
  meetupCity: {
    color: '#E46F58',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  meetupTitle: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
  },
  meetupCopy: {
    color: '#6A7473',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 10,
  },
});
