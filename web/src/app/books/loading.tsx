import { ContentLoading } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';

export default function Loading() {
  return <PageShell active="books"><section className="container directory-hero"><h1>책을 찾고 있어요</h1><ContentLoading label="검색 결과를 불러오는 중…" /></section></PageShell>;
}
