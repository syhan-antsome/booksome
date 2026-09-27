import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { booksomeColors as c } from '../theme/booksome';
import { Touch as Pressable } from './app-ui';

export function BackButton({ fallbackHref = '/' }: { fallbackHref?: '/' | '/rooms' }) {
  return (
    <Pressable
      accessibilityLabel="뒤로"
      accessibilityRole="button"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref))}
      style={styles.button}
    >
      <Ionicons name="arrow-back" size={23} color={c.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
