import { Platform } from 'react-native';

// Enabled only for the browser bundle hosted beside the Next.js portal.
// Native builds continue to use SecureStore and the Spring API directly.
export const usesWebSession = Platform.OS === 'web' && process.env.EXPO_PUBLIC_WEB_SESSION === 'true';

export async function webSessionRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Booksome-Client': 'reader' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(detail.message || '요청을 처리하지 못했습니다. 다시 시도해주세요.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
