import { router } from 'expo-router';
import { EmptyState } from './app-ui';
export function AuthRequired({ title, copy }: { title: string; copy: string }) {
  return <EmptyState mascot title={title} copy={copy} action="로그인하고 시작하기" onAction={() => router.push('/auth')} />;
}
