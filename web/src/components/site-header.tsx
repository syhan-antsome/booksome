'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ReaderLink, SessionLink } from '@/components/portal-session';

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
        <ReaderLink className="button button--compact" href="/library">내 서재</ReaderLink>
      </div>
      <details className="mobile-menu">
        <summary aria-label="메뉴 열기"><span /><span /></summary>
        <nav aria-label="모바일 메뉴" onClick={event => { if ((event.target as HTMLElement).closest('a')) event.currentTarget.closest('details')?.removeAttribute('open'); }}>
          <Link href="/books">책 찾기</Link>
          <Link href="/rooms">책 이야기</Link>
          <Link href="/about">북썸 소개</Link>
          <SessionLink />
          <ReaderLink href="/library">내 서재</ReaderLink>
        </nav>
      </details>
    </header>
  );
}
