import { supabase } from '../lib/supabase';
import type { BookSearchItem } from './books';

export type ReadingBookStatus = 'want_to_read' | 'reading' | 'finished' | 'paused';

export type ReadingLifeBook = {
  id: string;
  profileId: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  externalCoverUrl: string | null;
  status: ReadingBookStatus;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

type ReadingBookRow = {
  id: string;
  profile_id: string;
  isbn13: string | null;
  title: string;
  author: string;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  external_cover_url: string | null;
  status: ReadingBookStatus;
  progress_percent: number;
  created_at: string;
  updated_at: string;
};

export async function listReadingLifeBooks(profileId: string) {
  const { data, error } = await supabase
    .from('reading_books')
    .select(
      'id, profile_id, isbn13, title, author, publisher, published_date, description, external_cover_url, status, progress_percent, created_at, updated_at',
    )
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .returns<ReadingBookRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapReadingBook);
}

export async function addBookToReadingLife(profileId: string, book: BookSearchItem) {
  const isbn13 = normalizeIsbn(book.isbn);

  if (!isbn13) {
    throw new Error('ISBN이 없어 독서생활에 등록할 수 없습니다.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('reading_books')
    .select(
      'id, profile_id, isbn13, title, author, publisher, published_date, description, external_cover_url, status, progress_percent, created_at, updated_at',
    )
    .eq('profile_id', profileId)
    .eq('isbn13', isbn13)
    .maybeSingle<ReadingBookRow>();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return mapReadingBook(existing);
  }

  const { data, error } = await supabase
    .from('reading_books')
    .insert({
      profile_id: profileId,
      isbn13,
      title: book.title || '제목 없는 책',
      author: book.author || '작가 미상',
      publisher: book.publisher || null,
      published_date: normalizePublishedDate(book.publishedDate),
      description: book.description || null,
      external_cover_url: book.imageUrl,
      status: 'reading',
      progress_percent: 0,
      source: book.source,
      source_payload: book.sourcePayload,
    })
    .select(
      'id, profile_id, isbn13, title, author, publisher, published_date, description, external_cover_url, status, progress_percent, created_at, updated_at',
    )
    .single<ReadingBookRow>();

  if (error) {
    throw error;
  }

  return mapReadingBook(data);
}

function mapReadingBook(row: ReadingBookRow): ReadingLifeBook {
  return {
    id: row.id,
    profileId: row.profile_id,
    isbn13: row.isbn13,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    publishedDate: row.published_date,
    description: row.description,
    externalCoverUrl: row.external_cover_url,
    status: row.status,
    progressPercent: row.progress_percent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, '').toUpperCase();
}

function normalizePublishedDate(value: string) {
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}
