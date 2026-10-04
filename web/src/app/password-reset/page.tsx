import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { PasswordResetForm } from '@/components/password-reset-form';

export const metadata: Metadata = { title: '비밀번호 재설정', robots: { index: false, follow: false } };

export default function PasswordResetPage() {
  return <AuthShell title="비밀번호를 다시 정해요" description="가입한 이메일로 8자리 인증 코드를 보내드립니다."><PasswordResetForm /></AuthShell>;
}
