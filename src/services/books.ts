export type BookSearchItem = {
  title: string;
  author: string;
  publisher: string;
  publishedDate: string;
  isbn: string;
  imageUrl: string | null;
  link: string | null;
  description: string;
  source: 'naver' | 'nl-seoji';
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

const apiUrl = process.env.EXPO_PUBLIC_MEDIA_API_URL;

export async function lookupBookByIsbn(isbn: string) {
  const normalizedIsbn = isbn.replace(/[^0-9X]/gi, '').toUpperCase();

  if (!normalizedIsbn) {
    throw new Error('ISBN이 비어 있습니다.');
  }

  const response = await fetch(`${getApiBaseUrl()}/v1/books/isbn/${encodeURIComponent(normalizedIsbn)}`);

  if (!response.ok) {
    throw new Error(`도서 검색에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as BookLookupResponse;
}

export async function searchBooksByTitle(query: string) {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  if (normalizedQuery.length < 2) {
    throw new Error('책 제목을 두 글자 이상 입력해주세요.');
  }

  const response = await fetch(`${getApiBaseUrl()}/v1/books/search?query=${encodeURIComponent(normalizedQuery)}`);

  if (!response.ok) {
    throw new Error(`도서 검색에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as BookTitleSearchResponse;
}

function getApiBaseUrl() {
  if (!apiUrl) {
    throw new Error('Missing EXPO_PUBLIC_MEDIA_API_URL');
  }

  return apiUrl.replace(/\/$/, '');
}
