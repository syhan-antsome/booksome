import { apiRequest } from '../lib/api-client';
import {
  applyApiAuthSession,
  clearAuthSession,
  getStoredAuthSession,
  mapApiProfile,
  restoreAuthState,
  subscribeAuthState,
  updateAuthUser,
  type ApiAuthSession,
  type ApiAuthUser,
  type ApiProfile,
  type AuthSession,
  type AuthUser,
  type ProfileRecord,
} from '../state/auth-session';

export type { AuthSession, AuthUser, ProfileRecord };

type CurrentSessionResponse = {
  user: ApiAuthUser;
  profile: ApiProfile;
};

export async function signInWithEmail(email: string, password: string) {
  const response = await apiRequest<ApiAuthSession>(
    '/api/auth/sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    { authenticated: false, retryOnUnauthorized: false },
  );
  const state = await applyApiAuthSession(response, 'SIGNED_IN');
  return { session: state.session, user: state.session.user, profile: state.profile };
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const response = await apiRequest<ApiAuthSession>(
    '/api/auth/sign-up',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { authenticated: false, retryOnUnauthorized: false },
  );
  const state = await applyApiAuthSession(response, 'SIGNED_IN');
  return { session: state.session, user: state.session.user, profile: state.profile };
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ accepted: boolean }>(
    '/api/auth/password-reset/request',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    { authenticated: false, retryOnUnauthorized: false },
  );
}

export async function updatePassword(email: string, code: string, newPassword: string) {
  return apiRequest<void>(
    '/api/auth/password-reset/confirm',
    {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    },
    { authenticated: false, retryOnUnauthorized: false },
  );
}

export async function requestEmailVerification() {
  return apiRequest<{ accepted: boolean }>('/api/auth/email-verification/request', {
    method: 'POST',
  });
}

export async function confirmEmailVerification(code: string) {
  await apiRequest<void>('/api/auth/email-verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  await getActiveSession();
}

export async function signOut() {
  const session = await getStoredAuthSession();
  try {
    if (session) {
      await apiRequest<void>(
        '/api/auth/sign-out',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refresh_token }),
        },
        { authenticated: false, retryOnUnauthorized: false },
      );
    }
  } finally {
    await clearAuthSession();
  }
}

export async function getActiveSession() {
  const storedSession = await getStoredAuthSession();
  if (!storedSession) return null;

  try {
    const response = await apiRequest<CurrentSessionResponse>('/api/auth/me');
    await updateAuthUser(response.user);
    const session = await getStoredAuthSession();
    if (!session) return null;
    restoreAuthState(session, mapApiProfile(response.profile));
    return session;
  } catch (error) {
    await clearAuthSession();
    throw error;
  }
}

export async function getProfile(_userId: string) {
  return mapApiProfile(await apiRequest<ApiProfile>('/api/profiles/me'));
}

export async function updateProfile(
  _userId: string,
  input: {
    displayName?: string;
    avatarPath?: string | null;
  },
) {
  const profile = await apiRequest<ApiProfile>('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify({
      displayName: input.displayName,
      avatarPath: input.avatarPath,
      updateAvatar: 'avatarPath' in input,
    }),
  });
  return mapApiProfile(profile);
}

export async function ensureProfile(user: AuthUser) {
  return getProfile(user.id);
}

export async function bootstrapProfile(session: AuthSession | null) {
  if (!session?.user) return null;
  return ensureProfile(session.user);
}

export { subscribeAuthState };
