import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

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

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryRedirectUrl(),
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) throw error;
  return data;
}

export async function setRecoverySessionFromCurrentUrl() {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  const params = new URLSearchParams(hash);
  const errorDescription = params.get('error_description');

  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    return data.session;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<ProfileRecord>();

  if (error) throw error;
  return data;
}

export async function ensureProfile(user: User) {
  const existing = await getProfile(user.id);

  if (existing) {
    return existing;
  }

  const fallbackName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Reader';

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: fallbackName,
      preferred_language: 'ko',
    })
    .select('*')
    .single<ProfileRecord>();

  if (error) throw error;
  return data;
}

export async function bootstrapProfile(session: Session | null) {
  if (!session?.user) return null;
  return ensureProfile(session.user);
}

function getPasswordRecoveryRedirectUrl() {
  if (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL) {
    return process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/update-password`;
  }

  return 'https://booksome-app.pages.dev/auth/update-password';
}
