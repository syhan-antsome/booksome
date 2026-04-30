-- BookSome initial Supabase schema
-- Run this in Supabase SQL Editor before rls.sql and seed.sql.

create extension if not exists pgcrypto;

do $$ begin
  create type public.room_visibility as enum ('public', 'private', 'unlisted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.room_member_role as enum ('founder', 'host', 'co_host', 'editor', 'member');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.post_kind as enum ('impression', 'question', 'quote', 'notice');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.meetup_status as enum ('draft', 'scheduled', 'cancelled', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.reading_book_status as enum ('want_to_read', 'reading', 'finished', 'paused');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_path text,
  bio text,
  preferred_language text not null default 'ko',
  city text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_title text,
  author text not null,
  description text,
  primary_language text,
  cover_path text,
  external_cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_editions (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.book_works(id) on delete cascade,
  isbn13 text unique,
  isbn10 text unique,
  title text not null,
  author text not null,
  publisher text,
  published_date date,
  language text,
  cover_path text,
  external_cover_url text,
  source text,
  source_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.book_works(id) on delete cascade,
  edition_id uuid references public.book_editions(id) on delete set null,
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  accent_color text not null default '#116653',
  cover_path text,
  external_cover_url text,
  visibility public.room_visibility not null default 'public',
  default_spoiler_chapter integer,
  founder_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.room_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  muted_until timestamptz,
  primary key (room_id, profile_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind public.post_kind not null default 'impression',
  body text not null,
  quote_text text,
  chapter_label text,
  spoiler_chapter integer,
  pinned boolean not null default false,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id, reaction)
);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  host_id uuid references public.profiles(id) on delete set null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  chapter_label text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_books (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  isbn13 text,
  title text not null,
  author text not null,
  publisher text,
  published_date date,
  description text,
  external_cover_url text,
  status public.reading_book_status not null default 'reading',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  current_page integer not null default 0 check (current_page >= 0),
  total_pages integer check (total_pages is null or total_pages > 0),
  pinned_at timestamptz,
  visibility text not null default 'private',
  source text,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_books_current_page_within_total_check
    check (total_pages is null or current_page <= total_pages),
  unique (profile_id, isbn13)
);

create table if not exists public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  reading_book_id uuid not null references public.reading_books(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('quote', 'photo')),
  quote_text text,
  body text,
  page_label text,
  media_path text,
  media_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  host_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status public.meetup_status not null default 'scheduled',
  starts_at timestamptz,
  city text,
  country text,
  venue_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  mime_type text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  device_platform text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  details text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace view public.room_discovery_cards
with (security_invoker = true) as
select
  r.id,
  r.slug,
  r.title,
  coalesce(r.subtitle, bw.author) as subtitle,
  r.accent_color,
  r.visibility,
  host_profile.display_name as host_name,
  count(distinct rm.profile_id)::integer as member_count,
  pinned.body as pinned_question,
  next_session.title as next_event,
  50::integer as progress_percent,
  r.external_cover_url,
  r.created_at
from public.rooms r
join public.book_works bw on bw.id = r.work_id
left join public.room_members rm on rm.room_id = r.id
left join lateral (
  select p.display_name
  from public.room_members hrm
  join public.profiles p on p.id = hrm.profile_id
  where hrm.room_id = r.id and hrm.role in ('founder', 'host')
  order by case hrm.role when 'founder' then 0 else 1 end, hrm.joined_at
  limit 1
) host_profile on true
left join lateral (
  select body
  from public.posts
  where room_id = r.id and kind = 'question' and hidden_at is null
  order by pinned desc, created_at desc
  limit 1
) pinned on true
left join lateral (
  select title
  from public.reading_sessions
  where room_id = r.id and (starts_at is null or starts_at >= now() - interval '1 day')
  order by starts_at nulls last
  limit 1
) next_session on true
where r.visibility = 'public'
group by r.id, bw.author, host_profile.display_name, pinned.body, next_session.title;

create index if not exists book_editions_isbn13_idx on public.book_editions(isbn13);
create index if not exists rooms_work_id_idx on public.rooms(work_id);
create index if not exists room_members_profile_id_idx on public.room_members(profile_id);
create index if not exists posts_room_id_created_at_idx on public.posts(room_id, created_at desc);
create index if not exists comments_post_id_created_at_idx on public.comments(post_id, created_at asc);
create index if not exists reading_books_profile_id_updated_at_idx on public.reading_books(profile_id, updated_at desc);
create unique index if not exists reading_books_one_pinned_per_profile_idx
on public.reading_books(profile_id)
where pinned_at is not null;
create index if not exists reading_notes_book_id_created_at_idx on public.reading_notes(reading_book_id, created_at desc);
create index if not exists reading_notes_profile_id_created_at_idx on public.reading_notes(profile_id, created_at desc);
create index if not exists meetups_city_starts_at_idx on public.meetups(city, starts_at);
