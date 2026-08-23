import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: number;
  user: AuthUser;
};

export type ProfileRecord = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  bio: string | null;
  preferred_language: string;
  city: string | null;
  country: string | null;
};

export type ApiProfile = {
  id: string;
  displayName: string;
  username: string | null;
  avatarPath: string | null;
  bio: string | null;
  preferredLanguage: string;
  city: string | null;
  country: string | null;
};

export type ApiAuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
  profile: ApiProfile;
};

export type AuthChangeEvent = 'RESTORED' | 'SIGNED_IN' | 'TOKEN_REFRESHED' | 'PROFILE_UPDATED' | 'SIGNED_OUT';

export type AuthStateChange = {
  event: AuthChangeEvent;
  session: AuthSession | null;
  profile: ProfileRecord | null;
};

type StoredAuthSessionV1 = {
  version: 1;
  session: AuthSession;
};

type AuthStateListener = (change: AuthStateChange) => void;

const AUTH_STORAGE_KEY = 'booksome.auth-session.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const listeners = new Set<AuthStateListener>();

let memorySession: AuthSession | null | undefined;
let memoryProfile: ProfileRecord | null = null;

export function mapApiProfile(profile: ApiProfile): ProfileRecord {
  return {
    id: profile.id,
    display_name: profile.displayName,
    username: profile.username,
    avatar_path: profile.avatarPath,
    bio: profile.bio,
    preferred_language: profile.preferredLanguage,
    city: profile.city,
    country: profile.country,
  };
}

export function subscribeAuthState(listener: AuthStateListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getStoredAuthSession() {
  if (typeof memorySession !== 'undefined') {
    return memorySession;
  }

  try {
    const rawValue = await readStoredValue();
    if (!rawValue) {
      memorySession = null;
      return null;
    }

    const stored = JSON.parse(rawValue) as Partial<StoredAuthSessionV1>;
    memorySession = stored.version === 1 && isAuthSession(stored.session) ? stored.session : null;
    if (!memorySession) {
      await deleteStoredValue();
    }
    return memorySession;
  } catch {
    memorySession = null;
    await deleteStoredValue().catch(() => undefined);
    return null;
  }
}

export async function applyApiAuthSession(response: ApiAuthSession, event: AuthChangeEvent) {
  const session: AuthSession = {
    access_token: response.accessToken,
    refresh_token: response.refreshToken,
    token_type: response.tokenType,
    expires_in: response.expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + response.expiresIn,
    user: response.user,
  };
  const profile = mapApiProfile(response.profile);
  memorySession = session;
  memoryProfile = profile;
  await writeStoredValue(JSON.stringify({ version: 1, session } satisfies StoredAuthSessionV1));
  emitAuthState({ event, session, profile });
  return { session, profile };
}

export function restoreAuthState(session: AuthSession, profile: ProfileRecord) {
  memorySession = session;
  memoryProfile = profile;
  emitAuthState({ event: 'RESTORED', session, profile });
}

export function updateAuthProfile(profile: ProfileRecord) {
  memoryProfile = profile;
  emitAuthState({ event: 'PROFILE_UPDATED', session: memorySession ?? null, profile });
}

export function getMemoryAuthProfile() {
  return memoryProfile;
}

export async function clearAuthSession() {
  memorySession = null;
  memoryProfile = null;
  await deleteStoredValue().catch(() => undefined);
  emitAuthState({ event: 'SIGNED_OUT', session: null, profile: null });
}

export async function clearLegacySupabaseSession() {
  const storageKeys = await AsyncStorage.getAllKeys();
  const legacyKeys = storageKeys.filter(
    (key) =>
      key === 'supabase.auth.token' ||
      (key.startsWith('sb-') && key.includes('-auth-token')) ||
      (key.startsWith('booksome-') && key.includes('-auth-token')),
  );

  await Promise.all(legacyKeys.map((key) => AsyncStorage.removeItem(key)));
}

function emitAuthState(change: AuthStateChange) {
  for (const listener of listeners) {
    listener(change);
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.access_token === 'string' &&
    typeof session.refresh_token === 'string' &&
    session.token_type === 'Bearer' &&
    typeof session.expires_in === 'number' &&
    typeof session.expires_at === 'number' &&
    Boolean(session.user) &&
    typeof session.user?.id === 'string' &&
    typeof session.user?.email === 'string'
  );
}

async function readStoredValue() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(AUTH_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(AUTH_STORAGE_KEY, secureStoreOptions);
}

async function writeStoredValue(value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, value, secureStoreOptions);
}

async function deleteStoredValue() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY, secureStoreOptions);
}
