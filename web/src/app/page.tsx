import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { ContentLoading, ContentState } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';
import { ReaderLink } from '@/components/portal-session';
import { SearchForm } from '@/components/search-form';
import { getPublicStories, roomCover } from '@/lib/api';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function HomePage() {
  return <PageShell>
    <section className="home-hero container">
      <div className="home-hero__copy">
        <h1>읽는 즐거움,<br /><span>쌓이는 나의 이야기.</span></h1>
        <p>책 한 권, 한 페이지, 마음에 남은 문장.<br />북썸에서 나만의 독서 생활을 이어가세요.</p>
        <SearchForm home />
        <div className="home-hero__entry"><span>설치 없이 시작할 수 있어요.</span><ReaderLink className="text-link" href="/library">내 서재 열기 <ArrowIcon /></ReaderLink></div>
      </div>
      <div className="home-hero__media"><Image src="/images/reading-table-coral.webp" alt="햇살 아래 펼친 책과 코랄색 노트, 커피 한 잔" fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
    </section>
    <section className="reading-workflow container" id="my-records">
      <header className="section-heading"><h2>책을 덮어도, 내 생각은 남도록</h2><p>개인 기록은 기본적으로 나만 볼 수 있어요.</p></header>
      <div className="workflow-line">
        <article><span aria-hidden="true">01</span><h3>책을 찾아 담고</h3><p>제목·ISBN으로 검색하고,<br />로그인 후 내 서재에 담아요.</p></article>
        <article><span aria-hidden="true">02</span><h3>오늘 읽은 만큼 남기고</h3><p>읽은 페이지, 문장과 생각, 사진을<br />책 한 권에 차곡차곡 모아요.</p></article>
        <article><span aria-hidden="true">03</span><h3>나의 독서를 돌아봐요</h3><p>다 읽은 책에서도 내가 남긴 기록을<br />다시 꺼내보고, 다음 책으로 이어가요.</p></article>
      </div>
      <aside className="privacy-band">
        <svg aria-hidden="true" viewBox="0 0 32 40" fill="none"><rect x="3" y="17" width="26" height="20" rx="4" stroke="currentColor" strokeWidth="2.5" /><path d="M8 17v-6a8 8 0 0 1 16 0v6M16 25v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
        <div><h3>나를 위한 기록, 함께 나누는 이야기</h3><p>내 서재의 기록과 공개 책 이야기는 서로 다른 공간이에요.</p></div>
        <Link className="text-link" href="/about">북썸 알아보기 <ArrowIcon /></Link>
      </aside>
    </section>
    <section className="home-stories container" id="records">
      <header className="section-heading"><div><h2>같은 책에서 시작되는 대화</h2><p>다른 독자의 생각을 읽고, 나누고 싶은 순간에 이야기해요.</p></div><Link className="text-link" href="/rooms">책 이야기 둘러보기 <ArrowIcon /></Link></header>
      <Suspense fallback={<ContentLoading label="공개 책 이야기를 불러오는 중…" />}><PublicStories /></Suspense>
    </section>
    <section className="closing-band"><div className="container"><h2>오늘의 한 페이지를,<br />내일의 나에게.</h2><div><Link className="button" href="/books">책 찾고 시작하기 <ArrowIcon /></Link><ReaderLink className="text-link" href="/library">이미 읽고 있다면 내 서재로 <ArrowIcon /></ReaderLink></div></div></section>
  </PageShell>;
}

async function PublicStories() {
  const result = await getPublicStories();
  // A document navigation retries the server request even on the current route.
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  if (result.error) return <ContentState error title="책 이야기를 불러오지 못했어요" action={<a className="text-link" href="/#records">다시 불러오기 <ArrowIcon /></a>}>잠시 뒤 다시 시도해주세요. 내 서재에서 개인 기록을 이어갈 수 있어요.</ContentState>;
  if (!result.data.length) return <ContentState title="아직 공개된 이야기가 없어요" action={<Link className="text-link" href="/rooms">책 이야기 둘러보기 <ArrowIcon /></Link>}>첫 대화를 기다리는 책을 둘러보세요. 개인 기록은 내 서재에서 시작할 수 있어요.</ContentState>;
  return <div className="story-list">{result.data.map(item => <Link className="story-row" key={item.id} href={`/rooms/${item.roomSlug}`}>
    <BookCover src={roomCover(item)} title={item.roomTitle} />
    <div><p className="story-row__book">{item.roomTitle}</p><h3>{excerpt(item.quoteText || item.body)}</h3><p>{item.authorName} · {new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(item.createdAt))}</p></div><ArrowIcon />
  </Link>)}</div>;
}
function excerpt(value: string | null) {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text.length > 110 ? `${text.slice(0, 110)}…` : text : '이 책에 남긴 이야기를 읽어보세요.';
}
