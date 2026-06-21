-- Enable standalone book-meeting creation.
-- Run this in Supabase SQL Editor.

alter table public.meetups
  add column if not exists starting_book_title text,
  add column if not exists starting_book_author text,
  add column if not exists starting_book_publisher text,
  add column if not exists starting_book_translator text,
  add column if not exists starting_book_isbn text,
  add column if not exists starting_book_cover_url text;

drop policy if exists "Meetup hosts create meetups" on public.meetups;
create policy "Meetup hosts create meetups"
on public.meetups for insert
to authenticated
with check (host_id = auth.uid());

drop policy if exists "Meetup hosts update their meetups" on public.meetups;
create policy "Meetup hosts update their meetups"
on public.meetups for update
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

drop policy if exists "Meetup hosts delete their meetups" on public.meetups;
create policy "Meetup hosts delete their meetups"
on public.meetups for delete
to authenticated
using (host_id = auth.uid());
