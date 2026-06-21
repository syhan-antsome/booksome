import { supabase } from '../lib/supabase';

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

const mediaApiUrl = process.env.EXPO_PUBLIC_MEDIA_API_URL;

export async function listFeaturedRooms() {
  const { data, error } = await supabase
    .from('room_discovery_cards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error && error.message.includes('created_at')) {
    const fallback = await supabase
      .from('room_discovery_cards')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(12);

    if (fallback.error) {
      throw fallback.error;
    }

    return withRoomCovers(fallback.data as RoomSummary[]);
  }

  if (error) {
    throw error;
  }

  return withRoomCovers(data as RoomSummary[]);
}

async function withRoomCovers(rooms: RoomSummary[]) {
  const roomIds = rooms.map((room) => room.id);

  if (roomIds.length === 0) {
    return rooms;
  }

  const { data, error } = await supabase.from('rooms').select('id, cover_path, external_cover_url').in('id', roomIds);

  if (error) {
    return rooms;
  }

  const coverByRoomId = new Map(data.map((room) => [room.id, room.cover_path as string | null]));
  const externalCoverByRoomId = new Map(data.map((room) => [room.id, room.external_cover_url as string | null]));

  return rooms.map((room) => ({
    ...room,
    cover_path: coverByRoomId.get(room.id) ?? null,
    external_cover_url: externalCoverByRoomId.get(room.id) ?? room.external_cover_url ?? null,
  }));
}

export async function getRoomDetail(slug: string, viewerId?: string): Promise<RoomDetail | null> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, work_id, slug, title, subtitle, description, accent_color, cover_path, external_cover_url')
    .eq('slug', slug)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const [{ data: work }, { data: session }, memberRows] = await Promise.all([
    supabase.from('book_works').select('author').eq('id', room.work_id).maybeSingle(),
    supabase
      .from('reading_sessions')
      .select('title')
      .eq('room_id', room.id)
      .order('starts_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    getRoomMemberRows(room.id),
  ]);

  const viewerMembership = viewerId ? memberRows.find((member) => member.profile_id === viewerId) : null;
  const readingStatusCounts = getReadingStatusCounts(memberRows);

  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    subtitle: room.subtitle,
    description: room.description,
    author: work?.author ?? 'BookSome',
    accentColor: room.accent_color,
    coverPath: room.cover_path,
    externalCoverUrl: room.external_cover_url,
    nextEvent: session?.title ?? null,
    memberCount: memberRows.length,
    viewerRole: viewerMembership?.role ?? null,
    viewerReadingStatus: normalizeReadingStatus(viewerMembership?.reading_status),
    readingStatusCounts,
  };
}

