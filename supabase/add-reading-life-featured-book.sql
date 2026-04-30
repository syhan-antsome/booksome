-- Adds a user-selected featured book for the reading-life home.
-- Run this once in Supabase SQL Editor before using "대표 책으로 설정".

alter table public.reading_books
add column if not exists pinned_at timestamptz;

create unique index if not exists reading_books_one_pinned_per_profile_idx
on public.reading_books(profile_id)
where pinned_at is not null;
