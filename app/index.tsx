import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms, nativeReadiness, type FeaturedRoom } from '../src/data/rooms';
import { useAuth } from '../src/providers/auth-provider';
import { getMediaUrl } from '../src/services/media';
import { listFeaturedRooms, type RoomSummary } from '../src/services/rooms';

export default function DiscoverScreen() {
  const { isLoading, profile, session, signOut } = useAuth();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [connectionLabel, setConnectionLabel] = useState('연결 확인 중');
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);

  const refreshRooms = useCallback(() => {
    let isMounted = true;

    setIsRefreshingRooms(true);
    setConnectionLabel('새로고침 중');

    listFeaturedRooms()
      .then((rooms) => {
        if (!isMounted) return;

        setRemoteRooms(rooms);
        setConnectionLabel(rooms.length > 0 ? 'Live' : 'Ready');
      })
      .catch(() => {
        if (!isMounted) return;

        setConnectionLabel('Preview');
      })
      .finally(() => {
        if (isMounted) {
          setIsRefreshingRooms(false);
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
  const leadRoom = rooms[0];
  const feedRooms = rooms.length > 1 ? rooms.slice(1) : rooms;
  const leadCoverUrl = leadRoom?.coverPath ? getRoomCoverUrl(leadRoom.coverPath) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BookSome</Text>
            <Text style={styles.brandCaption}>
              {isLoading
                ? '읽는 중'
                : session
                  ? `${profile?.display_name ?? 'Reader'}님의 리딩 피드`
                  : '책으로 이어지는 사람들'}
            </Text>
          </View>
          {session ? (
            <Text style={styles.connectionText}>오늘</Text>
          ) : (
            <Link href="/auth" style={styles.headerAction}>
              로그인
            </Link>
          )}
        </View>

        {leadRoom ? (
          <Link href={`/room/${leadRoom.slug}`} style={styles.hero}>
            {leadCoverUrl ? (
              <Image resizeMode="cover" source={{ uri: leadCoverUrl }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroFallback, { backgroundColor: leadRoom.accent }]}>
                <Text style={styles.heroFallbackLetter}>{leadRoom.title.slice(0, 1)}</Text>
                <View style={styles.heroFallbackLineOne} />
                <View style={styles.heroFallbackLineTwo} />
              </View>
            )}
            <View style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <View style={styles.editorialMarker}>
                <View style={styles.editorialLine} />
                <Text style={styles.editorialText}>오늘의 리딩룸</Text>
              </View>
              <Text style={styles.heroTitle}>{leadRoom.title}</Text>
              <Text style={styles.heroAuthor}>{leadRoom.author}</Text>
              <Text style={styles.heroQuestion}>{leadRoom.question}</Text>
            </View>
          </Link>
        ) : null}

        <View style={styles.quickActions}>
          <Link href={session ? '/scan' : '/auth'} style={styles.quickAction}>
            {session ? 'ISBN 스캔' : '시작하기'}
          </Link>
          <Link href={session ? '/create-room' : '/auth'} style={styles.quickAction}>
            {session ? '방 만들기' : '회원가입'}
          </Link>
          <Link href="/meetups" style={styles.quickAction}>
            모임
          </Link>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Rooms</Text>
            <Text style={styles.sectionTitle}>지금 열려있는 이야기</Text>
          </View>
          <Pressable onPress={refreshRooms} style={styles.refreshAction}>
            <Text style={styles.refreshText}>{isRefreshingRooms ? '...' : '↻'}</Text>
          </Pressable>
        </View>

        <View style={styles.roomFeed}>
          {feedRooms.map((room, index) => {
            const coverUrl = room.coverPath ? getRoomCoverUrl(room.coverPath) : null;

            return (
              <Link key={room.slug} href={`/room/${room.slug}`} style={styles.roomItem}>
                <View style={styles.roomIndexWrap}>
                  <Text style={styles.roomIndex}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.roomThumb}>
                  {coverUrl ? (
                    <Image resizeMode="cover" source={{ uri: coverUrl }} style={styles.roomThumbImage} />
                  ) : (
                    <View style={[styles.roomThumbFallback, { backgroundColor: room.accent }]}>
                      <Text style={styles.roomThumbLetter}>{room.title.slice(0, 1)}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomTitle}>{room.title}</Text>
                  <Text style={styles.roomMeta}>{room.author} · {room.host}</Text>
                  <Text style={styles.roomQuestion}>{room.question}</Text>
                </View>
                <Text style={styles.roomArrow}>↗</Text>
              </Link>
            );
          })}
        </View>

        <View style={styles.nativePanel}>
          <View style={styles.sectionHeaderCompact}>
            <Text style={styles.sectionEyebrow}>Tools</Text>
            <Text style={styles.connectionText}>BookSome</Text>
          </View>
          {nativeReadiness.map((item, index) => (
            <View key={item.title} style={styles.nativeItem}>
              <Text style={styles.nativeIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.nativeCopy}>
                <Text style={styles.nativeTitle}>{item.title}</Text>
                <Text style={styles.nativeLabel}>{item.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {session ? (
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </Pressable>
        ) : null}
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
  };
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
    flex: 1,
    backgroundColor: '#F7F3EC',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    color: '#24201B',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandCaption: {
    color: '#857B70',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  headerAction: {
    color: '#24201B',
    fontSize: 14,
    fontWeight: '900',
  },
  connectionText: {
    color: '#8B8175',
    fontSize: 12,
    fontWeight: '800',
  },
  hero: {
    height: 520,
    marginHorizontal: -18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroFallback: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroFallbackLetter: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 240,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroFallbackLineOne: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    height: 18,
    left: 28,
    position: 'absolute',
    top: 152,
    width: 138,
  },
  heroFallbackLineTwo: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    bottom: 138,
    height: 12,
    position: 'absolute',
    right: 34,
    width: 96,
  },
  heroShade: {
    backgroundColor: 'rgba(15, 13, 11, 0.36)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroCopy: {
    bottom: 42,
    left: 22,
    position: 'absolute',
    right: 22,
  },
  editorialMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  editorialLine: {
    backgroundColor: 'rgba(255,255,255,0.76)',
    height: 1,
    width: 34,
  },
  editorialText: {
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
  heroAuthor: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  heroQuestion: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 24,
    maxWidth: 560,
  },
  quickActions: {
    borderBottomColor: 'rgba(36,32,27,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 18,
    paddingVertical: 22,
  },
  quickAction: {
    color: '#24201B',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 34,
    marginBottom: 8,
  },
  sectionHeaderCompact: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionEyebrow: {
    color: '#958B80',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#24201B',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  refreshAction: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  refreshText: {
    color: '#24201B',
    fontSize: 23,
    fontWeight: '900',
  },
  roomFeed: {
    marginTop: 8,
  },
  roomItem: {
    alignItems: 'center',
    borderBottomColor: 'rgba(36,32,27,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 132,
    paddingVertical: 18,
  },
  roomIndexWrap: {
    width: 34,
  },
  roomIndex: {
    color: '#B2A79A',
    fontSize: 12,
    fontWeight: '900',
  },
  roomThumb: {
    borderRadius: 4,
    height: 92,
    overflow: 'hidden',
    width: 68,
  },
  roomThumbImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  roomThumbFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  roomThumbLetter: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
  },
  roomInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  roomTitle: {
    color: '#24201B',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  roomMeta: {
    color: '#8B8175',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  roomQuestion: {
    color: '#4C443C',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 12,
  },
  roomArrow: {
    color: '#24201B',
    fontSize: 24,
    fontWeight: '900',
  },
  nativePanel: {
    borderTopColor: 'rgba(36,32,27,0.1)',
    borderTopWidth: 1,
    marginTop: 34,
    paddingTop: 22,
  },
  nativeItem: {
    alignItems: 'flex-start',
    borderBottomColor: 'rgba(36,32,27,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  nativeIndex: {
    color: '#B2A79A',
    fontSize: 12,
    fontWeight: '900',
    width: 34,
  },
  nativeCopy: {
    flex: 1,
  },
  nativeTitle: {
    color: '#24201B',
    fontSize: 15,
    fontWeight: '900',
  },
  nativeLabel: {
    color: '#7A7065',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  signOutButton: {
    alignItems: 'center',
    marginTop: 22,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#8B8175',
    fontSize: 14,
    fontWeight: '900',
  },
});
