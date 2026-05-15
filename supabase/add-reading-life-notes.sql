-- Adds quote/photo records and public/private visibility for reading life.
-- Run this once in Supabase SQL Editor before using reading notes.

alter table public.reading_books
add column if not exists visibility text not null default 'private';

do $$ begin
  alter table public.reading_books
  add constraint reading_books_visibility_check check (visibility in ('private', 'public'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  reading_book_id uuid not null references public.reading_books(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('quote', 'photo')),
  quote_text text,
  body text,
  page_label text,
  current_page_snapshot integer not null default 0,
  progress_percent_snapshot integer not null default 0,
  total_pages_snapshot integer,
  media_path text,
  media_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reading_notes_book_id_created_at_idx
on public.reading_notes(reading_book_id, created_at desc);

create index if not exists reading_notes_profile_id_created_at_idx
on public.reading_notes(profile_id, created_at desc);

alter table public.reading_books enable row level security;
alter table public.reading_notes enable row level security;

drop policy if exists "Public can read public reading books" on public.reading_books;
create policy "Public can read public reading books"
on public.reading_books for select
using (visibility = 'public');

drop policy if exists "Users read their reading notes" on public.reading_notes;
create policy "Users read their reading notes"
on public.reading_notes for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Public can read public reading notes" on public.reading_notes;
create policy "Public can read public reading notes"
on public.reading_notes for select
using (visibility = 'public');

drop policy if exists "Users create their reading notes" on public.reading_notes;
create policy "Users create their reading notes"
on public.reading_notes for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "Users update their reading notes" on public.reading_notes;
create policy "Users update their reading notes"
on public.reading_notes for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Users delete their reading notes" on public.reading_notes;
create policy "Users delete their reading notes"
on public.reading_notes for delete
to authenticated
using (profile_id = auth.uid());
