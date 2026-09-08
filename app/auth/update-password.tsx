import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../src/components/back-button';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { requestPasswordReset, updatePassword } from '../../src/services/auth';

export default function UpdatePasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('error');

  const sendCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFeedbackTone('error');
      setFeedback('가입한 이메일을 입력해주세요.');
      return;
    }

    setIsSendingCode(true);
    setFeedback(null);
    try {
      await requestPasswordReset(cleanEmail);
      setCodeSent(true);
      setFeedbackTone('success');
      setFeedback('8자리 인증 코드를 보냈습니다. 메일함을 확인해주세요.');
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : '인증 코드를 보내지 못했습니다.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const submit = async () => {
    if (!email.trim()) {
      setFeedbackTone('error');
      setFeedback('가입한 이메일을 입력해주세요.');
      return;
    }

    if (!/^[0-9]{8}$/.test(code)) {
      setFeedbackTone('error');
      setFeedback('메일로 받은 8자리 코드를 입력해주세요.');
      return;
    }

    if (password.length < 10) {
      setFeedbackTone('error');
      setFeedback('비밀번호는 10자 이상으로 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setFeedbackTone('error');
      setFeedback('새 비밀번호가 서로 다릅니다.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await updatePassword(email.trim(), code, password);
      router.replace({ pathname: '/auth', params: { email: email.trim(), reset: 'success' } });
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
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
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <BackButton />
            <Text style={styles.brand}>BookSome</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>PASSWORD RESET</Text>
            <Text style={styles.title}>새 비밀번호를 정해주세요</Text>
            <Text style={styles.copy}>가입 이메일로 코드를 받은 뒤 새 비밀번호를 정해주세요.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="가입한 이메일"
              placeholderTextColor="#8D8A83"
              style={styles.input}
              value={email}
            />
            <Pressable
              disabled={isSendingCode || isSubmitting}
              onPress={sendCode}
              style={[styles.codeButton, (isSendingCode || isSubmitting) && styles.submitButtonDisabled]}
            >
              {isSendingCode ? <ActivityIndicator color="#103D2B" /> : <Text style={styles.codeButtonText}>{codeSent ? '인증 코드 다시 받기' : '인증 코드 받기'}</Text>}
            </Pressable>

            {feedback ? (
              <View
                accessibilityRole="alert"
                style={[styles.feedbackPanel, feedbackTone === 'success' ? styles.feedbackPanelSuccess : styles.feedbackPanelError]}
              >
                <Text style={[styles.feedback, feedbackTone === 'error' ? styles.feedbackError : null]}>{feedback}</Text>
              </View>
            ) : null}

            {codeSent ? (
              <>
                <TextInput
                  editable={!isSubmitting}
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                  placeholder="8자리 인증 코드"
                  placeholderTextColor="#8D8A83"
                  style={styles.input}
                  value={code}
                />
                <TextInput
                  editable={!isSubmitting}
                  onChangeText={setPassword}
                  placeholder="새 비밀번호 (10자 이상)"
                  placeholderTextColor="#8D8A83"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
                <TextInput
                  editable={!isSubmitting}
                  onChangeText={setConfirmPassword}
                  placeholder="새 비밀번호 확인"
                  placeholderTextColor="#8D8A83"
                  secureTextEntry
                  style={styles.input}
                  value={confirmPassword}
                />

                <Pressable
                  disabled={isSubmitting}
                  onPress={submit}
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>비밀번호 변경하기</Text>
                  )}
                </Pressable>
              </>
            ) : null}

            <Pressable onPress={() => router.replace('/auth')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>로그인 화면으로 돌아가기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavigation active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0D2F22',
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#F7F1E5',
    flexGrow: 1,
    maxWidth: 430,
    padding: 20,
    paddingBottom: 188,
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#103D2B',
    fontSize: 17,
    fontWeight: '900',
  },
  hero: {
    paddingBottom: 28,
    paddingTop: 64,
  },
  eyebrow: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#14251B',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
    marginTop: 10,
  },
  copy: {
    color: '#5F574D',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 290,
  },
  form: {
    gap: 12,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    color: '#526154',
    fontSize: 13,
    fontWeight: '800',
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
  submitButtonDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  codeButton: {
    alignItems: 'center',
    borderColor: '#103D2B',
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  codeButtonText: {
    color: '#103D2B',
    fontSize: 15,
    fontWeight: '900',
  },
  feedback: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  feedbackError: {
    color: '#8A342B',
  },
  feedbackPanel: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  feedbackPanelSuccess: {
    backgroundColor: '#E3EDE5',
    borderColor: 'rgba(16,61,43,0.18)',
  },
  feedbackPanelError: {
    backgroundColor: '#F8E8E4',
    borderColor: 'rgba(138,52,43,0.18)',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryText: {
    color: '#103D2B',
    fontSize: 14,
    fontWeight: '900',
  },
});
