import { cookies } from 'next/headers';
import type { AuthSession } from '@/lib/types';

export const ACCESS_COOKIE = 'booksome_access';
export const REFRESH_COOKIE = 'booksome_refresh';

const sharedOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

export async function setSessionCookies(session: AuthSession) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, session.accessToken, {
    ...sharedOptions,
    maxAge: session.expiresIn
  });
  store.set(REFRESH_COOKIE, session.refreshToken, {
    ...sharedOptions,
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, '', { ...sharedOptions, maxAge: 0 });
  store.set(REFRESH_COOKIE, '', { ...sharedOptions, maxAge: 0 });
}

export async function getSessionTokens() {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_COOKIE)?.value ?? null
  };
}
