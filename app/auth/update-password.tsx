import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { setRecoverySessionFromCurrentUrl, updatePassword } from '../../src/services/auth';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setRecoverySessionFromCurrentUrl()
      .then((session) => {
        if (!isMounted) return;
        setCanUpdate(Boolean(session));
        if (!session) {
          setFeedback('재설정 링크가 없거나 만료되었습니다. 로그인 화면에서 메일을 다시 받아주세요.');
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setCanUpdate(false);
        setFeedback(error instanceof Error ? error.message : '재설정 링크를 확인하지 못했습니다.');
      })
      .finally(() => {
        if (isMounted) setIsPreparing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      setFeedback('비밀번호는 6자 이상으로 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setFeedback('새 비밀번호가 서로 다릅니다.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await updatePassword(password);
      setFeedback('비밀번호를 변경했습니다. 새 비밀번호로 북썸을 이용할 수 있습니다.');
      router.replace('/');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.');
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <BackButton />
            <Text style={styles.brand}>BookSome</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>PASSWORD RESET</Text>
            <Text style={styles.title}>새 비밀번호를 정해주세요</Text>
            <Text style={styles.copy}>메일 링크가 확인되면 이 화면에서 바로 새 비밀번호를 저장합니다.</Text>
          </View>

          <View style={styles.form}>
            {isPreparing ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#103D2B" />
                <Text style={styles.loadingText}>재설정 링크를 확인하는 중입니다</Text>
              </View>
            ) : null}

            <TextInput
              editable={canUpdate && !isSubmitting}
              onChangeText={setPassword}
              placeholder="새 비밀번호"
              placeholderTextColor="#8D8A83"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              editable={canUpdate && !isSubmitting}
              onChangeText={setConfirmPassword}
              placeholder="새 비밀번호 확인"
              placeholderTextColor="#8D8A83"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />

            <Pressable
              disabled={!canUpdate || isSubmitting}
              onPress={submit}
              style={[styles.submitButton, (!canUpdate || isSubmitting) && styles.submitButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>비밀번호 변경하기</Text>
              )}
            </Pressable>

            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            {!canUpdate && !isPreparing ? (
              <Pressable onPress={() => router.replace('/auth')} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>로그인 화면으로 돌아가기</Text>
              </Pressable>
            ) : null}
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
    paddingBottom: 108,
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
  feedback: {
    color: '#5F574D',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
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
