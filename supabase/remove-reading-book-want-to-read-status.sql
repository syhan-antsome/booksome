-- Removes the user-managed "want_to_read" reading-book status.
-- Run this once in Supabase SQL Editor after remove-reading-book-paused-status.sql.

update public.reading_books
set status = 'reading'::public.reading_book_status,
    updated_at = now()
where status::text = 'want_to_read';

do $$
begin
  if exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'reading_book_status'
  ) and exists (
    select 1
    from pg_enum
    where enumtypid = 'public.reading_book_status'::regtype
      and enumlabel = 'want_to_read'
  ) then
    create type public.reading_book_status_new as enum ('reading', 'finished');

    alter table public.reading_books
      alter column status drop default;

    alter table public.reading_books
      alter column status type public.reading_book_status_new
      using status::text::public.reading_book_status_new;

    drop type public.reading_book_status;

    alter type public.reading_book_status_new
      rename to reading_book_status;

    alter table public.reading_books
      alter column status set default 'reading'::public.reading_book_status;
  end if;
end $$;
