import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms, type FeaturedRoom } from '../../src/data/rooms';
import { useAuth } from '../../src/providers/auth-provider';
import { getMediaUrl } from '../../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../../src/services/rooms';

export default function RoomsScreen() {
  const { session } = useAuth();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsLoadingRooms(true);

    listFeaturedRooms()
      .then((rooms) => {
        if (!isMounted) return;
        setRemoteRooms(rooms);
      })
      .catch(() => {
        if (!isMounted) return;
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRooms(false);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Link asChild href={session ? '/create-room' : '/auth'}>
            <Pressable accessibilityLabel="리딩룸 만들기" style={styles.createButton}>
              <Text style={styles.createButtonText}>＋</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.kicker}>BOOKSOME ROOMS</Text>
        <Text style={styles.title}>함께 읽는 방</Text>
        <Text style={styles.copy}>
          책마다 다른 분위기의 대화가 열립니다. 지금 참여할 방을 고르거나, 충분히 준비되었을 때 새 방을 만들어 보세요.
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>열려 있는 리딩룸</Text>
          <Text style={styles.sectionMeta}>{isLoadingRooms ? '불러오는 중' : `${rooms.length} rooms`}</Text>
        </View>

        <View style={styles.roomList}>
          {rooms.map((room) => {
            const coverUrl = getRoomImageUrl(room);

            return (
              <Link asChild href={`/room/${room.slug}`} key={room.slug}>
                <Pressable style={styles.roomItem}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.roomImage} />
                  ) : (
                    <View style={[styles.roomFallback, { backgroundColor: room.accent }]} />
                  )}
                  <View style={styles.roomScrim} />
                  <View style={styles.roomCopy}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.roomAuthor} numberOfLines={1}>
                      {room.author}
                    </Text>
                    <Text style={styles.roomQuestion} numberOfLines={2}>
                      {room.question}
                    </Text>
                  </View>
                  <View style={styles.roomArrow}>
                    <Text style={styles.roomArrowText}>›</Text>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function toFeaturedRoom(room: RoomSummary): FeaturedRoom {
  return {
    slug: room.slug,
    title: room.title,
    author: room.subtitle ?? 'BookSome',
    host: room.host_name ?? 'Host',
    members: room.member_count.toLocaleString(),
    accent: room.accent_color,
    progress: room.progress_percent,
    next: room.next_event ?? '새로운 함께 읽기 일정을 준비 중입니다',
    question: room.pinned_question ?? '이 책은 당신에게 어떤 질문을 남겼나요?',
    coverPath: room.cover_path ?? null,
    coverUrl: null,
  };
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
    backgroundColor: '#F7F1E5',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 34,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: '#103D2B',
    fontSize: 15,
    fontWeight: '900',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  createButtonText: {
    color: '#F7F1E5',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 28,
  },
  kicker: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  title: {
    color: '#14251B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copy: {
    color: '#667167',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#14251B',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#8F6A42',
    fontSize: 12,
    fontWeight: '900',
  },
  roomList: {
    gap: 14,
  },
  roomItem: {
    backgroundColor: '#103D2B',
    borderRadius: 28,
    height: 154,
    overflow: 'hidden',
    position: 'relative',
  },
  roomImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomFallback: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomScrim: {
    backgroundColor: 'rgba(4, 14, 8, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomCopy: {
    bottom: 20,
    left: 20,
    position: 'absolute',
    right: 72,
  },
  roomTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },
  roomAuthor: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  roomQuestion: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  roomArrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 241, 229, 0.94)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
    width: 44,
  },
  roomArrowText: {
    color: '#103D2B',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
});
