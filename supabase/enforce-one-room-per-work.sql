-- Enforce the BookSome v2 rule: one public Bookroom per book work.
-- Run after duplicate rooms have been reviewed and merged.

do $$
begin
  if exists (
    select 1
    from public.rooms
    group by work_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate rooms exist for at least one book work. Merge duplicates before adding rooms_one_per_work_idx.';
  end if;
end;
$$;

create unique index if not exists rooms_one_per_work_idx
on public.rooms(work_id);
