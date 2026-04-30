-- Adds page-based progress fields to personal reading-life books.
-- Run this once in Supabase SQL Editor before testing page progress.

alter table public.reading_books
add column if not exists current_page integer not null default 0,
add column if not exists total_pages integer;

update public.reading_books
set current_page = 0
where current_page is null;

do $$ begin
  alter table public.reading_books
  add constraint reading_books_current_page_nonnegative_check
  check (current_page >= 0);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.reading_books
  add constraint reading_books_total_pages_positive_check
  check (total_pages is null or total_pages > 0);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.reading_books
  add constraint reading_books_current_page_within_total_check
  check (total_pages is null or current_page <= total_pages);
exception
  when duplicate_object then null;
end $$;
