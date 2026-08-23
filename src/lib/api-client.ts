import {
  applyApiAuthSession,
  clearAuthSession,
  getStoredAuthSession,
  type ApiAuthSession,
  type AuthSession,
} from '../state/auth-session';

type ApiRequestOptions = {
  authenticated?: boolean | 'optional';
  retryOnUnauthorized?: boolean;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.booksome.top').replace(/\/$/, '');
const refreshWindowSeconds = 45;

let refreshPromise: Promise<AuthSession> | null = null;

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const authenticationMode = options.authenticated ?? true;
  const authenticationRequired = authenticationMode === true;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const headers = new Headers(init.headers);
  let sentAuthorization = false;

  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (authenticationMode !== false) {
    const session = await getUsableSession().catch((error) => {
      if (authenticationRequired) throw error;
      return null;
    });
    if (!session && authenticationRequired) {
      throw new Error('로그인이 필요합니다.');
    }
    if (session) {
      headers.set('authorization', `${session.token_type} ${session.access_token}`);
      sentAuthorization = true;
    }
  }

  const response = await fetch(`${apiBaseUrl}${normalizePath(path)}`, { ...init, headers });

  if (sentAuthorization && response.status === 401 && retryOnUnauthorized) {
    const session = await refreshAuthSession();
    headers.set('authorization', `${session.token_type} ${session.access_token}`);
    const retryResponse = await fetch(`${apiBaseUrl}${normalizePath(path)}`, { ...init, headers });
    return readResponse<T>(retryResponse);
  }

  return readResponse<T>(response);
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

async function getUsableSession() {
  const session = await getStoredAuthSession();
  if (!session) return null;

  const currentTime = Math.floor(Date.now() / 1000);
  if (session.expires_at - currentTime > refreshWindowSeconds) {
    return session;
  }
  return refreshAuthSession();
}

async function refreshAuthSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const currentSession = await getStoredAuthSession();
    if (!currentSession) {
      throw new Error('로그인이 필요합니다.');
    }

    const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentSession.refresh_token }),
    });

    if (!response.ok) {
      await clearAuthSession();
      throw await toApiError(response);
    }

    const nextAuth = (await response.json()) as ApiAuthSession;
    return (await applyApiAuthSession(nextAuth, 'TOKEN_REFRESHED')).session;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return new Error(payload.message || `요청을 처리하지 못했습니다. (${response.status})`);
  } catch {
    return new Error(`요청을 처리하지 못했습니다. (${response.status})`);
  }
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}
