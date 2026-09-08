import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = { title: '개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <PageShell><article className="prose-page legal-page"><p>BookSome</p><h1>개인정보처리방침</h1><section><h2>준비 중인 방침</h2><p>정식 서비스 공개 전에 수집 항목, 처리 목적, 보관 기간, 위탁 처리와 이용자 권리를 명확히 고지합니다. 현재 개발·QA 단계에서는 민감한 개인정보를 입력하지 마세요.</p></section></article></PageShell>
  );
}
