import { NextResponse } from 'next/server';
import { postAuth, readAuthSession } from '@/lib/api';
import { setSessionCookies } from '@/lib/auth';
import { apiErrorResponse, invalidRequestResponse } from '@/lib/route-response';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return invalidRequestResponse(); }
  if (!body.email || !body.password) return invalidRequestResponse();

  const response = await postAuth('/api/auth/sign-in', { email: body.email.trim(), password: body.password });
  if (!response.ok) return apiErrorResponse(response);

  const session = await readAuthSession(response);
  await setSessionCookies(session);
  return NextResponse.json({ user: session.user, profile: session.profile });
}
