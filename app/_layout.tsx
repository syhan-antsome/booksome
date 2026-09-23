import 'react-native-gesture-handler';

import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { NotoSerifKR_500Medium } from '@expo-google-fonts/noto-serif-kr/500Medium';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/providers/auth-provider';
import { BottomNavigation } from '../src/components/bottom-navigation';
import { MotionPreference, useReducedMotion } from '../src/components/tab-page';
import { tabForPath } from '../src/lib/tab-navigation';
import { booksomeColors } from '../src/theme/booksome';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ NotoSerifKR_500Medium });
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MotionPreference>
          <StatusBar style="dark" />
          {fontsLoaded || fontError ? <AppNavigation /> : <View style={{ flex: 1, backgroundColor: booksomeColors.paper, justifyContent: 'center' }}><ActivityIndicator color={booksomeColors.forest} /></View>}
        </MotionPreference>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const active = tabForPath(usePathname());
  const reduced = useReducedMotion();
  return <View style={{ flex: 1, overflow: 'hidden', backgroundColor: booksomeColors.paper }}>
    <Stack screenOptions={({ route }) => ({
      animation: reduced || ['index', 'library', 'record', 'rooms/index', 'profile'].includes(route.name) ? 'none' : 'slide_from_right',
      animationTypeForReplace: 'push', headerShown: false,
      contentStyle: { backgroundColor: booksomeColors.paper },
    })} />
    {active ? <BottomNavigation active={active} /> : null}
  </View>;
}
