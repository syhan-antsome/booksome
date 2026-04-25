import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import authHeroImage from '../assets/home-hero-writer-desk.jpg';
import sseomdiReadingImage from '../assets/sseomdi-reading.png';
import { useAuth } from '../src/providers/auth-provider';
import { signInWithEmail, signUpWithEmail } from '../src/services/auth';

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

const authHeroSource = toImageSource(authHeroImage);
const sseomdiReadingSource = toImageSource(sseomdiReadingImage);

export default function AuthScreen() {
  const { session } = useAuth();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const title = useMemo(
    () =>
      mode === 'sign-in'
        ? '읽던 곳으로 돌아가기'
        : '나의 첫 책장을 열기',
    [mode],
  );
  const copy = useMemo(
    () =>
      mode === 'sign-in'
        ? '함께 읽던 리딩룸과 대화를 계속 이어가세요.'
        : '좋아하는 책을 고르고, 질문을 남기고, 독서 친구를 만나보세요.',
    [mode],
  );
  const heroHeight = Math.max(330, Math.min(440, height * 0.48));

  const submit = async () => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email.trim(), password);
        router.replace('/');
      } else {
        const result = await signUpWithEmail({
          email: email.trim(),
          password,
          displayName: displayName.trim() || 'Reader',
        });

        if (result.session) {
          router.replace('/');
          return;
        }

        setFeedback('가입 요청이 접수되었습니다. 이메일 인증 설정이 켜져 있다면 메일함을 확인해주세요.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '인증 중 오류가 발생했습니다.';
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image resizeMode="cover" source={authHeroSource} style={styles.heroImage} />
            <View style={styles.heroShade} />

            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>‹</Text>
              </Pressable>
              <Text style={styles.brand}>BookSome</Text>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>READING SOCIAL</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.copy}>{copy}</Text>
            </View>
          </View>

          <View style={styles.sheet}>
            <View style={styles.mascotBadge}>
              <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.mascotImage} />
            </View>

            <View style={styles.switchRow}>
              <Pressable
                onPress={() => setMode('sign-in')}
                style={[styles.switchChip, mode === 'sign-in' && styles.switchChipActive]}
              >
                <Text style={[styles.switchText, mode === 'sign-in' && styles.switchTextActive]}>
                  로그인
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('sign-up')}
                style={[styles.switchChip, mode === 'sign-up' && styles.switchChipActive]}
              >
                <Text style={[styles.switchText, mode === 'sign-up' && styles.switchTextActive]}>
                  회원가입
                </Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              {mode === 'sign-up' ? (
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setDisplayName}
                  placeholder="표시 이름"
                  placeholderTextColor="#8D8A83"
                  style={styles.input}
                  value={displayName}
                />
              ) : null}

              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="이메일"
                placeholderTextColor="#8D8A83"
                style={styles.input}
                value={email}
              />

              <TextInput
                onChangeText={setPassword}
                placeholder="비밀번호"
                placeholderTextColor="#8D8A83"
                secureTextEntry
                style={styles.input}
                value={password}
              />

              <Pressable onPress={submit} style={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'sign-in' ? '북썸으로 입장하기' : '프로필 만들기'}
                  </Text>
                )}
              </Pressable>

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
              {session ? (
                <Text style={styles.feedback}>이미 로그인되어 있습니다. 뒤로 가면 홈으로 돌아갑니다.</Text>
              ) : null}

              <Text style={styles.note}>내 책장, 리딩룸, 질문과 모임 알림이 계정에 저장됩니다.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D130E',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#F5F0E8',
    flexGrow: 1,
    maxWidth: 430,
    width: '100%',
  },
  hero: {
    backgroundColor: '#162216',
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    bottom: 0,
    left: 0,
    opacity: 0.92,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroShade: {
    backgroundColor: 'rgba(5, 10, 7, 0.38)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    position: 'relative',
    zIndex: 2,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backText: {
    color: '#111910',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: -3,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
  },
  copy: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 280,
  },
  heroCopy: {
    bottom: 42,
    left: 22,
    position: 'absolute',
    right: 22,
    zIndex: 2,
  },
  heroEyebrow: {
    color: '#F6D39C',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 10,
  },
  sheet: {
    backgroundColor: '#F5F0E8',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: -30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 46,
    position: 'relative',
  },
  switchRow: {
    backgroundColor: '#E7DECE',
    borderRadius: 22,
    flexDirection: 'row',
    padding: 5,
  },
  switchChip: {
    borderRadius: 18,
    flex: 1,
    paddingVertical: 12,
  },
  switchChipActive: {
    backgroundColor: '#111910',
  },
  switchText: {
    color: '#6A665E',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 12,
    marginTop: 20,
  },
  input: {
    backgroundColor: '#FFFCF6',
    borderRadius: 22,
    color: '#111910',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#111910',
    borderRadius: 23,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 58,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  feedback: {
    color: '#5F574D',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
  note: {
    color: '#81786B',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  mascotBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFCF6',
    borderRadius: 26,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'absolute',
    right: 22,
    top: -38,
    width: 98,
  },
  mascotImage: {
    height: 72,
    width: 96,
  },
});
