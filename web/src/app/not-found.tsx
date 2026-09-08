import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';
import { PageShell } from '@/components/page-shell';

export default function NotFound() {
  return (
    <PageShell>
      <section className="status-page"><span>404</span><h1>찾는 페이지가 없습니다.</h1><Link className="text-link" href="/">처음으로 돌아가기 <ArrowIcon /></Link></section>
    </PageShell>
  );
}
