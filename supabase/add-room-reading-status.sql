-- Add lightweight reading-status reactions for bookrooms.
-- Run this after schema.sql/functions.sql on existing projects.

alter table public.room_members
  add column if not exists reading_status text;

do $$
begin
  alter table public.room_members
    add constraint room_members_reading_status_check
    check (
      reading_status is null
      or reading_status in ('want_to_read', 'reading', 'finished')
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists room_members_reading_status_idx
on public.room_members(room_id, reading_status)
where reading_status is not null;

drop function if exists public.set_room_reading_status(uuid, text);

create or replace function public.set_room_reading_status(
  p_room_id uuid,
  p_reading_status text
)
returns table(room_id uuid, profile_id uuid, reading_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not exists (select 1 from public.profiles where profiles.id = current_profile_id) then
    raise exception '프로필이 아직 준비되지 않았습니다. 다시 로그인한 뒤 시도해주세요.';
  end if;

  if p_reading_status not in ('want_to_read', 'reading', 'finished') then
    raise exception '지원하지 않는 독서 반응입니다.';
  end if;

  if not exists (
    select 1
    from public.rooms
    where rooms.id = p_room_id
      and (
        rooms.visibility = 'public'
        or public.is_room_member(rooms.id)
      )
  ) then
    raise exception '참여할 수 없는 북룸입니다.';
  end if;

  insert into public.room_members (
    room_id,
    profile_id,
    role,
    reading_status
  )
  values (
    p_room_id,
    current_profile_id,
    'member',
    p_reading_status
  )
  on conflict on constraint room_members_pkey do update
  set reading_status = excluded.reading_status
  returning room_members.room_id, room_members.profile_id, room_members.reading_status
  into room_id, profile_id, reading_status;

  return next;
end;
$$;

grant execute on function public.set_room_reading_status(uuid, text) to authenticated;
