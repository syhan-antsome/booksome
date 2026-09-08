'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowIcon } from '@/components/arrow-icon';
import type { CurrentSession } from '@/lib/types';

export function AccountPanel() {
  const router = useRouter();
  const [session, setSession] = useState<CurrentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) { router.replace('/login?next=/me'); return null; }
        if (!response.ok) throw new Error();
        return (await response.json()) as CurrentSession;
      })
      .then((value) => { if (active && value) setSession(value); })
      .catch(() => { if (active) router.replace('/login?next=/me'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/'); router.refresh();
  }

  if (loading || !session) return <div className="account-loading">서재를 불러오고 있습니다…</div>;

  return (
    <section className="account-panel">
      <header>
        <p>{session.user.emailVerified ? '이메일 인증 완료' : '이메일 인증 전'}</p>
        <h1>{session.profile.displayName}님의<br />책 읽는 시간</h1>
        <span>{session.user.email}</span>
      </header>
      <div className="account-actions">
        <article><span>01</span><h2>책을 찾고 있나요?</h2><p>새로운 책을 검색하고 모바일 앱의 서재에 담아보세요.</p><Link className="text-link" href="/books">책 찾기 <ArrowIcon /></Link></article>
        <article><span>02</span><h2>같이 읽고 싶나요?</h2><p>지금 열려 있는 북룸과 공개 기록을 둘러보세요.</p><Link className="text-link" href="/rooms">북룸 보기 <ArrowIcon /></Link></article>
      </div>
      <div className="account-notice"><strong>웹 서재는 이제 시작입니다.</strong><p>상세 독서 기록은 현재 Expo 모바일 앱에서 가장 완전하게 사용할 수 있습니다.</p></div>
      <button className="text-button" onClick={logout} type="button">로그아웃</button>
    </section>
  );
}
