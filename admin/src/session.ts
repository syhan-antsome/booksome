import type { AuthSession } from './types';

const SESSION_KEY = 'booksome.admin.session.v1';

export function getSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as AuthSession;
    return session?.user?.role === 'ADMIN' && session.accessToken && session.refreshToken ? session : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
