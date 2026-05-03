import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../../src/components/auth-required';
import { BottomNavigation } from '../../../src/components/bottom-navigation';
import { ScreenHeader } from '../../../src/components/screen-header';
import { useAuth } from '../../../src/providers/auth-provider';
import {
  getMarketListing,
  getMarketThread,
  listMarketMessages,
  sendMarketMessage,
  type MarketListing,
  type MarketMessage,
  type MarketThread,
} from '../../../src/services/market';

export default function MarketChatScreen() {
  const { threadId: rawThreadId } = useLocalSearchParams<{ threadId?: string }>();
  const { session } = useAuth();
  const threadId = Array.isArray(rawThreadId) ? rawThreadId[0] : rawThreadId;
  const [thread, setThread] = useState<MarketThread | null>(null);
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [messages, setMessages] = useState<MarketMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSend = Boolean(session?.user.id && draftMessage.trim() && !isSending);
  const title = useMemo(() => listing?.title ?? '책 문의', [listing?.title]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id || !threadId) {
        setThread(null);
        setListing(null);
        setMessages([]);
        return undefined;
      }

      let isMounted = true;

      setIsLoading(true);
      setErrorMessage(null);

      getMarketThread(session.user.id, threadId)
        .then(async (nextThread) => {
          if (!nextThread) {
            throw new Error('문의방을 찾지 못했습니다.');
          }

          const [nextListing, nextMessages] = await Promise.all([
            getMarketListing(nextThread.listingId),
            listMarketMessages(nextThread.id),
          ]);

          if (!isMounted) return;

          setThread(nextThread);
          setListing(nextListing);
          setMessages(nextMessages);
        })
        .catch((error) => {
          if (isMounted) setErrorMessage(getErrorMessage(error, '문의 내용을 불러오지 못했습니다.'));
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [session?.user.id, threadId]),
  );

  const sendMessage = async () => {
    if (!session?.user.id || !thread || !canSend) return;

    const body = draftMessage;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const nextMessage = await sendMarketMessage(thread.id, session.user.id, body);
      setMessages((current) => [...current, nextMessage]);
      setDraftMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '메시지를 보내지 못했습니다.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 24}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <ScreenHeader
            eyebrow="Bookstore Chat"
            subtitle={title}
            title="문의"
            tone="clay"
          />

          {!session ? (
            <AuthRequired
              title="문의는 로그인 후 사용할 수 있습니다."
              copy="책가게 대화는 내 계정에 연결됩니다."
            />
          ) : null}

          {session ? (
            <>
              {listing ? (
                <Pressable onPress={() => router.push(`/market/${listing.id}`)} style={styles.listingStrip}>
                  <Text style={styles.listingPrice}>{formatListingPrice(listing)}</Text>
                  <Text numberOfLines={1} style={styles.listingTitle}>
                    {listing.title}
                  </Text>
                </Pressable>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingPanel}>
                  <ActivityIndicator color="#103D2B" />
                  <Text style={styles.loadingText}>대화를 불러오는 중입니다</Text>
                </View>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
                {messages.length === 0 && !isLoading ? (
                  <View style={styles.emptyMessages}>
                    <Text style={styles.emptyTitle}>아직 대화가 없습니다</Text>
                    <Text style={styles.emptyCopy}>책 상태나 만날 장소를 가볍게 물어보세요.</Text>
                  </View>
                ) : null}

                {messages.map((message) => {
                  const isMine = message.senderId === session.user.id;

                  return (
                    <View key={message.id} style={[styles.messageBubble, isMine ? styles.messageBubbleMine : null]}>
                      <Text style={[styles.messageText, isMine ? styles.messageTextMine : null]}>{message.body}</Text>
                      <Text style={[styles.messageTime, isMine ? styles.messageTimeMine : null]}>
                        {formatMessageTime(message.createdAt)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  multiline
                  onChangeText={setDraftMessage}
                  placeholder="메시지"
                  placeholderTextColor="#9B917E"
                  style={styles.composerInput}
                  value={draftMessage}
                />
                <Pressable disabled={!canSend} onPress={sendMessage} style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}>
                  {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>보내기</Text>}
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <BottomNavigation active="market" />
    </SafeAreaView>
  );
}

function formatListingPrice(item: MarketListing) {
  if (item.type === 'wanted') return '찾아요';
  if (item.price === 0) return '나눔';
  return `${(item.price ?? 0).toLocaleString('ko-KR')}원`;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    backgroundColor: '#F6EEE1',
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 112,
  },
  listingStrip: {
    borderBottomColor: 'rgba(143,106,66,0.16)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 14,
  },
  listingPrice: {
    color: '#103D2B',
    fontSize: 13,
    fontWeight: '900',
  },
  listingTitle: {
    color: '#14251B',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  loadingPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    color: '#526154',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#A43D20',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 12,
  },
  messages: {
    flexGrow: 1,
    gap: 10,
    paddingVertical: 18,
  },
  emptyMessages: {
    borderTopColor: 'rgba(143,106,66,0.14)',
    borderTopWidth: 1,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: '#103D2B',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyCopy: {
    color: '#667167',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  messageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#103D2B',
  },
  messageText: {
    color: '#14251B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTime: {
    color: '#8F6A42',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.58)',
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(246,238,225,0.96)',
    borderTopColor: 'rgba(143,106,66,0.16)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  composerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    color: '#14251B',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    maxHeight: 92,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    minWidth: 68,
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
