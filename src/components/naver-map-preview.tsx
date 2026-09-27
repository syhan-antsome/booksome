import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { booksomeColors as uiColors } from '../theme/booksome';

type NaverMapPreviewProps = {
  areaLabel: string;
};

const naverMapsClientId = process.env.EXPO_PUBLIC_NAVER_MAPS_CLIENT_ID;
const naverMapsBaseUrl = getNaverMapsBaseUrl();
const mapPreviewAssetVersion = '20260510-area-label';

export function NaverMapPreview({ areaLabel }: NaverMapPreviewProps) {
  const [mapError, setMapError] = useState<string | null>(null);
  const mapUri = useMemo(() => {
    if (!naverMapsClientId || !naverMapsBaseUrl || !areaLabel.trim()) return '';

    const params = new URLSearchParams({
      clientId: naverMapsClientId,
      area: areaLabel.trim(),
      v: mapPreviewAssetVersion,
    });

    return `${naverMapsBaseUrl}/naver-map-preview.html?${params.toString()}`;
  }, [areaLabel]);

  if (Platform.OS === 'web' || !naverMapsClientId || !mapUri) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>지도 미리보기</Text>
        <Text style={styles.fallbackCopy}>{areaLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        javaScriptEnabled
        onError={() => setMapError('지도를 불러오지 못했습니다.')}
        onHttpError={(event) => setMapError(`지도 페이지 HTTP 오류: ${event.nativeEvent.statusCode}`)}
        onLoadStart={() => setMapError(null)}
        originWhitelist={['*']}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={uiColors.action} />
          </View>
        )}
        scrollEnabled={false}
        source={{ uri: mapUri }}
        startInLoadingState
        style={styles.webView}
      />
      {mapError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{mapError}</Text>
        </View>
      ) : null}
    </View>
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
  wrap: {
    backgroundColor: uiColors.line,
    borderRadius: 26,
    height: 190,
    marginTop: 14,
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: uiColors.line,
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: uiColors.line,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(250,249,247,0.94)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 18,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorText: {
    color: uiColors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  fallback: {
    backgroundColor: 'rgba(38,37,38,0.08)',
    borderRadius: 22,
    marginTop: 14,
    padding: 16,
  },
  fallbackTitle: {
    color: uiColors.action,
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackCopy: {
    color: uiColors.action,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
});
