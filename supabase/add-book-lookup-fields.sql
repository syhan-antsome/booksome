-- Add Naver/OpenAPI book lookup fields.
-- Run this in the Supabase SQL Editor before the updated functions.sql.

alter table public.book_works
  add column if not exists external_cover_url text;

alter table public.book_editions
  add column if not exists external_cover_url text;

alter table public.rooms
  add column if not exists external_cover_url text;

create or replace view public.room_discovery_cards
with (security_invoker = true) as
select
  r.id,
  r.slug,
  r.title,
  coalesce(r.subtitle, bw.author) as subtitle,
  r.accent_color,
  r.visibility,
  host_profile.display_name as host_name,
  count(distinct rm.profile_id)::integer as member_count,
  pinned.body as pinned_question,
  next_session.title as next_event,
  50::integer as progress_percent,
  r.external_cover_url,
  r.created_at
from public.rooms r
join public.book_works bw on bw.id = r.work_id
left join public.room_members rm on rm.room_id = r.id
left join lateral (
  select p.display_name
  from public.room_members hrm
  join public.profiles p on p.id = hrm.profile_id
  where hrm.room_id = r.id and hrm.role in ('founder', 'host')
  order by case hrm.role when 'founder' then 0 else 1 end, hrm.joined_at
  limit 1
) host_profile on true
left join lateral (
  select body
  from public.posts
  where room_id = r.id and kind = 'question' and hidden_at is null
  order by pinned desc, created_at desc
  limit 1
) pinned on true
left join lateral (
  select title
  from public.reading_sessions
  where room_id = r.id and (starts_at is null or starts_at >= now() - interval '1 day')
  order by starts_at nulls last
  limit 1
) next_session on true
where r.visibility = 'public'
group by r.id, bw.author, host_profile.display_name, pinned.body, next_session.title;
