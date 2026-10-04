'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authHref, conversationPath, safeNextPath } from '@/lib/navigation';
import { ArrowIcon } from '@/components/arrow-icon';
import { signOutPortal } from '@/lib/portal-request';

type SessionState = { signedIn: boolean; checking: boolean; loggingOut: boolean; logoutError: string; logout: () => Promise<void> };
const SessionContext = createContext<SessionState>({ signedIn: false, checking: true, loggingOut: false, logoutError: '', logout: async () => {} });

export function usePortalSession() { return useContext(SessionContext); }

export function PortalSession({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const sessionCheck = useRef<Promise<void> | null>(null);
  const messageSource = useRef('');
  useEffect(() => {
    messageSource.current = crypto.randomUUID();
    const controller = new AbortController();
    sessionCheck.current = fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setSignedIn(response.ok); })
      .catch(() => { /* Public browsing remains available if session lookup fails. */ })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('booksome-portal-session');
    if (channel) channel.onmessage = event => {
      if (event.data?.type === 'signed-out' && event.data.source !== messageSource.current) {
        controller.abort();
        window.location.reload();
      }
    };
    return () => { controller.abort(); channel?.close(); };
  }, []);

  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true); setLogoutError('');
    try {
      await sessionCheck.current;
      await signOutPortal();
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('booksome-portal-session');
        channel.postMessage({ type: 'signed-out', source: messageSource.current }); channel.close();
      }
      // Reload this public URL to discard authenticated data and unsent drafts.
      window.location.reload();
    } catch {
      setLogoutError('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해주세요.');
      logoutPending.current = false; setLoggingOut(false);
    }
  }

  return <SessionContext.Provider value={{ signedIn, checking, loggingOut, logoutError, logout }}>{children}</SessionContext.Provider>;
}

export function SessionLink() {
  const { signedIn, loggingOut, logoutError, logout } = usePortalSession();
  const pathname = usePathname();
  return signedIn ? <div className="session-control"><button className="header-login header-logout" type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? '로그아웃 중…' : '로그아웃'}</button>{logoutError ? <p className="session-control__error" role="alert">{logoutError}</p> : null}</div> : <Link className="header-login" href={authHref('login', pathname)}>로그인</Link>;
}

export function ReaderLink({ href, children, className, label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  const { signedIn } = usePortalSession();
  const destination = safeNextPath(href, '/library');
  return <Link className={className} aria-label={label} href={signedIn ? destination : authHref('login', destination)}>{children}</Link>;
}

export function ConversationLink({ slug }: { slug: string }) {
  const { signedIn, checking } = usePortalSession();
  if (checking) return <button className="button" disabled>참여 준비 중…</button>;
  return <Link className="button" href={signedIn ? '#discussion-compose' : authHref('login', conversationPath(slug))}>이 책 이야기 참여하기 <ArrowIcon /></Link>;
}
