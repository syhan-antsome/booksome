-- Fix recursive RLS policies between rooms and room_members.
-- Run this once in Supabase SQL Editor if discovery reads fail with:
-- "infinite recursion detected in policy for relation rooms/room_members".

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and profile_id = auth.uid()
  );
$$;

create or replace function public.is_public_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where id = target_room_id
      and visibility = 'public'
  );
$$;

drop policy if exists "Public rooms are readable" on public.rooms;
create policy "Public rooms are readable"
on public.rooms for select
using (
  visibility = 'public'
  or public.is_room_member(id)
);

drop policy if exists "Room members are readable for visible rooms" on public.room_members;
create policy "Room members are readable for visible rooms"
on public.room_members for select
using (
  public.is_public_room(room_id)
  or profile_id = auth.uid()
  or public.is_room_operator(room_id)
);

drop policy if exists "Posts are readable in visible rooms" on public.posts;
create policy "Posts are readable in visible rooms"
on public.posts for select
using (
  hidden_at is null
  and (
    public.is_public_room(room_id)
    or public.is_room_member(room_id)
  )
);

drop policy if exists "Comments are readable when parent post is readable" on public.comments;
create policy "Comments are readable when parent post is readable"
on public.comments for select
using (
  hidden_at is null
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.hidden_at is null
      and (
        public.is_public_room(posts.room_id)
        or public.is_room_member(posts.room_id)
      )
  )
);

drop policy if exists "Reading sessions are readable in visible rooms" on public.reading_sessions;
create policy "Reading sessions are readable in visible rooms"
on public.reading_sessions for select
using (public.is_public_room(room_id));
