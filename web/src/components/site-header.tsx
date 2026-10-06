'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { SessionLink } from '@/components/portal-session';

export function SiteHeader({ active, sticky = false }: { active?: 'books' | 'rooms' | 'about'; sticky?: boolean }) {
  return (
    <header className={`site-header${sticky ? ' site-header--sticky' : ''}`}>
      <BrandLogo />
      <nav aria-label="주요 메뉴" className="desktop-nav">
        <Link href="/books" aria-current={active === 'books' ? 'page' : undefined}>책 찾기</Link>
        <Link href="/rooms" aria-current={active === 'rooms' ? 'page' : undefined}>책 이야기</Link>
        <Link href="/about" aria-current={active === 'about' ? 'page' : undefined}>북썸 소개</Link>
      </nav>
      <div className="header-actions">
        <SessionLink />
        <Link className="button button--compact" href="/study" prefetch={false}>내 서재</Link>
      </div>
      <details className="mobile-menu">
        <summary aria-label="메뉴 열기"><span /><span /></summary>
        <nav aria-label="모바일 메뉴" onClick={event => { if ((event.target as HTMLElement).closest('a')) event.currentTarget.closest('details')?.removeAttribute('open'); }}>
          <Link href="/books">책 찾기</Link>
          <Link href="/rooms">책 이야기</Link>
          <Link href="/about">북썸 소개</Link>
          <SessionLink />
          <Link href="/study" prefetch={false}>내 서재</Link>
        </nav>
      </details>
    </header>
  );
}
