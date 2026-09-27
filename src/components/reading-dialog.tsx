import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { booksomeColors as c } from '../theme/booksome';
import { Touch as Pressable } from './app-ui';

// React Native's Alert is not implemented on web. Keep the same explicit
// choices (especially draft-discard and deletion) on both platforms.
export function useReadingDialog() {
  const [value, setValue] = useState<{ title: string; message: string; buttons: AlertButton[] } | null>(null);
  const show = useCallback((title: string, message: string, buttons: AlertButton[]) => {
    if (Platform.OS !== 'web') { Alert.alert(title, message, buttons); return; }
    setValue({ title, message, buttons });
  }, []);
  const dialog = <Modal transparent animationType="fade" visible={value !== null} onRequestClose={() => setValue(null)}>
    <View style={styles.overlay}>
      <View accessibilityViewIsModal style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>{value?.title}</Text>
        <Text style={styles.message}>{value?.message}</Text>
        {value?.buttons.map((button, index) => <Pressable key={index} accessibilityRole="button" onPress={() => { setValue(null); button.onPress?.(); }} style={[styles.button, button.style === 'cancel' && styles.cancel]}>
          <Text style={[styles.buttonText, button.style === 'destructive' && styles.danger]}>{button.text}</Text>
        </Pressable>)}
      </View>
    </View>
  </Modal>;
  return { show, dialog };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,30,24,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { backgroundColor: c.paperStrong, borderRadius: 14, padding: 24, maxWidth: 370, width: '100%', gap: 14 },
  title: { color: c.ink, fontSize: 21, fontWeight: '700', lineHeight: 29 },
  message: { color: c.muted, fontSize: 14, lineHeight: 23, marginBottom: 8 },
  button: { backgroundColor: c.forestSoft, padding: 14, borderRadius: 24, alignItems: 'center', minHeight: 48 },
  cancel: { backgroundColor: c.paper },
  buttonText: { color: c.forest, fontSize: 15, fontWeight: '600' },
  danger: { color: c.danger },
});
