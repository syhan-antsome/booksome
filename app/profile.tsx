import * as ImagePicker from 'expo-image-picker';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Touch as Pressable, Sheet, Input as TextInput } from '../src/components/app-ui';
import { BrandLogo } from '../src/components/brand-logo';
import { listReadingLifeBooks, listReadingLifeNoteCounts } from '../src/services/reading-life';
import { booksomeColors as uiColors } from '../src/theme/booksome';

import { AuthRequired } from '../src/components/auth-required';
import { TabPage } from '../src/components/tab-page';
import { useAuth } from '../src/providers/auth-provider';
import { updateProfile } from '../src/services/auth';
import { getMediaUrl, uploadImageAsset } from '../src/services/media';
import { booksomeColors, booksomeLayout } from '../src/theme/booksome';

const profileLinks = [
  { href: '/reading-life', label: '독서 달력', meta: '책과 문장을 만난 날 돌아보기' },
  { href: '/meetups', label: '독서 모임', meta: '함께 읽을 사람들과 만나기' },
  { href: '/market', label: '북마켓', meta: '책을 나누고 거래하기' },
] as const;

export default function ProfileScreen() {
  const { isLoading, profile, refreshProfile, session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isWebSignOutConfirmVisible, setIsWebSignOutConfirmVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [summary, setSummary] = useState<{ books: number; finished: number; notes: number } | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!session) { setSummary(null); return; }
    Promise.all([listReadingLifeBooks(session.user.id), listReadingLifeNoteCounts(session.user.id)])
      .then(([books, counts]) => { if (active) setSummary({ books: books.length, finished: books.filter(book => book.status === 'finished').length, notes: Object.values(counts).reduce((sum, value) => sum + value, 0) }); })
      .catch(() => { if (active) setSummary(null); });
    return () => { active = false; };
  }, [session?.user.id]));

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const avatarUrl = useMemo(() => getProfileAvatarUrl(profile?.avatar_path), [profile?.avatar_path]);
  const displayInitial = (displayName.trim() || profile?.display_name || '독').slice(0, 1).toUpperCase();
  const email = session?.user.email ?? '';
  const trimmedDisplayName = displayName.trim();
  const canSaveName =
    Boolean(session) &&
    trimmedDisplayName.length >= 2 &&
    trimmedDisplayName !== (profile?.display_name ?? '') &&
    !isSavingName;

  if (!isLoading && !session) {
    return (
      <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.requiredWrap}>
          <BrandLogo />
          <AuthRequired
            title="나의 책 생활"
            copy="닉네임, 프로필 사진, 독서 기록은 로그인 후 사용할 수 있습니다."
          />
        </View>

      </SafeAreaView></TabPage>
    );
  }

  const pickAvatar = async () => {
    if (!session) return;

    setErrorText('');
    setStatusText('');

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.86,
    };

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    } catch (pickerError) {
      if (Platform.OS === 'web') {
        setErrorText(pickerError instanceof Error ? pickerError.message : '사진 선택 창을 열지 못했습니다.');
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted) {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      } else {
        setErrorText('사진을 선택하려면 앨범 접근 권한이 필요합니다.');
        if (!permission.canAskAgain) {
          Alert.alert('앨범 권한이 꺼져 있습니다', '기기 설정에서 BookSome 또는 Expo Go의 사진 권한을 허용해주세요.', [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => void Linking.openSettings() },
          ]);
        }
        return;
      }
    }

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      setErrorText('선택한 이미지를 읽을 수 없습니다.');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      await uploadImageAsset({
        kind: 'avatar',
        entityId: session.user.id,
        uri: asset.uri,
        ownerId: session.user.id,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      });

      await refreshProfile();
      setStatusText('사진을 바꿨습니다.');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '사진 저장에 실패했습니다.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveDisplayName = async () => {
    if (!session || !canSaveName) return;

    if (trimmedDisplayName.length < 2) {
      setErrorText('닉네임은 두 글자 이상 입력해 주세요.');
      return;
    }

    setIsSavingName(true);
    setErrorText('');
    setStatusText('');

    try {
      await updateProfile(session.user.id, { displayName: trimmedDisplayName });
      await refreshProfile();
      setStatusText('닉네임을 저장했습니다.');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '닉네임 저장에 실패했습니다.');
    } finally {
      setIsSavingName(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      setIsWebSignOutConfirmVisible(true);
      return;
    }

    Alert.alert('로그아웃', '이 기기에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <TabPage><SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 112, 132) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BrandLogo />
            <Text style={[styles.title, { marginTop: 28, fontFamily: undefined }]}>나의 독서 생활</Text>
            <Text style={styles.subtitle}>차곡차곡 쌓인, 책과 보낸 시간</Text>
          </View>

          <View style={styles.profileSection}>
            <Pressable
              accessibilityLabel="프로필 사진 변경"
              disabled={isUploadingAvatar}
              onPress={pickAvatar}
              style={styles.avatarButton}
            >
              {avatarUrl ? (
                <Image resizeMode="cover" source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{displayInitial}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile?.display_name ?? '북썸 독자'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {email}
              </Text>
              <Pressable disabled={isUploadingAvatar} onPress={pickAvatar} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>{isUploadingAvatar ? '올리는 중' : '사진 변경'}</Text>
              </Pressable>
            </View>
          </View>

          {summary ? <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: uiColors.line, paddingVertical: 24, marginBottom: 24 }}>
            {[['서재', summary.books, '권'], ['완독', summary.finished, '권'], ['남긴 기록', summary.notes, '개']].map(([label, count, unit]) => <View key={String(label)} style={{ flex: 1, alignItems: 'center', gap: 8 }}><Text style={{ fontSize: 26, color: uiColors.ink, fontWeight: '700' }}>{count}<Text style={{ fontSize: 12, color: uiColors.muted }}> {unit}</Text></Text><Text style={{ fontSize: 12, color: uiColors.muted }}>{label}</Text></View>)}
          </View> : null}
          <Button title="프로필 편집" variant="secondary" onPress={() => setEditingName(true)} />
          <Sheet visible={editingName} title="내 이름 바꾸기" onClose={() => setEditingName(false)}>
            <View style={styles.formSection}>
              <Text style={styles.label}>닉네임</Text>
              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  maxLength={24}
                  onChangeText={(value) => {
                    setDisplayName(value);
                    setErrorText('');
                    setStatusText('');
                  }}
                  placeholder="이야기에서 사용할 이름"
                  placeholderTextColor={uiColors.muted}
                  style={styles.input}
                  value={displayName}
                />
                <Pressable
                  disabled={!canSaveName}
                  onPress={saveDisplayName}
                  style={[styles.saveButton, canSaveName ? styles.saveButtonActive : null]}
                >
                  <Text style={[styles.saveButtonText, canSaveName ? styles.saveButtonTextActive : null]}>
                    {isSavingName ? '저장 중' : '저장'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>본명 대신 닉네임이나 필명으로 활동할 수 있습니다.</Text>
              {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </View>
          </Sheet>

          <View style={styles.linkSection}>
            {session && !session.user.email_verified ? (
              <Link asChild href="/auth/verify-email">
                <Pressable style={styles.linkRow}>
                  <View style={styles.linkCopy}>
                    <Text style={styles.linkLabel}>이메일 인증</Text>
                    <Text style={styles.linkMeta}>계정 복구와 보안을 위해 인증해주세요</Text>
                  </View>
                  <Text style={styles.linkArrow}>›</Text>
                </Pressable>
              </Link>
            ) : null}
            {profileLinks.map((item) => (
              <Link asChild href={item.href} key={item.href}>
                <Pressable style={styles.linkRow}>
                  <View style={styles.linkCopy}>
                    <Text style={styles.linkLabel}>{item.label}</Text>
                    <Text style={styles.linkMeta}>{item.meta}</Text>
                  </View>
                  <Text style={styles.linkArrow}>›</Text>
                </Pressable>
              </Link>
            ))}
          </View>

          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>계정</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>이메일</Text>
              <Text numberOfLines={1} style={styles.accountValue}>
                {email}
              </Text>
            </View>
            <Pressable onPress={confirmSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>로그아웃</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsWebSignOutConfirmVisible(false)}
        transparent
        visible={isWebSignOutConfirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>로그아웃</Text>
            <Text style={styles.modalCopy}>이 기기에서 로그아웃할까요?</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setIsWebSignOutConfirmVisible(false)} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsWebSignOutConfirmVisible(false);
                  void signOut();
                }}
                style={styles.modalSignOutButton}
              >
                <Text style={styles.modalSignOutText}>로그아웃</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView></TabPage>
  );
}

