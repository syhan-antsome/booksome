import { supabase } from '../lib/supabase';

export type Meetup = {
  id: string;
  hostId: string | null;
  title: string;
  description: string | null;
  startingBookTitle: string | null;
  startingBookAuthor: string | null;
  startingBookPublisher: string | null;
  startingBookTranslator: string | null;
  startingBookIsbn: string | null;
  startingBookCoverUrl: string | null;
  city: string | null;
  status: 'draft' | 'scheduled' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type CreateMeetupInput = {
  hostId: string;
  title: string;
  startingBookTitle?: string | null;
  startingBookAuthor?: string | null;
  startingBookPublisher?: string | null;
  startingBookTranslator?: string | null;
  startingBookIsbn?: string | null;
  startingBookCoverUrl?: string | null;
  city: string;
  description?: string | null;
};

type MeetupRow = {
  id: string;
  host_id: string | null;
  title: string;
  description: string | null;
  starting_book_title?: string | null;
  starting_book_author?: string | null;
  starting_book_publisher?: string | null;
  starting_book_translator?: string | null;
  starting_book_isbn?: string | null;
  starting_book_cover_url?: string | null;
  city: string | null;
  status: Meetup['status'];
  created_at: string;
  updated_at: string;
};

const meetupSelect =
  'id, host_id, title, description, starting_book_title, starting_book_author, starting_book_publisher, starting_book_translator, starting_book_isbn, starting_book_cover_url, city, status, created_at, updated_at';
const legacyMeetupSelect = 'id, host_id, title, description, city, status, created_at, updated_at';

export async function listMeetups() {
  const result = await supabase
    .from('meetups')
    .select(meetupSelect)
    .eq('status', 'scheduled')
    .order('created_at', { ascending: false })
    .limit(40)
    .returns<MeetupRow[]>();

  const { data, error } = result.error && isMissingStartingBookColumnError(result.error)
    ? await supabase
        .from('meetups')
        .select(legacyMeetupSelect)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false })
        .limit(40)
        .returns<MeetupRow[]>()
    : result;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMeetup);
}

export async function createMeetup(input: CreateMeetupInput) {
  const payload = {
    host_id: input.hostId,
    title: input.title.trim(),
    starting_book_title: input.startingBookTitle?.trim() || null,
    starting_book_author: input.startingBookAuthor?.trim() || null,
    starting_book_publisher: input.startingBookPublisher?.trim() || null,
    starting_book_translator: input.startingBookTranslator?.trim() || null,
    starting_book_isbn: normalizeIsbn(input.startingBookIsbn ?? ''),
    starting_book_cover_url: input.startingBookCoverUrl ?? null,
    city: input.city.trim(),
    description: input.description?.trim() || null,
    status: 'scheduled' as const,
  };

  const { data, error } = await supabase
    .from('meetups')
    .insert(payload)
    .select(meetupSelect)
    .single<MeetupRow>();

  if (error) {
    throw normalizeCreateMeetupError(error);
  }

  return mapMeetup(data);
}

function isMissingStartingBookColumnError(error: { code?: string; message?: string }) {
  const message = error.message ?? '';
  return error.code === '42703' || /starting_book_/.test(message);
}

function normalizeCreateMeetupError(error: { code?: string; message?: string }) {
  const message = error.message ?? '';

  if (isMissingStartingBookColumnError(error) || /row-level security|violates row-level security/i.test(message)) {
    return new Error('Supabase에서 supabase/add-meetup-creation.sql을 먼저 실행해주세요.');
  }

  return error;
}

function mapMeetup(row: MeetupRow): Meetup {
  return {
    id: row.id,
    hostId: row.host_id,
    title: row.title,
    description: row.description,
    startingBookTitle: row.starting_book_title ?? null,
    startingBookAuthor: row.starting_book_author ?? null,
    startingBookPublisher: row.starting_book_publisher ?? null,
    startingBookTranslator: row.starting_book_translator ?? null,
    startingBookIsbn: normalizeIsbn(row.starting_book_isbn ?? ''),
    startingBookCoverUrl: row.starting_book_cover_url ?? null,
    city: row.city,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeIsbn(value: string) {
  const normalizedValue = value.replace(/[^0-9X]/gi, '').toUpperCase();
  return normalizedValue || null;
}
