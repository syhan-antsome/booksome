-- Add the Room participation RPC.
-- Run after functions.sql or on an existing BookSome database.

drop function if exists public.join_room(uuid);

create or replace function public.join_room(p_room_id uuid)
returns table(joined_room_id uuid, joined_profile_id uuid, member_role public.room_member_role)
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

  if not exists (
    select 1
    from public.rooms
    where rooms.id = p_room_id
      and (
        rooms.visibility = 'public'
        or public.is_room_member(rooms.id)
      )
  ) then
    raise exception '참여할 수 없는 리딩룸입니다.';
  end if;

  insert into public.room_members (
    room_id,
    profile_id,
    role
  )
  values (
    p_room_id,
    current_profile_id,
    'member'
  )
  on conflict on constraint room_members_pkey do update
  set joined_at = public.room_members.joined_at
  returning room_members.room_id, room_members.profile_id, room_members.role
  into joined_room_id, joined_profile_id, member_role;

  return next;
end;
$$;

grant execute on function public.join_room(uuid) to authenticated;
