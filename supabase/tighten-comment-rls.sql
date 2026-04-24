-- Require Room membership before writing comments.
-- Run on existing databases after fix-rls-recursion.sql.

drop policy if exists "Authenticated users can comment" on public.comments;

create policy "Authenticated users can comment"
on public.comments for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and public.is_room_member(posts.room_id)
  )
);
