import { router, useLocalSearchParams } from 'expo-router';
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
import { BackButton } from '../src/components/back-button';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { useAuth } from '../src/providers/auth-provider';
import {
  requestEmailVerification,
  signInWithEmail,
  signUpWithEmail,
} from '../src/services/auth';

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

const authHeroSource = toImageSource(authHeroImage);
const sseomdiReadingSource = toImageSource(sseomdiReadingImage);

export default function AuthScreen() {
  const params = useLocalSearchParams<{ email?: string; reset?: string; next?: string; mode?: string }>();
  const { session } = useAuth();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(params.mode === 'sign-up' ? 'sign-up' : 'sign-in');
  const nextPath = typeof params.next === 'string' && /^\/(books\/add(?:\?|$)|library$|record$)/.test(params.next) ? params.next : '/';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(
    params.reset === 'success' ? '비밀번호를 변경했습니다. 새 비밀번호로 로그인해주세요.' : null,
  );

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
        ? '내 서재와 읽던 페이지, 남겨둔 기록을 계속 이어가세요.'
        : '필명으로 책에 머물고, 질문과 문장을 안전하게 남겨보세요.',
    [mode],
  );
  const heroHeight = Math.max(220, Math.min(280, height * 0.3));

  const submit = async () => {
    setFeedback(null);
    const penName = displayName.trim();

    if (mode === 'sign-up' && !penName) {
      setFeedback('필명 또는 닉네임을 입력해주세요.');
      return;
    }

    if (mode === 'sign-up' && password.length < 10) {
      setFeedback('비밀번호는 10자 이상으로 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signInWithEmail(email.trim(), password);
        router.replace(nextPath as '/');
      } else {
        const result = await signUpWithEmail({
          email: email.trim(),
          password,
          displayName: penName,
        });

        if (result.session) {
          // Account creation already establishes a session. Email delivery must
          // not strand a new reader before their first book when SMTP is off.
          void requestEmailVerification().catch(() => undefined);
          router.replace((nextPath === '/' ? '/books/add' : nextPath) as '/');
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

  const openPasswordReset = () => {
    const cleanEmail = email.trim();
    router.push({ pathname: '/auth/update-password', params: cleanEmail ? { email: cleanEmail } : {} });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 18}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image resizeMode="cover" source={authHeroSource} style={styles.heroImage} />
            <View style={styles.heroShade} />

            <View style={styles.topBar}>
              <BackButton />
              <Text style={styles.brand}>BookSome</Text>
            </View>

            <View style={styles.heroCopy}>
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
                  placeholder="필명 또는 닉네임"
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

              {feedback ? (
                <View accessibilityRole="alert" style={styles.feedbackPanel}>
                  <Text style={styles.feedback}>{feedback}</Text>
                </View>
              ) : null}

              <Pressable accessibilityRole="button" onPress={submit} style={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'sign-in' ? '로그인하고 이어가기' : '가입하고 내 책 담기'}
                  </Text>
                )}
              </Pressable>

              {mode === 'sign-in' ? (
                <Pressable onPress={openPasswordReset} style={styles.resetButton}>
                  <Text style={styles.resetText}>비밀번호를 잊으셨나요?</Text>
                </Pressable>
              ) : null}
              {session ? (
                <Text style={styles.feedback}>이미 로그인되어 있습니다. 뒤로 가면 홈으로 돌아갑니다.</Text>
              ) : null}

              <Text style={styles.note}>북썸 활동은 필명 또는 닉네임으로 표시됩니다. 본명보다 편한 이름을 권장합니다.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavigation active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D2F22',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#F7F1E5',
    flexGrow: 1,
    maxWidth: 430,
    paddingBottom: 188,
    width: '100%',
  },
  hero: {
    backgroundColor: '#0D2F22',
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
    backgroundColor: 'rgba(5, 10, 7, 0.46)',
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
    backgroundColor: '#F7F1E5',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: -30,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 46,
    position: 'relative',
  },
  switchRow: {
    backgroundColor: '#E7DDCA',
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
    backgroundColor: '#103D2B',
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
    backgroundColor: '#FFF9EF',
    borderRadius: 22,
    color: '#14251B',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
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
  resetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  resetText: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '900',
  },
  feedback: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  feedbackPanel: {
    backgroundColor: '#E3EDE5',
    borderColor: 'rgba(16,61,43,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
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
    backgroundColor: '#FFF9EF',
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
