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
          <h1>읽은 책이,<br />나의 시간이 되도록</h1>
          <p>책을 등록하고, 읽은 페이지와 문장을 기록하고,<br className="desktop-only" /> 같은 책을 읽는 사람과 이어지세요.</p>
          <div className="hero__actions">
            <Link className="button" href="/books">책 찾아보기 <ArrowIcon /></Link>
            <Link className="button button--ghost-light" href="/signup">북썸 시작하기</Link>
          </div>
        </div>
        <Link className="hero__scroll" href="#records">아래로 읽기 <ArrowIcon direction="down" /></Link>
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
            <Link className="text-link" href="/signup">첫 기록 시작하기 <ArrowIcon /></Link>
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
              <Link className="text-link text-link--light" href="/login">로그인하고 기다리기 <ArrowIcon /></Link>
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
          <article><span>01</span><h3>책을 담아요</h3><p>지금 읽는 책과 언젠가 읽고 싶은 책을 나만의 서재에 모읍니다.</p></article>
          <article><span>02</span><h3>읽으며 남겨요</h3><p>페이지, 밑줄, 메모와 한 줄의 감상을 읽는 흐름 안에서 기록합니다.</p></article>
          <article><span>03</span><h3>원할 때 함께해요</h3><p>선택한 기록만 공개하고, 같은 책의 북룸에서 대화를 이어갑니다.</p></article>
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
            <Link className="button" href="/signup">북썸 시작하기 <ArrowIcon /></Link>
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
