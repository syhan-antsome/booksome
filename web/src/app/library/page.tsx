import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { LibraryAccess } from '@/components/library-access';
import { LibraryShelf } from '@/components/library-shelf';
export const metadata: Metadata = { title: '내 서재', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function LibraryPage() {
  return <PageShell stickyHeader><section className="container library-hero"><div><h1>내 서재</h1><p>지금 읽는 책과, 나에게 남은 문장.</p></div><Link className="button" href="/library/add">책 등록하기 →</Link></section><LibraryAccess path="/library"><LibraryShelf /></LibraryAccess></PageShell>;
}
