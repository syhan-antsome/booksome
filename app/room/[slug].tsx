import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms } from '../../src/data/rooms';
import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import {
  createRoomComment,
  createRoomPost,
  getRoomDetail,
  joinRoom,
  listRoomPosts,
  togglePostReaction,
  type RoomDetail,
  type RoomPost,
} from '../../src/services/rooms';

type RoomTab = 'talk' | 'reading' | 'info';

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<RoomTab>('talk');
  const [remoteRoom, setRemoteRoom] = useState<RoomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [postBody, setPostBody] = useState('');
  const [postKind, setPostKind] = useState<'impression' | 'question'>('impression');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const fallbackRoom = featuredRooms.find((item) => item.slug === slug) ?? featuredRooms[0];

  const refreshRoom = async () => {
    if (!slug) return;
    const room = await getRoomDetail(slug, session?.user.id);
    setRemoteRoom(room);

    if (room) {
      const nextPosts = await listRoomPosts(room.id, session?.user.id);
      setPosts(nextPosts);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!slug) {
      setIsLoading(false);
      return;
    }

    getRoomDetail(slug, session?.user.id)
      .then(async (room) => {
        if (isMounted) {
          setRemoteRoom(room);
        }

        if (room) {
          const nextPosts = await listRoomPosts(room.id, session?.user.id);
          if (isMounted) {
            setPosts(nextPosts);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setRemoteRoom(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id, slug]);

  const handleJoinRoom = async () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    if (!remoteRoom) {
      setActionMessage('리딩룸 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    if (remoteRoom.viewerRole) {
      setActionMessage('이미 이 리딩룸에 참여 중입니다.');
      return;
    }

    setIsJoining(true);
    setActionMessage(null);

    try {
      await joinRoom(remoteRoom.id);
      await refreshRoom();
      setActionMessage('리딩룸에 참여했습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '리딩룸 참여에 실패했습니다.'));
    } finally {
      setIsJoining(false);
    }
  };

  const ensureCanInteract = () => {
    if (!session) {
      router.push('/auth');
      return false;
    }

    if (!remoteRoom?.viewerRole) {
      setActionMessage('먼저 리딩룸에 참여해야 반응할 수 있습니다.');
      return false;
    }

    return true;
  };

  const handleToggleReaction = async (post: RoomPost) => {
    if (!ensureCanInteract() || !session) return;

    setReactingPostId(post.id);
    setActionMessage(null);

    try {
      await togglePostReaction(post.id, session.user.id, post.viewerReacted);
      await refreshRoom();
    } catch (error) {
      setActionMessage(getErrorMessage(error, '공감 처리에 실패했습니다.'));
    } finally {
      setReactingPostId(null);
    }
  };

  const handleCreateComment = async (postId: string) => {
    if (!ensureCanInteract() || !session) return;

    const body = commentDrafts[postId]?.trim();
    if (!body) {
      setActionMessage('댓글 내용을 입력해주세요.');
      return;
    }

    setCommentingPostId(postId);
    setActionMessage(null);

    try {
      await createRoomComment({
        postId,
        authorId: session.user.id,
        body,
      });
      setCommentDrafts((drafts) => ({ ...drafts, [postId]: '' }));
      await refreshRoom();
      setActionMessage('댓글을 남겼습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '댓글 작성에 실패했습니다.'));
    } finally {
      setCommentingPostId(null);
    }
  };

  const handleCreatePost = async () => {
    if (!session) {
      router.push('/auth');
      return;
    }

    if (!remoteRoom) {
      setActionMessage('리딩룸 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    if (!remoteRoom.viewerRole) {
      setActionMessage('먼저 리딩룸에 참여해야 글을 남길 수 있습니다.');
      return;
    }

    if (!postBody.trim()) {
      setActionMessage('남길 내용을 입력해주세요.');
      return;
    }

    setIsPosting(true);
    setActionMessage(null);

    try {
      await createRoomPost({
        roomId: remoteRoom.id,
        authorId: session.user.id,
        kind: postKind,
        body: postBody,
      });
      setPostBody('');
      await refreshRoom();
      setActionMessage(postKind === 'question' ? '질문을 남겼습니다.' : '감상을 남겼습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '글 작성에 실패했습니다.'));
    } finally {
      setIsPosting(false);
    }
  };

  const room = useMemo(() => {
    if (!remoteRoom) {
      return {
        accent: fallbackRoom.accent,
        author: fallbackRoom.author,
        coverPath: null,
        description: null,
        host: fallbackRoom.host,
        members: fallbackRoom.members,
        next: fallbackRoom.next,
        question: fallbackRoom.question,
        title: fallbackRoom.title,
        viewerRole: null,
      };
    }

    return {
      accent: remoteRoom.accentColor,
      author: remoteRoom.author,
      coverPath: remoteRoom.coverPath,
      description: remoteRoom.description,
      host: remoteRoom.viewerRole === 'founder' ? 'Founder' : 'Host',
      members: remoteRoom.memberCount.toLocaleString(),
      next: remoteRoom.nextEvent ?? '첫 함께 읽기 일정을 준비해보세요.',
      question: remoteRoom.pinnedQuestion ?? '이 책은 당신에게 어떤 질문을 남겼나요?',
      title: remoteRoom.title,
      viewerRole: remoteRoom.viewerRole,
    };
  }, [fallbackRoom, remoteRoom]);

  const coverUrl = room.coverPath ? getMediaUrl(room.coverPath) : null;
  const isMember = Boolean(room.viewerRole);
  const isCompact = width < 430;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.topStatus}>{isLoading ? '불러오는 중' : isMember ? '참여중' : '열린 리딩룸'}</Text>
        </View>

        <View style={styles.heroStage}>
          <View style={[styles.heroColorBlock, { backgroundColor: room.accent }]} />
          <View style={styles.heroSunPatch} />
          <View style={styles.heroLineOne} />
          <View style={styles.heroLineTwo} />
          <View style={[styles.coverStack, isCompact ? styles.coverStackCompact : null]}>
            <View style={styles.coverBack} />
            <View style={[styles.bookCover, { backgroundColor: room.accent }]}>
              {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.bookCoverImage} /> : null}
              <View style={styles.bookCoverShade} />
            </View>
          </View>
          <View style={[styles.heroCopy, isCompact ? styles.heroCopyCompact : null]}>
            <View style={styles.roomSticker}>
              <Text style={styles.roomStickerText}>BOOKSOME CLUB</Text>
            </View>
            <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>{room.title}</Text>
            <Text style={styles.heroAuthor}>{room.author}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{room.host}</Text>
              <Text style={styles.heroMetaDot}>/</Text>
              <Text style={styles.heroMetaText}>{room.members} readers</Text>
            </View>
          </View>
        </View>

        <View style={styles.moodRail}>
          <View style={[styles.moodChip, styles.moodChipBlue]}>
            <Text style={styles.moodLabel}>오늘의 질문</Text>
            <Text style={styles.moodValue}>열림</Text>
          </View>
          <View style={[styles.moodChip, styles.moodChipYellow]}>
            <Text style={styles.moodLabel}>대화 온도</Text>
            <Text style={styles.moodValue}>따뜻함</Text>
          </View>
          <View style={[styles.moodChip, styles.moodChipGreen]}>
            <Text style={styles.moodLabel}>읽는 사람</Text>
            <Text style={styles.moodValue}>{room.members}</Text>
          </View>
        </View>

        <View style={styles.joinNote}>
          <View style={styles.joinTape} />
          <View style={styles.joinCopy}>
            <Text style={styles.joinTitle}>{isMember ? '이 방에 참여 중입니다' : '이야기에 참여해보세요'}</Text>
            <Text style={styles.joinText}>
              {isMember ? '감상, 질문, 댓글, 공감이 열려 있습니다.' : '참여하면 감상과 질문을 남길 수 있습니다.'}
            </Text>
          </View>
          <Pressable
            disabled={isJoining || isMember}
            onPress={handleJoinRoom}
            style={[styles.joinButton, isMember ? styles.joinButtonDisabled : null]}
          >
            <Text style={[styles.joinButtonText, isMember ? styles.joinButtonTextDisabled : null]}>
              {isMember ? '참여 중' : isJoining ? '참여 중...' : '참여'}
            </Text>
          </Pressable>
        </View>

        {actionMessage ? (
          <View style={styles.messagePanel}>
            <Text style={styles.messageText}>{actionMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {[
            { key: 'talk', label: '이야기' },
            { key: 'reading', label: '함께읽기' },
            { key: 'info', label: '정보' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as RoomTab)}
              style={[styles.tabButton, activeTab === tab.key ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'talk' ? (
          <View style={styles.tabPanel}>
            <View style={styles.pinnedQuestion}>
              <View style={styles.questionBadge}>
                <Text style={styles.questionBadgeText}>QUESTION</Text>
              </View>
              <Text style={styles.question}>{room.question}</Text>
            </View>

            <View style={styles.composer}>
              <View style={styles.composerHeader}>
                <View>
                  <Text style={styles.sectionLabel}>MOOD NOTE</Text>
                  <Text style={styles.composerTitle}>감상과 질문 남기기</Text>
                </View>
                <Text style={styles.composerState}>{isMember ? '참여 중' : '참여 필요'}</Text>
              </View>
              <View style={styles.segmented}>
                <Pressable
                  onPress={() => setPostKind('impression')}
                  style={[styles.segmentButton, postKind === 'impression' ? styles.segmentButtonActive : null]}
                >
                  <Text style={[styles.segmentText, postKind === 'impression' ? styles.segmentTextActive : null]}>
                    감상
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPostKind('question')}
                  style={[styles.segmentButton, postKind === 'question' ? styles.segmentButtonActive : null]}
                >
                  <Text style={[styles.segmentText, postKind === 'question' ? styles.segmentTextActive : null]}>
                    질문
                  </Text>
                </Pressable>
              </View>
              <TextInput
                multiline
                onChangeText={setPostBody}
                placeholder={isMember ? '이 책이 지금 남긴 생각을 적어보세요.' : '참여 후 감상과 질문을 남길 수 있습니다.'}
                placeholderTextColor="#8F877B"
                style={styles.postInput}
                value={postBody}
              />
              <Pressable disabled={isPosting} onPress={handleCreatePost} style={styles.postButton}>
                <Text style={styles.postButtonText}>{isPosting ? '등록 중...' : '남기기'}</Text>
              </Pressable>
            </View>

            <View style={styles.postsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 이야기</Text>
                <Text style={styles.sectionCount}>{posts.length}</Text>
              </View>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View
                      style={[
                        styles.postSpine,
                        post.kind === 'question' ? styles.postSpineQuestion : styles.postSpineImpression,
                      ]}
                    />
                    <View style={styles.postMetaRow}>
                      <Text style={styles.postKind}>{post.kind === 'question' ? '질문' : '감상'}</Text>
                      <Text style={styles.postAuthor}>{post.authorName ?? 'Reader'}</Text>
                    </View>
                    <Text style={styles.postBody}>{post.body}</Text>
                    <View style={styles.postActions}>
                      <Pressable
                        disabled={reactingPostId === post.id}
                        onPress={() => handleToggleReaction(post)}
                        style={[styles.reactionButton, post.viewerReacted ? styles.reactionButtonActive : null]}
                      >
                        <Text style={[styles.reactionText, post.viewerReacted ? styles.reactionTextActive : null]}>
                          공감 {post.reactionCount}
                        </Text>
                      </Pressable>
                    </View>
                    {post.comments.length > 0 ? (
                      <View style={styles.commentsList}>
                        {post.comments.map((comment) => (
                          <View key={comment.id} style={styles.commentItem}>
                            <Text style={styles.commentAuthor}>{comment.authorName ?? 'Reader'}</Text>
                            <Text style={styles.commentBody}>{comment.body}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.commentComposer}>
                      <TextInput
                        onChangeText={(text) => setCommentDrafts((drafts) => ({ ...drafts, [post.id]: text }))}
                        placeholder={isMember ? '댓글을 남겨보세요.' : '참여 후 댓글을 남길 수 있습니다.'}
                        placeholderTextColor="#8F877B"
                        style={styles.commentInput}
                        value={commentDrafts[post.id] ?? ''}
                      />
                      <Pressable
                        disabled={commentingPostId === post.id}
                        onPress={() => handleCreateComment(post.id)}
                        style={styles.commentButton}
                      >
                        <Text style={styles.commentButtonText}>{commentingPostId === post.id ? '등록' : '댓글'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyText}>아직 첫 감상이 기다리고 있습니다.</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {activeTab === 'reading' ? (
          <View style={styles.tabPanel}>
            <View style={styles.readingLead}>
              <Text style={styles.sectionLabel}>Now</Text>
              <Text style={styles.readingTitle}>{room.next}</Text>
              <Text style={styles.readingCopy}>함께 읽기 일정과 챕터별 토론은 이곳에서 관리됩니다.</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineTime}>Next</Text>
              <Text style={styles.timelineCopy}>챕터별 스포일러 보호 토론을 준비 중입니다.</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineTime}>Soon</Text>
              <Text style={styles.timelineCopy}>읽기 체크인과 참여자 진행률을 연결할 예정입니다.</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'info' ? (
          <View style={styles.tabPanel}>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>Room Note</Text>
              <Text style={styles.infoTitle}>{room.title}</Text>
              <Text style={styles.infoCopy}>{room.description ?? '아직 Room 소개가 준비되지 않았습니다.'}</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>Host</Text>
                <Text style={styles.infoCellValue}>{room.host}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>Readers</Text>
                <Text style={styles.infoCellValue}>{room.members}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>Status</Text>
                <Text style={styles.infoCellValue}>{isMember ? 'Joined' : 'Open'}</Text>
              </View>
            </View>
            <View style={styles.ruleBlock}>
              <Text style={styles.sectionLabel}>Room Rule</Text>
              <Text style={styles.ruleText}>서로의 읽는 속도를 존중하고, 스포일러가 될 수 있는 내용은 맥락을 먼저 알려주세요.</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return fallback;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF7E8',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    alignItems: 'center',
    borderColor: '#D8CEBB',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    paddingVertical: 8,
    width: 38,
  },
  backText: {
    color: '#0F6B57',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
  topStatus: {
    color: '#7A5B3A',
    fontSize: 12,
    fontWeight: '900',
  },
  heroStage: {
    minHeight: 390,
    overflow: 'hidden',
    position: 'relative',
  },
  heroColorBlock: {
    borderRadius: 8,
    bottom: 10,
    left: 0,
    opacity: 0.92,
    position: 'absolute',
    right: 0,
    top: 32,
  },
  heroSunPatch: {
    backgroundColor: '#FFD86D',
    borderRadius: 8,
    height: 96,
    opacity: 0.94,
    position: 'absolute',
    right: 18,
    top: 0,
    transform: [{ rotate: '7deg' }],
    width: 116,
  },
  heroLineOne: {
    backgroundColor: '#F7A66C',
    borderRadius: 8,
    height: 14,
    left: 22,
    position: 'absolute',
    top: 72,
    transform: [{ rotate: '-5deg' }],
    width: 124,
  },
  heroLineTwo: {
    backgroundColor: '#65B7C8',
    borderRadius: 8,
    height: 12,
    position: 'absolute',
    right: 32,
    top: 144,
    transform: [{ rotate: '8deg' }],
    width: 88,
  },
  coverStack: {
    height: 238,
    left: 24,
    position: 'absolute',
    top: 78,
    transform: [{ rotate: '-4deg' }],
    width: 166,
  },
  coverStackCompact: {
    height: 198,
    left: 18,
    top: 100,
    width: 138,
  },
  coverBack: {
    backgroundColor: '#123C54',
    borderRadius: 8,
    bottom: -10,
    left: 12,
    opacity: 0.22,
    position: 'absolute',
    right: -12,
    top: 14,
  },
  bookCover: {
    borderColor: 'rgba(255,255,255,0.68)',
    borderRadius: 8,
    borderWidth: 3,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bookCoverImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bookCoverShade: {
    backgroundColor: 'rgba(19, 31, 37, 0.12)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroCopy: {
    bottom: 34,
    left: 202,
    position: 'absolute',
    right: 18,
  },
  heroCopyCompact: {
    bottom: 42,
    left: 170,
    right: 14,
  },
  roomSticker: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7E8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    transform: [{ rotate: '2deg' }],
  },
  roomStickerText: {
    color: '#1A2D36',
    fontSize: 11,
    fontWeight: '900',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    textShadowColor: 'rgba(12, 19, 22, 0.18)',
    textShadowOffset: { height: 2, width: 0 },
    textShadowRadius: 3,
  },
  heroTitleCompact: {
    fontSize: 29,
    lineHeight: 33,
  },
  heroAuthor: {
    color: '#FFF7E8',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  heroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  heroMetaText: {
    color: '#FFF7E8',
    fontSize: 13,
    fontWeight: '900',
  },
  heroMetaDot: {
    color: '#FFD86D',
    fontSize: 14,
    fontWeight: '900',
    marginHorizontal: 8,
  },
  moodRail: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  moodChip: {
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    flex: 1,
    minHeight: 76,
    padding: 10,
  },
  moodChipBlue: {
    backgroundColor: '#DDF3F9',
  },
  moodChipYellow: {
    backgroundColor: '#FFE18A',
  },
  moodChipGreen: {
    backgroundColor: '#DDF3C4',
  },
  moodLabel: {
    color: '#6E614A',
    fontSize: 11,
    fontWeight: '900',
  },
  moodValue: {
    color: '#1A2D36',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 8,
  },
  joinNote: {
    alignItems: 'center',
    backgroundColor: '#FFEEE1',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  joinTape: {
    backgroundColor: '#65B7C8',
    bottom: 0,
    position: 'absolute',
    right: 86,
    top: 0,
    transform: [{ rotate: '7deg' }],
    width: 18,
  },
  joinCopy: {
    flex: 1,
    paddingRight: 12,
  },
  joinTitle: {
    color: '#1A2D36',
    fontSize: 15,
    fontWeight: '900',
  },
  joinText: {
    color: '#6F5D46',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 4,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#1A2D36',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 44,
    minWidth: 76,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  joinButtonDisabled: {
    backgroundColor: '#DDF3C4',
  },
  joinButtonText: {
    color: '#FFF7E8',
    fontSize: 14,
    fontWeight: '900',
  },
  joinButtonTextDisabled: {
    color: '#1A2D36',
  },
  messagePanel: {
    backgroundColor: '#DDF3F9',
    borderColor: '#1A2D36',
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 12,
    padding: 13,
  },
  messageText: {
    color: '#1A2D36',
    fontSize: 14,
    fontWeight: '800',
  },
  tabs: {
    backgroundColor: '#1A2D36',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    padding: 5,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFF7E8',
  },
  tabText: {
    color: '#FFF7E8',
    fontSize: 14,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#1A2D36',
  },
  tabPanel: {
    marginTop: 18,
  },
  pinnedQuestion: {
    backgroundColor: '#FFD3BF',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    padding: 18,
    transform: [{ rotate: '-1deg' }],
  },
  questionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7E8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  questionBadgeText: {
    color: '#B7462F',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionLabel: {
    color: '#B7462F',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    color: '#1A2D36',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 36,
  },
  composer: {
    backgroundColor: '#DDF3F9',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 24,
    padding: 16,
  },
  composerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  composerTitle: {
    color: '#1A2D36',
    fontSize: 20,
    fontWeight: '900',
  },
  composerState: {
    color: '#1A7C66',
    fontSize: 13,
    fontWeight: '900',
  },
  segmented: {
    backgroundColor: '#BEE6EF',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FF775F',
  },
  segmentText: {
    color: '#1A2D36',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  postInput: {
    backgroundColor: '#FFF7E8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    color: '#1A2D36',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 108,
    paddingHorizontal: 13,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#FF775F',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  postButtonText: {
    color: '#1A2D36',
    fontSize: 15,
    fontWeight: '900',
  },
  postsSection: {
    marginTop: 26,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#1A2D36',
    fontSize: 24,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#B7462F',
    fontSize: 14,
    fontWeight: '900',
  },
  postCard: {
    backgroundColor: '#FFFDF8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 16,
    paddingLeft: 22,
    position: 'relative',
  },
  postSpine: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 8,
  },
  postSpineQuestion: {
    backgroundColor: '#65B7C8',
  },
  postSpineImpression: {
    backgroundColor: '#FF775F',
  },
  postMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postKind: {
    backgroundColor: '#FFE18A',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    color: '#1A2D36',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  postAuthor: {
    color: '#7A5B3A',
    fontSize: 12,
    fontWeight: '900',
  },
  postBody: {
    color: '#1A2D36',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  reactionButton: {
    backgroundColor: '#DDF3C4',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reactionButtonActive: {
    backgroundColor: '#1A7C66',
  },
  reactionText: {
    color: '#1A2D36',
    fontSize: 13,
    fontWeight: '900',
  },
  reactionTextActive: {
    color: '#FFFFFF',
  },
  commentsList: {
    borderTopColor: '#1A2D36',
    borderTopWidth: 2,
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
  },
  commentItem: {
    backgroundColor: '#FFF0C7',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  commentAuthor: {
    color: '#1A7C66',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  commentBody: {
    color: '#1A2D36',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    backgroundColor: '#FFF7E8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    color: '#1A2D36',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  commentButton: {
    alignItems: 'center',
    backgroundColor: '#1A2D36',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 58,
    paddingHorizontal: 12,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  emptyPanel: {
    backgroundColor: '#FFE18A',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    padding: 18,
  },
  emptyText: {
    color: '#1A2D36',
    fontSize: 15,
    fontWeight: '800',
  },
  readingLead: {
    backgroundColor: '#DDF3C4',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    padding: 18,
  },
  readingTitle: {
    color: '#1A2D36',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
  },
  readingCopy: {
    color: '#5A634A',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 10,
  },
  timelineItem: {
    borderTopColor: '#1A2D36',
    borderTopWidth: 2,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 18,
  },
  timelineTime: {
    color: '#B7462F',
    fontSize: 13,
    fontWeight: '900',
    width: 48,
  },
  timelineCopy: {
    color: '#1A2D36',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  infoBlock: {
    backgroundColor: '#FFEEE1',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    padding: 18,
    paddingBottom: 18,
  },
  infoTitle: {
    color: '#1A2D36',
    fontSize: 26,
    fontWeight: '900',
  },
  infoCopy: {
    color: '#654B34',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 25,
    marginTop: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  infoCell: {
    backgroundColor: '#FFFDF8',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    flex: 1,
    padding: 12,
  },
  infoCellLabel: {
    color: '#7A5B3A',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoCellValue: {
    color: '#1A2D36',
    fontSize: 16,
    fontWeight: '900',
  },
  ruleBlock: {
    backgroundColor: '#DDF3F9',
    borderColor: '#1A2D36',
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 16,
    padding: 16,
  },
  ruleText: {
    color: '#1A2D36',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 23,
  },
});
