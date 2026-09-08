import type {
  AuthSession,
  BookroomFeedItem,
  BookSearchResponse,
  RoomDetail,
  RoomPost,
  RoomSummary
} from '@/lib/types';

const FALLBACK_API_URL = 'https://api.booksome.top';

export function getApiBaseUrl() {
  return (process.env.BOOKSOME_API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_API_URL).replace(
    /\/$/,
    ''
  );
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers
    }
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
  return { rooms: rooms ?? [], feed: feed ?? [] };
}

export function searchBooks(query: string) {
  return publicJson<BookSearchResponse>(`/api/books/search?query=${encodeURIComponent(query)}&display=12`);
}

export async function getRooms() {
  return (await publicJson<RoomSummary[]>('/api/rooms/featured')) ?? [];
}

export async function getRoom(slug: string) {
  const envelope = await publicJson<{ room: RoomDetail | null }>(`/api/rooms/by-slug/${encodeURIComponent(slug)}`);
  return envelope?.room ?? null;
}

export async function getRoomPosts(roomId: string) {
  return (await publicJson<RoomPost[]>(`/api/rooms/${encodeURIComponent(roomId)}/posts`)) ?? [];
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

export async function postAuth(path: string, body: unknown) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store'
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

async function publicJson<T>(path: string): Promise<T | null> {
  try {
    return await apiJson<T>(path, { next: { revalidate: 60 } });
  } catch {
    return null;
  }
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}
