import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookCover } from '@/components/book-cover';
import { PageShell } from '@/components/page-shell';
import { demoStudyBooks } from '@/lib/study/types';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const book=demoStudyBooks.find(item=>item.id===id);
  return { title: book ? `${book.title} · 시안 도서` : '시안 도서', robots:{index:false,follow:false} };
}

export default async function StudyBookPage({params}:Props) {
  const {id}=await params;
  const book=demoStudyBooks.find(item=>item.id===id);
  if(!book)notFound();
  return <PageShell>
    <div className="container breadcrumb"><Link href="/study">가상 서재</Link><span>/</span><span>책 상세</span></div>
    <section className="container library-book-hero">
      <BookCover src={null} title={book.title} />
      <div><p className="library-muted">가상 서재 · 시안 도서</p><h1>{book.title}</h1><p>{book.author || '저자 정보 없음'}</p><p className="library-muted">서재의 모습과 책을 꺼내보는 동작을 체험하기 위한 시안 도서입니다.</p></div>
    </section>
    <section className="container library-section">
      <h2>내 책으로 채워볼까요?</h2><p>실제로 등록한 책에서는 책 정보와 내가 남긴 문장, 독서 기록을 함께 볼 수 있어요.</p>
      <div className="state-actions"><Link className="button" href="/study">가상 서재로 돌아가기</Link><Link className="button button--outline" href={`/books?query=${encodeURIComponent(book.title)}`}>이 책 찾아보기</Link></div>
    </section>
  </PageShell>;
}
