import { apiRequest } from '../lib/api-client';

export type BookSearchItem = {
  title: string;
  author: string;
  publisher: string;
  translator?: string | null;
  publishedDate: string;
  isbn: string;
  imageUrl: string | null;
  link: string | null;
  description: string;
  source: 'naver' | 'kakao' | 'nl-seoji' | 'manual';
  sourcePayload: unknown;
};

type BookLookupResponse = {
  isbn: string;
  total: number;
  items: BookSearchItem[];
};

type BookTitleSearchResponse = {
  query: string;
  total: number;
  items: BookSearchItem[];
};

export async function lookupBookByIsbn(isbn: string) {
  const normalizedIsbn = isbn.replace(/[^0-9X]/gi, '').toUpperCase();

  if (!normalizedIsbn) {
    throw new Error('ISBN이 비어 있습니다.');
  }

  return apiRequest<BookLookupResponse>(
    `/api/books/isbn/${encodeURIComponent(normalizedIsbn)}`,
    {},
    { authenticated: 'optional' },
  );
}

export async function searchBooksByTitle(query: string) {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  if (normalizedQuery.length < 2) {
    throw new Error('책 제목을 두 글자 이상 입력해주세요.');
  }

  return apiRequest<BookTitleSearchResponse>(
    `/api/books/search?query=${encodeURIComponent(normalizedQuery)}`,
    {},
    { authenticated: 'optional' },
  );
}
