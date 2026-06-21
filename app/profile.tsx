import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthRequired } from '../src/components/auth-required';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { useAuth } from '../src/providers/auth-provider';
import { updateProfile } from '../src/services/auth';
import { getMediaUrl, uploadImageAsset } from '../src/services/media';

const profileLinks = [
  { href: '/reading-life', label: '독서 생활', meta: '내가 읽는 책과 기록' },
  { href: '/rooms', label: '북룸', meta: '책마다 모인 책톡' },
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.requiredWrap}>
          <AuthRequired
            title="나의 책 생활"
            copy="닉네임, 프로필 사진, 독서 기록은 로그인 후 사용할 수 있습니다."
          />
        </View>
        <BottomNavigation active="profile" />
      </SafeAreaView>
    );
  }

  const pickAvatar = async () => {
    if (!session) return;

    setErrorText('');
    setStatusText('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorText('사진을 선택하려면 앨범 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
    });

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
      const uploaded = await uploadImageAsset({
        kind: 'avatar',
        entityId: session.user.id,
        uri: asset.uri,
        ownerId: session.user.id,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName,
      });

      await updateProfile(session.user.id, { avatarPath: uploaded.objectPath });
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
    Alert.alert('로그아웃', '이 기기에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 112, 132) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>나의 책 생활</Text>
            <Text style={styles.subtitle}>책톡에 보이는 내 이름과 사진</Text>
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
                placeholder="책톡에서 사용할 이름"
                placeholderTextColor="#9A958E"
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

          <View style={styles.linkSection}>
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
      <BottomNavigation active="profile" />
    </SafeAreaView>
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
    backgroundColor: '#F7F4EE',
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
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  header: {
    borderBottomColor: 'rgba(20,35,31,0.1)',
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  title: {
    color: '#18231F',
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    color: '#706E67',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 5,
  },
  profileSection: {
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
    backgroundColor: '#D8D0C4',
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
    color: '#18231F',
    fontSize: 17,
    fontWeight: '600',
  },
  profileEmail: {
    color: '#77736C',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  textButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },
  textButtonLabel: {
    color: '#8C3E38',
    fontSize: 13,
    fontWeight: '500',
  },
  formSection: {
    borderBottomColor: 'rgba(20,35,31,0.1)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(20,35,31,0.1)',
    borderTopWidth: 1,
    paddingVertical: 16,
  },
  label: {
    color: '#5D625A',
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
    backgroundColor: '#FFFDF8',
    borderColor: 'rgba(20,35,31,0.12)',
    borderRadius: 5,
    borderWidth: 1,
    color: '#18231F',
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    minHeight: 42,
    paddingHorizontal: 11,
  },
  saveButton: {
    alignItems: 'center',
    borderColor: 'rgba(20,35,31,0.14)',
    borderRadius: 5,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 60,
  },
  saveButtonActive: {
    backgroundColor: '#18231F',
    borderColor: '#18231F',
  },
  saveButtonText: {
    color: '#8B8780',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButtonTextActive: {
    color: '#FFFDF8',
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
    color: '#9A3A33',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  linkSection: {
    borderBottomColor: 'rgba(20,35,31,0.1)',
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
    color: '#18231F',
    fontSize: 15,
    fontWeight: '500',
  },
  linkMeta: {
    color: '#77736C',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  linkArrow: {
    color: '#9B958B',
    fontSize: 22,
    fontWeight: '400',
  },
  accountSection: {
    paddingTop: 18,
  },
  sectionTitle: {
    color: '#5D625A',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  accountRow: {
    borderBottomColor: 'rgba(20,35,31,0.1)',
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  accountLabel: {
    color: '#77736C',
    fontSize: 12,
    fontWeight: '400',
  },
  accountValue: {
    color: '#18231F',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 5,
  },
  signOutButton: {
    alignSelf: 'flex-start',
    paddingVertical: 16,
  },
  signOutText: {
    color: '#8C3E38',
    fontSize: 13,
    fontWeight: '500',
  },
});
