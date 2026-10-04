import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { LibraryAccess } from '@/components/library-access';
import { LibraryAdd } from '@/components/library-add';
export const metadata: Metadata = { title: '내 서재에 책 등록', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function AddPage({ searchParams }: { searchParams: Promise<{query?:string|string[]}> }) {
  const raw=(await searchParams).query; const query=(Array.isArray(raw)?raw[0]:raw)?.trim().slice(0,80)??'';
  const path='/library/add'+(query?'?query='+encodeURIComponent(query):'');
  return <PageShell stickyHeader><section className="container library-hero"><div><h1>내 서재에 책 담기</h1><p>오늘의 독서를, 나의 이야기로.</p></div></section><LibraryAccess path={path}><LibraryAdd key={query} query={query} /></LibraryAccess></PageShell>;
}
