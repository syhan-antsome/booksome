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

    return fallback.data as RoomSummary[];
  }

  if (error) {
    throw error;
  }

  return data as RoomSummary[];
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

  return data?.[0] as { room_id: string; profile_id: string; role: string } | undefined;
}
