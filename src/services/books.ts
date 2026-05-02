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

const apiUrl = process.env.EXPO_PUBLIC_MEDIA_API_URL;

export async function lookupBookByIsbn(isbn: string) {
  if (!apiUrl) {
    throw new Error('Missing EXPO_PUBLIC_MEDIA_API_URL');
  }

  const normalizedIsbn = isbn.replace(/[^0-9X]/gi, '').toUpperCase();

  if (!normalizedIsbn) {
    throw new Error('ISBN이 비어 있습니다.');
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/books/isbn/${encodeURIComponent(normalizedIsbn)}`);

  if (!response.ok) {
    throw new Error(`도서 검색에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as BookLookupResponse;
}
