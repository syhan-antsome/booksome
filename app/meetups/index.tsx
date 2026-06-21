import * as Location from 'expo-location';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BottomNavigation } from '../../src/components/bottom-navigation';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { listMeetups, type Meetup } from '../../src/services/meetups';

export default function MeetupsScreen() {
  const { session } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoadingMeetups, setIsLoadingMeetups] = useState(false);
  const [meetupError, setMeetupError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setIsLoadingMeetups(true);
      setMeetupError(null);

      listMeetups()
        .then((items) => {
          if (isMounted) setMeetups(items);
        })
        .catch((error) => {
          if (isMounted) setMeetupError(getErrorMessage(error, '북모임을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoadingMeetups(false);
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const requestLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setStatus('위치 권한이 거부되었습니다. 지역명 수동 선택 플로우를 제공합니다.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setStatus(
      `현재 위치 기준으로 주변 모임을 탐색할 준비가 되었습니다. (${location.coords.latitude.toFixed(
        3,
      )}, ${location.coords.longitude.toFixed(3)})`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          action={
            <Link asChild href={session ? '/meetups/new' : '/auth'}>
              <Pressable accessibilityLabel="북모임 만들기" style={styles.headerAction}>
                <Text style={styles.headerActionText}>＋</Text>
              </Pressable>
            </Link>
          }
          title="북모임"
          tone="ink"
        />

        {!session ? (
          <AuthRequired
            title="주변 독서 모임은 로그인 후 추천됩니다."
            copy="내 위치와 관심 책을 기준으로 가까운 모임을 보여주기 위해 계정이 필요합니다."
          />
        ) : null}

        {session ? (
          <Pressable onPress={requestLocation} style={styles.locationAction}>
            <Text style={styles.locationActionText}>가까운 모임 찾기</Text>
          </Pressable>
        ) : null}

        {session && status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        {isLoadingMeetups ? <ActivityIndicator color="#142326" style={styles.loader} /> : null}
        {meetupError ? <Text style={styles.errorText}>{meetupError}</Text> : null}

        {meetups.length > 0 ? (
          <View style={styles.meetupList}>
            {meetups.map((meetup) => (
              <View key={meetup.id} style={styles.meetupCard}>
                <Text style={styles.meetupCity}>{meetup.city ?? '지역 미정'}</Text>
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                {meetup.startingBookTitle ? (
                  <View style={styles.meetupBookRow}>
                    {meetup.startingBookCoverUrl ? (
                      <Image source={{ uri: meetup.startingBookCoverUrl }} style={styles.meetupBookCover} />
                    ) : null}
                    <View style={styles.meetupBookCopy}>
                      <Text numberOfLines={1} style={styles.meetupBook}>
                        {meetup.startingBookTitle}
                      </Text>
                      {getMeetupBookMetaText(meetup) ? (
                        <Text numberOfLines={1} style={styles.meetupBookMeta}>
                          {getMeetupBookMetaText(meetup)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
                {meetup.description ? (
                  <Text numberOfLines={2} style={styles.meetupCopy}>
                    {meetup.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : !isLoadingMeetups && !meetupError ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyText}>아직 열린 북모임이 없습니다.</Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation active="meetups" />
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}

function getMeetupBookMetaText(meetup: Meetup) {
  return [
    meetup.startingBookAuthor,
    meetup.startingBookPublisher,
    meetup.startingBookTranslator ? `${meetup.startingBookTranslator} 옮김` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    padding: 20,
    paddingBottom: 112,
  },
  headerAction: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerActionText: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 27,
  },
  locationAction: {
    alignItems: 'center',
    backgroundColor: '#142326',
    borderRadius: 6,
    marginTop: 18,
    paddingVertical: 12,
  },
  locationActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBox: {
    borderBottomColor: 'rgba(20,35,38,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(20,35,38,0.12)',
    borderTopWidth: 1,
    marginTop: 18,
    paddingVertical: 12,
  },
  statusText: {
    color: '#4E5958',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  loader: {
    marginTop: 26,
  },
  errorText: {
    color: '#8C3E38',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 18,
  },
  meetupList: {
    marginTop: 18,
  },
  meetupCard: {
    borderBottomColor: 'rgba(20,35,38,0.12)',
    borderBottomWidth: 1,
    paddingVertical: 15,
  },
  meetupCity: {
    color: '#E46F58',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  meetupTitle: {
    color: '#142326',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  meetupBookRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  meetupBookCover: {
    borderRadius: 3,
    height: 42,
    width: 30,
  },
  meetupBookCopy: {
    flex: 1,
    minWidth: 0,
  },
  meetupBook: {
    color: '#35504D',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  meetupBookMeta: {
    color: '#7A827F',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 1,
  },
  meetupCopy: {
    color: '#6A7473',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 7,
  },
  emptyPanel: {
    borderBottomColor: 'rgba(20,35,38,0.12)',
    borderBottomWidth: 1,
    borderTopColor: 'rgba(20,35,38,0.12)',
    borderTopWidth: 1,
    marginTop: 20,
    paddingVertical: 18,
  },
  emptyText: {
    color: '#697370',
    fontSize: 13,
    fontWeight: '400',
  },
});
