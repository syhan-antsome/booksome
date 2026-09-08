import { NextResponse } from 'next/server';
import { postAuth } from '@/lib/api';
import { clearSessionCookies, getSessionTokens } from '@/lib/auth';

export async function POST() {
  const { refreshToken } = await getSessionTokens();
  if (refreshToken) {
    await postAuth('/api/auth/sign-out', { refreshToken }).catch(() => null);
  }
  await clearSessionCookies();
  return NextResponse.json({ signedOut: true });
}
