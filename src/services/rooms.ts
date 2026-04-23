import { supabase } from '../lib/supabase';

export type RoomSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  host_name: string | null;
  member_count: number;
  accent_color: string;
  pinned_question: string | null;
  next_event: string | null;
  progress_percent: number;
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

export async function listFeaturedRooms() {
  const { data, error } = await supabase
    .from('room_discovery_cards')
    .select('*')
    .order('member_count', { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

  return data as RoomSummary[];
}

export async function getRoomDetail(slug: string): Promise<RoomDetail | null> {
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

  const [{ data: work }, { data: question }, { data: session }, { count }] = await Promise.all([
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
  };
}

export async function createRoom(input: CreateRoomInput) {
  const { data: bookWork, error: bookError } = await supabase
    .from('book_works')
    .insert({
      title: input.bookTitle.trim(),
      author: input.author.trim(),
      description: input.roomDescription.trim() || null,
      primary_language: 'ko',
      cover_path: input.coverPath ?? null,
    })
    .select('id')
    .single();

  if (bookError) {
    throw bookError;
  }

  const slug = createRoomSlug(input.roomTitle || input.bookTitle);

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      work_id: bookWork.id,
      slug,
      title: input.roomTitle.trim() || input.bookTitle.trim(),
      subtitle: input.roomSubtitle.trim() || null,
      description: input.roomDescription.trim() || null,
      cover_path: input.coverPath ?? null,
      founder_id: input.founderId,
      visibility: 'public',
    })
    .select('id, slug')
    .single();

  if (roomError) {
    throw roomError;
  }

  const { error: memberError } = await supabase.from('room_members').insert({
    room_id: room.id,
    profile_id: input.founderId,
    role: 'founder',
  });

  if (memberError) {
    throw memberError;
  }

  if (input.firstQuestion.trim()) {
    const { error: postError } = await supabase.from('posts').insert({
      room_id: room.id,
      author_id: input.founderId,
      kind: 'question',
      body: input.firstQuestion.trim(),
      pinned: true,
    });

    if (postError) {
      throw postError;
    }
  }

  return room;
}

function createRoomSlug(value: string) {
  const base = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'room'}-${suffix}`;
}
