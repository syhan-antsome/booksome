import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { ContentState } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';
import { ReaderLink } from '@/components/portal-session';
import { SearchForm } from '@/components/search-form';
import { searchBooks } from '@/lib/api';

type Props = { searchParams: Promise<{ query?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = (await searchParams).query;
  return { title: '책 찾기', description: '책 제목 또는 ISBN으로 책을 찾고 북썸의 내 서재에 담아 독서 기록을 시작하세요.', alternates: { canonical: '/books' }, ...(query ? { robots: { index: false, follow: true } } : {}) };
}
export default async function BooksPage({ searchParams }: Props) {
  const raw = (await searchParams).query;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? '';
  const result = query.length >= 2 ? await searchBooks(query) : null;
  const readerPath = `/library/add${query ? `?query=${encodeURIComponent(query)}` : ''}`;
  return <PageShell active="books">
    <section className="directory-hero container"><h1>다음 이야기는<br /><span>어떤 책인가요?</span></h1><p>책을 찾고, 내 서재에 담고, 나만의 기록을 시작하세요.</p><SearchForm key={query} query={query} /></section>
    <section className="book-results container" aria-live="polite">
      {!query ? <ContentState title="지금 읽는 책 한 권부터" action={<ReaderLink className="text-link" href={readerPath}>책 정보를 직접 입력하기 <ArrowIcon /></ReaderLink>}>로그인 없이 찾아볼 수 있어요. 내 서재에 담을 때 로그인하고, 읽던 책에 기록을 남겨보세요.</ContentState> : query.length < 2 ? <ContentState title="두 글자 이상으로 찾아주세요">책 제목을 두 글자 이상 입력해주세요.</ContentState> : result?.error ? <ContentState error title={result.error === 'search-not-configured' ? '온라인 책 검색을 준비하고 있어요' : '책 검색에 연결하지 못했어요'} action={<div className="state-actions"><a className="button button--outline" href={`/books?query=${encodeURIComponent(query)}`}>다시 시도하기</a><ReaderLink className="text-link" href={readerPath}>책 정보를 직접 입력하기 <ArrowIcon /></ReaderLink></div>}>{result.error === 'search-not-configured' ? '검색 서비스 설정이 완료되지 않아 지금은 검색할 수 없어요. 제목·저자·ISBN을 직접 입력해 내 서재를 시작할 수 있어요.' : '입력한 검색어는 그대로 남겨두었어요. 다시 시도하거나 제목·저자·ISBN을 직접 입력해주세요.'}</ContentState> : result?.data ? <>
        <header className="results-heading"><h2>‘{query}’ 검색 결과</h2><p>{result.data.total.toLocaleString('ko-KR')}권 중 {result.data.items.length}권 표시</p></header>
        {result.data.items.length ? <div className="book-list">{result.data.items.map((book, index) => <article className="book-row" key={`${book.isbn}-${index}`}>
          <BookCover src={book.imageUrl} title={book.title} /><div><h3>{book.title}</h3><p>{[book.author, book.translator, book.publisher].filter(Boolean).join(' · ')}</p>{book.description ? <p className="book-row__description">{book.description}</p> : null}<small>{book.isbn ? `ISBN ${book.isbn}` : 'ISBN 정보 없음'}</small></div>
          <ReaderLink className="button button--outline" label={`${book.title} 내 서재에 담기`} href={`/library/add?query=${encodeURIComponent(book.isbn || book.title)}`}>내 서재에 담기 <ArrowIcon /></ReaderLink>
        </article>)}</div> : <ContentState title="찾는 책이 보이지 않아요" action={<ReaderLink className="text-link" href={readerPath}>책 정보를 직접 입력하기 <ArrowIcon /></ReaderLink>}>짧은 제목이나 책 뒷면의 ISBN으로 다시 찾아보세요.</ContentState>}
      </> : null}
      <div className="reading-hint"><p>담은 책과 개인 기록은 <strong>내 서재</strong>에서, 다른 독자와의 공개 대화는 <strong>책 이야기</strong>에서.</p><Link className="text-link" href="/rooms">책 이야기 보기 <ArrowIcon /></Link></div>
    </section>
  </PageShell>;
}
