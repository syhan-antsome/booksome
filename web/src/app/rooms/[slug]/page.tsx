import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { PageShell } from '@/components/page-shell';
import { getRoom, getRoomPosts, roomCover } from '@/lib/api';

type RoomPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const room = await getRoom((await params).slug);
  return room ? { title: room.title, description: room.subtitle || room.description } : { title: '북룸' };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const room = await getRoom((await params).slug);
  if (!room) notFound();
  const posts = await getRoomPosts(room.id);

  return (
    <PageShell>
      <section className="room-detail-hero" style={{ '--room-accent': room.accentColor || '#9f8f66' } as React.CSSProperties}>
        <BookCover className="room-detail-hero__cover" src={roomCover(room)} title={room.title} />
        <div>
          <p>{room.author || 'BookSome 북룸'}</p>
          <h1>{room.title}</h1>
          <strong>{room.subtitle}</strong>
          <p>{room.description}</p>
          <dl>
            <div><dt>함께 읽는 사람</dt><dd>{room.memberCount.toLocaleString('ko-KR')}명</dd></div>
            <div><dt>읽는 중</dt><dd>{room.readingStatusCounts.reading.toLocaleString('ko-KR')}명</dd></div>
            <div><dt>완독</dt><dd>{room.readingStatusCounts.finished.toLocaleString('ko-KR')}명</dd></div>
          </dl>
          <Link className="button" href={`/login?next=${encodeURIComponent(`/rooms/${room.slug}`)}`}>로그인하고 참여하기 <ArrowIcon /></Link>
        </div>
      </section>
      <section className="room-posts">
        <header><h2>이 방의 기록</h2><p>{posts.length}개의 공개 기록</p></header>
        {posts.length ? posts.map((post) => (
          <article key={post.id}>
            <p>{post.authorName} · {formatDate(post.createdAt)}</p>
            {post.quoteText ? <blockquote>{post.quoteText}</blockquote> : null}
            {post.body ? <div>{post.body}</div> : null}
            <small>{post.chapterLabel || '페이지 기록 없음'} · 공감 {post.reactionCount}</small>
          </article>
        )) : <p className="empty-editorial">아직 공개된 기록이 없습니다.</p>}
      </section>
    </PageShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date(value));
}
