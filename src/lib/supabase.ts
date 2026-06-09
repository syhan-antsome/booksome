import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseProjectRef = new URL(supabaseUrl).hostname.split('.')[0];
const supabaseAuthStorageKey = `booksome-${supabaseProjectRef}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: supabaseAuthStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function clearPersistedSupabaseSession() {
  const storageKeys = await AsyncStorage.getAllKeys();
  const authStorageKeys = storageKeys.filter(
    (key) => key === 'supabase.auth.token' || (key.startsWith('sb-') && key.includes('-auth-token')),
  );

  await Promise.all([
    AsyncStorage.removeItem(supabaseAuthStorageKey),
    AsyncStorage.removeItem(`${supabaseAuthStorageKey}-code-verifier`),
    AsyncStorage.removeItem(`${supabaseAuthStorageKey}-user`),
    AsyncStorage.removeItem('supabase.auth.token'),
    AsyncStorage.removeItem('supabase.auth.token-code-verifier'),
    AsyncStorage.removeItem('supabase.auth.token-user'),
    ...authStorageKeys.map((key) => AsyncStorage.removeItem(key)),
  ]);
}
