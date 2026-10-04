'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ContentLoading, ContentState } from '@/components/content-state';
import { usePortalSession } from '@/components/portal-session';
import { authHref } from '@/lib/navigation';
import { portalRequest, PortalRequestError } from '@/lib/portal-request';

export function LibraryAccess({ path, children }: { path: string; children: ReactNode }) {
  const { signedIn, checking } = usePortalSession();
  if (checking) return <div className="container"><ContentLoading label="로그인 상태를 확인하는 중…" /></div>;
  if (!signedIn) return <div className="container library-status"><ContentState title="나만의 서재에서 이어 읽어요" action={<Link className="button" href={authHref('login', path)}>로그인하고 내 서재 열기</Link>}>개인 서재와 기록은 로그인한 나에게만 보여요.</ContentState></div>;
  return children;
}
export function LibraryFailure({ error, path, retry }: { error: Error; path: string; retry?: () => void }) {
  const expired = error instanceof PortalRequestError && error.status === 401;
  return <ContentState error title={expired ? '다시 로그인해주세요' : '불러오지 못했어요'} action={expired ? <Link className="button" href={authHref('login', path)}>로그인</Link> : <button className="button button--outline" onClick={retry} type="button">다시 불러오기</button>}>{error.message}</ContentState>;
}
export function useLibraryResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    portalRequest<T>(path, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: error instanceof Error ? error : new Error('잠시 뒤 다시 시도해주세요.') }); });
    return () => controller.abort();
  }, [path, version]);
  return { ...state, retry: () => { setState({ data: null, loading: true, error: null }); setVersion(value => value + 1); } };
}
