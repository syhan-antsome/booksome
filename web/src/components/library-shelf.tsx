'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { ContentLoading, ContentState } from '@/components/content-state';
import { LibraryFailure, useLibraryResource } from '@/components/library-access';
import type { ReadingBook } from '@/lib/reading';

export function LibraryShelf() {
  const resource = useLibraryResource<ReadingBook[]>('/reading-life/books');
  const [filter, setFilter] = useState<'all' | 'reading' | 'finished'>('all');
  if (resource.loading) return <div className="container"><ContentLoading label="내 책을 불러오는 중…" /></div>;
  if (resource.error) return <div className="container library-status"><LibraryFailure error={resource.error} path="/library" retry={resource.retry} /></div>;
  const books = [...(resource.data ?? [])].sort((a,b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const shown = books.filter(book => filter === 'all' || book.status === filter);
  return <section className="container library-section">
    <div className="library-filters" aria-label="서재 분류">{(['all','reading','finished'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? '전체' : value === 'reading' ? '읽는 중' : '완독'} <span>{books.filter(book => value === 'all' || book.status === value).length}</span></button>)}</div>
    {!books.length ? <ContentState title="첫 책을 담아볼까요?" action={<Link className="button" href="/library/add">책 등록하기</Link>}>읽고 있는 책 한 권부터 시작하세요. 문장과 생각은 책마다 모아둘 수 있어요.</ContentState> : !shown.length ? <ContentState title={filter === 'finished' ? '아직 완독한 책이 없어요' : '이 분류에는 책이 없어요'}>다른 분류에서 책을 찾아보세요.</ContentState> : <div className="shelf-grid">{shown.map(book => <Link className="shelf-book" key={book.id} href={`/library/${encodeURIComponent(book.id)}`}><BookCover src={book.externalCoverUrl} title={book.title} /><h2>{book.title}</h2><p>{book.author}</p><small>{book.status === 'finished' ? '완독' : '읽는 중'} · {book.currentPage}{book.totalPages ? ` / ${book.totalPages}` : ''}쪽</small>{book.totalPages ? <progress value={book.currentPage} max={book.totalPages} aria-label={`${book.title} 읽은 쪽수`} /> : null}<span className="text-link">기록 이어가기 →</span></Link>)}</div>}
  </section>;
}
