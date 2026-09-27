import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Feedback, Field, Input, PasswordInput } from '../src/components/app-ui';
import { BackButton } from '../src/components/back-button';
import { BrandLogo } from '../src/components/brand-logo';
import { requestEmailVerification, signInWithEmail, signUpWithEmail } from '../src/services/auth';
import { booksomeLayout, booksomeColors as c } from '../src/theme/booksome';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ email?: string; reset?: string; next?: string; mode?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(params.mode === 'sign-up' ? 'sign-up' : 'sign-in');
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(params.reset === 'success' ? '비밀번호를 바꿨어요. 새 비밀번호로 로그인해주세요.' : '');
  const [failed, setFailed] = useState(false);
  const nextPath = typeof params.next === 'string' && /^\/(books\/add(?:\?|$)|library$|record$|rooms$|room\/[^?#]+$)/.test(params.next) ? params.next : '/';
  async function submit() {
    if (busy) return;
    setFeedback(''); setFailed(false);
    if (!email.trim() || !password) { setFailed(true); setFeedback('이메일과 비밀번호를 입력해주세요.'); return; }
    if (mode === 'sign-up' && (!name.trim() || password.length < 10)) { setFailed(true); setFeedback('닉네임과 10자 이상의 비밀번호를 입력해주세요.'); return; }
    setBusy(true);
    try {
      if (mode === 'sign-in') { await signInWithEmail(email.trim(), password); router.replace(nextPath as '/'); }
      else {
        await signUpWithEmail({ email: email.trim(), password, displayName: name.trim() });
        void requestEmailVerification().catch(() => undefined);
        router.replace((nextPath === '/' ? '/books/add' : nextPath) as '/');
      }
    } catch (cause) { setFailed(true); setFeedback(cause instanceof Error ? cause.message : '로그인하지 못했어요. 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.top}><BackButton /><BrandLogo width={140} /></View>
      <View style={styles.intro}><Image source={require('../assets/booksome-adaptive-icon-v2.png')} style={styles.mascot} resizeMode="contain" /><Text style={styles.title}>{mode === 'sign-in' ? '읽던 이야기,\n이어서 만나요' : '나만의 서재를\n시작해볼까요?'}</Text><Text style={styles.copy}>책과 문장, 나의 생각이 쌓이는 곳</Text></View>
      <View accessibilityRole="tablist" style={styles.switch}>{(['sign-in', 'sign-up'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => { setMode(value); setFeedback(''); }} style={[styles.tab, mode === value && styles.tabActive]}><Text style={[styles.tabText, mode === value && styles.tabSelected]}>{value === 'sign-in' ? '로그인' : '회원가입'}</Text></Pressable>)}</View>
      <View style={styles.form}>
        {mode === 'sign-up' ? <Field label="닉네임"><Input accessibilityLabel="닉네임" value={name} onChangeText={setName} placeholder="책 이야기에서 불릴 이름" autoCapitalize="none" /></Field> : null}
        <Field label="이메일"><Input accessibilityLabel="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="hello@example.com" /></Field>
        <Field label="비밀번호" hint={mode === 'sign-up' ? '10자 이상으로 만들어주세요.' : undefined}><PasswordInput accessibilityLabel="비밀번호" value={password} onChangeText={setPassword} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="비밀번호를 입력하세요" returnKeyType="go" onSubmitEditing={() => void submit()} /></Field>
        <Feedback error={failed}>{feedback}</Feedback>
        <Button title={mode === 'sign-in' ? '로그인하고 이어 읽기' : '내 서재 만들기'} loading={busy} onPress={() => void submit()} />
        {mode === 'sign-in' ? <Button title="비밀번호를 잊으셨나요?" variant="ghost" onPress={() => router.push({ pathname: '/auth/update-password', params: { email: email.trim() } })} /> : <Text style={styles.note}>독서 기록은 기본적으로 나에게만 보여요.</Text>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, content: { width: '100%', alignSelf: 'center', maxWidth: booksomeLayout.maxContentWidth, padding: 24, paddingBottom: 48 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, intro: { paddingTop: 32, paddingBottom: 24, position: 'relative' },
  mascot: { position: 'absolute', right: -20, top: 6, width: 150, height: 150, opacity: 0.95 },
  title: { color: c.ink, fontSize: 28, lineHeight: 39, fontWeight: '800', letterSpacing: -1 }, copy: { color: c.muted, fontSize: 14, marginTop: 22 },
  switch: { flexDirection: 'row', backgroundColor: c.subtle, padding: 4, borderRadius: 28, marginBottom: 26 }, tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 24 }, tabActive: { backgroundColor: c.surface }, tabText: { color: c.muted, fontSize: 14, fontWeight: '600' }, tabSelected: { color: c.action, fontWeight: '700' },
  form: { gap: 18 }, note: { textAlign: 'center', color: c.muted, fontSize: 12, lineHeight: 20 },
});
