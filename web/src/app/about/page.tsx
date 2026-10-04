import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';
import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';

export const metadata: Metadata = { title: '북썸 소개', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return (
    <PageShell active="about">
      <article className="prose-page">
        <p>BookSome</p>
        <h1>책을 읽은 시간이<br />나에게 남도록</h1>
        <section><h2>개인 기록이 먼저입니다.</h2><p>북썸은 책을 얼마나 많이 읽었는지 경쟁하는 서비스가 아닙니다. 지금 읽는 페이지, 마음에 남은 문장, 그때의 생각을 부담 없이 모으는 개인 독서 기록 서비스입니다.</p></section>
        <section><h2>책 이야기는 공개 대화입니다.</h2><p>내 서재의 문장과 생각은 기본적으로 나만 볼 수 있습니다. 책 이야기는 같은 책을 읽는 독자에게 별도로 글과 댓글을 남기는 공간입니다. 내 기록을 남기는 것만으로 공개 대화에 게시되지 않습니다.</p></section>
        <section><h2>어디서든 이어서 읽으세요.</h2><p>책 찾기와 공개 책 이야기는 로그인 없이 둘러볼 수 있습니다. 내 서재에 담을 때 로그인하면 설치 없이 브라우저에서 기록을 시작할 수 있습니다. 모바일 앱에서도 같은 계정으로 서재와 기록을 이어갑니다.</p><Link className="button" href="/books">첫 책 찾기 <ArrowIcon /></Link></section>
      </article>
    </PageShell>
  );
}
