-- BookSome server-side functions.
-- Run after schema.sql and rls.sql.

drop function if exists public.create_reading_room(text, text, text, text, text, text, text);
drop function if exists public.create_reading_room(text, text, text, text, text, text, text, text);
drop function if exists public.create_reading_room(text, text, text, text, text, text, jsonb, text, text, text, text, text);

create or replace function public.create_reading_room(
  p_book_title text,
  p_author text,
  p_isbn13 text default null,
  p_external_cover_url text default null,
  p_publisher text default null,
  p_published_date text default null,
  p_source_payload jsonb default null,
  p_room_title text default null,
  p_room_subtitle text default null,
  p_room_description text default null,
  p_first_question text default null,
  p_cover_path text default null
)
returns table(id uuid, slug text, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  new_work_id uuid;
  new_edition_id uuid;
  new_room_id uuid;
  existing_room_id uuid;
  existing_room_slug text;
  new_room_slug text;
  clean_isbn13 text := nullif(regexp_replace(coalesce(p_isbn13, ''), '[^0-9Xx]', '', 'g'), '');
  clean_book_title text := nullif(regexp_replace(lower(trim(coalesce(p_book_title, ''))), '[[:space:]]+', ' ', 'g'), '');
  clean_author text := nullif(regexp_replace(lower(trim(coalesce(p_author, ''))), '[[:space:]]+', ' ', 'g'), '');
  clean_external_cover_url text := nullif(trim(coalesce(p_external_cover_url, '')), '');
  clean_publisher text := nullif(trim(coalesce(p_publisher, '')), '');
  clean_published_date date;
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

  if nullif(trim(coalesce(p_published_date, '')), '') is not null
    and trim(p_published_date) ~ '^[0-9]{8}$' then
    clean_published_date := to_date(trim(p_published_date), 'YYYYMMDD');
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

  if clean_isbn13 is not null and new_edition_id is not null then
    update public.book_editions
    set
      publisher = coalesce(public.book_editions.publisher, clean_publisher),
      published_date = coalesce(public.book_editions.published_date, clean_published_date),
      external_cover_url = coalesce(public.book_editions.external_cover_url, clean_external_cover_url),
      source = coalesce(public.book_editions.source, 'naver'),
      source_payload = coalesce(public.book_editions.source_payload, p_source_payload)
    where public.book_editions.id = new_edition_id;
  end if;

  if new_work_id is null then
    select book_works.id
    into new_work_id
    from public.book_works
    where regexp_replace(lower(trim(book_works.title)), '[[:space:]]+', ' ', 'g') = clean_book_title
      and regexp_replace(lower(trim(book_works.author)), '[[:space:]]+', ' ', 'g') = clean_author
    order by book_works.created_at
    limit 1;
  end if;

  if clean_isbn13 is not null and new_work_id is not null and new_edition_id is null then
    insert into public.book_editions (
      work_id,
      isbn13,
      title,
      author,
      publisher,
      published_date,
      language,
      cover_path,
      external_cover_url,
      source,
      source_payload
    )
    values (
      new_work_id,
      clean_isbn13,
      trim(p_book_title),
      trim(p_author),
      clean_publisher,
      clean_published_date,
      'ko',
      p_cover_path,
      clean_external_cover_url,
      'naver',
      p_source_payload
    )
    on conflict (isbn13) do update
    set
      publisher = coalesce(public.book_editions.publisher, excluded.publisher),
      published_date = coalesce(public.book_editions.published_date, excluded.published_date),
      external_cover_url = coalesce(public.book_editions.external_cover_url, excluded.external_cover_url),
      source = coalesce(public.book_editions.source, excluded.source),
      source_payload = coalesce(public.book_editions.source_payload, excluded.source_payload)
    returning book_editions.id into new_edition_id;
  end if;

  if new_work_id is not null then
    select rooms.id, rooms.slug
    into existing_room_id, existing_room_slug
    from public.rooms
    where rooms.work_id = new_work_id
    order by rooms.created_at
    limit 1;

    if existing_room_id is not null then
      insert into public.room_members (
        room_id,
        profile_id,
        role
      )
      values (
        existing_room_id,
        current_profile_id,
        'member'
      )
      on conflict on constraint room_members_pkey do nothing;

      return query select existing_room_id, existing_room_slug, false;
      return;
    end if;
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
      cover_path,
      external_cover_url
    )
    values (
      trim(p_book_title),
      trim(p_author),
      nullif(trim(coalesce(p_room_description, '')), ''),
      'ko',
      p_cover_path,
      clean_external_cover_url
    )
    returning book_works.id into new_work_id;
  end if;

  if clean_isbn13 is not null and new_edition_id is null then
    insert into public.book_editions (
      work_id,
      isbn13,
      title,
      author,
      publisher,
      published_date,
      language,
      cover_path,
      external_cover_url,
      source,
      source_payload
    )
    values (
      new_work_id,
      clean_isbn13,
      trim(p_book_title),
      trim(p_author),
      clean_publisher,
      clean_published_date,
      'ko',
      p_cover_path,
      clean_external_cover_url,
      'naver',
      p_source_payload
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
    external_cover_url,
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
    clean_external_cover_url,
    current_profile_id,
    'public'
  )
  returning rooms.id, rooms.slug into new_room_id, new_room_slug;

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

  if nullif(trim(coalesce(p_first_question, '')), '') is not null then
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
  end if;

  if p_cover_path is not null then
    update public.media_assets
    set room_id = new_room_id
    where owner_id = current_profile_id
      and object_path = p_cover_path
      and room_id is null;
  end if;

  return query select new_room_id, new_room_slug, true;
end;
$$;

grant execute on function public.create_reading_room(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  text,
  text
) to authenticated;

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
