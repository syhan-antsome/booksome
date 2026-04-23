import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { useAuth } from '../../src/providers/auth-provider';

export default function CreateRoomScreen() {
  const { session } = useAuth();
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0]?.uri ?? null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>당신이 사랑하는 책의 첫 번째 방장이 되어보세요.</Text>
        <Text style={styles.copy}>
          책을 검색하거나 ISBN을 스캔한 뒤, Room 소개와 첫 질문을 등록하는 흐름으로 확장합니다.
        </Text>

        {!session ? (
          <AuthRequired
            title="리딩룸 생성은 로그인 후 열립니다."
            copy="Host 역할과 운영 권한을 계정에 연결해야 Room 개설과 관리 기능이 이어질 수 있습니다."
          />
        ) : null}

        {session ? (
        <Pressable onPress={pickCover} style={styles.coverPicker}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <>
              <Text style={styles.coverTitle}>Room 커버 선택</Text>
              <Text style={styles.coverCopy}>사진 보관함에서 커버 이미지를 불러오는 초기 연결입니다.</Text>
            </>
          )}
        </Pressable>
        ) : null}

        {session ? (
        <View style={styles.formPreview}>
          <Text style={styles.label}>Room setup</Text>
          <Text style={styles.previewLine}>책 검색</Text>
          <Text style={styles.previewLine}>Room 소개</Text>
          <Text style={styles.previewLine}>첫 질문</Text>
          <Text style={styles.previewLine}>Host 운영 규칙</Text>
        </View>
        ) : null}
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
    fontSize: 33,
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
  coverPicker: {
    alignItems: 'center',
    backgroundColor: '#113F35',
    borderRadius: 30,
    height: 330,
    justifyContent: 'center',
    marginTop: 30,
    overflow: 'hidden',
    padding: 28,
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  coverCopy: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 10,
    textAlign: 'center',
  },
  formPreview: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    marginTop: 22,
    padding: 20,
  },
  label: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  previewLine: {
    borderBottomColor: '#EEE7DA',
    borderBottomWidth: 1,
    color: '#142326',
    fontSize: 18,
    fontWeight: '800',
    paddingBottom: 12,
  },
});
