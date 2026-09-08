import { NextResponse } from 'next/server';
import { responseMessage } from '@/lib/api';

export async function apiErrorResponse(response: Response) {
  return NextResponse.json({ message: await responseMessage(response) }, { status: response.status });
}

export function invalidRequestResponse() {
  return NextResponse.json({ message: '입력 내용을 확인해주세요.' }, { status: 400 });
}