export async function listRoomPosts(roomId: string, viewerId?: string): Promise<RoomPost[]> {
  const selectWithReviewFields =
    'id, kind, body, quote_text, chapter_label, classification_status, moderation_status, visibility, ai_confidence, ai_reason, created_at, profiles:author_id(display_name)';
  const selectLegacyFields = 'id, kind, body, quote_text, chapter_label, created_at, profiles:author_id(display_name)';
  const result = await supabase
    .from('posts')
    .select(selectWithReviewFields)
    .eq('room_id', roomId)
    .in('kind', ['impression', 'question', 'quote'])
    .order('created_at', { ascending: false })
    .limit(20);

  const { data, error } = result.error && isMissingReviewColumnError(result.error)
    ? await supabase
        .from('posts')
        .select(selectLegacyFields)
        .eq('room_id', roomId)
        .in('kind', ['impression', 'question', 'quote'])
        .order('created_at', { ascending: false })
        .limit(20)
    : result;

  if (error) {
    throw error;
  }

  type PostRow = {
    id: string;
    kind: RoomPost['kind'];
    body: string;
    quote_text: string | null;
    chapter_label: string | null;
    classification_status?: RoomPost['classificationStatus'] | null;
    moderation_status?: RoomPost['moderationStatus'] | null;
    visibility?: RoomPost['visibility'] | null;
    ai_confidence?: number | string | null;
    ai_reason?: string | null;
    created_at: string;
    profiles?: { display_name?: string | null } | { display_name?: string | null }[] | null;
  };

  const postRows = (data ?? []) as PostRow[];
  const postIds = postRows.map((post) => post.id);

  const [reactionsResult, commentsResult] = postIds.length
    ? await Promise.all([
        supabase.from('reactions').select('post_id, profile_id').in('post_id', postIds).eq('reaction', 'like'),
        supabase
          .from('comments')
          .select('id, post_id, body, created_at, profiles:author_id(display_name)')
          .in('post_id', postIds)
          .order('created_at', { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (reactionsResult.error) {
    throw reactionsResult.error;
  }

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  const reactionCounts = new Map<string, number>();
  const viewerReactionSet = new Set<string>();

  for (const reaction of reactionsResult.data ?? []) {
    reactionCounts.set(reaction.post_id, (reactionCounts.get(reaction.post_id) ?? 0) + 1);

    if (viewerId && reaction.profile_id === viewerId) {
      viewerReactionSet.add(reaction.post_id);
    }
  }

  type CommentRow = {
    id: string;
    post_id: string;
    body: string;
    created_at: string;
    profiles?: { display_name?: string | null } | { display_name?: string | null }[] | null;
  };

  const commentsByPost = new Map<string, RoomComment[]>();
  for (const comment of (commentsResult.data ?? []) as CommentRow[]) {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    const comments = commentsByPost.get(comment.post_id) ?? [];

    comments.push({
      id: comment.id,
      postId: comment.post_id,
      body: comment.body,
      authorName: profile?.display_name ?? null,
      createdAt: comment.created_at,
    });

    commentsByPost.set(comment.post_id, comments);
  }

  return postRows.map((post) => {
    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

    return {
      id: post.id,
      kind: post.kind,
      body: post.body,
      quoteText: post.quote_text,
      chapterLabel: post.chapter_label,
      classificationStatus: post.classification_status ?? 'done',
      moderationStatus: post.moderation_status ?? 'approved',
      visibility: post.visibility ?? 'public',
      aiConfidence: normalizeConfidence(post.ai_confidence),
      aiReason: post.ai_reason ?? null,
      authorName: profile?.display_name ?? null,
      createdAt: post.created_at,
      reactionCount: reactionCounts.get(post.id) ?? 0,
      viewerReacted: viewerReactionSet.has(post.id),
      comments: commentsByPost.get(post.id) ?? [],
    };
  });
}

export async function listBookroomFeed(limit = 30): Promise<BookroomFeedItem[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, room_id, kind, body, quote_text, chapter_label, created_at, rooms:room_id(id, slug, title, subtitle, accent_color, cover_path, external_cover_url), profiles:author_id(display_name, avatar_path)',
    )
    .in('kind', ['impression', 'question', 'quote'])
    .eq('visibility', 'public')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  type FeedRow = {
    id: string;
    room_id: string;
    kind: RoomPost['kind'];
    body: string;
    quote_text: string | null;
    chapter_label: string | null;
    created_at: string;
    rooms?:
      | {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          accent_color: string;
          cover_path?: string | null;
          external_cover_url?: string | null;
        }
      | {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          accent_color: string;
          cover_path?: string | null;
          external_cover_url?: string | null;
        }[]
      | null;
    profiles?:
      | { display_name?: string | null; avatar_path?: string | null }
      | { display_name?: string | null; avatar_path?: string | null }[]
      | null;
  };

  const rows = (data ?? []) as FeedRow[];
  const postIds = rows.map((post) => post.id);

  const [reactionsResult, commentsResult] = postIds.length
    ? await Promise.all([
        supabase.from('reactions').select('post_id').in('post_id', postIds).eq('reaction', 'like'),
        supabase.from('comments').select('post_id').in('post_id', postIds).is('hidden_at', null),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (reactionsResult.error) {
    throw reactionsResult.error;
  }

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  const reactionCounts = new Map<string, number>();
  for (const reaction of reactionsResult.data ?? []) {
    reactionCounts.set(reaction.post_id, (reactionCounts.get(reaction.post_id) ?? 0) + 1);
  }

  const commentCounts = new Map<string, number>();
  for (const comment of commentsResult.data ?? []) {
    commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
  }

  return rows
    .map((post) => {
      const room = Array.isArray(post.rooms) ? post.rooms[0] : post.rooms;
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

      if (!room) {
        return null;
      }

      return {
        id: post.id,
        roomId: post.room_id,
        roomSlug: room.slug,
        roomTitle: room.title,
        roomAuthor: room.subtitle ?? '작가 미상',
        roomAccentColor: room.accent_color,
        roomCoverPath: room.cover_path ?? null,
        roomExternalCoverUrl: room.external_cover_url ?? null,
        kind: post.kind,
        body: post.body,
        quoteText: post.quote_text,
        chapterLabel: post.chapter_label,
        authorName: profile?.display_name ?? null,
        authorAvatarPath: profile?.avatar_path ?? null,
        createdAt: post.created_at,
        reactionCount: reactionCounts.get(post.id) ?? 0,
        commentCount: commentCounts.get(post.id) ?? 0,
      } satisfies BookroomFeedItem;
    })
    .filter((post): post is BookroomFeedItem => Boolean(post));
}

export async function createRoomPost(input: CreateRoomPostInput) {
  const insertWithReviewFields = {
    room_id: input.roomId,
    author_id: input.authorId,
    kind: 'impression',
    body: input.body.trim(),
    quote_text: null,
    chapter_label: input.chapterLabel?.trim() || null,
    classification_status: 'pending',
    moderation_status: 'pending',
    visibility: 'pending',
  };

  const result = await supabase
    .from('posts')
    .insert(insertWithReviewFields)
    .select('id')
    .single();

  const { data, error } = result.error && isMissingReviewColumnError(result.error)
    ? await supabase
        .from('posts')
        .insert({
          room_id: input.roomId,
          author_id: input.authorId,
          kind: 'impression',
          body: input.body.trim(),
          quote_text: null,
          chapter_label: input.chapterLabel?.trim() || null,
        })
        .select('id')
        .single()
    : result;

  if (error) {
    throw error;
  }

  return data as { id: string };
}

export async function requestRoomPostReview(postId: string, accessToken?: string | null) {
  if (!mediaApiUrl || !accessToken) {
    return;
  }

  const response = await fetch(`${mediaApiUrl.replace(/\/$/, '')}/v1/posts/${encodeURIComponent(postId)}/review`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AI 검토 요청에 실패했습니다. (${response.status})`);
  }
}

export async function createRoomComment(input: CreateRoomCommentInput) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: input.postId,
      author_id: input.authorId,
      body: input.body.trim(),
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}

export async function togglePostReaction(postId: string, profileId: string, active: boolean) {
  if (active) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', profileId)
      .eq('reaction', 'like');

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from('reactions').upsert({
    post_id: postId,
    profile_id: profileId,
    reaction: 'like',
  });

  if (error) {
    throw error;
  }
}

export async function setRoomReadingStatus(roomId: string, status: RoomReadingStatus) {
  const { data, error } = await supabase
    .rpc('set_room_reading_status', {
      p_room_id: roomId,
      p_reading_status: status,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as { room_id: string; profile_id: string; reading_status: RoomReadingStatus };
}

export async function createRoom(input: CreateRoomInput) {
  const payload = {
    p_book_title: input.bookTitle.trim(),
    p_author: input.author.trim(),
    p_isbn13: input.isbn13?.trim() || null,
    p_external_cover_url: input.externalCoverUrl || null,
    p_publisher: input.publisher || null,
    p_published_date: input.publishedDate || null,
    p_source_payload: input.sourcePayload ?? null,
    p_room_title: (input.roomTitle || input.bookTitle).trim(),
    p_room_subtitle: input.roomSubtitle?.trim() || null,
    p_room_description: input.roomDescription?.trim() || null,
    p_first_question: null,
    p_cover_path: input.coverPath ?? null,
  };

  const { data, error } = await supabase
    .rpc('create_reading_room', {
      ...payload,
    })
    .single();

  if (error) {
    if (input.isbn13 && isRpcSignatureError(error.message)) {
      const fallbackPayload = {
        p_book_title: payload.p_book_title,
        p_author: payload.p_author,
        p_isbn13: payload.p_isbn13,
        p_room_title: payload.p_room_title,
        p_room_subtitle: payload.p_room_subtitle,
        p_room_description: payload.p_room_description,
        p_first_question: payload.p_first_question,
        p_cover_path: payload.p_cover_path,
      };
      const fallback = await supabase.rpc('create_reading_room', fallbackPayload).single();

      if (fallback.error) {
        if (isRpcSignatureError(fallback.error.message)) {
          const legacyPayload = {
            p_book_title: payload.p_book_title,
            p_author: payload.p_author,
            p_room_title: payload.p_room_title,
            p_room_subtitle: payload.p_room_subtitle,
            p_room_description: payload.p_room_description,
            p_first_question: payload.p_first_question,
            p_cover_path: payload.p_cover_path,
          };
          const legacyFallback = await supabase.rpc('create_reading_room', legacyPayload).single();

          if (legacyFallback.error) {
            throw legacyFallback.error;
          }

          return legacyFallback.data as CreateRoomResult;
        }

        throw fallback.error;
      }

      return fallback.data as CreateRoomResult;
    }

    throw error;
  }

  return data as CreateRoomResult;
}

function normalizeConfidence(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

type RoomMemberRow = {
  profile_id: string;
  role: string;
  reading_status?: string | null;
};

async function getRoomMemberRows(roomId: string): Promise<RoomMemberRow[]> {
  const result = await supabase
    .from('room_members')
    .select('profile_id, role, reading_status')
    .eq('room_id', roomId);

  if (result.error && isMissingReadingStatusColumnError(result.error)) {
    const fallback = await supabase
      .from('room_members')
      .select('profile_id, role')
      .eq('room_id', roomId);

    if (fallback.error) {
      throw fallback.error;
    }

    return (fallback.data ?? []) as RoomMemberRow[];
  }

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []) as RoomMemberRow[];
}

function getReadingStatusCounts(memberRows: RoomMemberRow[]): RoomReadingStatusCounts {
  return memberRows.reduce<RoomReadingStatusCounts>(
    (counts, member) => {
      const status = normalizeReadingStatus(member.reading_status);

      if (status === 'want_to_read') {
        counts.wantToRead += 1;
      }

      if (status === 'reading') {
        counts.reading += 1;
      }

      if (status === 'finished') {
        counts.finished += 1;
      }

      return counts;
    },
    { wantToRead: 0, reading: 0, finished: 0 },
  );
}

function normalizeReadingStatus(value: string | null | undefined): RoomReadingStatus | null {
  if (value === 'want_to_read' || value === 'reading' || value === 'finished') {
    return value;
  }

  return null;
}

function isMissingReviewColumnError(error: { message?: string; code?: string }) {
  const message = error.message ?? '';
  return error.code === '42703' || /classification_status|moderation_status|visibility|ai_confidence|ai_reason/.test(message);
}

function isMissingReadingStatusColumnError(error: { message?: string; code?: string }) {
  const message = error.message ?? '';
  return error.code === '42703' || message.includes('reading_status');
}

function isRpcSignatureError(message?: string) {
  return Boolean(
    message?.includes('Could not find the function') ||
      message?.includes('function public.create_reading_room') ||
      message?.includes('schema cache')
  );
}

export async function joinRoom(roomId: string) {
  const { data, error } = await supabase.rpc('join_room', {
    p_room_id: roomId,
  });

  if (error) {
    throw error;
  }

  return data?.[0] as
    | { joined_room_id: string; joined_profile_id: string; member_role: string }
    | undefined;
}
