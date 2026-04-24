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
      setActionMessage('댓글로 이어갈 생각을 짧게 적어보세요.');
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
      setActionMessage(postKind === 'question' ? '떠오른 질문을 한 줄로 적어보세요.' : '책이 남긴 생각을 한 줄로 적어보세요.');
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
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.topStatus}>{isLoading ? '불러오는 중' : isMember ? '참여중' : '열린 리딩룸'}</Text>
        </View>

        <View style={styles.heroStage}>
          {coverUrl ? (
            <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.heroBackdrop} />
          ) : (
            <View style={[styles.heroFallback, { backgroundColor: room.accent }]} />
          )}
          <View style={styles.heroVeil} />
          <View style={styles.heroGlow} />
          <View style={[styles.heroCopy, isCompact ? styles.heroCopyCompact : null]}>
            <View style={styles.roomMarker}>
              <View style={styles.roomMarkerLine} />
              <Text style={styles.roomMarkerText}>BookSome Room</Text>
            </View>
            <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>{room.title}</Text>
            <Text style={styles.heroAuthor}>{room.author}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{room.host}</Text>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMetaText}>{room.members} readers</Text>
            </View>
          </View>
        </View>

        <View style={styles.roomSignal}>
          <View style={styles.signalItem}>
            <Text style={styles.signalValue}>{room.members}</Text>
            <Text style={styles.signalLabel}>참여자</Text>
          </View>
          <View style={styles.signalItem}>
            <Text style={styles.signalValue}>1</Text>
            <Text style={styles.signalLabel}>질문</Text>
          </View>
          <View style={styles.signalItem}>
            <Text style={styles.signalValue}>읽는 중</Text>
            <Text style={styles.signalLabel}>상태</Text>
          </View>
        </View>

        {!isMember ? (
          <View style={styles.joinNote}>
            <View style={styles.joinCopy}>
              <Text style={styles.joinTitle}>이야기에 참여해보세요</Text>
              <Text style={styles.joinText}>함께 읽고 생각을 나눠보세요.</Text>
            </View>
            <Pressable disabled={isJoining} onPress={handleJoinRoom} style={styles.joinButton}>
              <Text style={styles.joinButtonText}>{isJoining ? '...' : '참여'}</Text>
            </Pressable>
          </View>
        ) : null}

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
              <View style={styles.questionMarker}>
                <Text style={styles.questionNumber}>01</Text>
                <View style={styles.questionMarkerLine} />
                <Text style={styles.questionMarkerText}>오늘의 질문</Text>
              </View>
              <Text style={styles.question}>{room.question}</Text>
            </View>

            <View style={styles.composer}>
              <View style={styles.composerHeader}>
                <View>
                  <Text style={styles.sectionLabel}>새 메모</Text>
                  <Text style={styles.composerTitle}>책장을 덮기 전 남기기</Text>
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
                <Text style={styles.postButtonText}>{isPosting ? '…' : '↑'}</Text>
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
                        <Text style={[styles.reactionIcon, post.viewerReacted ? styles.reactionIconActive : null]}>
                          {post.viewerReacted ? '♥' : '♡'}
                        </Text>
                        <Text style={styles.reactionCount}>{post.reactionCount}</Text>
                      </Pressable>
                      <View style={styles.feedIconGroup}>
                        <Text style={styles.feedIcon}>✎</Text>
                        <Text style={styles.reactionCount}>{post.comments.length}</Text>
                      </View>
                      <View style={styles.feedIconSpacer} />
                      <Text style={styles.feedIcon}>↗</Text>
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
                        <Text style={styles.commentButtonText}>{commentingPostId === post.id ? '…' : '↑'}</Text>
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
    backgroundColor: '#F7F3EC',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 56,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderColor: 'rgba(35, 30, 24, 0.08)',
    borderRadius: 19,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 8,
    width: 40,
  },
  backText: {
    color: '#2E493F',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
  topStatus: {
    color: '#776E63',
    fontSize: 12,
    fontWeight: '800',
  },
  heroStage: {
    borderRadius: 0,
    marginHorizontal: -18,
    minHeight: 520,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#2A241D',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
  },
  heroBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroFallback: {
    bottom: 0,
    left: 0,
    opacity: 0.86,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroVeil: {
    backgroundColor: 'rgba(15, 13, 11, 0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroGlow: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroCopy: {
    alignItems: 'flex-start',
    bottom: 48,
    left: 22,
    position: 'absolute',
    right: 22,
  },
  heroCopyCompact: {
    bottom: 42,
  },
  roomMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roomMarkerLine: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    height: 1,
    width: 34,
  },
  roomMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 50,
  },
  heroTitleCompact: {
    fontSize: 40,
    lineHeight: 46,
  },
  heroAuthor: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  heroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '700',
  },
  heroMetaDot: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 2,
    height: 4,
    marginHorizontal: 10,
    width: 4,
  },
  roomSignal: {
    borderBottomColor: 'rgba(36,32,27,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 26,
    paddingBottom: 22,
    paddingTop: 4,
  },
  signalItem: {
    alignItems: 'center',
    flex: 1,
  },
  signalLabel: {
    color: '#92887D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  signalValue: {
    color: '#24201B',
    fontSize: 19,
    fontWeight: '900',
  },
  joinNote: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingVertical: 4,
    position: 'relative',
  },
  joinCopy: {
    flex: 1,
    paddingRight: 12,
  },
  joinTitle: {
    color: '#24201B',
    fontSize: 16,
    fontWeight: '900',
  },
  joinText: {
    color: '#83796D',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 6,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#24201B',
    borderRadius: 18,
    minHeight: 36,
    minWidth: 76,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  joinButtonDisabled: {
    backgroundColor: '#EEE7DC',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  joinButtonTextDisabled: {
    color: '#4E463C',
  },
  messagePanel: {
    backgroundColor: '#F1E9DD',
    borderRadius: 20,
    marginTop: 18,
    padding: 14,
  },
  messageText: {
    color: '#4F473D',
    fontSize: 14,
    fontWeight: '700',
  },
  tabs: {
    borderBottomColor: 'rgba(36,32,27,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: 30,
  },
  tabButton: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderBottomColor: '#24201B',
  },
  tabText: {
    color: '#8A8074',
    fontSize: 14,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#24201B',
  },
  tabPanel: {
    marginTop: 30,
  },
  pinnedQuestion: {
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  questionMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  questionNumber: {
    color: '#9A9084',
    fontSize: 13,
    fontWeight: '900',
  },
  questionMarkerLine: {
    backgroundColor: 'rgba(36,32,27,0.22)',
    height: 1,
    width: 42,
  },
  questionMarkerText: {
    color: '#746B60',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#8E7F70',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  question: {
    color: '#24201B',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 43,
  },
  composer: {
    borderTopColor: 'rgba(36,32,27,0.1)',
    borderTopWidth: 1,
    marginTop: 36,
    paddingTop: 24,
  },
  composerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  composerTitle: {
    color: '#24201B',
    fontSize: 22,
    fontWeight: '900',
  },
  composerState: {
    color: '#8E7F70',
    fontSize: 13,
    fontWeight: '800',
  },
  segmented: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 18,
    marginBottom: 16,
  },
  segmentButton: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  segmentButtonActive: {
    borderBottomColor: '#24201B',
  },
  segmentText: {
    color: '#7E7469',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#24201B',
  },
  postInput: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(36,32,27,0.08)',
    borderRadius: 22,
    borderWidth: 1,
    color: '#24201B',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 124,
    paddingHorizontal: 16,
    paddingVertical: 15,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#24201B',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginTop: 14,
    width: 48,
    alignSelf: 'flex-end',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  postsSection: {
    marginTop: 40,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#24201B',
    fontSize: 24,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#8E7F70',
    fontSize: 14,
    fontWeight: '800',
  },
  postCard: {
    borderBottomColor: 'rgba(36,32,27,0.1)',
    borderBottomWidth: 1,
    marginBottom: 0,
    overflow: 'hidden',
    paddingVertical: 22,
    position: 'relative',
  },
  postSpine: {
    display: 'none',
  },
  postSpineQuestion: {
    backgroundColor: '#7DAF9C',
  },
  postSpineImpression: {
    backgroundColor: '#BF8E63',
  },
  postMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postKind: {
    color: '#665D52',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  postAuthor: {
    color: '#8E7F70',
    fontSize: 12,
    fontWeight: '700',
  },
  postBody: {
    color: '#24201B',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 27,
  },
  postActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
  },
  reactionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
  },
  reactionButtonActive: {
    backgroundColor: 'transparent',
  },
  reactionIcon: {
    color: '#24201B',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 28,
  },
  reactionIconActive: {
    color: '#D54E47',
  },
  reactionCount: {
    color: '#675E54',
    fontSize: 13,
    fontWeight: '700',
  },
  feedIconGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
  },
  feedIcon: {
    color: '#24201B',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 28,
  },
  feedIconSpacer: {
    flex: 1,
  },
  commentsList: {
    borderTopColor: 'rgba(36,32,27,0.08)',
    borderTopWidth: 1,
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
  },
  commentItem: {
    paddingVertical: 6,
  },
  commentAuthor: {
    color: '#82776B',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  commentBody: {
    color: '#38312A',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(36,32,27,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    color: '#24201B',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  commentButton: {
    alignItems: 'center',
    backgroundColor: '#24201B',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 21,
  },
  emptyPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  emptyText: {
    color: '#82776B',
    fontSize: 15,
    fontWeight: '700',
  },
  readingLead: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#2A241D',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  readingTitle: {
    color: '#24201B',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
  },
  readingCopy: {
    color: '#82776B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 10,
  },
  timelineItem: {
    borderTopColor: 'rgba(36,32,27,0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 18,
  },
  timelineTime: {
    color: '#8E7F70',
    fontSize: 13,
    fontWeight: '800',
    width: 48,
  },
  timelineCopy: {
    color: '#38312A',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  infoBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#2A241D',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  infoTitle: {
    color: '#24201B',
    fontSize: 26,
    fontWeight: '900',
  },
  infoCopy: {
    color: '#82776B',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  infoCell: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flex: 1,
    padding: 14,
  },
  infoCellLabel: {
    color: '#8E7F70',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoCellValue: {
    color: '#24201B',
    fontSize: 16,
    fontWeight: '900',
  },
  ruleBlock: {
    backgroundColor: '#EFE8DD',
    borderRadius: 24,
    marginTop: 16,
    padding: 18,
  },
  ruleText: {
    color: '#4F473D',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
});
