import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import bookroomSignboardImage from '../../assets/bookroom-signboard.jpg';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { featuredRooms, type FeaturedRoom } from '../../src/data/rooms';
import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import {
  listBookroomFeed,
  listFeaturedRooms,
  type BookroomFeedItem,
  type RoomSummary,
} from '../../src/services/rooms';

type CoverStyle = {
  borderRadius: number;
  height: number;
  width: number;
};

const bookroomSignboardRatio = 803 / 1400;
const bookroomSignboardSource = bookroomSignboardImage as ImageSourcePropType;
const feedMoreLabelLength = 260;
const feedDropLeadLength = 58;

export default function RoomsScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [feedItems, setFeedItems] = useState<BookroomFeedItem[]>([]);
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsLoading(true);

    Promise.all([listBookroomFeed(), listFeaturedRooms()])
      .then(([nextFeedItems, nextRooms]) => {
        if (!isMounted) return;
        setFeedItems(nextFeedItems);
        setRemoteRooms(nextRooms);
      })
      .catch(() => {
        if (!isMounted) return;
        setFeedItems([]);
        setRemoteRooms([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(refreshRooms);

  const rooms = useMemo(
    () => (remoteRooms.length > 0 ? remoteRooms.map(toFeaturedRoom) : featuredRooms),
    [remoteRooms],
  );
  const filteredFeed = feedItems;
  const filteredRooms = rooms.slice(0, 6);
  const shelfRooms = rooms.slice(0, 8);
  const signboardHeight = Math.round(Math.min(width, 520) * bookroomSignboardRatio);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.signboardBackdrop, { height: signboardHeight }]}>
        <Image resizeMode="cover" source={bookroomSignboardSource} style={styles.signboardImage} />
        <LinearGradient
          colors={['rgba(246,243,237,0)', '#F6F3ED']}
          locations={[0, 1]}
          pointerEvents="none"
          style={styles.signboardFade}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ height: signboardHeight }} />
        <View style={styles.pageSurface}>
          {shelfRooms.length > 0 ? (
            <View style={styles.bookStage}>
              <View style={styles.bookStageHeader}>
                <Text style={styles.bookStageTitle}>추천 북룸</Text>
                <Link asChild href={session ? '/create-room' : '/auth'}>
                  <Pressable accessibilityLabel="책 검색" style={styles.bookStageSearchButton}>
                    <SearchIcon tone="light" />
                  </Pressable>
                </Link>
              </View>
              <ScrollView
                contentContainerStyle={styles.bookRail}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {shelfRooms.map((room) => (
                  <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                    <Pressable style={styles.bookTile}>
                      <BookCover room={room} style={styles.bookTileCover} />
                      <Text numberOfLines={2} style={styles.bookTileTitle}>
                        {room.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.bookTileAuthor}>
                        {room.author}
                      </Text>
                      <Text style={styles.bookTileSignal}>{getRoomSignalText(room, feedItems)}</Text>
                    </Pressable>
                  </Link>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.feedList}>
            <View style={styles.bookTalkHeader}>
              <Text style={styles.bookTalkTitle}>책톡</Text>
            </View>
            {filteredFeed.length > 0 ? (
              filteredFeed.map((item) => {
                const previewText = getFeedPreviewText(item);
                const previewParts = splitFeedPreviewText(previewText);

                return (
                  <Link asChild href={`/room/${item.roomSlug}`} key={item.id}>
                    <Pressable style={styles.feedItem}>
                      <FeedCover item={item} style={styles.feedBookThumb} />
                      <View style={styles.feedCopy}>
                        <View style={styles.feedBookRow}>
                          <Text numberOfLines={1} style={styles.feedBookTitle}>
                            {item.roomTitle}
                          </Text>
                          <Text style={styles.feedBookSeparator}>·</Text>
                          <Text numberOfLines={1} style={styles.feedBookAuthor}>
                            {item.roomAuthor}
                          </Text>
                        </View>
                        <View style={styles.feedChatBubble}>
                          <View style={styles.feedDropLine}>
                            <AuthorAvatar item={item} style={styles.feedDropAvatar} />
                            <Text numberOfLines={4} style={[styles.feedBody, styles.feedDropLead]}>
                              {previewParts.lead}
                            </Text>
                          </View>
                          {previewParts.rest ? (
                            <Text numberOfLines={6} style={[styles.feedBody, styles.feedBodyRest]}>
                              {previewParts.rest}
                            </Text>
                          ) : null}
                          {shouldShowMoreLabel(previewText) ? (
                            <Text style={styles.feedMoreText}>더보기</Text>
                          ) : null}
                        </View>
                        <View style={styles.feedMetaRow}>
                          <Text numberOfLines={1} style={styles.feedAuthor}>
                            {item.authorName ?? '독자'}
                          </Text>
                          <Text style={styles.feedActionText}>♡ {item.reactionCount}</Text>
                          <Text style={styles.feedActionText}>댓글 {item.commentCount}</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })
            ) : (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyTitle}>{isLoading ? '불러오는 중입니다.' : '아직 조용합니다.'}</Text>
                <Text style={styles.emptyCopy}>책을 찾아 먼저 말을 걸어보세요.</Text>
              </View>
            )}
          </View>

          {filteredFeed.length === 0 && filteredRooms.length > 0 ? (
            <View style={styles.roomFallback}>
              <Text style={styles.fallbackTitle}>책으로 들어가기</Text>
              {filteredRooms.map((room) => (
                <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                  <Pressable style={styles.roomRow}>
                    <BookCover room={room} style={styles.roomCover} />
                    <View style={styles.roomCopy}>
                      <Text numberOfLines={1} style={styles.roomTitle}>
                        {room.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.roomAuthor}>
                        {room.author}
                      </Text>
                    </View>
                    <Text style={styles.roomArrow}>›</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <BottomNavigation active="rooms" />
    </SafeAreaView>
  );
}

function SearchIcon({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const color = tone === 'light' ? '#FFF9EF' : '#6E766E';

  return (
    <View pointerEvents="none" style={styles.searchIcon}>
      <View style={[styles.searchIconCircle, { borderColor: color }]} />
      <View style={[styles.searchIconHandle, { backgroundColor: color }]} />
    </View>
  );
}

function FeedCover({ item, style }: { item: BookroomFeedItem; style: CoverStyle }) {
  const coverUrl = getFeedCoverUrl(item);

  if (coverUrl) {
    return <Image resizeMode="cover" source={{ uri: coverUrl }} style={style} />;
  }

  return (
    <View style={[style, styles.coverFallback, { backgroundColor: item.roomAccentColor }]}>
      <Text style={styles.coverFallbackText}>BOOK</Text>
    </View>
  );
}

function AuthorAvatar({ item, style }: { item: BookroomFeedItem; style: CoverStyle }) {
  const avatarUrl = getAuthorAvatarUrl(item);

  if (avatarUrl) {
    return <Image resizeMode="cover" source={{ uri: avatarUrl }} style={style} />;
  }

  return (
    <View style={[style, styles.avatarFallback]}>
      <Text style={styles.avatarFallbackText}>{getAuthorInitial(item.authorName)}</Text>
    </View>
  );
}

function BookCover({ room, style }: { room: FeaturedRoom; style: CoverStyle }) {
  const coverUrl = getRoomImageUrl(room);

  if (coverUrl) {
    return <Image resizeMode="cover" source={{ uri: coverUrl }} style={style} />;
  }

  return (
    <View style={[style, styles.coverFallback, { backgroundColor: room.accent }]}>
      <Text style={styles.coverFallbackText}>BOOK</Text>
    </View>
  );
}

function getFeedPreviewText(item: BookroomFeedItem) {
  if (item.quoteText) {
    return `“${item.quoteText}”`;
  }

  return item.body;
}

function getAuthorInitial(name: string | null) {
  return (name?.trim().slice(0, 1) || '독').toUpperCase();
}

function splitFeedPreviewText(text: string) {
  const normalizedText = text.trim();

  if (normalizedText.length <= feedDropLeadLength) {
    return { lead: normalizedText, rest: '' };
  }

  return {
    lead: normalizedText.slice(0, feedDropLeadLength).trimEnd(),
    rest: normalizedText.slice(feedDropLeadLength).trimStart(),
  };
}

function shouldShowMoreLabel(text: string) {
  return text.length > feedMoreLabelLength || text.split(/\r\n|\r|\n/).length > 10;
}

function getRoomSignalText(room: FeaturedRoom, feedItems: BookroomFeedItem[]) {
  const roomPostCount = feedItems.filter((item) => item.roomSlug === room.slug).length;

  if (roomPostCount > 0) {
    return `${roomPostCount}개의 말`;
  }

  return `${room.members}명`;
}

function toFeaturedRoom(room: RoomSummary): FeaturedRoom {
  return {
    slug: room.slug,
    title: room.title,
    author: room.subtitle ?? '작가 미상',
    host: room.host_name ?? '독자',
    members: room.member_count.toLocaleString(),
    accent: room.accent_color,
    progress: room.progress_percent,
    next: room.next_event ?? '',
    question: room.pinned_question ?? '',
    coverPath: room.cover_path ?? null,
    coverUrl: room.external_cover_url ?? null,
  };
}

function getFeedCoverUrl(item: BookroomFeedItem) {
  if (item.roomCoverPath) {
    return getRoomCoverUrl(item.roomCoverPath);
  }

  return item.roomExternalCoverUrl ?? null;
}

function getAuthorAvatarUrl(item: BookroomFeedItem) {
  if (!item.authorAvatarPath) {
    return null;
  }

  try {
    return getMediaUrl(item.authorAvatarPath);
  } catch {
    return null;
  }
}

function getRoomImageUrl(room: FeaturedRoom) {
  if (room.coverPath) {
    return getRoomCoverUrl(room.coverPath);
  }

  return room.coverUrl ?? null;
}

function getRoomCoverUrl(coverPath: string) {
  try {
    return getMediaUrl(coverPath);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F6F3ED',
    flex: 1,
  },
  content: {
    paddingBottom: 92,
  },
  signboardBackdrop: {
    backgroundColor: '#F6F3ED',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0,
  },
  signboardImage: {
    height: '100%',
    width: '100%',
  },
  signboardFade: {
    bottom: 0,
    height: 82,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  pageSurface: {
    backgroundColor: '#F6F3ED',
    position: 'relative',
    zIndex: 1,
  },
  searchIcon: {
    height: 18,
    position: 'relative',
    width: 18,
  },
  searchIconCircle: {
    borderColor: '#6E766E',
    borderRadius: 6,
    borderWidth: 1.7,
    height: 11,
    left: 1,
    position: 'absolute',
    top: 1,
    width: 11,
  },
  searchIconHandle: {
    borderRadius: 1,
    height: 7,
    left: 12,
    position: 'absolute',
    top: 10,
    transform: [{ rotate: '-45deg' }],
    width: 1.7,
  },
  bookStage: {
    backgroundColor: '#17231E',
    borderBottomColor: 'rgba(20,35,31,0.16)',
    borderBottomWidth: 1,
    paddingTop: 14,
    paddingBottom: 16,
  },
  bookStageHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  bookStageTitle: {
    color: '#FFF9EF',
    fontSize: 17,
    fontWeight: '700',
  },
  bookStageSearchButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    marginBottom: -5,
    marginRight: -8,
    width: 34,
  },
  bookRail: {
    gap: 13,
    paddingHorizontal: 16,
    paddingRight: 28,
    paddingTop: 12,
  },
  bookTile: {
    width: 92,
  },
  bookTileCover: {
    borderRadius: 4,
    height: 116,
    width: 78,
  },
  bookTileTitle: {
    color: '#FFF9EF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 7,
  },
  bookTileAuthor: {
    color: 'rgba(255,249,239,0.6)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  bookTileSignal: {
    color: '#D9A45F',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
  feedList: {
    backgroundColor: '#FFFDF8',
  },
  bookTalkHeader: {
    borderBottomColor: 'rgba(20,35,31,0.1)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bookTalkTitle: {
    color: '#14231F',
    fontSize: 16,
    fontWeight: '700',
  },
  feedItem: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(20,35,31,0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  feedBookThumb: {
    borderRadius: 3,
    height: 58,
    width: 39,
  },
  feedCopy: {
    flex: 1,
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  feedBookRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 5,
  },
  feedBookTitle: {
    color: '#14231F',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  feedBookSeparator: {
    color: '#8D938B',
    fontSize: 11,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  feedBookAuthor: {
    color: '#687068',
    flexShrink: 2,
    fontSize: 11,
    fontWeight: '500',
  },
  feedMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
    marginTop: 6,
  },
  feedAuthor: {
    color: '#707870',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  feedBody: {
    color: '#182520',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  feedBodyRest: {
    marginTop: 3,
  },
  feedChatBubble: {
    alignSelf: 'stretch',
    backgroundColor: '#FBF8F2',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedDropAvatar: {
    borderRadius: 11,
    height: 54,
    width: 54,
  },
  feedDropLead: {
    flex: 1,
    minWidth: 0,
  },
  feedDropLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
  },
  feedMoreText: {
    color: '#8C3E38',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  feedActionText: {
    color: '#707870',
    fontSize: 11,
    fontWeight: '500',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#D8D0C4',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#5D635C',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyFeed: {
    borderBottomColor: 'rgba(20,35,31,0.12)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: '#14231F',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCopy: {
    color: '#707870',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 5,
  },
  roomFallback: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  fallbackTitle: {
    color: '#14231F',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  roomRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(20,35,31,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  roomCover: {
    borderRadius: 4,
    height: 64,
    width: 43,
  },
  roomCopy: {
    flex: 1,
    marginLeft: 10,
  },
  roomTitle: {
    color: '#14231F',
    fontSize: 15,
    fontWeight: '700',
  },
  roomAuthor: {
    color: '#737B73',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  roomArrow: {
    color: '#8C3E38',
    fontSize: 22,
    fontWeight: '700',
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverFallbackText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
  },
});
