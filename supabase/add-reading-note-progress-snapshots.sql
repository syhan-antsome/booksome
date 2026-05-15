-- Stores the reading position at the moment a note/photo is created.
-- Run this once before using optional note pages with progress snapshots.

alter table public.reading_notes
add column if not exists current_page_snapshot integer not null default 0;

alter table public.reading_notes
add column if not exists progress_percent_snapshot integer not null default 0;

alter table public.reading_notes
add column if not exists total_pages_snapshot integer;

do $$ begin
  alter table public.reading_notes
  add constraint reading_notes_current_page_snapshot_nonnegative_check
  check (current_page_snapshot >= 0);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.reading_notes
  add constraint reading_notes_progress_percent_snapshot_range_check
  check (progress_percent_snapshot >= 0 and progress_percent_snapshot <= 100);
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.reading_notes
  add constraint reading_notes_total_pages_snapshot_positive_check
  check (total_pages_snapshot is null or total_pages_snapshot > 0);
exception
  when duplicate_object then null;
end $$;
