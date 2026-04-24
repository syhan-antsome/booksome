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
  createRoomPost,
  getRoomDetail,
  joinRoom,
  listRoomPosts,
  type RoomDetail,
  type RoomPost,
} from '../../src/services/rooms';

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useAuth();
  const [remoteRoom, setRemoteRoom] = useState<RoomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [postBody, setPostBody] = useState('');
  const [postKind, setPostKind] = useState<'impression' | 'question'>('impression');
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const fallbackRoom = featuredRooms.find((item) => item.slug === slug) ?? featuredRooms[0];

  const refreshRoom = async () => {
    if (!slug) return;
    const room = await getRoomDetail(slug, session?.user.id);
    setRemoteRoom(room);

    if (room) {
      const nextPosts = await listRoomPosts(room.id);
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
          const nextPosts = await listRoomPosts(room.id);
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
      const nextRoom = await getRoomDetail(remoteRoom.slug, session.user.id);
      setRemoteRoom(nextRoom);
      setActionMessage('리딩룸에 참여했습니다.');
    } catch (error) {
      setActionMessage(getErrorMessage(error, '리딩룸 참여에 실패했습니다.'));
    } finally {
      setIsJoining(false);
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
      };
    }

    return {
      accent: remoteRoom.accentColor,
      author: remoteRoom.author,
      coverPath: remoteRoom.coverPath,
      description: remoteRoom.description,
      host: 'Founder',
      members: remoteRoom.memberCount.toLocaleString(),
      next: remoteRoom.nextEvent ?? '첫 함께 읽기 일정을 준비해보세요.',
      question: remoteRoom.pinnedQuestion ?? '이 책은 당신에게 어떤 질문을 남겼나요?',
      title: remoteRoom.title,
      viewerRole: remoteRoom.viewerRole,
    };
  }, [fallbackRoom, remoteRoom]);

  const coverUrl = room.coverPath ? getMediaUrl(room.coverPath) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={[styles.cover, { backgroundColor: room.accent }]}>
          {coverUrl ? <Image source={{ uri: coverUrl }} style={styles.coverImage} /> : null}
          <View style={coverUrl ? styles.coverOverlay : null} />
          <Text style={styles.coverLabel}>Book Room</Text>
          <Text style={styles.coverTitle}>{room.title}</Text>
          <Text style={styles.coverAuthor}>{room.author}</Text>
        </View>

        <View style={styles.hostRow}>
          <View>
            <Text style={styles.hostLabel}>Host</Text>
            <Text style={styles.hostName}>{room.host}</Text>
          </View>
          <View style={styles.memberBadge}>
            <Text style={styles.memberCount}>{room.members}</Text>
            <Text style={styles.memberLabel}>readers</Text>
          </View>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.blockLabel}>Pinned Question</Text>
          <Text style={styles.question}>{room.question}</Text>
          {room.description ? <Text style={styles.description}>{room.description}</Text> : null}
        </View>

        <View style={styles.composer}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>감상과 질문 남기기</Text>
            <Text style={styles.composerState}>{room.viewerRole ? '참여 중' : '참여 필요'}</Text>
          </View>
          <View style={styles.segmented}>
            <Pressable
              onPress={() => setPostKind('impression')}
              style={[styles.segmentButton, postKind === 'impression' ? styles.segmentButtonActive : null]}
            >
              <Text
                style={[
                  styles.segmentText,
                  postKind === 'impression' ? styles.segmentTextActive : null,
                ]}
              >
                감상
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPostKind('question')}
              style={[styles.segmentButton, postKind === 'question' ? styles.segmentButtonActive : null]}
            >
              <Text
                style={[
                  styles.segmentText,
                  postKind === 'question' ? styles.segmentTextActive : null,
                ]}
              >
                질문
              </Text>
            </Pressable>
          </View>
          <TextInput
            multiline
            onChangeText={setPostBody}
            placeholder={
              room.viewerRole
                ? '이 책이 지금 남긴 생각을 적어보세요.'
                : '참여 후 감상과 질문을 남길 수 있습니다.'
            }
            placeholderTextColor="#A49B8D"
            style={styles.postInput}
            value={postBody}
          />
          <Pressable disabled={isPosting} onPress={handleCreatePost} style={styles.postButton}>
            <Text style={styles.postButtonText}>{isPosting ? '등록 중...' : '남기기'}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={isJoining || Boolean(room.viewerRole)}
            onPress={handleJoinRoom}
            style={[styles.primaryAction, room.viewerRole ? styles.primaryActionDisabled : null]}
          >
            <Text style={styles.primaryActionText}>
              {room.viewerRole ? '참여 중' : isJoining ? '참여 중...' : '리딩룸 참여'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Room 공유</Text>
          </Pressable>
        </View>

        {actionMessage ? (
          <View style={styles.messagePanel}>
            <Text style={styles.messageText}>{actionMessage}</Text>
          </View>
        ) : null}

        <View style={styles.postsSection}>
          <Text style={styles.timelineTitle}>최근 이야기</Text>
          {posts.length > 0 ? (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postMetaRow}>
                  <Text style={styles.postKind}>{post.kind === 'question' ? 'Question' : 'Impression'}</Text>
                  <Text style={styles.postAuthor}>{post.authorName ?? 'Reader'}</Text>
                </View>
                <Text style={styles.postBody}>{post.body}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyPostsText}>아직 첫 감상이 기다리고 있습니다.</Text>
            </View>
          )}
        </View>

        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>{isLoading ? '불러오는 중' : '함께 읽기'}</Text>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineTime}>Now</Text>
            <Text style={styles.timelineCopy}>{room.next}</Text>
          </View>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineTime}>Next</Text>
            <Text style={styles.timelineCopy}>챕터별 스포일러 보호 토론을 준비 중입니다.</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingVertical: 8,
  },
  backText: {
    color: '#116653',
    fontSize: 15,
    fontWeight: '900',
  },
  cover: {
    borderRadius: 30,
    overflow: 'hidden',
    minHeight: 330,
    padding: 26,
    justifyContent: 'flex-end',
  },
  coverImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coverOverlay: {
    backgroundColor: 'rgba(13, 24, 25, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coverLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0,
  },
  coverAuthor: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  hostRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  hostLabel: {
    color: '#7A7167',
    fontSize: 13,
    fontWeight: '800',
  },
  hostName: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  memberBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minWidth: 90,
    padding: 12,
  },
  memberCount: {
    color: '#116653',
    fontSize: 20,
    fontWeight: '900',
  },
  memberLabel: {
    color: '#7A7167',
    fontSize: 12,
    fontWeight: '800',
  },
  questionBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 22,
    padding: 22,
  },
  blockLabel: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  question: {
    color: '#142326',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 33,
  },
  description: {
    color: '#5E6766',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 18,
    flex: 1,
    paddingVertical: 15,
  },
  primaryActionDisabled: {
    backgroundColor: '#6C7C78',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#EAE1D2',
    borderRadius: 18,
    flex: 1,
    paddingVertical: 15,
  },
  secondaryActionText: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
  },
  messagePanel: {
    backgroundColor: '#E8F4EF',
    borderColor: '#B8D8CC',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  messageText: {
    color: '#116653',
    fontSize: 14,
    fontWeight: '800',
  },
  composer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  composerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  composerTitle: {
    color: '#142326',
    fontSize: 20,
    fontWeight: '900',
  },
  composerState: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
  },
  segmented: {
    backgroundColor: '#F0E8DA',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#116653',
  },
  segmentText: {
    color: '#5E6766',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  postInput: {
    backgroundColor: '#F7F2EA',
    borderColor: '#E6DDCF',
    borderRadius: 16,
    borderWidth: 1,
    color: '#142326',
    fontSize: 16,
    fontWeight: '700',
    minHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  postButton: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 16,
    marginTop: 12,
    minHeight: 50,
    justifyContent: 'center',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  postsSection: {
    marginTop: 28,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postKind: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
  },
  postAuthor: {
    color: '#7A7167',
    fontSize: 12,
    fontWeight: '800',
  },
  postBody: {
    color: '#142326',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  emptyPosts: {
    backgroundColor: '#ECE5D8',
    borderRadius: 18,
    padding: 18,
  },
  emptyPostsText: {
    color: '#5E6766',
    fontSize: 15,
    fontWeight: '800',
  },
  timeline: {
    marginTop: 28,
  },
  timelineTitle: {
    color: '#142326',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  timelineItem: {
    borderTopColor: '#DDD4C6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 18,
    paddingVertical: 18,
  },
  timelineTime: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
    width: 44,
  },
  timelineCopy: {
    color: '#3F4D4D',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
});
