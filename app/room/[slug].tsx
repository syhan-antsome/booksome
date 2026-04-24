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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.topStatus}>{isLoading ? '불러오는 중' : isMember ? '참여중' : '열린 리딩룸'}</Text>
        </View>

        <View style={[styles.hero, { backgroundColor: room.accent }]}>
          {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.heroImage} /> : null}
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <Text style={styles.kicker}>BookSome Room</Text>
            <Text style={styles.heroTitle}>{room.title}</Text>
            <Text style={styles.heroAuthor}>{room.author}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{room.host}</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.heroMetaText}>{room.members} readers</Text>
            </View>
          </View>
        </View>

        <View style={styles.joinStrip}>
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
            <Text style={styles.joinButtonText}>{isMember ? '참여 중' : isJoining ? '참여 중...' : '참여'}</Text>
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
              <Text style={styles.sectionLabel}>Pinned Question</Text>
              <Text style={styles.question}>{room.question}</Text>
            </View>

            <View style={styles.composer}>
              <View style={styles.composerHeader}>
                <View>
                  <Text style={styles.sectionLabel}>Write</Text>
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
                    <View style={styles.postMetaRow}>
                      <Text style={styles.postKind}>{post.kind === 'question' ? 'Question' : 'Impression'}</Text>
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
    backgroundColor: '#F3EFE5',
  },
  content: {
    padding: 16,
    paddingBottom: 44,
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
    color: '#7B756A',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hero: {
    borderRadius: 8,
    justifyContent: 'flex-end',
    minHeight: 366,
    overflow: 'hidden',
  },
  heroImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroShade: {
    backgroundColor: 'rgba(10, 15, 15, 0.46)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroContent: {
    padding: 22,
  },
  kicker: {
    color: '#D8B765',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 48,
  },
  heroAuthor: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 9,
  },
  heroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 18,
  },
  heroMetaText: {
    color: '#F7F2EA',
    fontSize: 13,
    fontWeight: '900',
  },
  metaDivider: {
    backgroundColor: 'rgba(255,255,255,0.36)',
    height: 16,
    marginHorizontal: 12,
    width: 1,
  },
  joinStrip: {
    alignItems: 'center',
    backgroundColor: '#101616',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 14,
  },
  joinCopy: {
    flex: 1,
    paddingRight: 12,
  },
  joinTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  joinText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#D8B765',
    borderRadius: 8,
    minHeight: 44,
    minWidth: 76,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  joinButtonDisabled: {
    backgroundColor: '#46514E',
  },
  joinButtonText: {
    color: '#101616',
    fontSize: 14,
    fontWeight: '900',
  },
  messagePanel: {
    backgroundColor: '#E6F0EA',
    borderLeftColor: '#0F6B57',
    borderLeftWidth: 4,
    borderRadius: 8,
    marginTop: 12,
    padding: 13,
  },
  messageText: {
    color: '#17493E',
    fontSize: 14,
    fontWeight: '800',
  },
  tabs: {
    backgroundColor: '#E7DFD0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
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
    backgroundColor: '#101616',
  },
  tabText: {
    color: '#5C574E',
    fontSize: 14,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabPanel: {
    marginTop: 16,
  },
  pinnedQuestion: {
    borderBottomColor: '#D8CEBB',
    borderBottomWidth: 1,
    paddingBottom: 18,
  },
  sectionLabel: {
    color: '#A9533B',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    color: '#101616',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 35,
  },
  composer: {
    backgroundColor: '#FFFDF8',
    borderColor: '#DCD2C0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  composerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  composerTitle: {
    color: '#101616',
    fontSize: 20,
    fontWeight: '900',
  },
  composerState: {
    color: '#0F6B57',
    fontSize: 13,
    fontWeight: '900',
  },
  segmented: {
    backgroundColor: '#EFE7D8',
    borderRadius: 8,
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
    backgroundColor: '#0F6B57',
  },
  segmentText: {
    color: '#5C574E',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  postInput: {
    backgroundColor: '#F6F0E5',
    borderColor: '#DED3C1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101616',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 108,
    paddingHorizontal: 13,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#101616',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  postButtonText: {
    color: '#FFFFFF',
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
    color: '#101616',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#A9533B',
    fontSize: 14,
    fontWeight: '900',
  },
  postCard: {
    backgroundColor: '#FFFDF8',
    borderColor: '#DCD2C0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postKind: {
    color: '#A9533B',
    fontSize: 12,
    fontWeight: '900',
  },
  postAuthor: {
    color: '#7B756A',
    fontSize: 12,
    fontWeight: '800',
  },
  postBody: {
    color: '#101616',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 14,
  },
  reactionButton: {
    backgroundColor: '#EFE7D8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reactionButtonActive: {
    backgroundColor: '#0F6B57',
  },
  reactionText: {
    color: '#0F6B57',
    fontSize: 13,
    fontWeight: '900',
  },
  reactionTextActive: {
    color: '#FFFFFF',
  },
  commentsList: {
    borderTopColor: '#E8DECD',
    borderTopWidth: 1,
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
  },
  commentItem: {
    backgroundColor: '#F6F0E5',
    borderRadius: 8,
    padding: 12,
  },
  commentAuthor: {
    color: '#0F6B57',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  commentBody: {
    color: '#101616',
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
    backgroundColor: '#F6F0E5',
    borderColor: '#DED3C1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101616',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  commentButton: {
    alignItems: 'center',
    backgroundColor: '#101616',
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
    backgroundColor: '#E7DFD0',
    borderRadius: 8,
    padding: 18,
  },
  emptyText: {
    color: '#5C574E',
    fontSize: 15,
    fontWeight: '800',
  },
  readingLead: {
    backgroundColor: '#101616',
    borderRadius: 8,
    padding: 18,
  },
  readingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
  },
  readingCopy: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  timelineItem: {
    borderTopColor: '#D8CEBB',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 18,
  },
  timelineTime: {
    color: '#A9533B',
    fontSize: 13,
    fontWeight: '900',
    width: 48,
  },
  timelineCopy: {
    color: '#373D3A',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  infoBlock: {
    borderBottomColor: '#D8CEBB',
    borderBottomWidth: 1,
    paddingBottom: 18,
  },
  infoTitle: {
    color: '#101616',
    fontSize: 26,
    fontWeight: '900',
  },
  infoCopy: {
    color: '#4E554F',
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
    borderColor: '#DCD2C0',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  infoCellLabel: {
    color: '#7B756A',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoCellValue: {
    color: '#101616',
    fontSize: 16,
    fontWeight: '900',
  },
  ruleBlock: {
    backgroundColor: '#E7DFD0',
    borderRadius: 8,
    marginTop: 16,
    padding: 16,
  },
  ruleText: {
    color: '#373D3A',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 23,
  },
});
