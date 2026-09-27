import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Touch as Pressable, Input as TextInput } from '../../src/components/app-ui';
import { BrandLogo } from '../../src/components/brand-logo';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

import { BackButton } from '../../src/components/back-button';
import { useAuth } from '../../src/providers/auth-provider';
import { confirmEmailVerification, requestEmailVerification } from '../../src/services/auth';

export default function VerifyEmailScreen() {
  const { session } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const confirm = async () => {
    if (!/^[0-9]{8}$/.test(code)) {
      setFeedback('메일로 받은 8자리 코드를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await confirmEmailVerification(code);
      setFeedback('이메일 인증이 완료되었습니다.');
      router.replace('/');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '이메일을 인증하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (!session) {
      router.replace('/auth');
      return;
    }
    setIsResending(true);
    setFeedback(null);
    try {
      await requestEmailVerification();
      setFeedback('요청을 접수했습니다. 메일함에서 인증 코드를 확인해주세요.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '인증 코드를 다시 보내지 못했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <BackButton />
            <BrandLogo width={142} />
          </View>

          <View style={styles.hero}>

            <Text style={styles.title}>이메일을 확인해주세요</Text>
            <Text style={styles.copy}>
              {session?.user.email ?? '가입한 이메일'}로 보낸 8자리 인증 코드를 입력해주세요.
            </Text>
          </View>

          {session?.user.email_verified ? (
            <View style={styles.form}>
              <Text style={styles.successText}>이미 인증된 이메일입니다.</Text>
              <Pressable onPress={() => router.replace('/')} style={styles.submitButton}>
                <Text style={styles.submitText}>내 서재로</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                editable={Boolean(session) && !isSubmitting}
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                placeholder="8자리 인증 코드"
                placeholderTextColor={uiColors.muted}
                style={styles.input}
                value={code}
              />
              <Pressable
                disabled={!session || isSubmitting}
                onPress={confirm}
                style={[styles.submitButton, (!session || isSubmitting) && styles.disabled]}
              >
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>인증하기</Text>}
              </Pressable>
              <Pressable disabled={isResending} onPress={resend} style={styles.secondaryButton}>
                {isResending ? (
                  <ActivityIndicator color={uiColors.action} />
                ) : (
                  <Text style={styles.secondaryText}>인증 코드 다시 받기</Text>
                )}
              </Pressable>
              {!session ? <Text style={styles.feedback}>먼저 로그인해주세요.</Text> : null}
              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: uiColors.background, flex: 1 },
  keyboard: { flex: 1 },
  content: {
    alignSelf: 'center',
    backgroundColor: uiColors.background,
    flexGrow: 1,
    maxWidth: 430,
    padding: 20,
    paddingBottom: 160,
    width: '100%',
  },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hero: { paddingBottom: 28, paddingTop: 36 },
  title: { color: uiColors.ink, fontSize: 28, fontWeight: '700', lineHeight: 39, marginTop: 10 },
  copy: { color: uiColors.muted, fontSize: 15, fontWeight: '400', lineHeight: 22, marginTop: 12 },
  form: { gap: 12 },
  input: {
    backgroundColor: uiColors.background,
    borderRadius: 16,
    color: uiColors.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    minHeight: 58,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 58,
  },
  disabled: { opacity: 0.42 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryText: { color: uiColors.action, fontSize: 14, fontWeight: '700' },
  feedback: { color: uiColors.muted, fontSize: 14, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
  successText: { color: uiColors.action, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
