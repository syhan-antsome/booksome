export type BookSearchItem = {
  title: string;
  author: string;
  publisher: string;
  translator: string | null;
  publishedDate: string | null;
  isbn: string;
  imageUrl: string | null;
  link: string | null;
  description: string | null;
  source: string;
};

export type BookSearchResponse = {
  query: string;
  total: number;
  items: BookSearchItem[];
};

export type RoomSummary = {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  subtitle: string | null;
  host_name: string | null;
  member_count: number;
  accent_color: string | null;
  pinned_question: string | null;
  next_event: string | null;
  progress_percent: number;
  cover_path: string | null;
  external_cover_url: string | null;
};

export type BookroomFeedItem = {
  id: string;
  roomId: string;
  roomSlug: string;
  roomTitle: string;
  roomAuthor: string | null;
  roomAccentColor: string | null;
  roomCoverPath: string | null;
  roomExternalCoverUrl: string | null;
  kind: string;
  body: string | null;
  quoteText: string | null;
  chapterLabel: string | null;
  authorName: string;
  authorAvatarPath: string | null;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
};

export type RoomDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  author: string | null;
  accentColor: string | null;
  coverPath: string | null;
  externalCoverUrl: string | null;
  nextEvent: string | null;
  memberCount: number;
  viewerRole: string | null;
  viewerReadingStatus: string | null;
  readingStatusCounts: {
    wantToRead: number;
    reading: number;
    finished: number;
  };
};

export type RoomPost = {
  id: string;
  kind: string;
  body: string | null;
  quoteText: string | null;
  chapterLabel: string | null;
  classificationStatus: string | null;
  moderationStatus: string | null;
  visibility: string;
  authorName: string;
  createdAt: string;
  reactionCount: number;
  viewerReacted: boolean;
  comments: Array<{
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
  }>;
};

export type Profile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  bio: string | null;
  preferredLanguage: string | null;
  city: string | null;
  country: string | null;
};

export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
  profile: Profile;
};

export type CurrentSession = {
  user: User;
  profile: Profile;
};
