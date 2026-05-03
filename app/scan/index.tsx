import { useState } from 'react';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { ScreenHeader } from '../../src/components/screen-header';
import { useAuth } from '../../src/providers/auth-provider';
import type { ReadingBookStatus } from '../../src/services/reading-life';

export default function ScanScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ context?: string; status?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isMovingToResult, setIsMovingToResult] = useState(false);
  const isGranted = permission?.granted;
  const isRoomContext = params.context === 'create-room';
  const readingStatus = parseReadingStatus(Array.isArray(params.status) ? params.status[0] : params.status);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (isMovingToResult) return;

    const isbn = normalizeIsbn(result.data);
    if (result.type === 'ean13' && /^(978|979)\d{10}$/.test(isbn)) {
      setIsMovingToResult(true);
      setScanError(null);
      router.push({
        pathname: '/scan/result',
        params: {
          isbn,
          ...(isRoomContext ? { context: 'create-room' } : {}),
          ...(!isRoomContext && readingStatus ? { status: readingStatus } : {}),
        },
      });
      return;
    }

    setScanError('책 뒷면의 978 또는 979로 시작하는 ISBN 바코드를 스캔해주세요.');
  };

  const resetScanner = () => {
    setCameraError(null);
    setScanError(null);
    setIsMovingToResult(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ScreenHeader
          eyebrow="ISBN Scanner"
          subtitle={isRoomContext ? '바코드로 북룸의 책을 설정합니다.' : '스캔한 책을 나의 독서생활에 담습니다.'}
          title="책 스캔"
          tone="ink"
        />

        {!session ? (
          <AuthRequired
            title="ISBN 스캔은 로그인 후 사용할 수 있습니다."
            copy="내가 스캔한 책을 독서생활 기록에 저장하고 진행률과 메모를 이어가기 위해 로그인이 필요합니다."
          />
        ) : null}

        {session ? (
          <View style={styles.scannerFrame}>
            {isGranted ? (
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={scanError || isMovingToResult ? undefined : handleBarcodeScanned}
                onMountError={(event) => setCameraError(event.message)}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={styles.permissionPanel}>
                <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
                <Text style={styles.permissionCopy}>책 뒷면의 ISBN 바코드를 읽기 위해 카메라 접근을 허용해주세요.</Text>
                <Pressable onPress={requestPermission} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>권한 요청</Text>
                </Pressable>
              </View>
            )}

            {isGranted ? (
              <View pointerEvents="none" style={styles.scannerOverlay}>
                <View style={styles.scanBox}>
                  <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                  <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                </View>
                <Text style={styles.scanGuide}>
                  {isMovingToResult ? '도서 확인 화면으로 이동합니다' : 'ISBN 바코드를 프레임 안에 맞춰주세요'}
                </Text>
              </View>
            ) : null}

            {cameraError || scanError ? (
              <View style={styles.feedbackPanel}>
                <Text style={styles.feedbackEyebrow}>{cameraError ? 'CAMERA ERROR' : 'SCAN AGAIN'}</Text>
                <Text style={styles.feedbackTitle}>{cameraError ? '카메라를 열지 못했습니다' : 'ISBN을 다시 맞춰주세요'}</Text>
                <Text style={styles.feedbackCopy}>{cameraError || scanError}</Text>
                <Pressable onPress={resetScanner} style={styles.feedbackButton}>
                  <Text style={styles.feedbackButtonText}>다시 스캔</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {session ? (
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>MVP note</Text>
            <Text style={styles.tipCopy}>
              {isRoomContext
                ? '스캔된 ISBN은 북룸 생성 화면의 책 정보에 임시로 적용됩니다.'
                : '스캔된 책은 나의 독서생활에 저장되고, 이후 진행률과 메모를 이어서 붙일 수 있습니다.'}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9X]/gi, '').toUpperCase();
}

function parseReadingStatus(value?: string): ReadingBookStatus | null {
  if (value === 'reading' || value === 'want_to_read' || value === 'paused') {
    return value;
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F2EA',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scannerFrame: {
    backgroundColor: '#142326',
    borderRadius: 30,
    flex: 1,
    marginTop: 28,
    minHeight: 390,
    overflow: 'hidden',
  },
  scannerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scanBox: {
    height: 150,
    position: 'relative',
    width: '74%',
  },
  scanCorner: {
    borderColor: '#F4D38A',
    height: 42,
    position: 'absolute',
    width: 42,
  },
  scanCornerTopLeft: {
    borderLeftWidth: 4,
    borderTopWidth: 4,
    left: 0,
    top: 0,
  },
  scanCornerTopRight: {
    borderRightWidth: 4,
    borderTopWidth: 4,
    right: 0,
    top: 0,
  },
  scanCornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: 0,
    left: 0,
  },
  scanCornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: 0,
    right: 0,
  },
  scanGuide: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 8,
  },
  feedbackPanel: {
    backgroundColor: 'rgba(247, 242, 234, 0.96)',
    borderRadius: 24,
    bottom: 18,
    left: 18,
    padding: 18,
    position: 'absolute',
    right: 18,
  },
  feedbackEyebrow: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  feedbackTitle: {
    color: '#142326',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 5,
  },
  feedbackCopy: {
    color: '#556260',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },
  feedbackButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  permissionPanel: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  permissionCopy: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 10,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#F7F2EA',
    borderRadius: 17,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  permissionButtonText: {
    color: '#142326',
    fontSize: 15,
    fontWeight: '900',
  },
  tip: {
    backgroundColor: '#ECE5D8',
    borderRadius: 22,
    marginTop: 18,
    padding: 18,
  },
  tipTitle: {
    color: '#116653',
    fontSize: 13,
    fontWeight: '900',
  },
  tipCopy: {
    color: '#4E5958',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 6,
  },
});
