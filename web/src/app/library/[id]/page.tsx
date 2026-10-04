import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import { LibraryAccess } from '@/components/library-access';
import { LibraryBook } from '@/components/library-book';
export const metadata: Metadata = { title: '나의 책과 기록', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function BookPage({ params }: {params:Promise<{id:string}>}) {
  const {id}=await params;
  return <PageShell stickyHeader><LibraryAccess path={'/library/'+encodeURIComponent(id)}><LibraryBook key={id} id={id} /></LibraryAccess></PageShell>;
}
