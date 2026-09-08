import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthShell title="다시, 읽던 자리로" description="나의 책과 문장을 이어서 기록해보세요."><LoginForm nextPath={(await searchParams).next} /></AuthShell>;
}
