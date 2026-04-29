-- BookSome initial Row Level Security policies.
-- Run after schema.sql. These policies are intentionally permissive for public discovery
-- and strict for user-owned writes.

alter table public.profiles enable row level security;
alter table public.book_works enable row level security;
alter table public.book_editions enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.reading_books enable row level security;
alter table public.reading_notes enable row level security;
alter table public.meetups enable row level security;
alter table public.media_assets enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create or replace function public.is_room_operator(target_room_id uuid)
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
      and role in ('founder', 'host', 'co_host')
  );
$$;

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

create policy "Profiles are publicly readable"
on public.profiles for select
using (true);

create policy "Users can insert their own profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "Books are publicly readable"
on public.book_works for select
using (true);

create policy "Book editions are publicly readable"
on public.book_editions for select
using (true);

create policy "Authenticated users can add book works"
on public.book_works for insert
to authenticated
with check (true);

create policy "Authenticated users can add book editions"
on public.book_editions for insert
to authenticated
with check (true);

create policy "Public rooms are readable"
on public.rooms for select
using (
  visibility = 'public'
  or public.is_room_member(id)
);

create policy "Authenticated users can create rooms"
on public.rooms for insert
to authenticated
with check (founder_id = auth.uid());

create policy "Room operators can update rooms"
on public.rooms for update
using (public.is_room_operator(id))
with check (public.is_room_operator(id));

create policy "Room members are readable for visible rooms"
on public.room_members for select
using (
  public.is_public_room(room_id)
  or profile_id = auth.uid()
  or public.is_room_operator(room_id)
);

create policy "Users can join rooms as themselves"
on public.room_members for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users can leave their own rooms"
on public.room_members for delete
using (profile_id = auth.uid());

create policy "Room operators can manage members"
on public.room_members for update
using (public.is_room_operator(room_id))
with check (public.is_room_operator(room_id));

create policy "Posts are readable in visible rooms"
on public.posts for select
using (
  hidden_at is null
  and (
    public.is_public_room(room_id)
    or public.is_room_member(room_id)
  )
);

create policy "Room members can create posts"
on public.posts for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.room_members
    where room_id = posts.room_id and profile_id = auth.uid()
  )
);

create policy "Authors and room operators can update posts"
on public.posts for update
using (author_id = auth.uid() or public.is_room_operator(room_id))
with check (author_id = auth.uid() or public.is_room_operator(room_id));

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

create policy "Authors can update comments"
on public.comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "Reactions are readable"
on public.reactions for select
using (true);

create policy "Users manage their reactions"
on public.reactions for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Reading sessions are readable in visible rooms"
on public.reading_sessions for select
using (public.is_public_room(room_id));

create policy "Room operators manage reading sessions"
on public.reading_sessions for all
to authenticated
using (public.is_room_operator(room_id))
with check (public.is_room_operator(room_id));

create policy "Users read their reading books"
on public.reading_books for select
to authenticated
using (profile_id = auth.uid());

create policy "Public can read public reading books"
on public.reading_books for select
using (visibility = 'public');

create policy "Users create their reading books"
on public.reading_books for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users update their reading books"
on public.reading_books for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users delete their reading books"
on public.reading_books for delete
to authenticated
using (profile_id = auth.uid());

create policy "Users read their reading notes"
on public.reading_notes for select
to authenticated
using (profile_id = auth.uid());

create policy "Public can read public reading notes"
on public.reading_notes for select
using (visibility = 'public');

create policy "Users create their reading notes"
on public.reading_notes for insert
to authenticated
with check (profile_id = auth.uid());

create policy "Users update their reading notes"
on public.reading_notes for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users delete their reading notes"
on public.reading_notes for delete
to authenticated
using (profile_id = auth.uid());

create policy "Scheduled meetups are readable"
on public.meetups for select
using (status = 'scheduled');

create policy "Room operators manage meetups"
on public.meetups for all
to authenticated
using (room_id is not null and public.is_room_operator(room_id))
with check (room_id is not null and public.is_room_operator(room_id));

create policy "Media is readable"
on public.media_assets for select
using (true);

create policy "Users can create owned media"
on public.media_assets for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Users manage their push tokens"
on public.push_tokens for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users read their notifications"
on public.notifications for select
using (profile_id = auth.uid());

create policy "Users update their notifications"
on public.notifications for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Authenticated users create reports"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());
