export type FeaturedRoom = {
  slug: string;
  title: string;
  author: string;
  host: string;
  members: string;
  accent: string;
  progress: number;
  next: string;
  question: string;
  coverPath?: string | null;
  coverUrl?: string | null;
};

export const featuredRooms: FeaturedRoom[] = [
  {
    slug: 'demian',
    title: '데미안',
    author: '헤르만 헤세',
    host: 'Mina',
    members: '1.8k',
    accent: '#E46F58',
    progress: 64,
    next: '오늘 밤 9:00 챕터 5 함께 읽기',
    question: '내가 나답게 살기 시작한 순간은 언제였나요?',
    coverUrl: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
  },
  {
    slug: 'midnight-library',
    title: 'Midnight Library',
    author: 'Matt Haig',
    host: 'Noah',
    members: '942',
    accent: '#2F6F95',
    progress: 42,
    next: '토요일 글로벌 토론 오픈',
    question: '다른 선택의 삶을 볼 수 있다면 무엇을 확인하고 싶나요?',
    coverUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  },
  {
    slug: 'almond',
    title: '아몬드',
    author: '손원평',
    host: 'Jin',
    members: '726',
    accent: '#C99B32',
    progress: 78,
    next: '새 질문 12개가 기다리고 있어요',
    question: '감정을 이해한다는 것은 어디에서 시작될까요?',
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80',
  },
];

export const nativeReadiness = [
  {
    title: 'Push',
    label: '리딩룸 활동과 모임 알림',
  },
  {
    title: 'Deep Link',
    label: '공유 링크에서 Room 바로 열기',
  },
  {
    title: 'Share',
    label: '질문, 감상, 모임 초대 공유',
  },
  {
    title: 'Location',
    label: '도시 기반 독서 모임 추천',
  },
  {
    title: 'ISBN Scan',
    label: '책을 스캔해 Room 진입',
  },
  {
    title: 'Camera',
    label: '프로필과 Room 이미지 업로드',
  },
];
