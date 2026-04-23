import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { useAuth } from '../../src/providers/auth-provider';
import { uploadImageAsset } from '../../src/services/media';
import type { UploadedMediaAsset } from '../../src/services/media';
import { createRoom } from '../../src/services/rooms';

export default function CreateRoomScreen() {
  const { session } = useAuth();
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomSubtitle, setRoomSubtitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [firstQuestion, setFirstQuestion] = useState('');
  const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploadedCover, setUploadedCover] = useState<UploadedMediaAsset | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.86,
    });

    if (!result.canceled) {
      const asset = result.assets[0] ?? null;
      setCoverAsset(asset);
      setCoverUri(asset?.uri ?? null);
      setUploadedCover(null);
      setUploadError(null);
    }
  };

  const uploadCover = async () => {
    if (!session || !coverAsset?.uri) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const media = await uploadSelectedCover();
      setUploadedCover(media);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '커버 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSelectedCover = async () => {
    if (!session || !coverAsset?.uri) {
      throw new Error('업로드할 커버 이미지가 없습니다.');
    }

    return uploadImageAsset({
      kind: 'room-cover',
      entityId: `draft-${session.user.id}`,
      uri: coverAsset.uri,
      ownerId: session.user.id,
      mimeType: coverAsset.mimeType,
      width: coverAsset.width,
      height: coverAsset.height,
      fileName: coverAsset.fileName,
    });
  };

  const createReadingRoom = async () => {
    if (!session) return;

    if (!bookTitle.trim() || !author.trim() || !firstQuestion.trim()) {
      setCreateError('책 제목, 저자, 첫 질문은 꼭 필요합니다.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const cover =
        uploadedCover ?? (coverAsset?.uri ? await uploadSelectedCover() : null);

      if (cover) {
        setUploadedCover(cover);
      }

      const room = await createRoom({
        bookTitle,
        author,
        roomTitle: roomTitle || bookTitle,
        roomSubtitle,
        roomDescription,
        firstQuestion,
        founderId: session.user.id,
        coverPath: cover?.objectPath ?? null,
      });

      router.replace(`/room/${room.slug}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '리딩룸 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>당신이 사랑하는 책의 첫 번째 방장이 되어보세요.</Text>
        <Text style={styles.copy}>
          첫 버전은 직접 입력으로 Room을 만들고, 이후 책 검색과 ISBN 스캔 흐름으로 확장합니다.
        </Text>

        {!session ? (
          <AuthRequired
            title="리딩룸 생성은 로그인 후 열립니다."
            copy="Host 역할과 운영 권한을 계정에 연결해야 Room 개설과 관리 기능이 이어질 수 있습니다."
          />
        ) : null}

        {session ? (
          <>
            <View style={styles.formPanel}>
              <Text style={styles.label}>Book</Text>
              <TextInput
                onChangeText={setBookTitle}
                placeholder="책 제목"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={bookTitle}
              />
              <TextInput
                onChangeText={setAuthor}
                placeholder="저자"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={author}
              />

              <Text style={[styles.label, styles.spacedLabel]}>Room</Text>
              <TextInput
                onChangeText={setRoomTitle}
                placeholder="Room 제목"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={roomTitle}
              />
              <TextInput
                onChangeText={setRoomSubtitle}
                placeholder="짧은 부제"
                placeholderTextColor="#A49B8D"
                style={styles.input}
                value={roomSubtitle}
              />
              <TextInput
                multiline
                onChangeText={setRoomDescription}
                placeholder="Room 소개"
                placeholderTextColor="#A49B8D"
                style={[styles.input, styles.textArea]}
                value={roomDescription}
              />
              <TextInput
                multiline
                onChangeText={setFirstQuestion}
                placeholder="첫 질문"
                placeholderTextColor="#A49B8D"
                style={[styles.input, styles.textArea]}
                value={firstQuestion}
              />
            </View>

            <Pressable onPress={pickCover} style={styles.coverPicker}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} />
              ) : (
                <>
                  <Text style={styles.coverTitle}>Room 커버 선택</Text>
                  <Text style={styles.coverCopy}>사진 보관함에서 커버 이미지를 불러옵니다.</Text>
                </>
              )}
            </Pressable>

            {coverUri ? (
              <Pressable
                disabled={isUploading}
                onPress={uploadCover}
                style={[styles.uploadButton, isUploading ? styles.uploadButtonDisabled : null]}
              >
                {isUploading ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={styles.uploadButtonText}>
                  {uploadedCover ? 'R2 업로드 다시 실행' : 'R2에 커버 업로드'}
                </Text>
              </Pressable>
            ) : null}

            {uploadedCover ? (
              <View style={styles.statusPanel}>
                <Text style={styles.statusTitle}>업로드 완료</Text>
                <Text style={styles.statusCopy}>{uploadedCover.objectPath}</Text>
              </View>
            ) : null}

            {uploadError ? (
              <View style={[styles.statusPanel, styles.errorPanel]}>
                <Text style={styles.errorTitle}>업로드 실패</Text>
                <Text style={styles.errorCopy}>{uploadError}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={isCreating}
              onPress={createReadingRoom}
              style={[styles.createButton, isCreating ? styles.uploadButtonDisabled : null]}
            >
              {isCreating ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text style={styles.createButtonText}>리딩룸 생성</Text>
            </Pressable>

            {createError ? (
              <View style={[styles.statusPanel, styles.errorPanel]}>
                <Text style={styles.errorTitle}>생성 실패</Text>
                <Text style={styles.errorCopy}>{createError}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 20,
    paddingBottom: 42,
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
  formPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 24,
    padding: 18,
  },
  spacedLabel: {
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F7F2EA',
    borderColor: '#E6DDCF',
    borderRadius: 16,
    borderWidth: 1,
    color: '#142326',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  coverImage: {
    height: '100%',
    width: '100%',
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  uploadButtonDisabled: {
    opacity: 0.68,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  statusPanel: {
    backgroundColor: '#E8F4EF',
    borderColor: '#B8D8CC',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  statusTitle: {
    color: '#116653',
    fontSize: 15,
    fontWeight: '900',
  },
  statusCopy: {
    color: '#33514A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  errorPanel: {
    backgroundColor: '#FFF0EA',
    borderColor: '#F3C2AE',
  },
  errorTitle: {
    color: '#A43D20',
    fontSize: 15,
    fontWeight: '900',
  },
  errorCopy: {
    color: '#7C3B29',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
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
  label: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
