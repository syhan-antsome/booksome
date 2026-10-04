import type {
  AuthSession,
  BookroomFeedItem,
  BookSearchResponse,
  RoomDetail,
  RoomPost,
  RoomSummary
} from '@/lib/types';

export type PublicResult<T> = { data: T; error: null } | { data: null; error: 'unavailable' | 'not-found' | 'search-not-configured' };

const FALLBACK_API_URL = 'https://api.booksome.top';

export function getApiBaseUrl() {
  return (process.env.BOOKSOME_API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_URL).replace(
    /\/$/,
    ''
  );
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
    ...init,
    headers
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    throw new Error(`BookSome API request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function getHomeData() {
  const [rooms, feed] = await Promise.all([
    publicJson<RoomSummary[]>('/api/rooms/featured'),
    publicJson<BookroomFeedItem[]>('/api/rooms/feed?limit=6')
  ]);
  return { rooms, feed };
}

export async function searchBooks(query: string): Promise<PublicResult<BookSearchResponse>> {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const isbn = normalized.replace(/[-\s]/g, '').toUpperCase();
  const path = /^(\d{13}|\d{9}[\dX])$/.test(isbn)
    ? `/api/books/isbn/${isbn}`
    : `/api/books/search?query=${encodeURIComponent(normalized)}&display=12`;
  const result = await publicJson<Omit<BookSearchResponse, 'query'>>(path);
  return result.error ? result : { data: { ...result.data, query: normalized }, error: null };
}

export async function getRooms() {
  return publicJson<RoomSummary[]>('/api/rooms/featured');
}

export async function getRoom(slug: string): Promise<PublicResult<RoomDetail>> {
  const envelope = await publicJson<{ room: RoomDetail | null }>(`/api/rooms/by-slug/${encodeURIComponent(slug)}`);
  if (envelope.error) return { data: null, error: envelope.error };
  return envelope.data.room ? { data: envelope.data.room, error: null } : { data: null, error: 'not-found' };
}

export async function getRoomPosts(roomId: string) {
  const result = await publicJson<RoomPost[]>(`/api/rooms/${encodeURIComponent(roomId)}/posts`);
  if (result.error) return result;
  return { data: result.data.filter(post => post.visibility === 'public' && post.moderationStatus === 'approved'), error: null } as const;
}

export function getPublicStories() {
  return publicJson<BookroomFeedItem[]>('/api/rooms/feed?limit=3');
}

export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const publicBase = (process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_URL).replace(/\/$/, '');
  return `${publicBase}/api/media/${encodedPath}`;
}

export function roomCover(room: RoomSummary | RoomDetail | BookroomFeedItem) {
  if ('cover_path' in room) return mediaUrl(room.cover_path) ?? room.external_cover_url;
  if ('coverPath' in room) return mediaUrl(room.coverPath) ?? room.externalCoverUrl;
  return mediaUrl(room.roomCoverPath) ?? room.roomExternalCoverUrl;
}

export async function postAuth(path: string, body: unknown, signal?: AbortSignal) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal
  });
}

export async function readAuthSession(response: Response) {
  return (await response.json()) as AuthSession;
}

export async function responseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

async function publicJson<T>(path: string): Promise<PublicResult<T>> {
  try {
    const response = await apiFetch(path, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { error?: string };
      return { data: null, error: detail.error === 'book_lookup_not_configured' ? 'search-not-configured' : response.status === 404 ? 'not-found' : 'unavailable' };
    }
    return { data: await response.json() as T, error: null };
  } catch {
    return { data: null, error: 'unavailable' };
  }
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}
