import type { Metadata } from 'next';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = { title: '서비스 소개' };

export default function AboutPage() {
  return (
    <PageShell>
      <article className="prose-page">
        <p>BookSome</p>
        <h1>책을 읽은 시간이<br />나에게 남도록</h1>
        <section><h2>개인 기록이 먼저입니다.</h2><p>북썸은 책을 얼마나 많이 읽었는지 경쟁하는 서비스가 아닙니다. 지금 읽는 페이지, 마음에 남은 문장, 그때의 생각을 부담 없이 모으는 개인 독서 기록 서비스입니다.</p></section>
        <section><h2>공유는 선택입니다.</h2><p>나의 기록은 기본적으로 나를 위해 남깁니다. 함께 읽고 싶은 순간에만 공개하고, 같은 책의 북룸에서 다른 독자와 천천히 대화할 수 있습니다.</p></section>
      </article>
    </PageShell>
  );
}
