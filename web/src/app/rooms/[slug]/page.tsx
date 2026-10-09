import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ArrowIcon } from '@/components/arrow-icon';
import { BookCover } from '@/components/book-cover';
import { ContentState } from '@/components/content-state';
import { PageShell } from '@/components/page-shell';
import styles from '@/components/reading-experience.module.css';
import { RoomDiscussion } from '@/components/room-discussion';
import { getRoom as fetchRoom, getRoomPosts, roomCover } from '@/lib/api';

const getRoom = cache(fetchRoom);

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getRoom(slug);
  return { title: result.data ? `${result.data.title} · 책 이야기` : '책 이야기', description: result.data?.description || '같은 책을 읽는 독자들의 공개 책 이야기.', alternates: { canonical: `/rooms/${encodeURIComponent(slug)}` }, ...(result.error ? { robots: { index: false } } : {}) };
}
export default async function RoomPage({ params }: Props) {
  const { slug } = await params;
  const result = await getRoom(slug);
  if (result.error === 'not-found') notFound();
  if (result.error) return <PageShell active="rooms" stickyHeader><section className="container detail-error"><ContentState heading="h1" error title="책 이야기를 불러오지 못했어요" action={<a className="button button--outline" href={`/rooms/${encodeURIComponent(slug)}`}>다시 불러오기</a>}>연결이 잠시 끊겼어요. 조금 뒤 다시 시도해주세요.</ContentState><Link className="text-link" href="/rooms">책 이야기 목록으로 <ArrowIcon /></Link></section></PageShell>;
  const room = result.data;
  const posts = await getRoomPosts(room.id);
  return <PageShell active="rooms" stickyHeader>
    <div className={styles.publicPage}>
      <div className={styles.bookContext}><div className={styles.contextInner}><Link className={styles.backLink} href="/rooms">← 책 이야기</Link><BookCover className={styles.contextCover} src={roomCover(room)} title={room.title} /><div><strong>{room.title}</strong>{room.author ? <p>{room.author}</p> : null}</div><Link className={styles.contextLibrary} href="/library">나의 책 목록 <span aria-hidden="true">↗</span></Link></div></div>
      <RoomDiscussion key={room.id} title={room.title} roomId={room.id} slug={room.slug} initialPosts={posts.data ?? []} initialError={Boolean(posts.error)} />
      {room.description || room.subtitle ? <details className={styles.roomAbout}><summary>이 책 이야기 공간 소개</summary>{room.subtitle ? <strong>{room.subtitle}</strong> : null}{room.description ? <p>{room.description}</p> : null}</details> : null}
    </div>
  </PageShell>;
}
