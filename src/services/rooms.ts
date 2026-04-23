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
