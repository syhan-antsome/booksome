-- Adds the first personal reading-life table.
-- Run this once in Supabase SQL Editor before using Scan > 독서생활에 등록.

do $$ begin
  create type public.reading_book_status as enum ('want_to_read', 'reading', 'finished', 'paused');
exception
  when duplicate_object then null;
end $$;

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

create index if not exists reading_books_profile_id_updated_at_idx
on public.reading_books(profile_id, updated_at desc);

create unique index if not exists reading_books_one_pinned_per_profile_idx
on public.reading_books(profile_id)
where pinned_at is not null;

alter table public.reading_books enable row level security;

drop policy if exists "Users read their reading books" on public.reading_books;
create policy "Users read their reading books"
on public.reading_books for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Users create their reading books" on public.reading_books;
create policy "Users create their reading books"
on public.reading_books for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "Users update their reading books" on public.reading_books;
create policy "Users update their reading books"
on public.reading_books for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Users delete their reading books" on public.reading_books;
create policy "Users delete their reading books"
on public.reading_books for delete
to authenticated
using (profile_id = auth.uid());
