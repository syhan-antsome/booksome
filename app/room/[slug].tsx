import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, Touch as Pressable, Input as TextInput } from '../../src/components/app-ui';
import { BookObject } from '../../src/components/book-object';
import { ScreenHeader } from '../../src/components/screen-header';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import {
  createRoomComment,
  createRoomPost,
  getRoomDetail,
  joinRoom,
  listRoomPosts,
  requestRoomPostReview,
  setRoomReadingStatus,
  togglePostReaction,
  type RoomDetail,
  type RoomPost,
  type RoomReadingStatus,
} from '../../src/services/rooms';

const readingStatusOptions: {
  status: RoomReadingStatus;
  label: string;
  countKey: 'wantToRead' | 'reading' | 'finished';
}[] = [
    { status: 'want_to_read', label: '읽고 싶어요', countKey: 'wantToRead' },
    { status: 'reading', label: '읽는 중', countKey: 'reading' },
    { status: 'finished', label: '다 읽었어요', countKey: 'finished' },
  ];

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [remoteRoom, setRemoteRoom] = useState<RoomDetail | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [settingReadingStatus, setSettingReadingStatus] = useState<RoomReadingStatus | null>(null);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [postChapterLabel, setPostChapterLabel] = useState('');
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<RoomPost[]>([]);

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
      setLoadingRoom(false);
      return;
    }
    setLoadingRoom(true); setLoadError(''); setRemoteRoom(null); setPosts([]);

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
      .catch((error) => {
        if (isMounted) {
          setRemoteRoom(null);
          setLoadError(getErrorMessage(error, '책 이야기를 불러오지 못했어요.'));
        }
      }).finally(() => { if (isMounted) setLoadingRoom(false); });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id, slug, reload]);

  const hasPendingReview = posts.some(
    (post) =>
      post.visibility === 'pending' ||
      post.classificationStatus === 'pending' ||
      post.moderationStatus === 'pending',
  );

  useEffect(() => {
    if (!hasPendingReview || !remoteRoom) return;

    const intervalId = setInterval(() => {
      void refreshRoom();
    }, 4500);

    return () => clearInterval(intervalId);
  }, [hasPendingReview, remoteRoom?.id, session?.user.id, slug]);

  const ensureJoinedRoom = async () => {
    if (!session) {
      router.push('/auth');
      return false;
    }

    if (!remoteRoom) {
      setActionMessage('책 이야기 정보를 불러온 뒤 다시 시도해주세요.');
      return false;
    }

    if (remoteRoom.viewerRole) {
      return true;
    }

    setActionMessage(null);

    try {
      await joinRoom(remoteRoom.id);
      await refreshRoom();
      return true;
    } catch (error) {
      setActionMessage(getErrorMessage(error, '책 이야기를 열지 못했습니다.'));
      return false;
    }
  };

  const handleSetReadingStatus = async (status: RoomReadingStatus) => {
    if (!remoteRoom) {
      setActionMessage('책 이야기 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    if (!(await ensureJoinedRoom())) return;

    setSettingReadingStatus(status);
    setActionMessage(null);

    try {
      await setRoomReadingStatus(remoteRoom.id, status);
      await refreshRoom();
    } catch (error) {
      setActionMessage(getErrorMessage(error, '독서 반응을 남기지 못했습니다.'));
    } finally {
      setSettingReadingStatus(null);
    }
  };

  const handleToggleReaction = async (post: RoomPost) => {
    if (!isPostPublic(post)) {
      setActionMessage('잠시 뒤 공감할 수 있습니다.');
      return;
    }

    if (!(await ensureJoinedRoom()) || !session) return;

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

  const handleCreateComment = async (post: RoomPost) => {
    if (!isPostPublic(post)) {
      setActionMessage('잠시 뒤 이어 남길 수 있습니다.');
      return;
    }

    if (!(await ensureJoinedRoom()) || !session) return;

    const body = commentDrafts[post.id]?.trim();
    if (!body) {
      setActionMessage('댓글로 이어갈 생각을 짧게 적어보세요.');
      return;
    }

    setCommentingPostId(post.id);
    setActionMessage(null);

    try {
      await createRoomComment({
        postId: post.id,
        authorId: session.user.id,
        body,
      });
      setCommentDrafts((drafts) => ({ ...drafts, [post.id]: '' }));
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
      setActionMessage('책 이야기 정보를 불러온 뒤 다시 시도해주세요.');
      return;
    }

    const trimmedBody = postBody.trim();
    const trimmedChapter = postChapterLabel.trim();

    if (!trimmedBody) {
      setActionMessage('이 책에 남기고 싶은 생각을 적어보세요.');
      return;
    }

    if (!(await ensureJoinedRoom())) return;

    setIsPosting(true);
    setActionMessage(null);

    try {
      const createdPost = await createRoomPost({
        roomId: remoteRoom.id,
        authorId: session.user.id,
        body: trimmedBody,
        chapterLabel: trimmedChapter || null,
      });
      setPostBody('');
      setPostChapterLabel('');
      setIsComposerOpen(false);
      await refreshRoom();
      setActionMessage('남겼습니다. 잠시 뒤 이야기에 나타납니다.');
      requestRoomPostReview(createdPost.id, session.access_token)
        .then(() => {
          setTimeout(() => {
            void refreshRoom();
          }, 2500);
          setTimeout(() => {
            void refreshRoom();
          }, 7000);
        })
        .catch((error) => {
          console.warn('Failed to request post review.', error instanceof Error ? error.message : error);
          setActionMessage('남겼습니다. 반영이 조금 늦어지고 있습니다.');
        });
    } catch (error) {
      setActionMessage(getErrorMessage(error, '글 작성에 실패했습니다.'));
    } finally {
      setIsPosting(false);
    }
  };

  const room = useMemo(() => {
    if (!remoteRoom) {
      return {
        author: '',
        coverPath: null,
        externalCoverUrl: null,
        memberCount: 0,
        readingStatusCounts: { wantToRead: 0, reading: 0, finished: 0 },
        title: '',
        viewerReadingStatus: null,
        viewerRole: null,
      };
    }

    return {
      author: remoteRoom.author,
      coverPath: remoteRoom.coverPath,
      externalCoverUrl: remoteRoom.externalCoverUrl,
      memberCount: remoteRoom.memberCount,
      readingStatusCounts: remoteRoom.readingStatusCounts,
      title: remoteRoom.title,
      viewerReadingStatus: remoteRoom.viewerReadingStatus,
      viewerRole: remoteRoom.viewerRole,
    };
  }, [remoteRoom]);

  const coverUrl = room.coverPath ? getMediaUrl(room.coverPath) : room.externalCoverUrl;

  if (!remoteRoom) return <SafeAreaView style={styles.safeArea}><ScrollView contentContainerStyle={styles.content}><ScreenHeader title="책 이야기" />
    {loadingRoom ? <ActivityIndicator color={uiColors.accent} style={{ marginTop: 40 }} /> : <EmptyState title={loadError ? '잠시 연결이 어려워요' : '이 책 이야기를 찾지 못했어요'} copy={loadError || '책을 검색해서 이야기를 다시 찾아보세요.'} action={loadError ? '다시 불러오기' : '책 이야기로'} onAction={() => loadError ? setReload(value => value + 1) : router.replace('/rooms')} />}
  </ScrollView></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="책 이야기" />
        <View style={{ flexDirection: 'row', gap: 22, alignItems: 'center', paddingVertical: 12, marginBottom: 22 }}>
          <BookObject width={92} title={room.title} author={room.author} uri={coverUrl} />
          <View style={{ flex: 1, gap: 10 }}><Text style={{ color: uiColors.ink, fontSize: 24, lineHeight: 33, fontWeight: '700' }}>{room.title}</Text><Text style={{ color: uiColors.muted, fontSize: 14 }}>{room.author}</Text><Text style={{ color: uiColors.muted, fontSize: 12, lineHeight: 20 }}>감상을 나누고, 궁금한 장면을 물어보세요.</Text></View>
        </View>

        <View style={styles.readingResponseBar}>
          {readingStatusOptions.map((item) => {
            const isActive = room.viewerReadingStatus === item.status;
            const isUpdating = settingReadingStatus === item.status;

            return (
              <Pressable
                key={item.status}
                disabled={Boolean(settingReadingStatus)}
                onPress={() => handleSetReadingStatus(item.status)}
                style={[styles.readingResponseButton, isActive ? styles.readingResponseButtonActive : null]}
              >
                <Text style={[styles.readingResponseLabel, isActive ? styles.readingResponseLabelActive : null]}>
                  {isUpdating ? '...' : item.label}
                </Text>
                <Text style={[styles.readingResponseCount, isActive ? styles.readingResponseCountActive : null]}>
                  {room.readingStatusCounts[item.countKey]}
                </Text>
              </Pressable>
            );
          })}
        </View>


        {actionMessage ? (
          <View style={styles.messagePanel}>
            <Text style={styles.messageText}>{actionMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tabPanel}>
          <View style={styles.sectionBlock}>
            {isComposerOpen ? (
              <>
                <View style={styles.composerTopRow}>
                  <Text style={styles.composerTitle}>남기기</Text>
                  <Pressable hitSlop={10} onPress={() => setIsComposerOpen(false)}>
                    <Text style={styles.composerCloseText}>닫기</Text>
                  </Pressable>
                </View>
                <TextInput
                  onChangeText={setPostChapterLabel}
                  placeholder="쪽수나 장면"
                  placeholderTextColor={uiColors.muted}
                  style={styles.chapterInput}
                  value={postChapterLabel}
                />
                <TextInput
                  multiline
                  onChangeText={setPostBody}
                  placeholder={getPostBodyPlaceholder(Boolean(session))}
                  placeholderTextColor={uiColors.muted}
                  style={styles.postInput}
                  value={postBody}
                />
                <Pressable disabled={isPosting} onPress={handleCreatePost} style={styles.postButton}>
                  <Text style={styles.postButtonText}>{isPosting ? '…' : '남기기'}</Text>
                </Pressable>
              </>
            ) : (
              <Button title="내 생각 남기기" icon="create-outline" onPress={() => setIsComposerOpen(true)} />
            )}
            <Text style={{ color: uiColors.muted, fontSize: 12, lineHeight: 20, marginTop: 12 }}>이곳에 남긴 이야기는 다른 독자에게 공개돼요.</Text>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>이야기</Text>
              </View>
              <Text style={styles.sectionCount}>{posts.length}</Text>
            </View>
            {posts.length > 0 ? (
              posts.map((post) => {
                const postPublic = isPostPublic(post);
                const commentsOpen = expandedCommentPostId === post.id;

                return (
                  <View key={post.id} style={[styles.postCard, !postPublic ? styles.postCardPending : null]}>
                    <View style={styles.postMetaRow}>
                      <View style={styles.postMetaLeft}>
                        <View
                          style={[
                            styles.postDot,
                            post.kind === 'question'
                              ? styles.postDotQuestion
                              : post.kind === 'quote'
                                ? styles.postDotQuote
                                : styles.postDotImpression,
                          ]}
                        />
                        <Text style={[styles.postKind, !postPublic ? styles.postKindPending : null]}>
                          {getPostDisplayLabel(post)}
                        </Text>
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
                    {!postPublic ? (
                      <Text style={styles.postReviewText}>{getPostReviewText(post)}</Text>
                    ) : null}
                    <View style={styles.postActions}>
                      <Pressable
                        disabled={!postPublic || reactingPostId === post.id}
                        onPress={() => handleToggleReaction(post)}
                        style={[styles.reactionButton, post.viewerReacted ? styles.reactionButtonActive : null]}
                      >
                        <Text style={[styles.reactionIcon, post.viewerReacted ? styles.reactionIconActive : null]}>
                          {post.viewerReacted ? '♥' : '♡'}
                        </Text>
                        <Text style={styles.reactionCount}>{post.reactionCount}</Text>
                      </Pressable>
                      <Pressable
                        disabled={!postPublic}
                        onPress={() => setExpandedCommentPostId(commentsOpen ? null : post.id)}
                        style={styles.commentToggle}
                      >
                        <Text style={styles.commentToggleText}>댓글 {post.comments.length}</Text>
                      </Pressable>
                    </View>
                    {commentsOpen ? (
                      <View style={styles.commentArea}>
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
                            editable={postPublic}
                            placeholder={session ? '이어 남기기' : '로그인 후 남길 수 있습니다.'}
                            placeholderTextColor={uiColors.muted}
                            style={styles.commentInput}
                            value={commentDrafts[post.id] ?? ''}
                          />
                          <Pressable
                            disabled={!postPublic || commentingPostId === post.id}
                            onPress={() => handleCreateComment(post)}
                            style={[styles.commentButton, !postPublic ? styles.commentButtonDisabled : null]}
                          >
                            <Text style={styles.commentButtonText}>{commentingPostId === post.id ? '…' : '↑'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>아직 이야기이 없습니다.</Text>
              </View>
            )}
          </View>
        </View>
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
  return '이야기';
}

function getPostBodyPlaceholder(isLoggedIn: boolean) {
  if (!isLoggedIn) return '로그인 후 글을 남길 수 있습니다.';
  return '읽고 남은 문장이나 생각을 적어보세요.';
}

function isPostPublic(post: RoomPost) {
  return post.visibility === 'public' && post.moderationStatus === 'approved';
}

function getPostDisplayLabel(post: RoomPost) {
  if (post.moderationStatus === 'pending' || post.visibility === 'pending') return '정리중';
  if (post.moderationStatus === 'needs_review') return '정리중';
  if (post.moderationStatus === 'rejected' || post.visibility === 'hidden') return '숨김';
  if (post.classificationStatus === 'pending') return '정리중';
  if (post.classificationStatus === 'failed') return '이야기';
  return getPostKindLabel(post.kind);
}

function getPostReviewText(post: RoomPost) {
  if (post.moderationStatus === 'rejected') {
    return '이 이야기는 보이지 않게 되었습니다.';
  }

  if (post.moderationStatus === 'needs_review' || post.moderationStatus === 'failed') {
    return '잠시 정리 중입니다.';
  }

  return '잠시 정리 중입니다.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.background,
  },
  content: {
    width: '100%', maxWidth: 480, alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 52,
  },
  readingResponseBar: {
    alignItems: 'center',
    backgroundColor: uiColors.background,
    borderBottomColor: 'rgba(21,34,31,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(21,34,31,0.12)',
    borderTopWidth: 1,
    borderRadius: 0,
    flexDirection: 'row',
    gap: 0,
    marginTop: 10,
    paddingVertical: 3,
    position: 'relative',
    zIndex: 2,
  },
  readingResponseButton: {
    alignItems: 'center',
    borderRadius: 24,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  readingResponseButtonActive: {
    backgroundColor: 'transparent',
  },
  readingResponseLabel: {
    color: '#5D645F',
    fontSize: 11,
    fontWeight: '600',
  },
  readingResponseLabelActive: {
    color: uiColors.danger,
  },
  readingResponseCount: {
    color: uiColors.muted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  readingResponseCountActive: {
    color: uiColors.danger,
  },
  messagePanel: {
    backgroundColor: uiColors.line,
    borderRadius: 0,
    marginTop: 8,
    paddingHorizontal: 2,
    paddingVertical: 7,
    position: 'relative',
    zIndex: 1,
  },
  messageText: {
    color: '#4D564F',
    fontSize: 12,
    fontWeight: '500',
  },
  tabPanel: {
    marginTop: 10,
  },
  sectionBlock: {
    borderBottomColor: 'rgba(21,34,31,0.12)',
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 12,
  },
  composerTitle: {
    color: uiColors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  composerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  composerCloseText: {
    color: uiColors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  chapterInput: {
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(21,34,31,0.16)',
    borderBottomWidth: 1,
    color: uiColors.ink,
    fontSize: 13,
    fontWeight: '500',
    height: 34,
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  postInput: {
    backgroundColor: uiColors.background,
    borderColor: 'rgba(21,34,31,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    color: uiColors.ink,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    marginTop: 9,
    minWidth: 72,
    paddingHorizontal: 14,
    alignSelf: 'flex-end',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    color: uiColors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionCount: {
    color: uiColors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  postCard: {
    borderTopColor: 'rgba(21,34,31,0.10)',
    borderTopWidth: 1,
    paddingVertical: 13,
    position: 'relative',
  },
  postCardPending: {
    opacity: 0.82,
  },
  postMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  postMetaLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
  },
  postDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  postDotQuestion: {
    backgroundColor: uiColors.action,
  },
  postDotQuote: {
    backgroundColor: uiColors.action,
  },
  postDotImpression: {
    backgroundColor: uiColors.danger,
  },
  postKind: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
  postKindPending: {
    color: uiColors.action,
  },
  postChapter: {
    color: uiColors.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  postAuthor: {
    color: uiColors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  postQuoteBox: {
    borderLeftColor: 'rgba(21,34,31,0.22)',
    borderLeftWidth: 2,
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  postQuoteText: {
    color: '#3A332B',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  postBody: {
    color: uiColors.ink,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  postReviewText: {
    color: '#8A7663',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 6,
  },
  postActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 9,
  },
  reactionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 24,
  },
  reactionButtonActive: {
    backgroundColor: 'transparent',
  },
  reactionIcon: {
    color: uiColors.ink,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 20,
  },
  reactionIconActive: {
    color: uiColors.danger,
  },
  reactionCount: {
    color: '#675E54',
    fontSize: 12,
    fontWeight: '500',
  },
  commentToggle: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(21,34,31,0.22)',
    borderBottomWidth: 1,
    borderRadius: 0,
    justifyContent: 'center',
    minHeight: 24,
    paddingHorizontal: 6,
  },
  commentToggleText: {
    color: '#5D5248',
    fontSize: 11,
    fontWeight: '600',
  },
  commentArea: {
    marginTop: 2,
  },
  commentsList: {
    borderTopColor: 'rgba(32,27,22,0.08)',
    borderTopWidth: 1,
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
  },
  commentItem: {
    paddingVertical: 3,
  },
  commentAuthor: {
    color: '#82776B',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  commentBody: {
    color: '#38312A',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: uiColors.background,
    borderColor: 'rgba(21,34,31,0.10)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#24201B',
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    minHeight: 36,
    paddingHorizontal: 9,
  },
  commentButton: {
    alignItems: 'center',
    backgroundColor: uiColors.action,
    borderRadius: 24,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  commentButtonDisabled: {
    backgroundColor: uiColors.line,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 17,
  },
  emptyPanel: {
    borderTopColor: 'rgba(21,34,31,0.10)',
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  emptyText: {
    color: '#707870',
    fontSize: 13,
    fontWeight: '400',
  },
});
