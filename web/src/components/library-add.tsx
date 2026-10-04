'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { usePortalSession } from '@/components/portal-session';
import { portalRequest } from '@/lib/portal-request';
import { normalizeIsbn, validIsbn, type ReadingBook } from '@/lib/reading';
import type { BookSearchItem } from '@/lib/types';

export function LibraryAdd({ query }: { query: string }) {
  const router = useRouter();
  const { loggingOut } = usePortalSession();
  const [items, setItems] = useState<BookSearchItem[]>([]);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(Boolean(query));
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState(validIsbn(query) ? normalizeIsbn(query) : '');
  const [total, setTotal] = useState('');
  const [selected, setSelected] = useState<BookSearchItem | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  function choose(book: BookSearchItem) { setSelected(book); setTitle(book.title); setAuthor(book.author); setIsbn(normalizeIsbn(book.isbn)); }
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const path = validIsbn(query) ? `/books/isbn/${normalizeIsbn(query)}` : `/books/search?query=${encodeURIComponent(query)}&display=12`;
    portalRequest<{ items: BookSearchItem[] }>(path, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      setItems(result.items);
      if (result.items.length === 1) choose(result.items[0]);
    }).catch(cause => { if (!controller.signal.aborted) setLookupError(cause instanceof Error ? cause.message : '책 검색을 불러오지 못했어요.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || loggingOut) return;
    const normalized = normalizeIsbn(isbn);
    if (!validIsbn(normalized) || !title.trim() || !author.trim()) { setError('책 제목·저자와 ISBN 10자리 또는 13자리를 확인해주세요.'); return; }
    const pages = total.trim() ? Number(total) : null;
    if (pages !== null && (!Number.isSafeInteger(pages) || pages <= 0)) { setError('전체 쪽수는 양의 정수로 입력하거나 비워주세요.'); return; }
    busy.current = true; setPending(true); setError('');
    try {
      const existing = await portalRequest<{ book: ReadingBook | null }>(`/reading-life/books/by-isbn/${normalized}`);
      let book = existing.book;
      if (!book) {
        const matched = selected && normalizeIsbn(selected.isbn) === normalized && selected.title === title && selected.author === author;
        const published = selected?.publishedDate;
        book = await portalRequest<ReadingBook>('/reading-life/books', { method: 'POST', body: JSON.stringify({
          isbn13: normalized, title: title.trim(), author: author.trim(), publisher: matched ? selected.publisher : null,
          publishedDate: matched && published ? /^\d{8}$/.test(published) ? `${published.slice(0,4)}-${published.slice(4,6)}-${published.slice(6,8)}` : /^\d{4}-\d{2}-\d{2}$/.test(published) ? published : null : null,
          description: matched ? selected.description : null, externalCoverUrl: matched ? selected.imageUrl : null,
          totalPages: pages, status: 'reading', source: matched ? selected.source : 'manual', sourcePayload: matched ? {} : { manual: true }
        }) });
      }
      router.replace(`/library/${encodeURIComponent(book.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '책을 담지 못했어요. 다시 시도해주세요.'); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className="container library-add-layout">
    <div><h2>읽고 있는 책을 찾아요</h2><p className="library-muted">제목이나 ISBN으로 찾거나, 책 정보를 직접 입력하세요.</p>
      <form className="book-search" action="/library/add" method="get"><label htmlFor="library-query">책 제목 또는 ISBN</label><div><input id="library-query" name="query" defaultValue={query} placeholder="책 제목 또는 ISBN" minLength={2} maxLength={80} required /><button className="button" type="submit">찾기</button></div></form>
      {loading ? <p className="library-muted" role="status">책을 찾는 중…</p> : null}
      {lookupError ? <p className="form-message" role="status">{lookupError} 아래에 책 정보를 직접 입력해 등록할 수 있어요.</p> : null}
      {!loading && query && !lookupError && !items.length ? <p className="library-muted">검색 결과가 없어요. 책 정보를 직접 입력할 수 있어요.</p> : null}
      <div className="library-search-results">{items.map((book,index) => <button key={book.isbn + index} className="library-search-book" type="button" onClick={() => choose(book)} aria-pressed={selected === book}><BookCover src={book.imageUrl} title={book.title} /><span><strong>{book.title}</strong><span>{book.author}</span><small>이 책 선택하기</small></span></button>)}</div>
      <Link className="text-link" href="/library">내 서재로 돌아가기 →</Link>
    </div>
    <form className="library-panel library-form" onSubmit={submit} aria-busy={pending}><h2>내 서재에 담기</h2><p className="library-muted">등록한 책과 새 기록은 기본적으로 나만 볼 수 있어요.</p>
      <div className="discussion-field"><label htmlFor="add-title">책 제목</label><input id="add-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={500} required readOnly={pending} /></div>
      <div className="discussion-field"><label htmlFor="add-author">저자</label><input id="add-author" value={author} onChange={e => setAuthor(e.target.value)} maxLength={500} required readOnly={pending} /></div>
      <div className="discussion-field"><label htmlFor="add-isbn">ISBN</label><input id="add-isbn" value={isbn} onChange={e => setIsbn(e.target.value)} maxLength={24} placeholder="책 뒷면의 10자리 또는 13자리 번호" required readOnly={pending} /></div>
      <div className="discussion-field"><label htmlFor="add-pages">전체 쪽수 · 선택</label><input id="add-pages" type="number" min={1} step={1} value={total} onChange={e => setTotal(e.target.value)} readOnly={pending} /></div>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      <button className="button" type="submit" disabled={pending || loggingOut}>{pending ? '담는 중…' : '내 서재에 담기'}</button>
    </form>
  </section>;
}
