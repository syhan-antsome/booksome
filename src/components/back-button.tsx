import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export function BackButton({ fallbackHref = '/' }: { fallbackHref?: '/' | '/rooms' }) {
  return (
    <Pressable
      accessibilityLabel="뒤로"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref))}
      style={styles.button}
    >
      <Text style={styles.icon}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.9)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  icon: {
    color: '#103D2B',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: -3,
  },
});
