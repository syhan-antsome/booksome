import { Link } from 'expo-router';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import homeHeroBookStacksImage from '../assets/home-hero-book-stacks.jpg';
import sseomdiReadingImage from '../assets/sseomdi-reading.png';
import { AuthRequired } from '../src/components/auth-required';
import { BackButton } from '../src/components/back-button';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { useAuth } from '../src/providers/auth-provider';

function toImageSource(image: string | number): ImageSourcePropType {
  return typeof image === 'string' ? { uri: image } : image;
}

const profileHeroSource = toImageSource(homeHeroBookStacksImage);
const sseomdiReadingSource = toImageSource(sseomdiReadingImage);

const readingMarkers = [
  { label: '읽는 중', value: '3' },
  { label: '문장 메모', value: '12' },
  { label: '비공개 노트', value: '8' },
];

const menuGroups = [
  [
    { icon: '◐', label: '나의 독서 생활', meta: '책, 문장, 사진 기록' },
    { icon: '□', label: '내 북룸', meta: '참여 중인 북룸과 내가 만든 북룸' },
    { icon: '♡', label: '저장한 글', meta: '공감한 감상과 질문' },
  ],
  [
    { icon: '◎', label: '친구와 팔로우', meta: '독서 취향으로 연결' },
    { icon: '◌', label: '알림', meta: '대화, 모임, 북룸 소식' },
    { icon: '◇', label: '공개 범위', meta: '기록별 공개 설정' },
  ],
  [
    { icon: '≡', label: '설정', meta: '계정, 언어, 알림 관리' },
    { icon: '?', label: '도움말', meta: 'BookSome 사용 안내' },
  ],
];

