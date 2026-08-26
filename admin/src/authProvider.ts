import type { AuthProvider } from 'react-admin';
import { HttpError } from 'react-admin';

import { API_BASE_URL, responseError } from './api';
import { clearSession, getSession, setSession } from './session';
import type { AuthSession } from './types';

export const authProvider: AuthProvider = {
  async login({ username, password }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });
    if (!response.ok) throw await responseError(response);

    const payload = await response.json();
    if (payload.user?.role !== 'ADMIN') {
      await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: payload.refreshToken }),
      }).catch(() => undefined);
      throw new HttpError('관리자 권한이 있는 계정만 사용할 수 있습니다.', 403);
    }
    const session: AuthSession = {
      ...payload,
      expiresAt: Date.now() + payload.expiresIn * 1000,
    };
    setSession(session);
  },

  async logout() {
    const session = getSession();
    clearSession();
    if (session) {
      await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      }).catch(() => undefined);
    }
  },

  async checkAuth() {
    if (!getSession()) throw new HttpError('로그인이 필요합니다.', 401);
  },

  async checkError(error) {
    if (error?.status === 401 || error?.status === 403) {
      clearSession();
      throw error;
    }
  },

  async getIdentity() {
    const session = getSession();
    if (!session) throw new HttpError('로그인이 필요합니다.', 401);
    return {
      id: session.user.id,
      fullName: `${session.profile.displayName} 관리자`,
      avatar: session.profile.avatarPath || undefined,
    };
  },

  async getPermissions() {
    return getSession()?.user.role || 'USER';
  },
};
