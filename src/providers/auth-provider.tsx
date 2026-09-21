import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  getActiveSession,
  getProfile,
  signOut as signOutRequest,
  subscribeAuthState,
  type AuthSession,
  type ProfileRecord,
} from '../services/auth';

type AuthContextValue = {
  session: AuthSession | null;
  profile: ProfileRecord | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAuthState((change) => {
      if (!isMounted) return;
      setSession(change.session);
      setProfile(change.profile);
    });

    getActiveSession()
      .then((activeSession) => {
        if (isMounted) setSession(activeSession);
      })
      .catch((error) => {
        console.warn('Failed to restore BookSome session.', error instanceof Error ? error.message : error);
        if (!isMounted) return;
        setSession(null);
        setProfile(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile(userId));
  }, [userId]);

  const signOut = useCallback(async () => {
    await signOutRequest();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, isLoading, refreshProfile, signOut }),
    [isLoading, profile, refreshProfile, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
