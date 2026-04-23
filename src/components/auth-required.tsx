import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export function AuthRequired({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Members only</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      <Link href="/auth" style={styles.cta}>
        로그인 / 회원가입
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#113F35',
    borderRadius: 28,
    flex: 1,
    justifyContent: 'center',
    marginTop: 20,
    padding: 24,
  },
  label: {
    color: '#D9C28F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 38,
  },
  copy: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 12,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#F7F2EA',
    borderRadius: 16,
    color: '#113F35',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 24,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
  },
});
