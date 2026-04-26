import { useMemo, useState } from 'react';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { BackButton } from '../../src/components/back-button';
import { useAuth } from '../../src/providers/auth-provider';

export default function ScanScreen() {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanResult, setScanResult] = useState<BarcodeScanningResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isGranted = permission?.granted;
  const scannedCode = scanResult?.data ?? '';
  const normalizedCode = useMemo(() => scannedCode.replace(/[^0-9X]/gi, ''), [scannedCode]);
  const looksLikeIsbn = scanResult?.type === 'ean13' && /^(978|979)\d{10}$/.test(normalizedCode);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    setScanResult(result);
  };

  const resetScanner = () => {
    setCameraError(null);
    setScanResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <BackButton />
        </View>

        <Text style={styles.title}>책을 스캔해 독서생활에 등록합니다.</Text>
        <Text style={styles.copy}>
          책 뒷면의 ISBN 바코드를 인식해 나의 책장에 추가하고, 읽는 상태와 메모를 이어서 기록합니다.
        </Text>

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
                onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
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
                <Text style={styles.scanGuide}>ISBN 바코드를 프레임 안에 맞춰주세요</Text>
              </View>
            ) : null}

            {cameraError ? (
              <View style={styles.resultPanel}>
                <Text style={styles.resultEyebrow}>CAMERA ERROR</Text>
                <Text style={styles.resultTitle}>카메라를 열지 못했습니다</Text>
                <Text style={styles.resultCopy}>{cameraError}</Text>
                <Pressable onPress={resetScanner} style={styles.resultButton}>
                  <Text style={styles.resultButtonText}>다시 시도</Text>
                </Pressable>
              </View>
            ) : null}

            {scanResult ? (
              <View style={styles.resultPanel}>
                <Text style={styles.resultEyebrow}>{looksLikeIsbn ? 'ISBN FOUND' : 'BARCODE FOUND'}</Text>
                <Text style={styles.resultTitle}>{normalizedCode || scannedCode}</Text>
                <Text style={styles.resultCopy}>
                  {looksLikeIsbn
                    ? '책 ISBN으로 인식했습니다. 다음 단계에서 책 정보 검색과 독서생활 등록으로 연결합니다.'
                    : `인식 형식: ${scanResult.type}. 책 ISBN이 맞는지 확인해주세요.`}
                </Text>
                <View style={styles.resultActions}>
                  <Pressable onPress={resetScanner} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>다시 스캔</Text>
                  </Pressable>
                  <Pressable disabled style={styles.resultButton}>
                    <Text style={styles.resultButtonText}>독서생활에 등록</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {session ? (
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>MVP note</Text>
            <Text style={styles.tipCopy}>
              지금은 Expo Go에서 카메라 권한과 ISBN 인식이 되는지 확인하는 단계입니다.
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2EA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#142326',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
  },
  copy: {
    color: '#5E6766',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 25,
    marginTop: 12,
  },
  scannerFrame: {
    backgroundColor: '#142326',
    borderRadius: 30,
    flex: 1,
    marginTop: 28,
    minHeight: 390,
    overflow: 'hidden',
  },
  scanBox: {
    height: 150,
    position: 'relative',
    width: '74%',
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
  resultPanel: {
    backgroundColor: 'rgba(247, 242, 234, 0.96)',
    borderRadius: 24,
    bottom: 18,
    left: 18,
    padding: 18,
    position: 'absolute',
    right: 18,
  },
  resultEyebrow: {
    color: '#116653',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  resultTitle: {
    color: '#142326',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 5,
  },
  resultCopy: {
    color: '#556260',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 8,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  resultButton: {
    alignItems: 'center',
    backgroundColor: '#116653',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  resultButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E2D8C9',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#142326',
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
