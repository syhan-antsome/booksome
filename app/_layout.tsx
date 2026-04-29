import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/providers/auth-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            animation: 'slide_from_bottom',
            animationDuration: 380,
            headerShown: false,
            contentStyle: { backgroundColor: '#F7F2EA' },
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="rooms/index" options={{ animation: 'none' }} />
          <Stack.Screen name="reading-life/index" options={{ animation: 'none' }} />
          <Stack.Screen name="market/index" options={{ animation: 'none' }} />
          <Stack.Screen name="profile" options={{ animation: 'none' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
