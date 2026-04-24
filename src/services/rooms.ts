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
  pinnedQuestion: string | null;
  nextEvent: string | null;
  memberCount: number;
  viewerRole: string | null;
};

export type RoomPost = {
  id: string;
  kind: 'impression' | 'question' | 'quote' | 'notice';
  body: string;
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

export type CreateRoomInput = {
  bookTitle: string;
  author: string;
  roomTitle: string;
  roomSubtitle: string;
  roomDescription: string;
  firstQuestion: string;
  founderId: string;
  coverPath?: string | null;
};

export type CreateRoomPostInput = {
  roomId: string;
  authorId: string;
  kind: 'impression' | 'question';
  body: string;
};

export type CreateRoomCommentInput = {
  postId: string;
  authorId: string;
  body: string;
};

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

  const { data, error } = await supabase.from('rooms').select('id, cover_path').in('id', roomIds);

  if (error) {
    return rooms;
  }

  const coverByRoomId = new Map(data.map((room) => [room.id, room.cover_path as string | null]));

  return rooms.map((room) => ({
    ...room,
    cover_path: coverByRoomId.get(room.id) ?? null,
  }));
}

export async function getRoomDetail(slug: string, viewerId?: string): Promise<RoomDetail | null> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, work_id, slug, title, subtitle, description, accent_color, cover_path')
    .eq('slug', slug)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const [{ data: work }, { data: question }, { data: session }, { count }, { data: membership }] =
    await Promise.all([
    supabase.from('book_works').select('author').eq('id', room.work_id).maybeSingle(),
    supabase
      .from('posts')
      .select('body')
      .eq('room_id', room.id)
      .eq('kind', 'question')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('reading_sessions')
      .select('title')
      .eq('room_id', room.id)
      .order('starts_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('room_members').select('profile_id', { count: 'exact', head: true }).eq('room_id', room.id),
    viewerId
      ? supabase
          .from('room_members')
          .select('role')
          .eq('room_id', room.id)
          .eq('profile_id', viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: room.id,
    slug: room.slug,
    title: room.title,
    subtitle: room.subtitle,
    description: room.description,
    author: work?.author ?? 'BookSome',
    accentColor: room.accent_color,
    coverPath: room.cover_path,
    pinnedQuestion: question?.body ?? null,
    nextEvent: session?.title ?? null,
    memberCount: count ?? 0,
    viewerRole: membership?.role ?? null,
  };
}

export async function listRoomPosts(roomId: string, viewerId?: string): Promise<RoomPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, kind, body, created_at, profiles:author_id(display_name)')
    .eq('room_id', roomId)
    .in('kind', ['impression', 'question'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  type PostRow = {
    id: string;
    kind: RoomPost['kind'];
    body: string;
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
      authorName: profile?.display_name ?? null,
      createdAt: post.created_at,
      reactionCount: reactionCounts.get(post.id) ?? 0,
      viewerReacted: viewerReactionSet.has(post.id),
      comments: commentsByPost.get(post.id) ?? [],
    };
  });
}

export async function createRoomPost(input: CreateRoomPostInput) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      room_id: input.roomId,
      author_id: input.authorId,
      kind: input.kind,
      body: input.body.trim(),
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
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

export async function createRoom(input: CreateRoomInput) {
  const { data, error } = await supabase
    .rpc('create_reading_room', {
      p_book_title: input.bookTitle.trim(),
      p_author: input.author.trim(),
      p_room_title: (input.roomTitle || input.bookTitle).trim(),
      p_room_subtitle: input.roomSubtitle.trim() || null,
      p_room_description: input.roomDescription.trim() || null,
      p_first_question: input.firstQuestion.trim(),
      p_cover_path: input.coverPath ?? null,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; slug: string };
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
