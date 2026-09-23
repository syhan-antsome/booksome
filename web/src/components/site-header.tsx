import Link from 'next/link';

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`site-header${overlay ? ' site-header--overlay' : ''}`}>
      <Link className="wordmark" href="/" aria-label="BookSome 홈">
        BookSome
      </Link>
      <nav aria-label="주요 메뉴" className="desktop-nav">
        <Link href="/books">책 찾기</Link>
        <Link href="/#records">공개 기록</Link>
        <Link href="/rooms">북룸</Link>
      </nav>
      <div className="header-actions">
        <a className="header-login" href="/app/auth">로그인</a>
        <a className="button button--compact" href="/app/library">내 서재</a>
      </div>
      <details className="mobile-menu">
        <summary aria-label="메뉴 열기"><span /><span /></summary>
        <nav aria-label="모바일 메뉴">
          <Link href="/books">책 찾기</Link>
          <Link href="/#records">공개 기록</Link>
          <Link href="/rooms">북룸</Link>
          <a href="/app/auth">로그인</a>
          <a href="/app/library">내 서재</a>
        </nav>
      </details>
    </header>
  );
}
