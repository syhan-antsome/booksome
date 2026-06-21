-- Add AI classification/moderation state for bookroom posts.
-- Run this after schema.sql and rls.sql.

alter table public.posts
  add column if not exists classification_status text not null default 'done',
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists visibility text not null default 'public',
  add column if not exists ai_confidence numeric(4, 3),
  add column if not exists ai_reason text,
  add column if not exists reviewed_at timestamptz;

update public.posts
set
  classification_status = coalesce(classification_status, 'done'),
  moderation_status = coalesce(moderation_status, 'approved'),
  visibility = coalesce(visibility, 'public')
where classification_status is null
  or moderation_status is null
  or visibility is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_classification_status_check'
  ) then
    alter table public.posts
      add constraint posts_classification_status_check
      check (classification_status in ('pending', 'done', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'posts_moderation_status_check'
  ) then
    alter table public.posts
      add constraint posts_moderation_status_check
      check (moderation_status in ('pending', 'approved', 'rejected', 'needs_review', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'posts_visibility_check'
  ) then
    alter table public.posts
      add constraint posts_visibility_check
      check (visibility in ('pending', 'public', 'hidden'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'posts_ai_confidence_check'
  ) then
    alter table public.posts
      add constraint posts_ai_confidence_check
      check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1));
  end if;
end $$;

create index if not exists posts_room_visibility_created_at_idx
  on public.posts(room_id, visibility, created_at desc);

drop policy if exists "Posts are readable in visible rooms" on public.posts;
drop policy if exists "Authors and room operators can update posts" on public.posts;
drop policy if exists "Comments are readable when parent post is readable" on public.comments;
drop policy if exists "Authenticated users can comment" on public.comments;

create policy "Posts are readable in visible rooms"
on public.posts for select
using (
  hidden_at is null
  and (
    author_id = auth.uid()
    or public.is_room_operator(room_id)
    or (
      visibility = 'public'
      and moderation_status = 'approved'
      and (
        public.is_public_room(room_id)
        or public.is_room_member(room_id)
      )
    )
  )
);

create policy "Room operators can update posts"
on public.posts for update
using (public.is_room_operator(room_id))
with check (public.is_room_operator(room_id));

create policy "Comments are readable when parent post is readable"
on public.comments for select
using (
  hidden_at is null
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.hidden_at is null
      and posts.visibility = 'public'
      and posts.moderation_status = 'approved'
      and (
        public.is_public_room(posts.room_id)
        or public.is_room_member(posts.room_id)
      )
  )
);

create policy "Authenticated users can comment"
on public.comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.hidden_at is null
      and posts.visibility = 'public'
      and posts.moderation_status = 'approved'
      and public.is_room_member(posts.room_id)
  )
);
