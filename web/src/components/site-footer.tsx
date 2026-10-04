import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <BrandLogo />
        <p>읽는 즐거움이 쌓이는 곳.</p>
      </div>
      <nav aria-label="하단 메뉴">
        <Link href="/about">북썸 소개</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
      </nav>
      <p>© {new Date().getFullYear()} BookSome.</p>
    </footer>
  );
}
