import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms, nativeReadiness, type FeaturedRoom } from '../src/data/rooms';
import { useAuth } from '../src/providers/auth-provider';
import { listFeaturedRooms, type RoomSummary } from '../src/services/rooms';

export default function DiscoverScreen() {
  const { isLoading, profile, session, signOut } = useAuth();
  const [remoteRooms, setRemoteRooms] = useState<RoomSummary[]>([]);
  const [connectionLabel, setConnectionLabel] = useState('Supabase 연결 확인 중');

  useEffect(() => {
    let isMounted = true;

    listFeaturedRooms()
      .then((rooms) => {
        if (!isMounted) {
          return;
        }

        setRemoteRooms(rooms);
        setConnectionLabel(rooms.length > 0 ? 'Supabase live' : 'Supabase ready');
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setConnectionLabel('Local preview');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rooms = useMemo(
    () => (remoteRooms.length > 0 ? remoteRooms.map(toFeaturedRoom) : featuredRooms),
    [remoteRooms],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BookSome</Text>
            <Text style={styles.brandKo}>
              {isLoading
                ? '세션을 확인하고 있습니다'
                : session
                  ? `${profile?.display_name ?? 'Reader'}님, 오늘 어떤 책의 방에 들어갈까요?`
                  : '북썸'}
            </Text>
          </View>
          {session ? (
            <View style={styles.connectionBadge}>
              <Text style={styles.connectionText}>{connectionLabel}</Text>
            </View>
          ) : (
            <Link href="/auth" style={styles.signInAction}>
              로그인
            </Link>
          )}
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Social Reading Rooms</Text>
          <Text style={styles.heroTitle}>책마다 방이 있고, 독자마다 이야기가 있습니다.</Text>
          <Text style={styles.heroCopy}>
            {session
              ? '같은 책을 읽는 사람을 발견하고, 질문과 문장으로 대화를 시작하세요.'
              : '로그인하면 리딩룸 참여, 질문 저장, 모임 알림, Host 운영이 이어집니다.'}
          </Text>
          <View style={styles.heroActions}>
            <Link href={session ? '/scan' : '/auth'} style={styles.primaryAction}>
              {session ? 'ISBN 스캔' : '로그인하고 시작'}
            </Link>
            <Link href={session ? '/create-room' : '/auth'} style={styles.secondaryAction}>
              {session ? '리딩룸 만들기' : '회원가입'}
            </Link>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>지금 살아있는 리딩룸</Text>
          <Link href="/meetups" style={styles.sectionLink}>
            주변 모임
          </Link>
        </View>

        <View style={styles.roomList}>
          {rooms.map((room) => (
            <Link key={room.slug} href={`/room/${room.slug}`} style={styles.roomCard}>
              <View style={[styles.bookRail, { backgroundColor: room.accent }]} />
              <View style={styles.roomContent}>
                <View style={styles.roomMetaRow}>
                  <Text style={styles.roomHost}>Host {room.host}</Text>
                  <Text style={styles.roomMembers}>{room.members} readers</Text>
                </View>
                <Text style={styles.roomTitle}>{room.title}</Text>
                <Text style={styles.roomAuthor}>{room.author}</Text>
                <Text style={styles.roomQuestion}>{room.question}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${room.progress}%` }]} />
                </View>
                <Text style={styles.roomNext}>{room.next}</Text>
              </View>
            </Link>
          ))}
        </View>

        <View style={styles.nativePanel}>
          <Text style={styles.nativeTitle}>초기 앱 필수 기능</Text>
          <Text style={styles.nativeCopy}>
            BookSome은 처음부터 앱스토어 출시를 전제로, 공유와 스캔, 알림 흐름을 제품 안에
            포함합니다.
          </Text>
          <View style={styles.nativeGrid}>
            {nativeReadiness.map((item) => (
              <View key={item.title} style={styles.nativeItem}>
                <Text style={styles.nativeItemTitle}>{item.title}</Text>
                <Text style={styles.nativeItemLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
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
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    color: '#142326',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  brandKo: {
    color: '#116653',
    fontSize: 14,
    fontWeight: '800',
    marginTop: -2,
  },
  signInAction: {
    backgroundColor: '#142326',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  connectionBadge: {
    alignItems: 'center',
    backgroundColor: '#ECE5D8',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  connectionText: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
  },
  hero: {
    backgroundColor: '#113F35',
    borderRadius: 28,
    marginBottom: 28,
    minHeight: 292,
    padding: 24,
  },
  heroLabel: {
    color: '#D9C28F',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
  },
  heroCopy: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 16,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  primaryAction: {
    backgroundColor: '#F7F2EA',
    borderRadius: 16,
    color: '#113F35',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  secondaryAction: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#142326',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionLink: {
    color: '#116653',
    fontSize: 14,
    fontWeight: '900',
  },
  roomList: {
    gap: 14,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5DED1',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 178,
    overflow: 'hidden',
  },
  bookRail: {
    width: 12,
  },
  roomContent: {
    flex: 1,
    padding: 18,
  },
  roomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roomHost: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
  },
  roomMembers: {
    color: '#7A7167',
    fontSize: 12,
    fontWeight: '800',
  },
  roomTitle: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  roomAuthor: {
    color: '#7A7167',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  roomQuestion: {
    color: '#3F4D4D',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 14,
  },
  progressTrack: {
    backgroundColor: '#EEE7DA',
    borderRadius: 6,
    height: 7,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#116653',
    borderRadius: 6,
    height: 7,
  },
  roomNext: {
    color: '#7A7167',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  nativePanel: {
    backgroundColor: '#ECE5D8',
    borderRadius: 28,
    marginTop: 28,
    padding: 22,
  },
  nativeTitle: {
    color: '#142326',
    fontSize: 22,
    fontWeight: '900',
  },
  nativeCopy: {
    color: '#5E6766',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    marginTop: 8,
  },
  nativeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  nativeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    width: '48%',
  },
  nativeItemTitle: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
  },
  nativeItemLabel: {
    color: '#4E5958',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  signOutButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#6A7473',
    fontSize: 14,
    fontWeight: '900',
  },
});
