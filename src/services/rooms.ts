import { apiRequest } from '../lib/api-client';

export type RoomSummary = {
  id: string;
  slug: string;
  title: string;
  created_at?: string;
  subtitle: string | null;
  host_name: string | null;
  member_count: number;
  accent_color: string;
  pinned_question: string | null;
  next_event: string | null;
  progress_percent: number;
  cover_path?: string | null;
  external_cover_url?: string | null;
};

export type RoomDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  author: string;
  accentColor: string;
  coverPath: string | null;
  externalCoverUrl: string | null;
  nextEvent: string | null;
  memberCount: number;
  viewerRole: string | null;
  viewerReadingStatus: RoomReadingStatus | null;
  readingStatusCounts: RoomReadingStatusCounts;
};

export type RoomReadingStatus = 'want_to_read' | 'reading' | 'finished';

export type RoomReadingStatusCounts = {
  wantToRead: number;
  reading: number;
  finished: number;
};

export type RoomPost = {
  id: string;
  kind: 'impression' | 'question' | 'quote' | 'notice';
  body: string;
  quoteText: string | null;
  chapterLabel: string | null;
  classificationStatus: 'pending' | 'done' | 'failed' | 'skipped';
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'needs_review' | 'failed';
  visibility: 'pending' | 'public' | 'hidden';
  aiConfidence: number | null;
  aiReason: string | null;
  authorName: string | null;
  createdAt: string;
  reactionCount: number;
  viewerReacted: boolean;
  comments: RoomComment[];
};

export type RoomComment = {
  id: string;
  postId: string;
  body: string;
  authorName: string | null;
  createdAt: string;
};

export type BookroomFeedItem = {
  id: string;
  roomId: string;
  roomSlug: string;
  roomTitle: string;
  roomAuthor: string;
  roomAccentColor: string;
  roomCoverPath: string | null;
  roomExternalCoverUrl: string | null;
  kind: RoomPost['kind'];
  body: string;
  quoteText: string | null;
  chapterLabel: string | null;
  authorName: string | null;
  authorAvatarPath: string | null;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
};

export type CreateRoomInput = {
  bookTitle: string;
  author: string;
  isbn13?: string;
  externalCoverUrl?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  sourcePayload?: Record<string, unknown> | null;
  roomTitle?: string;
  roomSubtitle?: string;
  roomDescription?: string;
  coverPath?: string | null;
};

export type CreateRoomResult = {
  id: string;
  slug: string;
  created?: boolean;
};

export type CreateRoomPostInput = {
  roomId: string;
  authorId: string;
  body: string;
  chapterLabel?: string | null;
};

export type CreateRoomCommentInput = {
  postId: string;
  authorId: string;
  body: string;
};

type RoomDetailEnvelope = { room: RoomDetail | null };

export function listFeaturedRooms() {
  return apiRequest<RoomSummary[]>('/api/rooms/featured', {}, { authenticated: 'optional' });
}

export async function getRoomDetail(slug: string, viewerId?: string): Promise<RoomDetail | null> {
  void viewerId;
  const response = await apiRequest<RoomDetailEnvelope>(
    `/api/rooms/by-slug/${encodeURIComponent(slug)}`,
    {},
    { authenticated: 'optional' },
  );
  return response.room;
}

export async function listRoomPosts(roomId: string, viewerId?: string): Promise<RoomPost[]> {
  void viewerId;
  return apiRequest<RoomPost[]>(
    `/api/rooms/${encodeURIComponent(roomId)}/posts`,
    {},
    { authenticated: 'optional' },
  );
}

export function listBookroomFeed(limit = 30): Promise<BookroomFeedItem[]> {
  return apiRequest<BookroomFeedItem[]>(
    `/api/rooms/feed?limit=${encodeURIComponent(String(limit))}`,
    {},
    { authenticated: 'optional' },
  );
}

export async function createRoomPost(input: CreateRoomPostInput) {
  return apiRequest<{ id: string }>(`/api/rooms/${encodeURIComponent(input.roomId)}/posts`, {
    method: 'POST',
    body: JSON.stringify({
      body: input.body.trim(),
      chapterLabel: input.chapterLabel?.trim() || null,
    }),
  });
}

export async function requestRoomPostReview(postId: string, accessToken?: string | null) {
  void postId;
  void accessToken;
  // Spring currently publishes posts after local validation. AI review will be reconnected server-side.
}

export async function createRoomComment(input: CreateRoomCommentInput) {
  return apiRequest<{ id: string }>(
    `/api/rooms/posts/${encodeURIComponent(input.postId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ body: input.body.trim() }),
    },
  );
}

export async function togglePostReaction(postId: string, profileId: string, active: boolean) {
  void profileId;
  return apiRequest<void>(`/api/rooms/posts/${encodeURIComponent(postId)}/reaction`, {
    method: active ? 'DELETE' : 'PUT',
  });
}

export async function setRoomReadingStatus(roomId: string, status: RoomReadingStatus) {
  return apiRequest<{ roomId: string; profileId: string; readingStatus: RoomReadingStatus }>(
    `/api/rooms/${encodeURIComponent(roomId)}/reading-status`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  );
}

export function createRoom(input: CreateRoomInput) {
  return apiRequest<CreateRoomResult>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({
      bookTitle: input.bookTitle.trim(),
      author: input.author.trim(),
      isbn13: input.isbn13?.trim() || null,
      externalCoverUrl: input.externalCoverUrl ?? null,
      publisher: input.publisher?.trim() || null,
      publishedDate: input.publishedDate?.trim() || null,
      sourcePayload: input.sourcePayload ?? null,
      roomTitle: (input.roomTitle || input.bookTitle).trim(),
      roomSubtitle: input.roomSubtitle?.trim() || null,
      roomDescription: input.roomDescription?.trim() || null,
      coverPath: input.coverPath ?? null,
    }),
  });
}

export function joinRoom(roomId: string) {
  return apiRequest<{ joinedRoomId: string; joinedProfileId: string; memberRole: string }>(
    `/api/rooms/${encodeURIComponent(roomId)}/join`,
    { method: 'POST' },
  );
}
