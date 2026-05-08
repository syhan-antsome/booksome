import Constants from 'expo-constants';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

type NaverMapPickerProps = {
  initialArea?: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (areaLabel: string) => void;
};

const naverMapsClientId = process.env.EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID;
const naverMapsBaseUrl = getNaverMapsBaseUrl();

export function NaverMapPicker({ initialArea, visible, onClose, onSelect }: NaverMapPickerProps) {
  const mapUri = useMemo(() => {
    if (!naverMapsClientId || !naverMapsBaseUrl) return '';

    const params = new URLSearchParams({
      clientId: naverMapsClientId,
    });

    if (initialArea) {
      params.set('initialArea', initialArea);
    }

    return `${naverMapsBaseUrl}/naver-map-picker.html?${params.toString()}`;
  }, [initialArea]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; areaLabel?: string };

      if (payload.type === 'select' && payload.areaLabel) {
        onSelect(payload.areaLabel);
      }
    } catch {
      // Ignore non-JSON messages from the embedded map.
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>NAVER MAP</Text>
            <Text style={styles.title}>지도에서 거래 지역 고르기</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>

        {naverMapsClientId ? (
          <WebView
            javaScriptEnabled
            onMessage={handleMessage}
            originWhitelist={['*']}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color="#103D2B" />
                <Text style={styles.loadingText}>지도를 여는 중입니다</Text>
              </View>
            )}
            source={{ uri: mapUri }}
            startInLoadingState
            style={styles.webView}
          />
        ) : (
          <View style={styles.missingKeyPanel}>
            <Text style={styles.missingTitle}>네이버 지도 키가 필요합니다</Text>
            <Text style={styles.missingCopy}>
              Expo 환경변수 `EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID`에 Naver Cloud Maps Client ID를 넣으면 지도 선택을 사용할 수 있습니다.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function getNaverMapsBaseUrl() {
  const hostUri = getExpoHostUri();

  if (hostUri) {
    return `http://${hostUri}`;
  }

  return process.env.EXPO_PUBLIC_NAVER_MAPS_BASE_URL ?? 'http://localhost';
}

function getExpoHostUri() {
  const constants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    manifest?: { debuggerHost?: string };
  };

  return (
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost ??
    null
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F6EEE1',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  eyebrow: {
    color: '#8F6A42',
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#14251B',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#103D2B',
    borderRadius: 19,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  webView: {
    backgroundColor: '#F6EEE1',
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: '#F6EEE1',
    bottom: 0,
    gap: 10,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#526154',
    fontSize: 13,
    fontWeight: '800',
  },
  missingKeyPanel: {
    borderTopColor: 'rgba(143,106,66,0.16)',
    borderTopWidth: 1,
    padding: 24,
  },
  missingTitle: {
    color: '#103D2B',
    fontSize: 20,
    fontWeight: '900',
  },
  missingCopy: {
    color: '#667167',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
});
