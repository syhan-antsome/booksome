import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { featuredRooms } from '../../src/data/rooms';
import { getMediaUrl } from '../../src/services/media';
import { getRoomDetail, type RoomDetail } from '../../src/services/rooms';

export default function RoomScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [remoteRoom, setRemoteRoom] = useState<RoomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fallbackRoom = featuredRooms.find((item) => item.slug === slug) ?? featuredRooms[0];

  useEffect(() => {
    let isMounted = true;

    if (!slug) {
      setIsLoading(false);
      return;
    }

    getRoomDetail(slug)
      .then((room) => {
        if (isMounted) {
          setRemoteRoom(room);
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
  }, [slug]);

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

        <View style={styles.actions}>
          <Pressable style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>질문에 답하기</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Room 공유</Text>
          </Pressable>
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
