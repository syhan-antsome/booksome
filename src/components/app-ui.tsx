import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { booksomeLayout, booksomeColors as c } from '../theme/booksome';
import { useReducedMotion } from './tab-page';

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary', icon, style }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ComponentProps<typeof Ionicons>['name']; style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const muted = disabled || loading;
  const foreground = variant === 'primary' || variant === 'danger' ? c.white : c.action;
  const animate = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, { toValue: value, speed: 30, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  return <Animated.View style={[{ transform: [{ scale }] }, style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: muted, busy: loading }}
      disabled={muted} onPress={onPress} onPressIn={() => animate(0.97)} onPressOut={() => animate(1)}
      style={[styles.button, styles[variant], muted && styles.disabled]}>
      {loading ? <ActivityIndicator color={foreground} /> : <>{icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}<Text style={[styles.buttonText, { color: foreground }]}>{title}</Text></>}
    </Pressable>
  </Animated.View>;
}

export const Input = forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(function Input(
  { style, invalid, onFocus, onBlur, secureTextEntry, autoCapitalize, autoCorrect, ...props }, ref,
) {
  const [focused, setFocused] = useState(false);
  const inputStyle = StyleSheet.flatten(style);
  return <TextInput {...props} ref={ref} secureTextEntry={secureTextEntry}
    autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : 'sentences')}
    autoCorrect={autoCorrect ?? !secureTextEntry}
    placeholderTextColor={c.muted} selectionColor={c.accent}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[styles.input, props.multiline && styles.multiline, style, styles.inputPaint,
    { minHeight: Math.max(props.multiline ? 120 : 56, typeof inputStyle?.minHeight === 'number' ? inputStyle.minHeight : 0), fontSize: Math.max(15, inputStyle?.fontSize ?? 16) },
    focused && styles.focused, invalid && styles.invalid, props.editable === false && styles.disabled]} />;
});

/** Custom rows, icon actions and chips share touch sizing and press feedback. */
export const Touch = forwardRef<View, PressableProps>(function Touch({ style, accessibilityRole = 'button', ...props }, ref) {
  return <Pressable {...props} ref={ref} accessibilityRole={accessibilityRole} style={state => [
    { minHeight: 44, minWidth: 44 }, typeof style === 'function' ? style(state) : style,
    state.pressed && { opacity: 0.72 }, props.disabled && { opacity: 0.48 },
  ]} />;
});

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}{hint ? <Text style={styles.hint}>{hint}</Text> : null}</View>;
}

export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.password}>
    <Input {...props} autoCapitalize="none" autoCorrect={false} secureTextEntry={!visible}
      autoComplete={props.autoComplete ?? 'current-password'} style={[props.style, styles.passwordInput]} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 보기'} onPress={() => setVisible(value => !value)} style={styles.eye}>
      <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} color={c.muted} size={22} />
    </Pressable>
  </View>;
}

export function Feedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
  if (!children) return null;
  return <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.feedback, error && styles.errorFeedback]}>
    <Ionicons name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={20} color={error ? c.danger : c.accent} />
    <Text style={[styles.feedbackText, error && { color: c.danger }]}>{children}</Text>
  </View>;
}

export function EmptyState({ title, copy, action, onAction, mascot = false }: {
  title: string; copy: string; action?: string; onAction?: () => void; mascot?: boolean;
}) {
  return <View style={styles.empty}>
    {mascot ? <Image source={require('../../assets/booksome-adaptive-icon-v2.png')} resizeMode="contain" style={styles.mascot} /> : <View style={styles.emptyIcon}><Ionicons name="book-outline" color={c.accent} size={30} /></View>}
    <Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text>
    {action && onAction ? <Button title={action} onPress={onAction} style={{ alignSelf: 'stretch', marginTop: 8 }} /> : null}
  </View>;
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return <Modal transparent visible={visible} animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <Pressable accessibilityLabel="닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom) }]}>
        <View style={styles.handle} /><View style={styles.sheetHeading}><Text style={styles.sheetTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color={c.ink} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primary: { backgroundColor: c.action }, secondary: { backgroundColor: c.accentSoft }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: c.danger },
  buttonText: { fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.48 },
  input: { backgroundColor: c.surface, color: c.ink, borderWidth: 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, fontSize: 16, fontWeight: '400' },
  multiline: { minHeight: 120, textAlignVertical: 'top', lineHeight: 25 },
  inputPaint: { backgroundColor: c.surface, color: c.ink, borderRadius: 16, fontWeight: '400', paddingVertical: 14, paddingHorizontal: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'solid' as const, outlineWidth: 0 } : {}) },
  focused: { borderWidth: 1, borderColor: c.action, borderTopColor: c.action, borderBottomColor: c.action, borderLeftColor: c.action, borderRightColor: c.action },
  invalid: { borderColor: c.danger, borderTopColor: c.danger, borderBottomColor: c.danger, borderLeftColor: c.danger, borderRightColor: c.danger },
  field: { gap: 8 }, label: { fontSize: 13, fontWeight: '700', color: c.ink }, hint: { color: c.muted, fontSize: 12, lineHeight: 19 },
  password: { position: 'relative' }, passwordInput: { paddingRight: 56 }, eye: { position: 'absolute', right: 4, top: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  feedback: { backgroundColor: c.accentSoft, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  errorFeedback: { backgroundColor: '#FFF0EF' }, feedbackText: { color: c.ink, fontSize: 14, lineHeight: 22, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 12 },
  mascot: { width: 200, height: 160, marginTop: -12, marginBottom: -8 },
  emptyIcon: { backgroundColor: c.accentSoft, borderRadius: 28, padding: 18, marginBottom: 8 },
  emptyTitle: { color: c.ink, fontSize: 21, lineHeight: 29, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { color: c.muted, fontSize: 14, lineHeight: 23, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(38,37,38,0.42)' },
  sheet: { width: '100%', maxWidth: booksomeLayout.maxContentWidth, maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.background, paddingHorizontal: 24 },
  handle: { backgroundColor: c.line, height: 4, width: 36, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  sheetTitle: { color: c.ink, fontSize: 21, fontWeight: '700' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, sheetContent: { gap: 16, paddingBottom: 12 },
});
