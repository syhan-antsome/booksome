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
  const leadCoverUrl = leadRoom ? getRoomImageUrl(leadRoom) : null;

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
          <Link href={`/room/${leadRoom.slug}`} style={styles.heroPoster}>
            <View style={[styles.heroColorPlane, { backgroundColor: leadRoom.accent }]} />
            <View style={styles.heroWhiteCut} />
            <View style={styles.heroPaperShard} />
            <View style={styles.heroVisual}>
              {leadCoverUrl ? (
                <Image resizeMode="cover" source={{ uri: leadCoverUrl }} style={styles.heroVisualImage} />
              ) : (
                <View style={[styles.heroFallback, { backgroundColor: leadRoom.accent }]}>
                  <Text style={styles.heroFallbackLetter}>{leadRoom.title.slice(0, 1)}</Text>
                  <View style={styles.heroFallbackLineOne} />
                  <View style={styles.heroFallbackLineTwo} />
                </View>
              )}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.posterKicker}>TODAY ROOM</Text>
              <Text adjustsFontSizeToFit numberOfLines={2} style={styles.heroTitle}>
                {leadRoom.title}
              </Text>
              <Text style={styles.heroAuthor}>{leadRoom.author}</Text>
              <Text style={styles.heroQuestion}>{leadRoom.question}</Text>
              <View style={styles.heroActions}>
                <Text style={styles.heroPrimaryAction}>ENTER ↗</Text>
                <Text style={styles.heroSecondaryAction}>읽고 말하기</Text>
              </View>
            </View>
          </Link>
        ) : null}

        <View style={styles.quickActions}>
          <Link href={session ? '/scan' : '/auth'} style={[styles.quickAction, styles.quickActionDark]}>
            <Text style={[styles.quickActionIcon, styles.quickActionIconDark]}>{session ? '⌕' : '→'}</Text>
            <Text style={[styles.quickActionText, styles.quickActionTextDark]}>
              {session ? 'ISBN 스캔' : '시작하기'}
            </Text>
          </Link>
          <Link href={session ? '/create-room' : '/auth'} style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>＋</Text>
            <Text style={styles.quickActionText}>{session ? '방 만들기' : '회원가입'}</Text>
          </Link>
          <Link href="/meetups" style={styles.quickAction}>
            <Text style={styles.quickActionIcon}>◎</Text>
            <Text style={styles.quickActionText}>모임</Text>
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
            const coverUrl = getRoomImageUrl(room);

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
    flex: 1,
    backgroundColor: '#F34A3F',
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#FFFDF8',
    maxWidth: 430,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 48,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#F34A3F',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandCaption: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  headerAction: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  connectionText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    fontWeight: '800',
  },
  heroPoster: {
    backgroundColor: '#F34A3F',
    height: 590,
    overflow: 'hidden',
    position: 'relative',
  },
  heroColorPlane: {
    bottom: 160,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroWhiteCut: {
    backgroundColor: '#FFFDF8',
    bottom: -72,
    height: 370,
    left: -36,
    position: 'absolute',
    right: -36,
    transform: [{ rotate: '-12deg' }],
  },
  heroPaperShard: {
    backgroundColor: '#FFFDF8',
    height: 172,
    left: -64,
    position: 'absolute',
    top: 150,
    transform: [{ rotate: '40deg' }],
    width: 188,
  },
  heroVisual: {
    backgroundColor: '#18130F',
    height: 250,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    top: 34,
    transform: [{ rotate: '5deg' }],
    width: '62%',
  },
  heroVisualImage: {
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
    fontSize: 156,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroFallbackLineOne: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    height: 12,
    left: 18,
    position: 'absolute',
    top: 78,
    width: 94,
  },
  heroFallbackLineTwo: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    bottom: 58,
    height: 10,
    position: 'absolute',
    right: 18,
    width: 72,
  },
  heroCopy: {
    bottom: 34,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  posterKicker: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E2DA',
    color: '#17120F',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroTitle: {
    color: '#15110E',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 50,
    maxWidth: 520,
    textTransform: 'uppercase',
  },
  heroAuthor: {
    color: '#5F554D',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
  },
  heroQuestion: {
    color: '#3B342F',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 480,
  },
  heroActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  heroPrimaryAction: {
    backgroundColor: '#080706',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroSecondaryAction: {
    backgroundColor: '#E8E1DA',
    color: '#15110E',
    fontSize: 15,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickActions: {
    backgroundColor: '#FFFDF8',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#F0EAE2',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
  },
  quickActionDark: {
    backgroundColor: '#070604',
  },
  quickActionIcon: {
    color: '#15110E',
    fontSize: 17,
    fontWeight: '900',
  },
  quickActionIconDark: {
    color: '#FFFFFF',
  },
  quickActionText: {
    color: '#15110E',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickActionTextDark: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFDF8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 34,
    paddingBottom: 8,
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
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 20,
    paddingTop: 8,
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
    backgroundColor: '#FFFDF8',
    borderTopColor: 'rgba(36,32,27,0.1)',
    borderTopWidth: 1,
    marginTop: 0,
    paddingHorizontal: 20,
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
    backgroundColor: '#FFFDF8',
    marginTop: 0,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#8B8175',
    fontSize: 14,
    fontWeight: '900',
  },
});
