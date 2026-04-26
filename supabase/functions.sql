-- BookSome server-side functions.
-- Run after schema.sql and rls.sql.

drop function if exists public.create_reading_room(text, text, text, text, text, text, text);

create or replace function public.create_reading_room(
  p_book_title text,
  p_author text,
  p_isbn13 text default null,
  p_room_title text default null,
  p_room_subtitle text default null,
  p_room_description text default null,
  p_first_question text default null,
  p_cover_path text default null
)
returns table(id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  new_work_id uuid;
  new_edition_id uuid;
  new_room_id uuid;
  clean_isbn13 text := nullif(regexp_replace(coalesce(p_isbn13, ''), '[^0-9Xx]', '', 'g'), '');
  slug_base text;
  candidate_slug text;
begin
  if current_profile_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not exists (select 1 from public.profiles where profiles.id = current_profile_id) then
    raise exception '프로필이 아직 준비되지 않았습니다. 다시 로그인한 뒤 시도해주세요.';
  end if;

  if nullif(trim(p_book_title), '') is null then
    raise exception '책 제목은 꼭 필요합니다.';
  end if;

  if nullif(trim(p_author), '') is null then
    raise exception '저자는 꼭 필요합니다.';
  end if;

  if clean_isbn13 is not null and clean_isbn13 !~ '^(978|979)[0-9]{10}$' then
    raise exception '올바른 ISBN-13 형식이 아닙니다.';
  end if;

  if nullif(trim(coalesce(p_first_question, '')), '') is null then
    raise exception '첫 질문은 꼭 필요합니다.';
  end if;

  slug_base := lower(coalesce(nullif(trim(p_room_title), ''), trim(p_book_title)));
  slug_base := regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g');
  slug_base := regexp_replace(slug_base, '(^-+|-+$)', '', 'g');
  slug_base := left(slug_base, 48);

  if slug_base = '' then
    slug_base := 'room';
  end if;

  if clean_isbn13 is not null then
    select book_editions.id, book_editions.work_id
    into new_edition_id, new_work_id
    from public.book_editions
    where book_editions.isbn13 = clean_isbn13
    limit 1;
  end if;

  loop
    candidate_slug := slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    exit when not exists (select 1 from public.rooms where rooms.slug = candidate_slug);
  end loop;

  if new_work_id is null then
    insert into public.book_works (
      title,
      author,
      description,
      primary_language,
      cover_path
    )
    values (
      trim(p_book_title),
      trim(p_author),
      nullif(trim(coalesce(p_room_description, '')), ''),
      'ko',
      p_cover_path
    )
    returning book_works.id into new_work_id;
  end if;

  if clean_isbn13 is not null and new_edition_id is null then
    insert into public.book_editions (
      work_id,
      isbn13,
      title,
      author,
      language,
      cover_path,
      source
    )
    values (
      new_work_id,
      clean_isbn13,
      trim(p_book_title),
      trim(p_author),
      'ko',
      p_cover_path,
      'isbn-scan'
    )
    returning book_editions.id into new_edition_id;
  end if;

  insert into public.rooms (
    work_id,
    edition_id,
    slug,
    title,
    subtitle,
    description,
    cover_path,
    founder_id,
    visibility
  )
  values (
    new_work_id,
    new_edition_id,
    candidate_slug,
    coalesce(nullif(trim(p_room_title), ''), trim(p_book_title)),
    nullif(trim(coalesce(p_room_subtitle, '')), ''),
    nullif(trim(coalesce(p_room_description, '')), ''),
    p_cover_path,
    current_profile_id,
    'public'
  )
  returning rooms.id into new_room_id;

  insert into public.room_members (
    room_id,
    profile_id,
    role
  )
  values (
    new_room_id,
    current_profile_id,
    'founder'
  );

  insert into public.posts (
    room_id,
    author_id,
    kind,
    body,
    pinned
  )
  values (
    new_room_id,
    current_profile_id,
    'question',
    trim(p_first_question),
    true
  );

  if p_cover_path is not null then
    update public.media_assets
    set room_id = new_room_id
    where owner_id = current_profile_id
      and object_path = p_cover_path
      and room_id is null;
  end if;

  return query select new_room_id, candidate_slug;
end;
$$;

grant execute on function public.create_reading_room(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

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
