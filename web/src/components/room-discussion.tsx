'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ContentState } from '@/components/content-state';
import { usePortalSession } from '@/components/portal-session';
import { authHref, conversationPath } from '@/lib/navigation';
import { portalRequest, PortalRequestError } from '@/lib/portal-request';
import type { RoomDetail, RoomPost } from '@/lib/types';

type Props = { roomId: string; slug: string; initialPosts: RoomPost[]; initialError: boolean };

export function RoomDiscussion({ roomId, slug, initialPosts, initialError }: Props) {
  const { signedIn, checking, loggingOut } = usePortalSession();
  const [posts, setPosts] = useState(initialPosts);
  const [listError, setListError] = useState(initialError);
  const [body, setBody] = useState('');
  const [chapter, setChapter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const busy = useRef(false);
  const joined = useRef(false);
  const canWrite = signedIn && !needsLogin && !loggingOut;
  const login = authHref('login', conversationPath(slug));

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    Promise.all([
      portalRequest<{ room: RoomDetail | null }>(`/rooms/by-slug/${encodeURIComponent(slug)}`, { signal: controller.signal }),
      portalRequest<RoomPost[]>(`/rooms/${encodeURIComponent(roomId)}/posts`, { signal: controller.signal })
    ]).then(([detail, nextPosts]) => {
      if (controller.signal.aborted) return;
      joined.current ||= Boolean(detail.room?.viewerRole);
      setPosts(nextPosts);
      setListError(false);
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (cause instanceof PortalRequestError && cause.status === 401) setNeedsLogin(true);
      // Keep the server-rendered public stories available if personalization fails.
      setError('참여 상태를 확인하지 못했어요. 다시 시도해주세요.');
    });
    return () => controller.abort();
  }, [signedIn, roomId, slug]);

  async function reloadPosts() {
    const next = await portalRequest<RoomPost[]>(`/rooms/${encodeURIComponent(roomId)}/posts`);
    setPosts(next);
    setListError(false);
  }

  async function mutate(key: string, action: () => Promise<void>, success: string) {
    if (busy.current || !canWrite) return;
    busy.current = true;
    setPending(key); setError(''); setMessage('');
    try {
      if (!joined.current) {
        await portalRequest(`/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST' });
        joined.current = true;
      }
      await action();
      setMessage(success);
      try { await reloadPosts(); }
      catch { setListError(true); setError('요청은 완료됐어요. 목록을 다시 불러와 결과를 확인해주세요.'); }
    } catch (cause) {
      if (cause instanceof PortalRequestError && cause.status === 401) {
        setNeedsLogin(true); setPosts(initialPosts); joined.current = false;
      }
      setError(cause instanceof PortalRequestError ? cause.message : '요청 결과를 확인하지 못했어요. 입력은 남겨두었으니 목록을 확인한 뒤 다시 시도해주세요.');
    } finally { busy.current = false; setPending(null); }
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) { setError('이 책에 남기고 싶은 생각을 입력해주세요.'); return; }
    await mutate('post', async () => {
      await portalRequest(`/rooms/${encodeURIComponent(roomId)}/posts`, { method: 'POST', body: JSON.stringify({ body: text, chapterLabel: chapter.trim() || null }) });
      setBody(''); setChapter('');
    }, '이야기를 남겼어요.');
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const text = drafts[postId]?.trim();
    if (!text) { setError('댓글 내용을 입력해주세요.'); return; }
    await mutate(`comment:${postId}`, async () => {
      await portalRequest(`/rooms/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: JSON.stringify({ body: text }) });
      setDrafts(value => ({ ...value, [postId]: '' }));
    }, '댓글을 남겼어요.');
  }

  async function retry() {
    if (busy.current) return;
    busy.current = true; setPending('reload'); setError('');
    try { await reloadPosts(); }
    catch (cause) {
      if (cause instanceof PortalRequestError && cause.status === 401) { setNeedsLogin(true); setPosts(initialPosts); }
      setListError(true); setError('이야기 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.');
    } finally { busy.current = false; setPending(null); }
  }

  return <section className="discussion-layout container" aria-label="이 책의 공개 대화">
    <aside className="discussion-composer" id="discussion-compose">
      <h2>이 책에 이야기 남기기</h2>
      <p>다른 독자에게 공개되는 글이에요.<br />나만의 기록은 내 서재에 남겨주세요.</p>
      {checking ? <p role="status">로그인 상태를 확인하고 있어요…</p> : canWrite ? <form onSubmit={submitPost} aria-busy={pending === 'post'}>
        <div className="discussion-field"><label htmlFor="discussion-body">나누고 싶은 생각</label><textarea id="discussion-body" value={body} onChange={event => setBody(event.target.value)} placeholder="이 책의 어떤 대목에서 멈췄나요?" required maxLength={10000} readOnly={pending === 'post'} /></div>
        <div className="discussion-field"><label htmlFor="discussion-chapter">쪽수·챕터 <span>선택</span></label><input id="discussion-chapter" value={chapter} onChange={event => setChapter(event.target.value)} placeholder="예: 42쪽, 3장" maxLength={255} readOnly={pending === 'post'} /></div>
        <button className="button button--wide" disabled={pending !== null} type="submit">{pending === 'post' ? '남기는 중…' : '공개로 남기기'}</button>
      </form> : <Link className="button button--wide" href={login}>로그인하고 이야기 남기기</Link>}
      {error ? <div className="discussion-feedback" role="alert"><p>{error}</p>{needsLogin ? <Link className="text-link" href={login}>다시 로그인하기</Link> : null}</div> : null}
      {message ? <p className="discussion-feedback discussion-feedback--success" role="status">{message}</p> : null}
    </aside>

    <div className="discussion-feed">
      <header className="results-heading"><h2>이 책에 남긴 이야기</h2><p>공개 글과 댓글로 대화를 이어가세요.</p></header>
      {listError ? <ContentState error title="목록을 다시 불러와주세요" action={<button className="button button--outline" type="button" onClick={() => void retry()} disabled={pending !== null}>다시 불러오기</button>}>이야기가 저장됐더라도 목록 반영이 늦을 수 있어요.</ContentState> : null}
      {!posts.length && !listError ? <ContentState title="이 책의 첫 이야기를 기다려요">마음에 남은 문장이나 질문을 나눠보세요.</ContentState> : null}
      {posts.map(post => {
        const publicPost = post.visibility === 'public' && post.moderationStatus === 'approved';
        return <article className="public-post" key={post.id}>
          <p className="public-post__meta">{post.authorName} · {formatDate(post.createdAt)}{!publicPost ? ' · 내 글 · 아직 공개되지 않았어요' : ''}</p>
          {post.quoteText ? <blockquote>{post.quoteText}</blockquote> : null}
          {post.body ? <p className="public-post__body">{post.body}</p> : null}
          {post.chapterLabel ? <small>{post.chapterLabel}</small> : null}
          <div className="discussion-post-actions">
            {canWrite && publicPost ? <button className="discussion-action" aria-pressed={post.viewerReacted} disabled={pending !== null} onClick={() => void mutate(`reaction:${post.id}`, async () => {
              await portalRequest(`/rooms/posts/${encodeURIComponent(post.id)}/reaction`, { method: post.viewerReacted ? 'DELETE' : 'PUT' });
            }, post.viewerReacted ? '공감을 취소했어요.' : '공감했어요.')} type="button">{post.viewerReacted ? '공감했어요' : '공감'} {post.reactionCount}</button> : <span>공감 {post.reactionCount}</span>}
            <button className="discussion-action" type="button" aria-expanded={expanded === post.id} aria-controls={`comments-${post.id}`} onClick={() => setExpanded(value => value === post.id ? null : post.id)}>댓글 {post.comments.length}</button>
          </div>
          {expanded === post.id ? <div className="discussion-comments" id={`comments-${post.id}`}>
            {post.comments.length ? post.comments.map(comment => <article key={comment.id}><p className="public-post__meta">{comment.authorName} · {formatDate(comment.createdAt)}</p><p>{comment.body}</p></article>) : <p className="discussion-comments__empty">아직 댓글이 없어요.</p>}
            {canWrite && publicPost ? <form onSubmit={event => void submitComment(event, post.id)} aria-busy={pending === `comment:${post.id}`}>
              <div className="discussion-field"><label htmlFor={`comment-${post.id}`}>공개 댓글</label><textarea id={`comment-${post.id}`} value={drafts[post.id] ?? ''} onChange={event => setDrafts(value => ({ ...value, [post.id]: event.target.value }))} maxLength={2000} required readOnly={pending === `comment:${post.id}`} placeholder="이 이야기에 이어갈 생각을 남겨주세요." /></div>
              <button className="button button--outline" disabled={pending !== null} type="submit">{pending === `comment:${post.id}` ? '남기는 중…' : '댓글 남기기'}</button>
            </form> : publicPost ? <Link className="text-link" href={login}>로그인하고 댓글 남기기</Link> : null}
          </div> : null}
        </article>;
      })}
    </div>
  </section>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(new Date(value));
}
