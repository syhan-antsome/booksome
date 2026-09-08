import { NextResponse } from 'next/server';
import { postAuth } from '@/lib/api';
import { apiErrorResponse, invalidRequestResponse } from '@/lib/route-response';

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = await request.json(); } catch { return invalidRequestResponse(); }
  if (!body.email) return invalidRequestResponse();
  const response = await postAuth('/api/auth/password-reset/request', { email: body.email.trim() });
  if (!response.ok) return apiErrorResponse(response);
  return NextResponse.json({ accepted: true }, { status: 202 });
}
