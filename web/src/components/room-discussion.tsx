'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ReadingIcon } from '@/components/reading-icon';
import styles from '@/components/reading-experience.module.css';
import { ContentState } from '@/components/content-state';
import { usePortalSession } from '@/components/portal-session';
import { authHref, conversationPath } from '@/lib/navigation';
import { portalRequest, PortalRequestError } from '@/lib/portal-request';
import type { RoomDetail, RoomPost } from '@/lib/types';

type Props = { title: string; roomId: string; slug: string; initialPosts: RoomPost[]; initialError: boolean };

export function RoomDiscussion({ title, roomId, slug, initialPosts, initialError }: Props) {
  const { signedIn, checking, loggingOut } = usePortalSession();
  const [posts, setPosts] = useState(initialPosts);
  const [listError, setListError] = useState(initialError);
  const [body, setBody] = useState('');
  const [chapter, setChapter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openStories, setOpenStories] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
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

  return <section className={styles.conversation} aria-label="이 책의 공개 대화">
    <header className={styles.conversationHeader}><div><h1>『{title}』<br className={styles.mobileBreak} /> 책 이야기</h1><p>누구나 볼 수 있는 공개 대화</p></div>
      {canWrite ? <button className="button button--compact" type="button" onClick={() => { composer.current?.focus({ preventScroll: true }); document.getElementById('discussion-compose')?.scrollIntoView({ block:'start', behavior:'auto' }); }}><ReadingIcon name="pen" />공개 이야기 쓰기</button> : <Link className="button button--compact" href={login}><ReadingIcon name="pen" />공개 이야기 쓰기</Link>}
    </header>
    {error || message ? <div className={styles.feedback}>{error ? <div className={styles.error} role="alert"><p>{error}</p>{needsLogin ? <Link className="text-link" href={login}>다시 로그인하기</Link> : null}</div> : null}{message ? <p className={styles.success} role="status">{message}</p> : null}</div> : null}
    <div className={styles.conversationFeed}>
      {listError ? <ContentState error title="이야기 목록을 불러오지 못했어요" action={<button className="button button--outline" type="button" onClick={() => void retry()} disabled={pending !== null}>다시 불러오기</button>}>다시 불러와 최신 글과 댓글을 확인해주세요.</ContentState> : null}
      {!posts.length && !listError ? <div className={styles.empty}><ReadingIcon name="comment" /><h2>이 책의 첫 이야기를 기다려요</h2><p>같은 책을 읽어도 마음에 남는 대목은 다르니까요.<br />다른 독자와 나누고 싶은 생각이 있나요?</p></div> : null}
      {posts.map(post => {
        const publicPost = post.visibility === 'public' && post.moderationStatus === 'approved';
        const isExpanded = expanded === post.id;
        const longStory = (post.body?.length ?? 0) > 420 || (post.body?.split('\n').length ?? 0) > 5;
        const comments = isExpanded ? post.comments : post.comments.slice(0, 1);
        return <article className={styles.post} key={post.id}>
          <div className={styles.avatar} aria-hidden="true">{Array.from(post.authorName)[0] || '독'}</div>
          <div className={styles.postContent}>
            <header className={styles.authorLine}><strong>{post.authorName}</strong><time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>{!publicPost ? <span className={styles.moderation}>내 글 · 아직 공개되지 않았어요</span> : null}</header>
            {post.chapterLabel ? <p className={styles.chapter}>{post.chapterLabel}</p> : null}
            {post.quoteText ? <blockquote className={styles.postQuote}>{post.quoteText}</blockquote> : null}
            {post.body ? <p id={`story-${post.id}`} className={`${styles.postBody} ${longStory && !openStories[post.id] ? styles.collapsedStory : ''}`}>{post.body}</p> : null}
            {longStory ? <button type="button" className={styles.readMore} aria-expanded={Boolean(openStories[post.id])} aria-controls={`story-${post.id}`} onClick={() => setOpenStories(value => ({ ...value, [post.id]: !value[post.id] }))}>{openStories[post.id] ? '이야기 접기' : '이야기 더 읽기'}</button> : null}
            <div className={styles.postActions}>
              {canWrite && publicPost ? <button aria-pressed={post.viewerReacted} disabled={pending !== null} onClick={() => void mutate(`reaction:${post.id}`, async () => {
                await portalRequest(`/rooms/posts/${encodeURIComponent(post.id)}/reaction`, { method: post.viewerReacted ? 'DELETE' : 'PUT' });
              }, post.viewerReacted ? '공감을 취소했어요.' : '공감했어요.')} type="button"><ReadingIcon name="heart" />공감 {post.reactionCount}</button> : publicPost ? <Link href={login}><ReadingIcon name="heart" />공감 {post.reactionCount}</Link> : <span><ReadingIcon name="heart" />공감 {post.reactionCount}</span>}
              <button type="button" aria-expanded={isExpanded} aria-controls={`comments-${post.id}`} onClick={() => setExpanded(value => value === post.id ? null : post.id)}><ReadingIcon name="comment" />댓글 {post.comments.length}<span aria-hidden="true">{isExpanded ? '−' : '+'}</span></button>
            </div>
            <div className={styles.thread} id={`comments-${post.id}`}>
              {comments.map(comment => <article className={styles.reply} key={comment.id}><div className={styles.replyAvatar} aria-hidden="true">{Array.from(comment.authorName)[0] || '독'}</div><div><header className={styles.authorLine}><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></header><p className={styles.replyBody}>{comment.body}</p></div></article>)}
              {!isExpanded && post.comments.length > 1 ? <button type="button" className={styles.quietButton} onClick={() => setExpanded(post.id)}>댓글 {post.comments.length}개 모두 보기 →</button> : null}
              {isExpanded ? <div className={styles.replyComposer}>
                {!post.comments.length ? <p className={styles.muted}>첫 댓글로 대화를 이어가 보세요.</p> : null}
                {canWrite && publicPost ? <form onSubmit={event => void submitComment(event, post.id)} aria-busy={pending === `comment:${post.id}`}>
                  <div className="discussion-field"><label htmlFor={`comment-${post.id}`}>공개 댓글</label><textarea id={`comment-${post.id}`} value={drafts[post.id] ?? ''} onChange={event => setDrafts(value => ({ ...value, [post.id]: event.target.value }))} maxLength={2000} required readOnly={pending !== null} placeholder="이 이야기에 이어갈 생각을 남겨주세요." /></div>
                  <button className="button button--outline button--compact" disabled={pending !== null} type="submit">{pending === `comment:${post.id}` ? '남기는 중…' : '댓글 남기기'}</button>
                </form> : publicPost ? <Link className="text-link" href={login}>로그인하고 댓글 남기기</Link> : null}
              </div> : null}
            </div>
          </div>
        </article>;
      })}
    </div>
    <section className={styles.publicComposer} id="discussion-compose" aria-labelledby="compose-title">
      <header><ReadingIcon name="pen" /><div><h2 id="compose-title">당신의 생각도 들려주세요</h2><p>이곳에 남기는 글은 다른 독자에게 공개됩니다.</p></div></header>
      {checking ? <p role="status">로그인 상태를 확인하고 있어요…</p> : canWrite ? <form onSubmit={submitPost} aria-busy={pending === 'post'}>
        <div className="discussion-field"><label className={styles.visuallyHidden} htmlFor="discussion-body">나누고 싶은 생각</label><textarea ref={composer} id="discussion-body" value={body} onChange={event => setBody(event.target.value)} placeholder="이 책을 읽으며 어떤 생각이 들었나요?" required maxLength={10000} readOnly={pending !== null} /></div>
        <div className={styles.publicComposerBottom}><div className="discussion-field"><label htmlFor="discussion-chapter">쪽수·챕터 <span>· 선택</span></label><input id="discussion-chapter" value={chapter} onChange={event => setChapter(event.target.value)} placeholder="예: 42쪽, 3장" maxLength={255} readOnly={pending !== null} /></div>
          <button className="button button--compact" disabled={pending !== null} type="submit">{pending === 'post' ? '남기는 중…' : '공개로 남기기'}</button></div>
      </form> : <div className={styles.loginPrompt}><p>읽기는 누구나, 글과 댓글은 로그인 후 남길 수 있어요.</p><Link className="button button--compact" href={login}>로그인하고 이야기 남기기</Link></div>}
    </section>
  </section>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(new Date(value));
}
