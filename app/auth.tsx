import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/providers/auth-provider';
import { signInWithEmail, signUpWithEmail } from '../src/services/auth';

export default function AuthScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const title = useMemo(
    () =>
      mode === 'sign-in'
        ? '다시 돌아온 리더를 위한 입장'
        : '책으로 연결되는 첫 번째 프로필 만들기',
    [mode],
  );

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
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.label}>BookSome Auth</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>
            북썸 계정으로 리딩룸 참여, Host 운영, 질문 저장, 모임 알림을 이어서 사용할 수 있습니다.
          </Text>

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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  keyboard: {
    flex: 1,
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
  label: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#142326',
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 41,
  },
  copy: {
    color: '#5E6766',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  switchChip: {
    backgroundColor: '#ECE5D8',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 13,
  },
  switchChipActive: {
    backgroundColor: '#113F35',
  },
  switchText: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 12,
    marginTop: 22,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 18,
    borderWidth: 1,
    color: '#142326',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 56,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  feedback: {
    color: '#4E5958',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
});
