import { apiRequest } from '../lib/api-client';
import type { BookSearchItem } from './books';

export type ReadingBookStatus = 'reading' | 'finished';
export type ReadingVisibility = 'private' | 'public';
export type ReadingNoteKind = 'quote' | 'photo';

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

export type UpdateReadingLifeNoteInput = {
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

type ReadingBookEnvelope = { book: ReadingLifeBook | null };

export async function listReadingLifeBooks(profileId: string) {
  void profileId;
  const books = await apiRequest<ReadingLifeBook[]>('/api/reading-life/books');
  return books.sort(sortReadingBooksForShelf);
}

export async function getReadingLifeBook(profileId: string, bookId: string) {
  void profileId;
  const response = await apiRequest<ReadingBookEnvelope>(
    `/api/reading-life/books/${encodeURIComponent(bookId)}`,
  );
  return response.book;
}

export async function getReadingLifeBookByIsbn(profileId: string, isbn: string) {
  void profileId;
  const normalizedIsbn = normalizeIsbn(isbn);
  if (!normalizedIsbn) return null;
  const response = await apiRequest<ReadingBookEnvelope>(
    `/api/reading-life/books/by-isbn/${encodeURIComponent(normalizedIsbn)}`,
  );
  return response.book;
}

export async function listReadingLifeNotes(profileId: string, readingBookId: string) {
  void profileId;
  return apiRequest<ReadingLifeNote[]>(
    `/api/reading-life/notes?bookId=${encodeURIComponent(readingBookId)}`,
  );
}

export async function listReadingLifeNoteCounts(profileId: string) {
  void profileId;
  return apiRequest<Record<string, number>>('/api/reading-life/note-counts');
}

export async function addBookToReadingLife(
  profileId: string,
  book: BookSearchItem,
  input: AddReadingLifeBookInput = {},
) {
  void profileId;
  const isbn13 = normalizeIsbn(book.isbn);
  if (!isbn13) throw new Error('ISBN이 없어 독서생활에 등록할 수 없습니다.');

  return apiRequest<ReadingLifeBook>('/api/reading-life/books', {
    method: 'POST',
    body: JSON.stringify({
      isbn13,
      title: book.title || '제목 없는 책',
      author: book.author || '작가 미상',
      publisher: book.publisher || null,
      publishedDate: normalizePublishedDate(book.publishedDate),
      description: book.description || null,
      externalCoverUrl: input.externalCoverUrl ?? book.imageUrl ?? null,
      status: input.status ?? 'reading',
      totalPages: sanitizePositiveInteger(input.totalPages),
      source: book.source,
      sourcePayload: asRecord(book.sourcePayload),
    }),
  });
}

export async function updateReadingLifeBook(
  profileId: string,
  bookId: string,
  input: UpdateReadingLifeBookInput,
) {
  void profileId;
  return apiRequest<ReadingLifeBook>(`/api/reading-life/books/${encodeURIComponent(bookId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: input.status,
      visibility: input.visibility,
      progressPercent:
        typeof input.progressPercent === 'number'
          ? Math.min(100, Math.max(0, Math.round(input.progressPercent)))
          : undefined,
      currentPage:
        typeof input.currentPage === 'number'
          ? sanitizeNonNegativeInteger(input.currentPage)
          : undefined,
      totalPages:
        typeof input.totalPages === 'number' ? sanitizePositiveInteger(input.totalPages) : input.totalPages,
      updateTotalPages: 'totalPages' in input,
      externalCoverUrl: input.externalCoverUrl,
      updateExternalCoverUrl: 'externalCoverUrl' in input,
    }),
  });
}

export async function deleteReadingLifeBook(profileId: string, bookId: string) {
  void profileId;
  return apiRequest<void>(`/api/reading-life/books/${encodeURIComponent(bookId)}`, {
    method: 'DELETE',
  });
}

export async function setFeaturedReadingLifeBook(profileId: string, bookId: string) {
  void profileId;
  return apiRequest<ReadingLifeBook>(
    `/api/reading-life/books/${encodeURIComponent(bookId)}/featured`,
    { method: 'PUT' },
  );
}

export async function createReadingLifeNote(input: CreateReadingLifeNoteInput) {
  return apiRequest<ReadingLifeNote>('/api/reading-life/notes', {
    method: 'POST',
    body: JSON.stringify({
      readingBookId: input.readingBookId,
      kind: input.kind,
      quoteText: input.quoteText?.trim() || null,
      body: input.body?.trim() || null,
      pageLabel: input.pageLabel?.trim() || null,
      currentPageSnapshot: sanitizeNonNegativeInteger(input.currentPageSnapshot ?? 0),
      progressPercentSnapshot: Math.min(100, Math.max(0, Math.round(input.progressPercentSnapshot ?? 0))),
      totalPagesSnapshot:
        typeof input.totalPagesSnapshot === 'number' ? sanitizePositiveInteger(input.totalPagesSnapshot) : null,
      mediaPath: input.mediaPath ?? null,
      mediaUrl: input.mediaUrl ?? null,
      visibility: input.visibility ?? 'private',
    }),
  });
}

export async function updateReadingLifeNote(
  profileId: string,
  noteId: string,
  input: UpdateReadingLifeNoteInput,
) {
  void profileId;
  return apiRequest<ReadingLifeNote>(`/api/reading-life/notes/${encodeURIComponent(noteId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      quoteText: input.quoteText?.trim() || null,
      updateQuoteText: 'quoteText' in input,
      body: input.body?.trim() || null,
      updateBody: 'body' in input,
      pageLabel: input.pageLabel?.trim() || null,
      updatePageLabel: 'pageLabel' in input,
      currentPageSnapshot:
        'currentPageSnapshot' in input
          ? sanitizeNonNegativeInteger(input.currentPageSnapshot ?? 0)
          : undefined,
      progressPercentSnapshot:
        'progressPercentSnapshot' in input
          ? Math.min(100, Math.max(0, Math.round(input.progressPercentSnapshot ?? 0)))
          : undefined,
      totalPagesSnapshot:
        typeof input.totalPagesSnapshot === 'number'
          ? sanitizePositiveInteger(input.totalPagesSnapshot)
          : input.totalPagesSnapshot,
      updateTotalPagesSnapshot: 'totalPagesSnapshot' in input,
      mediaPath: input.mediaPath ?? null,
      updateMediaPath: 'mediaPath' in input,
      mediaUrl: input.mediaUrl ?? null,
      updateMediaUrl: 'mediaUrl' in input,
      visibility: input.visibility,
    }),
  });
}

export async function deleteReadingLifeNote(profileId: string, noteId: string) {
  void profileId;
  return apiRequest<void>(`/api/reading-life/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

export function calculateReadingProgressPercent(currentPage: number, totalPages: number | null | undefined) {
  if (!totalPages || totalPages <= 0) return 0;
  const safeCurrentPage = Math.min(totalPages, Math.max(0, Math.round(currentPage)));
  return Math.min(100, Math.max(0, Math.round((safeCurrentPage / totalPages) * 100)));
}

function sanitizePositiveInteger(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const integerValue = Math.round(value);
  return integerValue > 0 ? integerValue : null;
}

function sanitizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
