import { HttpError } from 'react-admin';

import { clearSession, getSession, setSession } from './session';
import type { AuthSession } from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

let refreshPromise: Promise<AuthSession> | null = null;

async function refreshSession() {
  const current = getSession();
  if (!current) throw new HttpError('로그인이 필요합니다.', 401);
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) throw await responseError(response);
        const payload = await response.json();
        if (payload.user?.role !== 'ADMIN') throw new HttpError('관리자 권한이 없습니다.', 403);
        const next: AuthSession = {
          ...payload,
          expiresAt: Date.now() + payload.expiresIn * 1000,
        };
        setSession(next);
        return next;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function authorizedRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let session = getSession();
  if (!session) throw new HttpError('로그인이 필요합니다.', 401);
  if (session.expiresAt - Date.now() < 30_000) session = await refreshSession();

  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${session.accessToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry) {
    await refreshSession();
    return authorizedRequest<T>(path, init, false);
  }
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function responseError(response: Response) {
  let payload: { message?: string; error?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    // The status text is enough when the response has no JSON body.
  }
  return new HttpError(payload?.message || '요청을 처리하지 못했습니다.', response.status, payload || undefined);
}
