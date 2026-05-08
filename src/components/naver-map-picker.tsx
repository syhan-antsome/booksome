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
const naverMapsBaseUrl = process.env.EXPO_PUBLIC_NAVER_MAPS_BASE_URL ?? 'https://booksome.app';

export function NaverMapPicker({ initialArea, visible, onClose, onSelect }: NaverMapPickerProps) {
  const html = useMemo(() => {
    if (!naverMapsClientId) return '';
    return buildNaverMapHtml(naverMapsClientId, initialArea ?? '');
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
            source={{ html, baseUrl: naverMapsBaseUrl }}
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

function buildNaverMapHtml(clientId: string, initialArea: string) {
  const safeInitialArea = escapeHtml(initialArea);
  const jsInitialArea = JSON.stringify(initialArea);
  const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="${scriptUrl}"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    body { background: #f6eee1; color: #14251b; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; overflow: hidden; }
    #map { position: absolute; inset: 0; }
    .search {
      align-items: center;
      background: rgba(255, 252, 244, 0.94);
      border-radius: 26px;
      box-shadow: 0 14px 30px rgba(20, 37, 27, 0.14);
      display: flex;
      gap: 8px;
      left: 16px;
      padding: 10px;
      position: absolute;
      right: 16px;
      top: 18px;
      z-index: 5;
    }
    .search input {
      background: transparent;
      border: 0;
      color: #103d2b;
      flex: 1;
      font-size: 16px;
      font-weight: 800;
      min-width: 0;
      outline: none;
      padding: 10px 8px;
    }
    .search button, .sheet button {
      background: #103d2b;
      border: 0;
      border-radius: 18px;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      min-height: 40px;
      padding: 0 16px;
    }
    .pin {
      height: 62px;
      left: 50%;
      pointer-events: none;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -88%);
      width: 44px;
      z-index: 4;
    }
    .pin::before {
      background: #103d2b;
      border: 4px solid #fff7e9;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 16px 26px rgba(16, 61, 43, 0.28);
      content: "";
      height: 34px;
      left: 3px;
      position: absolute;
      top: 3px;
      transform: rotate(-45deg);
      width: 34px;
    }
    .pin::after {
      background: rgba(16, 61, 43, 0.2);
      border-radius: 50%;
      bottom: 0;
      content: "";
      height: 10px;
      left: 12px;
      position: absolute;
      width: 20px;
    }
    .sheet {
      background: rgba(255, 252, 244, 0.96);
      border-radius: 28px 28px 0 0;
      bottom: 0;
      box-shadow: 0 -18px 40px rgba(20, 37, 27, 0.16);
      left: 0;
      padding: 20px 18px 22px;
      position: absolute;
      right: 0;
      z-index: 5;
    }
    .label {
      color: #8f6a42;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .area {
      color: #14251b;
      font-size: 22px;
      font-weight: 900;
      line-height: 28px;
      margin-top: 6px;
    }
    .hint {
      color: #667167;
      font-size: 13px;
      font-weight: 700;
      line-height: 19px;
      margin: 8px 0 16px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="search">
    <input id="query" placeholder="동네, 역, 장소 검색" value="${safeInitialArea}" />
    <button id="searchButton">검색</button>
  </div>
  <div class="pin" aria-hidden="true"></div>
  <div class="sheet">
    <div class="label">선택한 거래 지역</div>
    <div id="area" class="area">지도를 움직여 지역을 고르세요</div>
    <div id="hint" class="hint">가운데 핀 기준으로 지역명만 앱에 저장합니다.</div>
    <button id="selectButton">이 지역으로 선택</button>
  </div>
  <script>
    var selectedArea = "";
    var selectedAddress = "";
    var map = new naver.maps.Map("map", {
      center: new naver.maps.LatLng(37.5666103, 126.9783882),
      zoom: 15,
      minZoom: 7,
      mapDataControl: false,
      scaleControl: false
    });

    function setArea(area, address) {
      selectedArea = area || "";
      selectedAddress = address || "";
      document.getElementById("area").textContent = selectedArea || "지역을 확인하지 못했습니다";
      document.getElementById("hint").textContent = selectedAddress
        ? selectedAddress
        : "가운데 핀 기준으로 지역명만 앱에 저장합니다.";
    }

    function regionNameFromResult(result) {
      if (!result || !result.region) return "";
      var region = result.region;
      return [region.area1 && region.area1.name, region.area2 && region.area2.name, region.area3 && region.area3.name]
        .filter(Boolean)
        .join(" ");
    }

    function updateSelectedArea() {
      var center = map.getCenter();
      naver.maps.Service.reverseGeocode({ location: center }, function(status, response) {
        if (status !== naver.maps.Service.Status.OK || !response || !response.v2) {
          setArea("", "");
          return;
        }

        var results = response.v2.results || [];
        var regionLabel = regionNameFromResult(results[0]);
        var address = response.v2.address || {};
        var addressText = address.roadAddress || address.jibunAddress || "";
        setArea(regionLabel || addressText || "선택한 지역", addressText);
      });
    }

    function searchAddress() {
      var query = document.getElementById("query").value.trim();
      if (!query) return;

      naver.maps.Service.geocode({ address: query }, function(status, response) {
        if (status !== naver.maps.Service.Status.OK) {
          return;
        }

        var addresses = response && response.v2 && response.v2.addresses ? response.v2.addresses : [];
        if (!addresses.length) return;

        var first = addresses[0];
        var point = new naver.maps.LatLng(Number(first.y), Number(first.x));
        map.setCenter(point);
        map.setZoom(16);
        setTimeout(updateSelectedArea, 180);
      });
    }

    naver.maps.Event.addListener(map, "idle", updateSelectedArea);
    document.getElementById("searchButton").addEventListener("click", searchAddress);
    document.getElementById("query").addEventListener("keydown", function(event) {
      if (event.key === "Enter") searchAddress();
    });
    document.getElementById("selectButton").addEventListener("click", function() {
      if (!selectedArea) updateSelectedArea();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "select",
        areaLabel: selectedArea || selectedAddress || "선택한 지역"
      }));
    });

    setTimeout(function() {
      if (${jsInitialArea}) {
        searchAddress();
      } else {
        updateSelectedArea();
      }
    }, 350);
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
