import Image from 'next/image';
import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { Reveal } from '@/components/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getHomeData, roomCover } from '@/lib/api';

export default async function HomePage() {
  const { rooms, feed } = await getHomeData();
  const leadRecord = feed[0];

  return (
    <main>
      <section className="hero">
        <Image
          alt="창가에서 책을 읽으며 기록하는 독자"
          className="hero__image"
          fill
          priority
          sizes="100vw"
          src="/images/hero-reading-room.png"
        />
        <SiteHeader overlay />
        <div className="hero__content">
          <h1>읽고 지나간 책이,<br />내 안에 남도록.</h1>
          <p>지금 읽는 책 한 권, 마음에 남은 한 문장.<br className="desktop-only" /> 나만의 서재에서 다시 만나세요.</p>
          <div className="hero__actions">
            <a className="button" href="/app/books/add">첫 책 찾아보기 <ArrowIcon /></a>
            <Link className="button button--ghost-light" href="#my-records">기록은 어떻게 남나요?</Link>
          </div>
        </div>
        <Link className="hero__scroll" href="#my-records">내 기록 만나보기 <ArrowIcon direction="down" /></Link>
      </section>

      <section className="memory-example" id="my-records">
        <div className="memory-example__intro">
          <h2>한 권을 다 읽고 나면,<br />내 생각이 남아요.</h2>
          <p>어디까지 읽었는지, 어디서 멈췄는지.<br />흩어져 있던 문장과 생각을 책 한 권에 모아보세요.</p>
          <a className="text-link" href="/app/books/add">내 책으로 시작하기 <ArrowIcon /></a>
        </div>
        <article className="memory-example__sheet" aria-label="독서 기록 예시">
          <small>기록 예시 · 설명을 위한 샘플입니다</small>
          <h3>이 책에서 내가 남긴 것</h3>
          <p className="memory-example__book">내가 고른 책 한 권</p>
          <blockquote>서두르지 않고 읽으니,<br />지난번에는 지나쳤던 마음이 보였다.</blockquote>
          <p>다 읽은 뒤에도 다시 꺼내보고 싶은 나의 생각.</p>
          <footer>내가 쓴 기록만 모아서 · 기본은 나만 보기</footer>
        </article>
      </section>

      <section className="records-section" id="records">
        <Reveal className="section-heading section-heading--rule">
          <div>
            <h2>오늘의 공개 기록</h2>
            <p>누군가의 문장이 또 다른 독서의 시작이 됩니다.</p>
          </div>
          <Link className="text-link" href="/rooms">기록 더 보기 <ArrowIcon /></Link>
        </Reveal>

        {leadRecord ? (
          <Reveal className="record-feature">
            <BookCover
              className="record-feature__cover"
              src={roomCover(leadRecord)}
              title={leadRecord.roomTitle}
            />
            <article>
              <p className="record-feature__room">{leadRecord.roomTitle}{leadRecord.roomAuthor ? ` · ${leadRecord.roomAuthor}` : ''}</p>
              <blockquote>{excerpt(leadRecord.quoteText || leadRecord.body, 92)}</blockquote>
              {leadRecord.quoteText && leadRecord.body ? <p className="record-feature__body">{excerpt(leadRecord.body, 180)}</p> : null}
              <div className="record-feature__meta">
                <span>{leadRecord.authorName}</span>
                <span>{formatDate(leadRecord.createdAt)}</span>
                <span>공감 {leadRecord.reactionCount}</span>
                <span>댓글 {leadRecord.commentCount}</span>
              </div>
              <Link className="text-link" href={`/rooms/${leadRecord.roomSlug}`}>기록 읽기 <ArrowIcon /></Link>
            </article>
          </Reveal>
        ) : (
          <Reveal className="empty-editorial">
            <p>아직 공개된 기록이 없습니다.</p>
            <a className="text-link" href="/app/books/add">나의 첫 기록 시작하기 <ArrowIcon /></a>
          </Reveal>
        )}

        {feed.length > 1 ? (
          <div className="record-strip">
            {feed.slice(1, 4).map((item) => (
              <Link href={`/rooms/${item.roomSlug}`} key={item.id}>
                <span>{item.roomTitle}</span>
                <strong>{excerpt(item.quoteText || item.body, 90)}</strong>
                <small>{item.authorName} · {formatDate(item.createdAt)}</small>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rooms-band">
        <Reveal className="rooms-band__intro">
          <h2>함께 읽는 북룸</h2>
          <p>같은 책을 읽는 사람들의 느린 대화.</p>
          <Link className="text-link text-link--light" href="/rooms">북룸 둘러보기 <ArrowIcon /></Link>
        </Reveal>
        <div className="rooms-rail">
          {rooms.length ? rooms.slice(0, 3).map((room) => (
            <Link className="room-volume" href={`/rooms/${room.slug}`} key={room.id}>
              <BookCover src={roomCover(room)} title={room.title} />
              <strong>{room.title}</strong>
              <span>{room.subtitle || room.host_name || '함께 읽는 북룸'}</span>
              <small>{room.member_count.toLocaleString('ko-KR')}명이 함께 읽고 있어요.</small>
            </Link>
          )) : (
            <div className="rooms-empty">
              <p>첫 북룸을 준비하고 있습니다.</p>
              <a className="text-link text-link--light" href="/app/books/add">먼저 내 책 기록하기 <ArrowIcon /></a>
            </div>
          )}
        </div>
      </section>

      <section className="workflow-section">
        <Reveal className="workflow-section__heading">
          <h2>한 권이 나의 기록이 되는 과정</h2>
          <p>혼자 읽는 시간은 온전히 간직하고, 나누고 싶은 순간에만 연결됩니다.</p>
        </Reveal>
        <div className="workflow-line" aria-label="BookSome 사용 과정">
          <article><span>01</span><h3>제목으로 찾아요</h3><p>종이책이 옆에 없어도 괜찮아요. 읽고 있는 책을 검색해 서재에 담습니다.</p></article>
          <article><span>02</span><h3>한 문장을 남겨요</h3><p>긴 독후감 대신 마음에 남은 대목이나 지금의 생각을 적어보세요.</p></article>
          <article><span>03</span><h3>내 생각을 다시 봐요</h3><p>읽던 곳에서 이어 읽고, 다 읽은 책에서는 내가 남긴 기록을 모아봅니다.</p></article>
        </div>
      </section>

      <section className="closing-cta">
        <Image
          alt="햇살이 드는 테이블 위의 책과 노트"
          className="closing-cta__image"
          fill
          sizes="100vw"
          src="/images/cta-reading-table.png"
        />
        <Reveal className="closing-cta__content">
          <h2>오늘 읽은 한 페이지부터</h2>
          <p>작은 페이지가 모여, 더 깊은 나를 만납니다.</p>
          <div>
            <a className="button" href="/app/books/add">첫 책 찾아보기 <ArrowIcon /></a>
            <Link className="button button--ghost-light" href="/books">책 찾아보기</Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(value));
}

function excerpt(value: string | null, maximum: number) {
  if (!value) return '이 독자가 남긴 기록을 북룸에서 읽어보세요.';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maximum ? `${normalized.slice(0, maximum).trim()}…` : normalized;
}
