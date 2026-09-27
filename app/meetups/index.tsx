import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Input, Touch as Pressable } from '../../src/components/app-ui';
import { booksomeColors as uiColors } from '../../src/theme/booksome';

import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import { listMeetups, type Meetup } from '../../src/services/meetups';

export default function MeetupsScreen() {
  const { session } = useAuth();
  const [region, setRegion] = useState('');
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
          if (isMounted) setMeetupError(getErrorMessage(error, '독서 모임을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoadingMeetups(false);
        });

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const visibleMeetups = meetups.filter(meetup => !region.trim() || (meetup.city ?? '').toLowerCase().includes(region.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          action={
            <Link asChild href={session ? '/meetups/new' : '/auth'}>
              <Pressable accessibilityLabel="독서 모임 만들기" style={styles.headerAction}>
                <Text style={styles.headerActionText}>＋</Text>
              </Pressable>
            </Link>
          }
          title="독서 모임"
          subtitle="함께 읽을 책과 사람들을 만나보세요."
          tone="ink"
        />

        <Input accessibilityLabel="독서 모임 지역 검색" value={region} onChangeText={setRegion} placeholder="도시·동네 이름으로 찾기" style={{ marginBottom: 24 }} />

        {isLoadingMeetups ? <ActivityIndicator color={uiColors.ink} style={styles.loader} /> : null}
        {meetupError ? <Text style={styles.errorText}>{meetupError}</Text> : null}

        {visibleMeetups.length > 0 ? (
          <View style={styles.meetupList}>
            {visibleMeetups.map((meetup) => (
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
          <EmptyState title={region ? "이 지역의 모임이 아직 없어요" : "함께 읽을 사람을 만나볼까요?"} copy="먼저 모임을 만들고, 함께 읽고 싶은 책을 골라보세요." action="독서 모임 만들기" onAction={() => router.push(session ? "/meetups/new" : "/auth")} />
        ) : null}
      </ScrollView>
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
    backgroundColor: uiColors.background,
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
    color: uiColors.ink,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 27,
  },
  loader: {
    marginTop: 26,
  },
  errorText: {
    color: uiColors.danger,
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
    color: uiColors.ink,
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
    color: uiColors.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 7,
  },
});
