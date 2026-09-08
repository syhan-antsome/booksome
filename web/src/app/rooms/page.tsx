import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { PageShell } from '@/components/page-shell';
import { getRooms, roomCover } from '@/lib/api';

export const metadata: Metadata = { title: '북룸' };

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <PageShell>
      <section className="directory-hero directory-hero--rooms">
        <h1>같은 책을 읽는<br />사람들의 느린 대화</h1>
        <p>책마다 하나의 북룸. 읽는 속도는 달라도, 문장 앞에서 만날 수 있습니다.</p>
      </section>
      <section className="rooms-directory">
        <header><h2>지금 열려 있는 북룸</h2><p>{rooms.length}개의 북룸</p></header>
        {rooms.length ? (
          <div className="room-list">
            {rooms.map((room, index) => (
              <Link className="room-row" href={`/rooms/${room.slug}`} key={room.id}>
                <span className="room-row__number">{String(index + 1).padStart(2, '0')}</span>
                <BookCover src={roomCover(room)} title={room.title} />
                <span className="room-row__copy">
                  <strong>{room.title}</strong>
                  <span>{room.subtitle || room.pinned_question || '같은 책을 천천히 읽고 이야기합니다.'}</span>
                  <small>{room.host_name || 'BookSome'} · {room.member_count.toLocaleString('ko-KR')}명</small>
                </span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-editorial"><p>아직 공개된 북룸이 없습니다.</p><Link className="text-link" href="/signup">북썸 시작하기 <ArrowIcon /></Link></div>
        )}
      </section>
    </PageShell>
  );
}
