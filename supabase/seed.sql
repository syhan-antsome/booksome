-- Development seed data for BookSome.
-- Safe to run after schema.sql. It does not create auth users.

insert into public.book_works (id, title, original_title, author, description, primary_language, cover_path)
values
  ('00000000-0000-4000-8000-000000000001', '데미안', 'Demian', '헤르만 헤세', '자기 자신에게 이르는 길을 묻는 고전.', 'ko', null),
  ('00000000-0000-4000-8000-000000000002', 'Midnight Library', 'The Midnight Library', 'Matt Haig', '삶의 다른 가능성을 마주하는 이야기.', 'en', null),
  ('00000000-0000-4000-8000-000000000003', '아몬드', 'Almond', '손원평', '감정과 이해에 대해 질문하는 소설.', 'ko', null)
on conflict (id) do nothing;

insert into public.rooms (id, work_id, slug, title, subtitle, description, accent_color, visibility)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'demian',
    '데미안',
    '나 자신에게 이르는 질문들',
    '데미안을 읽으며 나다움, 성장, 고독, 관계에 대해 이야기하는 리딩룸입니다.',
    '#E46F58',
    'public'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'midnight-library',
    'Midnight Library',
    '전 세계 독자들의 선택과 후회',
    '삶의 다른 가능성을 상상하며 질문을 나누는 글로벌 리딩룸입니다.',
    '#2F6F95',
    'public'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    'almond',
    '아몬드',
    '감정을 이해한다는 것',
    '감정, 공감, 관계에 대한 질문을 함께 나누는 리딩룸입니다.',
    '#C99B32',
    'public'
  )
on conflict (id) do nothing;

insert into public.posts (id, room_id, kind, body, pinned)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'question', '내가 나답게 살기 시작한 순간은 언제였나요?', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'question', '다른 선택의 삶을 볼 수 있다면 무엇을 확인하고 싶나요?', true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'question', '감정을 이해한다는 것은 어디에서 시작될까요?', true)
on conflict (id) do nothing;

insert into public.reading_sessions (id, room_id, title, chapter_label)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '오늘 밤 9:00 챕터 5 함께 읽기', 'Chapter 5'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '토요일 글로벌 토론 오픈', 'Part 2'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '새 질문 12개가 기다리고 있어요', 'Chapter 8')
on conflict (id) do nothing;
