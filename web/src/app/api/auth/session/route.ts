import { NextResponse } from 'next/server';
import { apiFetch, postAuth, readAuthSession } from '@/lib/api';
import { clearSessionCookies, getSessionTokens, setSessionCookies } from '@/lib/auth';
import type { CurrentSession } from '@/lib/types';

export async function GET() {
  const { accessToken, refreshToken } = await getSessionTokens();
  if (accessToken) {
    const current = await readCurrentSession(accessToken);
    if (current) return NextResponse.json(current);
  }

  if (!refreshToken) return unauthorized();

  const refreshResponse = await postAuth('/api/auth/refresh', { refreshToken }).catch(() => null);
  if (!refreshResponse?.ok) {
    await clearSessionCookies();
    return unauthorized();
  }

  const session = await readAuthSession(refreshResponse);
  await setSessionCookies(session);
  return NextResponse.json({ user: session.user, profile: session.profile });
}

async function readCurrentSession(accessToken: string): Promise<CurrentSession | null> {
  const response = await apiFetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  }).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json()) as CurrentSession;
}

function unauthorized() {
  return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
}
