import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { ContentState } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';
import { getRooms, roomCover } from '@/lib/api';

export const metadata: Metadata = { title: '책 이야기', description: '같은 책을 읽는 독자들의 공개 대화. 책마다 다른 생각을 만나고, 나누고 싶은 이야기를 남겨보세요.', alternates: { canonical: '/rooms' } };
export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ query?: string | string[] }> }) {
  const [result, params] = await Promise.all([getRooms(), searchParams]);
  const raw = params.query;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 200) ?? '';
  const rooms = result.data?.filter(room => !query || [room.title, room.subtitle].some(text => text?.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR')))) ?? [];
  return <PageShell active="rooms">
    <section className="directory-hero container"><h1>같은 책,<br /><span>서로 다른 이야기.</span></h1><p>여기는 다른 독자와 나누는 공개 대화예요.<br />나만의 문장과 독서 기록은 내 서재에서 간직하세요.</p>
      <form action="/rooms" className="book-search" method="get"><label htmlFor="story-query">공개된 책 이야기에서 찾기</label><div><input id="story-query" name="query" type="search" defaultValue={query} placeholder="책 제목 또는 이야기 이름" maxLength={200} /><button className="button" type="submit">찾기 <ArrowIcon /></button></div></form>
    </section>
    <section className="rooms-directory container">
      <header className="results-heading"><h2>{query ? `‘${query}’ 책 이야기` : '이야기를 나눌 책'}</h2><p>최근 공개된 책 이야기{result.data ? ` · ${rooms.length}개 표시` : ''}</p></header>
      {result.error ? <ContentState error title="책 이야기에 연결하지 못했어요" action={<a className="button button--outline" href={`/rooms${query ? `?query=${encodeURIComponent(query)}` : ''}`}>다시 불러오기</a>}>잠시 뒤 다시 시도해주세요. 개인 기록은 내 서재에서 이어갈 수 있어요.</ContentState> : rooms.length ? <div className="room-list">{rooms.map(room => <Link className="room-row" href={`/rooms/${room.slug}`} key={room.id}>
        <BookCover src={roomCover(room)} title={room.title} /><span className="room-row__copy"><strong>{room.title}</strong><span>{room.subtitle || '이 책에서 만난 생각을 함께 나눠보세요.'}</span><small>공개 책 이야기</small></span><ArrowIcon />
      </Link>)}</div> : <ContentState title={query ? '찾는 책 이야기가 없어요' : '첫 대화를 기다리고 있어요'} action={<Link className="text-link" href={query ? '/rooms' : '/books'}>{query ? '전체 책 이야기 보기' : '내가 읽는 책 찾기'} <ArrowIcon /></Link>}>{query ? '최근 공개된 목록에서 다른 제목으로 찾아보세요.' : '아직 공개된 책 이야기가 없어요. 먼저 내 책과 개인 기록을 시작해보세요.'}</ContentState>}
      <div className="reading-hint"><p>나누고 싶은 순간에만 공개 대화에 참여하세요. 내 서재의 기록은 자동으로 게시되지 않아요.</p></div>
    </section>
  </PageShell>;
}
