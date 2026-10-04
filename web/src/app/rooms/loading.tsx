import { ContentLoading } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';

export default function Loading() {
  return <PageShell active="rooms"><section className="container directory-hero"><h1>책 이야기</h1><ContentLoading label="공개 책 이야기를 불러오는 중…" /></section></PageShell>;
}
