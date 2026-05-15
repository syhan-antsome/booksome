import { supabase } from '../lib/supabase';
import type { BookSearchItem } from './books';

export type ReadingBookStatus = 'want_to_read' | 'reading' | 'finished';
type ReadingBookStatusRow = ReadingBookStatus | 'paused';

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
  currentPage: number;
  totalPages: number | null;
  pinnedAt: string | null;
  visibility: ReadingVisibility;
  createdAt: string;
  updatedAt: string;
};

export type ReadingVisibility = 'private' | 'public';
export type ReadingNoteKind = 'quote' | 'photo';

export type ReadingLifeNote = {
  id: string;
  readingBookId: string;
  profileId: string;
  kind: ReadingNoteKind;
  quoteText: string | null;
  body: string | null;
  pageLabel: string | null;
  currentPageSnapshot: number;
  progressPercentSnapshot: number;
  totalPagesSnapshot: number | null;
  mediaPath: string | null;
  mediaUrl: string | null;
  visibility: ReadingVisibility;
  createdAt: string;
  updatedAt: string;
};

export type UpdateReadingLifeBookInput = {
  status?: ReadingBookStatus;
  progressPercent?: number;
  currentPage?: number;
  totalPages?: number | null;
  externalCoverUrl?: string | null;
  visibility?: ReadingVisibility;
};

export type AddReadingLifeBookInput = {
  externalCoverUrl?: string | null;
  status?: ReadingBookStatus;
  totalPages?: number | null;
};

export type CreateReadingLifeNoteInput = {
  readingBookId: string;
  profileId: string;
  kind: ReadingNoteKind;
  quoteText?: string | null;
  body?: string | null;
  pageLabel?: string | null;
  currentPageSnapshot?: number | null;
  progressPercentSnapshot?: number | null;
  totalPagesSnapshot?: number | null;
  mediaPath?: string | null;
  mediaUrl?: string | null;
  visibility?: ReadingVisibility;
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
  status: ReadingBookStatusRow;
  progress_percent: number;
  current_page: number;
  total_pages: number | null;
  pinned_at: string | null;
  visibility: ReadingVisibility;
  created_at: string;
  updated_at: string;
};

type ReadingNoteRow = {
  id: string;
  reading_book_id: string;
  profile_id: string;
  kind: ReadingNoteKind;
  quote_text: string | null;
  body: string | null;
  page_label: string | null;
  current_page_snapshot: number;
  progress_percent_snapshot: number;
  total_pages_snapshot: number | null;
  media_path: string | null;
  media_url: string | null;
  visibility: ReadingVisibility;
  created_at: string;
  updated_at: string;
};

const readingBookSelect =
  'id, profile_id, isbn13, title, author, publisher, published_date, description, external_cover_url, status, progress_percent, current_page, total_pages, pinned_at, visibility, created_at, updated_at';

const readingNoteSelect =
  'id, reading_book_id, profile_id, kind, quote_text, body, page_label, current_page_snapshot, progress_percent_snapshot, total_pages_snapshot, media_path, media_url, visibility, created_at, updated_at';

export async function listReadingLifeBooks(profileId: string) {
  const { data, error } = await supabase
    .from('reading_books')
    .select(readingBookSelect)
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .returns<ReadingBookRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapReadingBook).sort(sortReadingBooksForShelf);
}

export async function getReadingLifeBook(profileId: string, bookId: string) {
  const { data, error } = await supabase
    .from('reading_books')
    .select(readingBookSelect)
    .eq('profile_id', profileId)
    .eq('id', bookId)
    .maybeSingle<ReadingBookRow>();

  if (error) {
    throw error;
  }

  return data ? mapReadingBook(data) : null;
}

export async function getReadingLifeBookByIsbn(profileId: string, isbn: string) {
  const isbn13 = normalizeIsbn(isbn);

  if (!isbn13) {
    return null;
  }

  const { data, error } = await supabase
    .from('reading_books')
    .select(readingBookSelect)
    .eq('profile_id', profileId)
    .eq('isbn13', isbn13)
    .maybeSingle<ReadingBookRow>();

  if (error) {
    throw error;
  }

  return data ? mapReadingBook(data) : null;
}

export async function listReadingLifeNotes(profileId: string, readingBookId: string) {
  const { data, error } = await supabase
    .from('reading_notes')
    .select(readingNoteSelect)
    .eq('profile_id', profileId)
    .eq('reading_book_id', readingBookId)
    .order('created_at', { ascending: false })
    .returns<ReadingNoteRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapReadingNote);
}

export async function addBookToReadingLife(
  profileId: string,
  book: BookSearchItem,
  input: AddReadingLifeBookInput = {},
) {
  const isbn13 = normalizeIsbn(book.isbn);
  const totalPages = sanitizePositiveInteger(input.totalPages);
  const externalCoverUrl = input.externalCoverUrl ?? book.imageUrl ?? null;
  const status = input.status ?? 'reading';

  if (!isbn13) {
    throw new Error('ISBN이 없어 독서생활에 등록할 수 없습니다.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('reading_books')
    .select(readingBookSelect)
    .eq('profile_id', profileId)
    .eq('isbn13', isbn13)
    .maybeSingle<ReadingBookRow>();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    throw new Error('이미 내 책장에 등록된 책입니다.');
  }

  const currentPage = status === 'finished' ? totalPages ?? 0 : 0;
  const progressPercent = status === 'finished' && totalPages ? 100 : 0;

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
      external_cover_url: externalCoverUrl,
      status,
      progress_percent: progressPercent,
      current_page: currentPage,
      total_pages: totalPages,
      source: book.source,
      source_payload: book.sourcePayload,
    })
    .select(
      readingBookSelect,
    )
    .single<ReadingBookRow>();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new Error('이미 내 책장에 등록된 책입니다.');
    }

    throw error;
  }

  return mapReadingBook(data);
}

