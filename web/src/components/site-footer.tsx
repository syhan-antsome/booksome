import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="wordmark wordmark--footer" href="/">BookSome</Link>
        <p>오늘도, 좋은 책과.</p>
      </div>
      <nav aria-label="하단 메뉴">
        <Link href="/about">서비스 소개</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
      </nav>
      <p>© {new Date().getFullYear()} BookSome.</p>
    </footer>
  );
}
