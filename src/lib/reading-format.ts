import type { ReadingLifeBook } from '../services/reading-life';

type ReadingPagePosition = Pick<ReadingLifeBook, 'currentPage' | 'totalPages'>;

export function formatReadingPagePosition(book: ReadingPagePosition) {
  return book.totalPages
    ? `${book.currentPage} / ${book.totalPages}쪽`
    : `${book.currentPage}쪽 · 전체 미설정`;
}

export function formatReadingTotalPages(book: ReadingPagePosition) {
  return book.totalPages ? `총 ${book.totalPages}쪽` : '전체 페이지 미설정';
}
