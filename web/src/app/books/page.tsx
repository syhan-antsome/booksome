import type { Metadata } from 'next';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { PageShell } from '@/components/page-shell';
import { searchBooks } from '@/lib/api';

export const metadata: Metadata = { title: '책 찾기' };
export const dynamic = 'force-dynamic';

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const query = (await searchParams).query?.trim() ?? '';
  const response = query ? await searchBooks(query) : null;

  return (
    <PageShell>
      <section className="directory-hero">
        <h1>어떤 책을<br />기록하고 싶나요?</h1>
        <form action="/books" className="book-search" method="get">
          <label htmlFor="book-query">책 제목, 저자 또는 ISBN</label>
          <div>
            <input defaultValue={query} id="book-query" name="query" placeholder="예: 모순, 양귀자" required />
            <button className="button" type="submit">책 찾기 <ArrowIcon /></button>
          </div>
        </form>
      </section>

      <section className="book-results" aria-live="polite">
        {!query ? (
          <div className="search-invitation">
            <span>01</span>
            <p>읽고 있는 책을 찾고, 북썸의 개인 서재에 담아보세요.</p>
          </div>
        ) : response ? (
          <>
            <header>
              <h2>‘{query}’ 검색 결과</h2>
              <p>{response.total.toLocaleString('ko-KR')}권 중 {response.items.length}권을 보여드립니다.</p>
            </header>
            {response.items.length ? (
              <div className="book-list">
                {response.items.map((book, index) => (
                  <article className="book-row" key={`${book.isbn}-${index}`}>
                    <BookCover src={book.imageUrl} title={book.title} />
                    <div>
                      <h3>{book.title}</h3>
                      <p>{[book.author, book.translator, book.publisher].filter(Boolean).join(' · ')}</p>
                      {book.description ? <p className="book-row__description">{book.description}</p> : null}
                      <small>{book.isbn ? `ISBN ${book.isbn}` : 'ISBN 정보 없음'}</small>
                    </div>
                    <a className="text-link" href={`/app/books/add?query=${encodeURIComponent(book.isbn || book.title)}`}>
                      내 서재에 담기 <ArrowIcon />
                    </a>
                  </article>
                ))}
              </div>
            ) : <p className="empty-editorial">검색 결과가 없습니다. 다른 제목이나 ISBN으로 찾아보세요.</p>}
          </>
        ) : (
          <p className="empty-editorial">책 검색 서버에 잠시 연결할 수 없습니다. 조금 뒤 다시 시도해주세요.</p>
        )}
      </section>
    </PageShell>
  );
}
