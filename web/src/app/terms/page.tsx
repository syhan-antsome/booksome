import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = { title: '이용약관' };

export default function TermsPage() {
  return (
    <PageShell><article className="prose-page legal-page"><p>BookSome</p><h1>이용약관</h1><section><h2>준비 중인 약관</h2><p>정식 서비스 공개 전에 운영 주체, 제공 기능, 회원의 권리와 의무, 콘텐츠 정책을 반영한 이용약관을 게시합니다. 현재 개발·QA 단계에서는 테스트 데이터만 입력해주세요.</p></section></article></PageShell>
  );
}
