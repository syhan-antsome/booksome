import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { booksomeColors as c, booksomeType } from '../theme/booksome';
import { PaperSlip } from './collector-surfaces';

export function AuthRequired({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <PaperSlip style={styles.panel}>
      <Text style={styles.label}>나만의 문장을 모으는 곳</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
      <Link href="/auth" style={styles.cta}>
        로그인 / 회원가입
      </Link>
    </PaperSlip>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: c.paperStrong,
    borderRadius: 2,
    justifyContent: 'center',
    marginTop: 20,
    padding: 24,
  },
  label: {
    color: c.muted,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: c.forest,
    fontFamily: booksomeType.serif,
    fontSize: 26,
    letterSpacing: 0,
    lineHeight: 38,
  },
  copy: {
    color: c.muted,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 12,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: c.forest,
    borderRadius: 28,
    color: c.paperStrong,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 24,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
  },
});
