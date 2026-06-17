import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import roomFallbackImage from '../../assets/home-hero-book-stacks.jpg';
import { BackButton } from '../../src/components/back-button';
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
type PostComposerKind = 'impression' | 'quote' | 'question';
type PostFilter = 'all' | PostComposerKind;

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
  const [postKind, setPostKind] = useState<PostComposerKind>('impression');
  const [postQuoteText, setPostQuoteText] = useState('');
  const [postChapterLabel, setPostChapterLabel] = useState('');
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [isAnsweringPrompt, setIsAnsweringPrompt] = useState(false);
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
      setActionMessage('북룸 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    if (remoteRoom.viewerRole) {
      setActionMessage('이미 이 책장에 머물고 있습니다.');
      return;
    }

    setIsJoining(true);
    setActionMessage(null);

    try {
      await joinRoom(remoteRoom.id);
      await refreshRoom();
      setActionMessage('이 책장에 머물기 시작했습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '책장에 들어가지 못했습니다.'));
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
      setActionMessage('먼저 이 책장에 머물러야 흔적을 남길 수 있습니다.');
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
      setActionMessage('북룸 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    if (!remoteRoom.viewerRole) {
      setActionMessage('먼저 이 책장에 머물러야 글을 남길 수 있습니다.');
      return;
    }

    const trimmedBody = postBody.trim();
    const trimmedQuote = postQuoteText.trim();
    const trimmedChapter = postChapterLabel.trim();

    if (postKind === 'quote' && !trimmedQuote) {
      setActionMessage('함께 읽고 싶은 책 속 문장을 적어보세요.');
      return;
    }

    if (postKind !== 'quote' && !trimmedBody) {
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
        body: trimmedBody || '이 문장을 함께 읽고 싶어요.',
        quoteText: postKind === 'quote' ? trimmedQuote : null,
        chapterLabel: trimmedChapter || null,
      });
      setPostBody('');
      setPostQuoteText('');
      setPostChapterLabel('');
      setIsAnsweringPrompt(false);
      await refreshRoom();
      setActionMessage(postKind === 'question' ? '질문을 남겼습니다.' : postKind === 'quote' ? '문장을 남겼습니다.' : '감상을 남겼습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '글 작성에 실패했습니다.'));
    } finally {
      setIsPosting(false);
    }
  };

  const handleAnswerPrompt = () => {
    if (!ensureCanInteract()) return;

    setPostKind('impression');
    setIsAnsweringPrompt(true);
    setActionMessage('책의 첫 질문에 이어서 생각을 남겨보세요.');
  };

  const room = useMemo(() => {
    if (!remoteRoom) {
      return {
        accent: fallbackRoom.accent,
        author: fallbackRoom.author,
        coverPath: null,
        externalCoverUrl: fallbackRoom.coverUrl ?? null,
        description: null,
        host: '첫 독자',
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
      externalCoverUrl: remoteRoom.externalCoverUrl,
      description: remoteRoom.description,
      host: remoteRoom.viewerRole === 'founder' ? '첫 독자' : remoteRoom.viewerRole ? '머무는 독자' : '열린 책장',
      members: remoteRoom.memberCount.toLocaleString(),
      next: remoteRoom.nextEvent ?? '첫 읽기 흔적을 기다리고 있습니다.',
      question: remoteRoom.pinnedQuestion ?? '이 책은 당신에게 어떤 질문을 남겼나요?',
      title: remoteRoom.title,
      viewerRole: remoteRoom.viewerRole,
    };
  }, [fallbackRoom, remoteRoom]);

  const coverUrl = room.coverPath ? getMediaUrl(room.coverPath) : room.externalCoverUrl;
  const heroSource: ImageSourcePropType = coverUrl ? { uri: coverUrl } : (roomFallbackImage as ImageSourcePropType);
  const isMember = Boolean(room.viewerRole);
  const isCompact = width < 430;
  const postCounts = useMemo(
    () => ({
      all: posts.length,
      impression: posts.filter((post) => post.kind === 'impression').length,
      quote: posts.filter((post) => post.kind === 'quote').length,
      question: posts.filter((post) => post.kind === 'question').length,
    }),
    [posts],
  );
  const visiblePosts = useMemo(
    () => (postFilter === 'all' ? posts : posts.filter((post) => post.kind === postFilter)),
    [postFilter, posts],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroStage}>
          <Image resizeMode="cover" source={heroSource} style={styles.heroBackdrop} />
          <View style={styles.heroVeil} />
          <View style={styles.heroGlow} />
          <View style={styles.heroTopBar}>
            <BackButton />
            <Text style={styles.topStatus}>{isLoading ? '불러오는 중' : isMember ? '머무는 중' : '열린 책장'}</Text>
          </View>
          <View style={styles.heroOrnament} />
          <View style={[styles.heroCopy, isCompact ? styles.heroCopyCompact : null]}>
            <View style={styles.roomMarker}>
              <Text style={styles.roomMarkerText}>BOOKROOM</Text>
              <View style={styles.roomMarkerLine} />
            </View>
            <View style={styles.heroMainRow}>
              <View style={styles.heroTextBlock}>
                <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>{room.title}</Text>
                <Text style={styles.heroAuthor}>{room.author}</Text>
              </View>
              <View style={styles.heroPoster}>
                <Image resizeMode="cover" source={heroSource} style={styles.heroPosterImage} />
              </View>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{room.host}</Text>
              <View style={styles.heroMetaDot} />
              <Text style={styles.heroMetaText}>{room.members}명의 독자</Text>
            </View>
          </View>
        </View>

        {!isMember ? (
          <View style={styles.joinNote}>
            <View style={styles.joinCopy}>
              <Text style={styles.joinTitle}>이 책장에 머물러보세요</Text>
              <Text style={styles.joinText}>감상, 문장, 질문을 이 책에 남길 수 있습니다.</Text>
            </View>
            <Pressable disabled={isJoining} onPress={handleJoinRoom} style={styles.joinButton}>
              <Text style={styles.joinButtonText}>{isJoining ? '...' : '머물기'}</Text>
            </Pressable>
          </View>
        ) : null}

        {actionMessage ? (
          <View style={styles.messagePanel}>
            <Text style={styles.messageText}>{actionMessage}</Text>
          </View>
        ) : null}

        <View style={styles.roomSheetIntro}>
          <Text style={styles.roomSheetEyebrow}>책이 중심인 북룸</Text>
          <Text style={styles.roomSheetTitle}>질문을 따라 읽고, 문장을 따라 만납니다.</Text>
        </View>

        <View style={styles.tabs}>
          {[
            { key: 'talk', label: '대화', number: 'Talk' },
            { key: 'reading', label: '읽기', number: 'Read' },
            { key: 'info', label: '노트', number: 'Note' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as RoomTab)}
              style={[styles.tabButton, activeTab === tab.key ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabNumber, activeTab === tab.key ? styles.tabNumberActive : null]}>
                {tab.number}
              </Text>
              <Text style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : null]}>
                {tab.label}
              </Text>
              {activeTab === tab.key ? <View style={styles.tabActiveLine} /> : null}
            </Pressable>
          ))}
        </View>

        {activeTab === 'talk' ? (
          <View style={styles.tabPanel}>
            <View style={styles.pinnedQuestion}>
              <View style={styles.questionPrelude}>
                <View style={styles.questionNumberBlock}>
                  <Text style={styles.questionNumber}>첫</Text>
                  <Text style={styles.questionNumberSub}>문장</Text>
                </View>
                <View style={styles.questionMarker}>
                  <View style={styles.questionMarkerLine} />
                  <Text style={styles.questionMarkerText}>책이 남긴 첫 질문</Text>
                </View>
              </View>
              <Text style={styles.questionQuote}>“</Text>
              <Text style={styles.question}>{room.question}</Text>
              <View style={styles.questionFooter}>
                <Text style={styles.questionIntent}>이 질문에서 이 책의 첫 대화가 시작됩니다.</Text>
                <Pressable onPress={handleAnswerPrompt} style={styles.questionReplyButton}>
                  <Text style={styles.questionReplyText}>답해보기</Text>
                  <Text style={styles.questionReplyArrow}>↑</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.composer}>
              <View style={styles.composerHeader}>
                <View>
                  <Text style={styles.sectionLabel}>내 문장</Text>
                  <Text style={styles.composerTitle}>책장을 덮기 전 남기기</Text>
                </View>
                <Text style={styles.composerState}>{isMember ? '머무는 중' : '머문 뒤 가능'}</Text>
              </View>
              <View style={styles.segmented}>
                {[
                  { key: 'impression', label: '감상' },
                  { key: 'quote', label: '문장' },
                  { key: 'question', label: '질문' },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setPostKind(item.key as PostComposerKind)}
                    style={[styles.segmentButton, postKind === item.key ? styles.segmentButtonActive : null]}
                  >
                    <Text style={[styles.segmentText, postKind === item.key ? styles.segmentTextActive : null]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                onChangeText={setPostChapterLabel}
                placeholder="쪽 / 챕터 / 장면"
                placeholderTextColor="#8F877B"
                style={styles.chapterInput}
                value={postChapterLabel}
              />
              {postKind === 'quote' ? (
                <TextInput
                  multiline
                  onChangeText={setPostQuoteText}
                  placeholder={isMember ? '함께 읽고 싶은 책 속 문장' : '책장에 머문 뒤 문장을 남길 수 있습니다.'}
                  placeholderTextColor="#CBBDA7"
                  style={styles.quoteInput}
                  value={postQuoteText}
                />
              ) : null}
              <TextInput
                multiline
                onChangeText={setPostBody}
                placeholder={getPostBodyPlaceholder(postKind, isMember, isAnsweringPrompt)}
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
                <View>
                  <Text style={styles.sectionLabel}>Book traces</Text>
                  <Text style={styles.sectionTitle}>이 책에 남은 문장들</Text>
                </View>
                <Text style={styles.sectionCount}>{posts.length}</Text>
              </View>
              <View style={styles.postFilterBar}>
                {[
                  { key: 'all', label: '전체', count: postCounts.all },
                  { key: 'impression', label: '감상', count: postCounts.impression },
                  { key: 'quote', label: '문장', count: postCounts.quote },
                  { key: 'question', label: '질문', count: postCounts.question },
                ].map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setPostFilter(item.key as PostFilter)}
                    style={[styles.postFilterButton, postFilter === item.key ? styles.postFilterButtonActive : null]}
                  >
                    <Text style={[styles.postFilterText, postFilter === item.key ? styles.postFilterTextActive : null]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.postFilterCount, postFilter === item.key ? styles.postFilterCountActive : null]}>
                      {item.count}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {visiblePosts.length > 0 ? (
                visiblePosts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View
                      style={[
                        styles.postSpine,
                        post.kind === 'question'
                          ? styles.postSpineQuestion
                          : post.kind === 'quote'
                            ? styles.postSpineQuote
                            : styles.postSpineImpression,
                      ]}
                    />
                    <View style={styles.postMetaRow}>
                      <View style={styles.postMetaLeft}>
                        <Text style={styles.postKind}>{getPostKindLabel(post.kind)}</Text>
                        {post.chapterLabel ? <Text style={styles.postChapter}>{post.chapterLabel}</Text> : null}
                      </View>
                      <Text style={styles.postAuthor}>{post.authorName ?? '독자'}</Text>
                    </View>
                    {post.quoteText ? (
                      <View style={styles.postQuoteBox}>
                        <Text style={styles.postQuoteText}>“{post.quoteText}”</Text>
                      </View>
                    ) : null}
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
                            <Text style={styles.commentAuthor}>{comment.authorName ?? '독자'}</Text>
                            <Text style={styles.commentBody}>{comment.body}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.commentComposer}>
                      <TextInput
                        onChangeText={(text) => setCommentDrafts((drafts) => ({ ...drafts, [post.id]: text }))}
                        placeholder={isMember ? '댓글을 남겨보세요.' : '책장에 머문 뒤 댓글을 남길 수 있습니다.'}
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
                  <Text style={styles.emptyText}>{getEmptyPostText(postFilter)}</Text>
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
              <Text style={styles.readingCopy}>읽기 일정과 챕터별 대화는 이곳에 쌓입니다.</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineTime}>Next</Text>
              <Text style={styles.timelineCopy}>챕터별 스포일러 보호 토론을 준비 중입니다.</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineTime}>Soon</Text>
              <Text style={styles.timelineCopy}>읽기 체크인과 독자별 진행률을 연결할 예정입니다.</Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'info' ? (
          <View style={styles.tabPanel}>
            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>책장 노트</Text>
              <Text style={styles.infoTitle}>{room.title}</Text>
              <Text style={styles.infoCopy}>{room.description ?? '아직 이 책장 소개가 없습니다.'}</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>자리</Text>
                <Text style={styles.infoCellValue}>{room.host}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>독자</Text>
                <Text style={styles.infoCellValue}>{room.members}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoCellLabel}>상태</Text>
                <Text style={styles.infoCellValue}>{isMember ? '머무는 중' : '열림'}</Text>
              </View>
            </View>
            <View style={styles.ruleBlock}>
              <Text style={styles.sectionLabel}>북룸 규칙</Text>
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

function getPostKindLabel(kind: RoomPost['kind']) {
  if (kind === 'question') return '질문';
  if (kind === 'quote') return '문장';
  if (kind === 'notice') return '공지';
  return '감상';
}

function getPostBodyPlaceholder(kind: PostComposerKind, isMember: boolean, isAnsweringPrompt: boolean) {
  if (!isMember) return '책장에 머문 뒤 감상, 문장, 질문을 남길 수 있습니다.';
  if (isAnsweringPrompt) return '책의 첫 질문에 대한 생각을 적어보세요.';
  if (kind === 'question') return '이 책이 나에게 남긴 질문을 적어보세요.';
  if (kind === 'quote') return '이 문장이 왜 마음에 남았는지 적어보세요.';
  return '이 책이 지금 남긴 생각을 적어보세요.';
}

function getEmptyPostText(filter: PostFilter) {
  if (filter === 'question') return '아직 열린 질문이 없습니다.';
  if (filter === 'quote') return '아직 함께 읽을 문장이 없습니다.';
  if (filter === 'impression') return '아직 첫 감상이 기다리고 있습니다.';
  return '아직 첫 대화가 기다리고 있습니다.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EFE6DA',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 56,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topStatus: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    color: '#201B16',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroStage: {
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    marginHorizontal: -18,
    minHeight: 590,
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
  heroVeil: {
    backgroundColor: 'rgba(14, 11, 8, 0.32)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroGlow: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 18,
    position: 'absolute',
    right: 18,
    top: 18,
    zIndex: 3,
  },
  heroOrnament: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    height: 260,
    position: 'absolute',
    right: -120,
    top: 106,
    width: 260,
  },
  heroCopy: {
    alignItems: 'flex-start',
    bottom: 42,
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
    gap: 12,
    marginBottom: 18,
  },
  roomMarkerLine: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    height: 1,
    width: 54,
  },
  roomMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroMainRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 18,
    width: '100%',
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 43,
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
    fontWeight: '800',
    marginTop: 12,
  },
  heroPoster: {
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 22,
    borderWidth: 1,
    height: 148,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    width: 108,
  },
  heroPosterImage: {
    height: '100%',
    width: '100%',
  },
  heroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 22,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '900',
  },
  heroMetaDot: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 2,
    height: 4,
    marginHorizontal: 10,
    width: 4,
  },
  joinNote: {
    alignItems: 'center',
    backgroundColor: '#201B16',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -32,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
    shadowColor: '#2A241D',
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
  },
  joinCopy: {
    flex: 1,
    paddingRight: 12,
  },
  joinTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  joinText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 6,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#F4D38A',
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 78,
    paddingHorizontal: 18,
  },
  joinButtonDisabled: {
    backgroundColor: '#EEE7DC',
  },
  joinButtonText: {
    color: '#201B16',
    fontSize: 14,
    fontWeight: '900',
  },
  joinButtonTextDisabled: {
    color: '#4E463C',
  },
  messagePanel: {
    backgroundColor: '#FFF6E2',
    borderRadius: 20,
    marginTop: 18,
    padding: 14,
  },
  messageText: {
    color: '#4F473D',
    fontSize: 14,
    fontWeight: '700',
  },
  roomSheetIntro: {
    marginTop: 32,
    paddingHorizontal: 2,
  },
  roomSheetEyebrow: {
    color: '#846F5B',
    fontSize: 12,
    fontWeight: '900',
  },
  roomSheetTitle: {
    color: '#201B16',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 35,
    marginTop: 8,
  },
  tabs: {
    backgroundColor: 'rgba(32,27,22,0.08)',
    borderRadius: 26,
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
    padding: 6,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 21,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  tabButtonActive: {
    backgroundColor: '#201B16',
  },
  tabNumber: {
    color: '#938475',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  tabNumberActive: {
    color: '#F4D38A',
  },
  tabText: {
    color: '#7B6F63',
    fontSize: 15,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabActiveLine: {
    backgroundColor: '#F4D38A',
    borderRadius: 2,
    height: 4,
    marginTop: 6,
    width: 18,
  },
  tabPanel: {
    marginTop: 24,
  },
  pinnedQuestion: {
    backgroundColor: '#221A14',
    borderRadius: 34,
    marginHorizontal: -2,
    marginTop: 4,
    overflow: 'hidden',
    padding: 26,
    position: 'relative',
    shadowColor: '#2A241D',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
  },
  questionPrelude: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 26,
  },
  questionNumberBlock: {
    alignItems: 'center',
    borderColor: 'rgba(244,211,138,0.55)',
    borderRadius: 24,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  questionNumber: {
    color: '#F4D38A',
    fontSize: 18,
    fontWeight: '900',
  },
  questionNumberSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  questionMarker: {
    flex: 1,
    gap: 9,
  },
  questionMarkerLine: {
    backgroundColor: 'rgba(244,211,138,0.52)',
    height: 1,
    width: '100%',
  },
  questionMarkerText: {
    color: '#F7F3EC',
    fontSize: 13,
    fontWeight: '900',
  },
  questionQuote: {
    color: 'rgba(244,211,138,0.24)',
    fontSize: 108,
    fontWeight: '900',
    left: 20,
    lineHeight: 112,
    position: 'absolute',
    top: 76,
  },
  sectionLabel: {
    color: '#8E7F70',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 43,
    paddingLeft: 2,
    paddingTop: 12,
  },
  questionFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 18,
  },
  questionIntent: {
    color: 'rgba(255,255,255,0.68)',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  questionReplyButton: {
    alignItems: 'center',
    backgroundColor: '#F4D38A',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  questionReplyText: {
    color: '#201B16',
    fontSize: 14,
    fontWeight: '900',
  },
  questionReplyArrow: {
    color: '#201B16',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 19,
  },
  composer: {
    backgroundColor: '#FFF8EA',
    borderRadius: 30,
    marginTop: 26,
    padding: 20,
    shadowColor: '#2A241D',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  composerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  composerTitle: {
    color: '#201B16',
    fontSize: 21,
    fontWeight: '900',
  },
  composerState: {
    color: '#8E7F70',
    fontSize: 13,
    fontWeight: '800',
  },
  segmented: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(32,27,22,0.08)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  segmentButtonActive: {
    backgroundColor: '#201B16',
  },
  segmentText: {
    color: '#7E7469',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  chapterInput: {
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderColor: 'rgba(32,27,22,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    color: '#201B16',
    fontSize: 14,
    fontWeight: '800',
    height: 46,
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  quoteInput: {
    backgroundColor: '#2A2119',
    borderColor: 'rgba(244,211,138,0.24)',
    borderRadius: 24,
    borderWidth: 1,
    color: '#FFF8EA',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 10,
    minHeight: 98,
    paddingHorizontal: 18,
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  postInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(32,27,22,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    color: '#201B16',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 124,
    paddingHorizontal: 18,
    paddingVertical: 17,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
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
    marginTop: 34,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#201B16',
    fontSize: 26,
    fontWeight: '900',
  },
  sectionCount: {
    backgroundColor: 'rgba(32,27,22,0.08)',
    borderRadius: 14,
    color: '#6D5D4F',
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  postFilterBar: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 14,
  },
  postFilterButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.44)',
    borderColor: 'rgba(32,27,22,0.07)',
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  postFilterButtonActive: {
    backgroundColor: '#201B16',
    borderColor: '#201B16',
  },
  postFilterText: {
    color: '#7E7469',
    fontSize: 12,
    fontWeight: '900',
  },
  postFilterTextActive: {
    color: '#FFFFFF',
  },
  postFilterCount: {
    color: '#A08F7C',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  postFilterCountActive: {
    color: '#F4D38A',
  },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderColor: 'rgba(32,27,22,0.08)',
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 20,
    position: 'relative',
  },
  postSpine: {
    borderRadius: 2,
    bottom: 20,
    left: 0,
    position: 'absolute',
    top: 20,
    width: 4,
  },
  postSpineQuestion: {
    backgroundColor: '#7DAF9C',
  },
  postSpineQuote: {
    backgroundColor: '#F4D38A',
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
  postMetaLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  postKind: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
  },
  postChapter: {
    color: '#8E7F70',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  postAuthor: {
    color: '#8E7F70',
    fontSize: 12,
    fontWeight: '700',
  },
  postQuoteBox: {
    backgroundColor: '#221A14',
    borderColor: 'rgba(244,211,138,0.24)',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 13,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  postQuoteText: {
    color: '#FFF4D6',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 28,
  },
  postBody: {
    color: '#201B16',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 28,
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
    color: '#201B16',
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
    color: '#201B16',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 28,
  },
  feedIconSpacer: {
    flex: 1,
  },
  commentsList: {
    borderTopColor: 'rgba(32,27,22,0.08)',
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
    backgroundColor: '#FFF8EA',
    borderColor: 'rgba(32,27,22,0.08)',
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
    backgroundColor: '#201B16',
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
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 28,
    padding: 24,
  },
  emptyText: {
    color: '#82776B',
    fontSize: 15,
    fontWeight: '700',
  },
  readingLead: {
    backgroundColor: '#201B16',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#2A241D',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  readingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
  },
  readingCopy: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 10,
  },
  timelineItem: {
    borderTopColor: 'rgba(32,27,22,0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 20,
  },
  timelineTime: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    width: 48,
  },
  timelineCopy: {
    color: '#352D25',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  infoBlock: {
    borderBottomColor: 'rgba(32,27,22,0.14)',
    borderBottomWidth: 1,
    paddingBottom: 24,
  },
  infoTitle: {
    color: '#201B16',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  infoCopy: {
    color: '#6F6255',
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
    backgroundColor: 'rgba(255,255,255,0.54)',
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
    color: '#201B16',
    fontSize: 16,
    fontWeight: '900',
  },
  ruleBlock: {
    backgroundColor: '#FFF8EA',
    borderRadius: 28,
    marginTop: 16,
    padding: 20,
  },
  ruleText: {
    color: '#4F473D',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
});