function getProfileAvatarUrl(avatarPath: string | null | undefined) {
  if (!avatarPath) return null;

  try {
    return getMediaUrl(avatarPath);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: booksomeColors.paper,
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  requiredWrap: {
    flex: 1,
    padding: 18,
  },
  content: {
    width: '100%', maxWidth: booksomeLayout.maxContentWidth, alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  header: {
    borderBottomColor: 'rgba(38,37,38,0.1)',
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  title: {
    color: uiColors.ink,
    fontSize: 30,
    fontWeight: '600',
  },
  subtitle: {
    color: '#706E67',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 5,
  },
  profileSection: {
    backgroundColor: booksomeColors.accentSoft, borderRadius: 24, marginVertical: 24, paddingHorizontal: 18,
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 18,
  },
  avatarButton: {
    borderRadius: 34,
    height: 68,
    overflow: 'hidden',
    width: 68,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: uiColors.line,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  avatarInitial: {
    color: '#555C55',
    fontSize: 24,
    fontWeight: '600',
  },
  profileCopy: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    color: uiColors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  profileEmail: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  textButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },
  textButtonLabel: {
    color: uiColors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  formSection: {
    borderBottomColor: 'rgba(38,37,38,0.1)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(38,37,38,0.1)',
    borderTopWidth: 1,
    paddingVertical: 16,
  },
  label: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: uiColors.background,
    borderColor: 'rgba(38,37,38,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    color: uiColors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    minHeight: 42,
    paddingHorizontal: 11,
  },
  saveButton: {
    alignItems: 'center',
    borderColor: 'rgba(38,37,38,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 60,
  },
  saveButtonActive: {
    backgroundColor: uiColors.action,
    borderColor: uiColors.action,
  },
  saveButtonText: {
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  saveButtonTextActive: {
    color: uiColors.background,
  },
  helperText: {
    color: '#7A766E',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 8,
  },
  statusText: {
    color: '#2E6B50',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  errorText: {
    color: uiColors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  linkSection: {
    borderBottomColor: 'rgba(38,37,38,0.1)',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
  },
  linkCopy: {
    flex: 1,
  },
  linkLabel: {
    color: uiColors.ink,
    fontSize: 15,
    fontWeight: '500',
  },
  linkMeta: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  linkArrow: {
    color: uiColors.muted,
    fontSize: 22,
    fontWeight: '400',
  },
  accountSection: {
    paddingTop: 18,
  },
  sectionTitle: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  accountRow: {
    borderBottomColor: 'rgba(38,37,38,0.1)',
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  accountLabel: {
    color: uiColors.muted,
    fontSize: 12,
    fontWeight: '400',
  },
  accountValue: {
    color: uiColors.ink,
    fontSize: 14,
    fontWeight: '400',
    marginTop: 5,
  },
  signOutButton: {
    alignSelf: 'flex-start',
    paddingVertical: 16,
  },
  signOutText: {
    color: uiColors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(10, 24, 19, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalPanel: {
    backgroundColor: uiColors.background,
    borderRadius: 16,
    maxWidth: 340,
    padding: 22,
    width: '100%',
  },
  modalTitle: {
    color: uiColors.ink,
    fontSize: 19,
    fontWeight: '700',
  },
  modalCopy: {
    color: '#66655F',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 22,
  },
  modalCancelButton: {
    borderColor: 'rgba(38,37,38,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: uiColors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSignOutButton: {
    backgroundColor: uiColors.danger,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalSignOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