export default function ProfileScreen() {
  const { isLoading, profile, session, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFramedPreview = width >= 640;
  const displayName = profile?.display_name ?? session?.user.email?.split('@')[0] ?? 'Reader';
  const email = session?.user.email ?? '로그인이 필요합니다';
  const initial = displayName.slice(0, 1).toUpperCase();

  if (!isLoading && !session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.requiredWrap}>
          <AuthRequired
            title="내 책장을 열려면 로그인이 필요합니다"
            copy="나의 독서 생활, 저장한 문장, 참여 중인 북룸은 계정에 연결됩니다."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, !isFramedPreview ? styles.safeAreaFull : null]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          !isFramedPreview ? styles.contentFull : null,
          { paddingBottom: Math.max(insets.bottom + 126, 148) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image resizeMode="cover" source={profileHeroSource} style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroTop}>
            <BackButton />
            <Text style={styles.heroBrand}>My BookSome</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>PRIVATE READING LIFE</Text>
            <Text style={styles.heroTitle}>나의 책 생활</Text>
            <Text style={styles.heroText}>기록은 나에게 머물고, 원할 때만 사람들과 이어집니다.</Text>
          </View>
        </View>

        <View style={styles.profileBand}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Image resizeMode="contain" source={sseomdiReadingSource} style={styles.mascot} />
        </View>

        <View style={styles.readingLife}>
          <View style={styles.readingHeader}>
            <View>
              <Text style={styles.sectionKicker}>READING LIFE</Text>
              <Text style={styles.sectionTitle}>나만의 독서 기록</Text>
            </View>
            <Text style={styles.privateBadge}>private</Text>
          </View>
          <View style={styles.bookProgress}>
            <View style={styles.bookCover}>
              <Text style={styles.bookCoverText}>책</Text>
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookStatus}>현재 읽는 책</Text>
              <Text style={styles.bookTitle}>아직 기록된 책이 없어요</Text>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>첫 책을 추가하면 진행률과 메모가 여기에 쌓입니다.</Text>
            </View>
          </View>
          <View style={styles.markerRow}>
            {readingMarkers.map((marker) => (
              <View key={marker.label} style={styles.markerItem}>
                <Text style={styles.markerValue}>{marker.value}</Text>
                <Text style={styles.markerLabel}>{marker.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>책 기록 시작</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>문장 메모</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.menuArea}>
          {menuGroups.map((group, groupIndex) => (
            <View key={String(groupIndex)} style={styles.menuGroup}>
              {group.map((item) => (
                <Pressable key={item.label} style={styles.menuItem}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <View style={styles.menuCopy}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuMeta}>{item.meta}</Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.bottomActions}>
          <Link href="/" style={styles.homeLink}>
            홈으로
          </Link>
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNavigation active="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#BACDB6',
  },
  safeAreaFull: {
    backgroundColor: '#F3EFE7',
  },
  requiredWrap: {
    flex: 1,
    padding: 20,
  },
  content: {
    alignSelf: 'center',
    backgroundColor: '#F3EFE7',
    borderRadius: 34,
    marginVertical: 14,
    maxWidth: 430,
    overflow: 'hidden',
    width: '100%',
  },
  contentFull: {
    alignSelf: 'stretch',
    borderRadius: 0,
    marginVertical: 0,
    maxWidth: '100%',
  },
  hero: {
    backgroundColor: '#111910',
    height: 318,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroShade: {
    backgroundColor: 'rgba(7, 13, 8, 0.4)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    position: 'relative',
    zIndex: 2,
  },
  heroBrand: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  heroCopy: {
    bottom: 32,
    left: 22,
    position: 'absolute',
    right: 22,
    zIndex: 2,
  },
  heroKicker: {
    color: '#F2C978',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 9,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 43,
  },
  heroText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 300,
  },
  profileBand: {
    alignItems: 'center',
    backgroundColor: '#FFFCF5',
    borderRadius: 30,
    flexDirection: 'row',
    marginHorizontal: 18,
    marginTop: -34,
    minHeight: 94,
    paddingLeft: 14,
    paddingRight: 94,
    position: 'relative',
    zIndex: 4,
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#111910',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginRight: 12,
    width: 60,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: '#111910',
    fontSize: 20,
    fontWeight: '900',
  },
  email: {
    color: '#746D62',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  mascot: {
    bottom: 8,
    height: 80,
    position: 'absolute',
    right: 4,
    width: 100,
  },
  readingLife: {
    backgroundColor: '#182119',
    borderRadius: 34,
    marginHorizontal: 18,
    marginTop: 20,
    overflow: 'hidden',
    padding: 18,
  },
  readingHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionKicker: {
    color: '#E9C177',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  privateBadge: {
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    color: '#182119',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  bookProgress: {
    flexDirection: 'row',
  },
  bookCover: {
    alignItems: 'center',
    backgroundColor: '#D98B57',
    borderRadius: 18,
    height: 118,
    justifyContent: 'center',
    marginRight: 14,
    width: 82,
  },
  bookCoverText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookStatus: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 5,
    height: 10,
    marginTop: 13,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#E9C177',
    borderRadius: 5,
    height: 10,
    width: '8%',
  },
  progressText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 9,
  },
  markerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  markerItem: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  markerValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  markerLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 21,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryActionText: {
    color: '#111910',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 21,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  menuArea: {
    gap: 14,
    marginHorizontal: 18,
    marginTop: 18,
  },
  menuGroup: {
    backgroundColor: '#FFFCF5',
    borderRadius: 28,
    overflow: 'hidden',
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 70,
    paddingHorizontal: 16,
  },
  menuIcon: {
    color: '#111910',
    fontSize: 22,
    fontWeight: '900',
    marginRight: 14,
    textAlign: 'center',
    width: 28,
  },
  menuCopy: {
    flex: 1,
  },
  menuLabel: {
    color: '#111910',
    fontSize: 16,
    fontWeight: '900',
  },
  menuMeta: {
    color: '#7A7165',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  menuArrow: {
    color: '#92877A',
    fontSize: 27,
    fontWeight: '800',
  },
  bottomActions: {
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 20,
  },
  homeLink: {
    backgroundColor: '#111910',
    borderRadius: 24,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingVertical: 14,
    textAlign: 'center',
    width: '100%',
  },
  signOutButton: {
    paddingVertical: 8,
  },
  signOutText: {
    color: '#766F65',
    fontSize: 13,
    fontWeight: '900',
  },
});