export async function updateReadingLifeBook(
  profileId: string,
  bookId: string,
  input: UpdateReadingLifeBookInput,
) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) {
    updatePayload.status = input.status;
  }

  if (input.visibility) {
    updatePayload.visibility = input.visibility;
  }

  if (typeof input.externalCoverUrl !== 'undefined') {
    updatePayload.external_cover_url = input.externalCoverUrl;
  }

  if (typeof input.progressPercent === 'number') {
    updatePayload.progress_percent = Math.min(100, Math.max(0, Math.round(input.progressPercent)));
  }

  if (typeof input.currentPage === 'number') {
    updatePayload.current_page = sanitizeNonNegativeInteger(input.currentPage);
  }

  if (typeof input.totalPages === 'number') {
    updatePayload.total_pages = sanitizePositiveInteger(input.totalPages);
  } else if (input.totalPages === null) {
    updatePayload.total_pages = null;
  }

  const { data, error } = await supabase
    .from('reading_books')
    .update(updatePayload)
    .eq('profile_id', profileId)
    .eq('id', bookId)
    .select(readingBookSelect)
    .single<ReadingBookRow>();

  if (error) {
    throw error;
  }

  return mapReadingBook(data);
}

export async function deleteReadingLifeBook(profileId: string, bookId: string) {
  const { error } = await supabase
    .from('reading_books')
    .delete()
    .eq('profile_id', profileId)
    .eq('id', bookId);

  if (error) {
    throw error;
  }
}

export async function setFeaturedReadingLifeBook(profileId: string, bookId: string) {
  const pinnedAt = new Date().toISOString();
  const { error: clearError } = await supabase
    .from('reading_books')
    .update({
      pinned_at: null,
    })
    .eq('profile_id', profileId);

  if (clearError) {
    throw clearError;
  }

  const { data, error } = await supabase
    .from('reading_books')
    .update({
      pinned_at: pinnedAt,
      updated_at: pinnedAt,
    })
    .eq('profile_id', profileId)
    .eq('id', bookId)
    .select(readingBookSelect)
    .single<ReadingBookRow>();

  if (error) {
    throw error;
  }

  return mapReadingBook(data);
}

export async function createReadingLifeNote(input: CreateReadingLifeNoteInput) {
  const { data, error } = await supabase
    .from('reading_notes')
    .insert({
      reading_book_id: input.readingBookId,
      profile_id: input.profileId,
      kind: input.kind,
      quote_text: input.quoteText?.trim() || null,
      body: input.body?.trim() || null,
      page_label: input.pageLabel?.trim() || null,
      current_page_snapshot: sanitizeNonNegativeInteger(input.currentPageSnapshot ?? 0),
      progress_percent_snapshot: Math.min(100, Math.max(0, Math.round(input.progressPercentSnapshot ?? 0))),
      total_pages_snapshot:
        typeof input.totalPagesSnapshot === 'number' ? sanitizePositiveInteger(input.totalPagesSnapshot) : null,
      media_path: input.mediaPath ?? null,
      media_url: input.mediaUrl ?? null,
      visibility: input.visibility ?? 'private',
    })
    .select(readingNoteSelect)
    .single<ReadingNoteRow>();

  if (error) {
    throw error;
  }

  return mapReadingNote(data);
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
    status: normalizeReadingBookStatus(row.status),
    progressPercent: row.progress_percent,
    currentPage: row.current_page ?? 0,
    totalPages: row.total_pages,
    pinnedAt: row.pinned_at,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeReadingBookStatus(status: ReadingBookStatusRow): ReadingBookStatus {
  return status === 'paused' ? 'reading' : status;
}

function mapReadingNote(row: ReadingNoteRow): ReadingLifeNote {
  return {
    id: row.id,
    readingBookId: row.reading_book_id,
    profileId: row.profile_id,
    kind: row.kind,
    quoteText: row.quote_text,
    body: row.body,
    pageLabel: row.page_label,
    currentPageSnapshot: row.current_page_snapshot ?? 0,
    progressPercentSnapshot: row.progress_percent_snapshot ?? 0,
    totalPagesSnapshot: row.total_pages_snapshot,
    mediaPath: row.media_path,
    mediaUrl: row.media_url,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, '').toUpperCase();
}

function sortReadingBooksForShelf(a: ReadingLifeBook, b: ReadingLifeBook) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

export function calculateReadingProgressPercent(currentPage: number, totalPages: number | null | undefined) {
  if (!totalPages || totalPages <= 0) {
    return 0;
  }

  const safeCurrentPage = Math.min(totalPages, Math.max(0, Math.round(currentPage)));
  return Math.min(100, Math.max(0, Math.round((safeCurrentPage / totalPages) * 100)));
}

function sanitizePositiveInteger(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const integerValue = Math.round(value);
  return integerValue > 0 ? integerValue : null;
}

function sanitizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}
