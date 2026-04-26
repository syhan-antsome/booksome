import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthRequired } from '../../src/components/auth-required';
import { useAuth } from '../../src/providers/auth-provider';

export default function ScanScreen() {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const isGranted = permission?.granted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>책을 스캔하면 북룸으로 이어집니다.</Text>
        <Text style={styles.copy}>
          책 뒷면의 ISBN 바코드를 인식해 기존 북룸을 찾고, 없으면 새 북룸 생성을 제안합니다.
        </Text>

        {!session ? (
          <AuthRequired
            title="ISBN 스캔은 로그인 후 사용할 수 있습니다."
            copy="내가 스캔한 책을 북룸과 연결하고, 생성 여부를 계정에 남기기 위해 로그인이 필요합니다."
          />
        ) : null}

        {session ? (
        <View style={styles.scannerFrame}>
          {isGranted ? (
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.permissionPanel}>
              <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
              <Text style={styles.permissionCopy}>ISBN 스캔을 위해 카메라 접근을 허용해주세요.</Text>
              <Pressable onPress={requestPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>권한 요청</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.scanBox} />
        </View>
        ) : null}

        {session ? (
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>MVP note</Text>
          <Text style={styles.tipCopy}>
            다음 단계에서 바코드 값을 책 검색 API와 연결하고, 북룸 진입 또는 생성 플로우를 붙입니다.
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
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 18,
    paddingVertical: 8,
  },
  backText: {
    color: '#116653',
    fontSize: 15,
    fontWeight: '900',
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
    borderColor: '#F4D38A',
    borderRadius: 22,
    borderWidth: 3,
    height: 148,
    left: '14%',
    position: 'absolute',
    right: '14%',
    top: '34%',
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
