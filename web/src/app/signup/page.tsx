import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { SignupForm } from '@/components/signup-form';

export const metadata: Metadata = { title: '회원가입' };

export default function SignupPage() {
  return <AuthShell title="나만의 서재를 시작해요" description="읽은 페이지와 오래 남기고 싶은 문장을 한곳에 모아보세요."><SignupForm /></AuthShell>;
}
