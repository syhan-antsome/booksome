import { NextResponse } from 'next/server';
import { postAuth } from '@/lib/api';
import { apiErrorResponse, invalidRequestResponse } from '@/lib/route-response';

export async function POST(request: Request) {
  let body: { email?: string; code?: string; newPassword?: string };
  try { body = await request.json(); } catch { return invalidRequestResponse(); }
  if (!body.email || !body.code || !body.newPassword) return invalidRequestResponse();
  const response = await postAuth('/api/auth/password-reset/confirm', {
    email: body.email.trim(), code: body.code.trim(), newPassword: body.newPassword
  });
  if (!response.ok) return apiErrorResponse(response);
  return NextResponse.json({ confirmed: true });
}
