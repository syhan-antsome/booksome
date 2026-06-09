import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { clearPersistedSupabaseSession, supabase } from '../lib/supabase';
import {
  bootstrapProfile,
  getActiveSession,
  getProfile,
  type ProfileRecord,
  signOut as signOutRequest,
} from '../services/auth';

type AuthContextValue = {
  session: Session | null;
  profile: ProfileRecord | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getActiveSession()
      .then(async (activeSession) => {
        if (!isMounted) return;

        setSession(activeSession);
        if (activeSession) {
          const nextProfile = await bootstrapProfile(activeSession);
          if (isMounted) setProfile(nextProfile);
        }
      })
      .catch(async (error) => {
        console.warn('Failed to restore Supabase session.', error instanceof Error ? error.message : error);
        await clearPersistedSupabaseSession();
        if (!isMounted) return;

        setSession(null);
        setProfile(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      bootstrapProfile(nextSession)
        .then((nextProfile) => {
          setProfile(nextProfile);
        })
        .catch(async (error) => {
          console.warn('Failed to bootstrap profile.', error instanceof Error ? error.message : error);
          await clearPersistedSupabaseSession();
          setProfile(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      refreshProfile: async () => {
        if (!session?.user) {
          setProfile(null);
          return;
        }

        const nextProfile = await getProfile(session.user.id);
        setProfile(nextProfile);
      },
      signOut: async () => {
        await signOutRequest();
      },
    }),
    [isLoading, profile, session],
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
