'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { ContentLoading, ContentState } from '@/components/content-state';
import { LibraryFailure, useLibraryResource } from '@/components/library-access';
import { usePortalSession } from '@/components/portal-session';
import { portalRequest, PortalRequestError } from '@/lib/portal-request';
import { editedNoteBody, noteBody, noteImage, readingPosition, type ReadingBook, type ReadingNote } from '@/lib/reading';

export function LibraryBook({ id }: { id: string }) {
  const book = useLibraryResource<{ book: ReadingBook | null }>(`/reading-life/books/${encodeURIComponent(id)}`);
  const notes = useLibraryResource<ReadingNote[]>(`/reading-life/notes?bookId=${encodeURIComponent(id)}`);
  if (book.loading || notes.loading) return <div className="container"><ContentLoading label="책과 나의 기록을 불러오는 중…" /></div>;
  if (book.error) return <div className="container library-status"><LibraryFailure error={book.error} path={`/library/${id}`} retry={() => { book.retry(); notes.retry(); }} /></div>;
  if (!book.data?.book) return <div className="container library-status"><ContentState title="내 서재에서 이 책을 찾지 못했어요" action={<Link className="button" href="/library">내 서재로 돌아가기</Link>}>책이 삭제됐거나 다른 계정의 책일 수 있어요.</ContentState></div>;
  if (notes.error) return <div className="container library-status"><LibraryFailure error={notes.error} path={`/library/${id}`} retry={() => { book.retry(); notes.retry(); }} /></div>;
  return <BookWorkspace initialBook={book.data.book} initialNotes={notes.data ?? []} />;
}

function BookWorkspace({ initialBook, initialNotes }: { initialBook: ReadingBook; initialNotes: ReadingNote[] }) {
  const { loggingOut } = usePortalSession();
  const [book, setBook] = useState(initialBook);
  const [notes, setNotes] = useState(initialNotes);
  const [page, setPage] = useState(String(initialBook.currentPage));
  const [total, setTotal] = useState(initialBook.totalPages ? String(initialBook.totalPages) : '');
  const [text, setText] = useState('');
  const [quote, setQuote] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [editing, setEditing] = useState<ReadingNote | null>(null);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [expired, setExpired] = useState<Error | null>(null);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useRef<{ file: File; objectPath: string; mediaUrl: string } | null>(null);
  const bookPath = `/reading-life/books/${encodeURIComponent(book.id)}`;
  const disabled = Boolean(pending) || loggingOut;

  async function change(key: string, action: () => Promise<void>, success: string) {
    if (busy.current || loggingOut) return;
    busy.current = true; setPending(key); setError(''); setMessage('');
    try { await action(); setMessage(success); }
    catch (cause) {
      if (cause instanceof PortalRequestError && cause.status === 401) setExpired(cause);
      setError(cause instanceof Error ? cause.message : '저장 결과를 확인하지 못했어요. 기록을 다시 확인해주세요.');
    } finally { busy.current = false; setPending(''); }
  }
  async function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await change('progress', async () => {
      const position = readingPosition(page, total);
      const saved = await portalRequest<ReadingBook>(bookPath, { method: 'PATCH', body: JSON.stringify(position) });
      setBook(saved); setPage(String(saved.currentPage)); setTotal(saved.totalPages ? String(saved.totalPages) : '');
    }, '읽은 위치를 저장했어요.');
  }
  function clearComposer() {
    setText(''); setQuote(''); setPageLabel(''); setPhoto(null); setEditing(null); upload.current = null;
    if (fileInput.current) fileInput.current.value = '';
  }
  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() && !quote.trim() && !photo && !(editing && noteImage(editing))) { setError('문장이나 생각, 사진 중 하나를 남겨주세요.'); return; }
    await change('note', async () => {
      if (editing) {
        const saved = await portalRequest<ReadingNote>(`/reading-life/notes/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify({
          quoteText: quote.trim() || null, updateQuoteText: true, body: editedNoteBody(editing.body, text), updateBody: true,
          pageLabel: pageLabel.trim() || null, updatePageLabel: true
        }) });
        setNotes(value => value.map(note => note.id === saved.id ? saved : note));
      } else {
        let media: { objectPath: string; mediaUrl: string } | null = null;
        if (photo) {
          if (photo.size > 8 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(photo.type)) throw new Error('8MB 이하 JPG·PNG·WEBP 사진을 선택해주세요.');
          if (upload.current?.file === photo) media = upload.current;
          else {
            const data = new FormData(); data.append('kind', 'post-media'); data.append('file', photo);
            media = await portalRequest<{ objectPath: string; mediaUrl: string }>('/media/images', { method: 'POST', body: data });
            upload.current = { ...media, file: photo };
          }
        }
        const saved = await portalRequest<ReadingNote>('/reading-life/notes', { method: 'POST', body: JSON.stringify({
          readingBookId: book.id, kind: photo ? 'photo' : 'quote', body: text.trim() || null, quoteText: quote.trim() || null,
          pageLabel: pageLabel.trim() || null, currentPageSnapshot: book.currentPage, progressPercentSnapshot: book.progressPercent,
          totalPagesSnapshot: book.totalPages, mediaPath: media?.objectPath ?? null, mediaUrl: media?.mediaUrl ?? null, visibility: 'private'
        }) });
        setNotes(value => [saved, ...value]);
      }
      clearComposer();
    }, editing ? '기록을 수정했어요.' : '나만 보는 기록을 남겼어요.');
  }
  function edit(note: ReadingNote) { setEditing(note); setText(noteBody(note.body)); setQuote(note.quoteText ?? ''); setPageLabel(note.pageLabel ?? ''); setPhoto(null); setError(''); setMessage(''); document.querySelector('#reading-note-composer')?.scrollIntoView({ block: 'start', behavior: 'auto' }); }
  async function finish() {
    await change('status', async () => {
      const status = book.status === 'finished' ? 'reading' : 'finished';
      const saved = await portalRequest<ReadingBook>(bookPath, { method: 'PATCH', body: JSON.stringify({ status, ...(status === 'finished' && book.totalPages ? { currentPage: book.totalPages, progressPercent: 100 } : {}) }) });
      setBook(saved); setPage(String(saved.currentPage));
    }, book.status === 'finished' ? '다시 읽는 중으로 표시했어요.' : '완독으로 표시했어요. 내가 남긴 기록을 돌아보세요.');
  }
  async function removeNote(note: ReadingNote) {
    if (!window.confirm('이 개인 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.')) return;
    await change(`delete:${note.id}`, async () => {
      await portalRequest(`/reading-life/notes/${encodeURIComponent(note.id)}`, { method: 'DELETE' });
      setNotes(value => value.filter(item => item.id !== note.id));
      if (editing?.id === note.id) clearComposer();
    }, '기록을 삭제했어요.');
  }
  if (expired) return <div className="container library-status"><LibraryFailure error={expired} path={`/library/${book.id}`} /></div>;
  return <>
    <div className="container breadcrumb"><Link href="/library">내 서재</Link><span>/</span><span>{book.title}</span></div>
    <section className="container library-book-hero"><BookCover src={book.externalCoverUrl} title={book.title} /><div><p className="library-muted">나의 책 · {book.status === 'finished' ? '완독' : '읽는 중'}</p><h1>{book.title}</h1><p>{book.author}{book.publisher ? ` · ${book.publisher}` : ''}</p><p className="library-muted">개인 기록과 공개 책 이야기는 별개의 공간이에요.</p><Link className="text-link" href={`/rooms?query=${encodeURIComponent(book.title)}`}>이 책의 공개 이야기 찾아보기 →</Link></div></section>
    <div className="container reading-workspace">
      <aside className="reading-tools">
        <form className="library-panel library-form" onSubmit={saveProgress}><h2>어디까지 읽었나요?</h2><p className="library-muted">저장한 위치: {book.currentPage}{book.totalPages ? ` / ${book.totalPages}` : ''}쪽</p><div className="reading-page-fields">
          <div className="discussion-field"><label htmlFor="reading-page">읽은 쪽수</label><input id="reading-page" type="number" min={0} step={1} value={page} onChange={e => setPage(e.target.value)} readOnly={disabled} required /></div>
          <div className="discussion-field"><label htmlFor="reading-total">전체 쪽수 · 선택</label><input id="reading-total" type="number" min={1} step={1} value={total} onChange={e => setTotal(e.target.value)} readOnly={disabled} /></div>
        </div><button className="button" disabled={disabled} type="submit">{pending === 'progress' ? '저장 중…' : '읽은 위치 저장'}</button><button className="text-button" type="button" disabled={disabled} onClick={() => void finish()}>{book.status === 'finished' ? '다시 읽는 중으로 바꾸기' : '이 책, 다 읽었어요'}</button></form>
        <form className="library-panel library-form" id="reading-note-composer" onSubmit={saveNote} aria-busy={pending === 'note'}><h2>{editing ? '기록 수정하기' : '문장과 생각 남기기'}</h2><p className="library-muted">{editing && editing.visibility !== 'private' ? '이 기록의 기존 공개 범위는 유지됩니다.' : '새 기록은 나만 볼 수 있어요.'}</p>
          <div className="discussion-field"><label htmlFor="note-quote">마음에 남은 문장 · 선택</label><textarea id="note-quote" value={quote} onChange={e => setQuote(e.target.value)} maxLength={10000} readOnly={disabled} /></div>
          <div className="discussion-field"><label htmlFor="note-body">나의 생각 · 선택</label><textarea id="note-body" value={text} onChange={e => setText(e.target.value)} maxLength={10000} readOnly={disabled} placeholder="지금의 생각을 한 문장부터 남겨보세요." /></div>
          <div className="discussion-field"><label htmlFor="note-page-label">기록 위치 · 선택</label><input id="note-page-label" value={pageLabel} onChange={e => setPageLabel(e.target.value)} maxLength={255} placeholder={`비워두면 저장한 ${book.currentPage}쪽 위치를 사용해요`} readOnly={disabled} /></div>
          {!editing ? <div className="discussion-field"><label htmlFor="note-photo">사진 · 선택</label><input ref={fileInput} id="note-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e => { setPhoto(e.target.files?.[0] ?? null); upload.current = null; }} /><small className="library-muted">8MB 이하 JPG·PNG·WEBP</small></div> : null}
          <button className="button" type="submit" disabled={disabled}>{pending === 'note' ? '저장 중…' : editing ? '기록 수정 저장' : '나만 보는 기록 저장'}</button>{editing ? <button className="text-button" disabled={disabled} type="button" onClick={clearComposer}>수정 취소</button> : null}
        </form>
        {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}{message ? <p className="form-message" role="status">{message}</p> : null}
      </aside>
      <section className="reading-notes"><header className="results-heading"><h2>{book.status === 'finished' ? '이 책에서 내가 남긴 것' : '나의 기록'}</h2><p>{notes.length}개의 기록</p></header>
        {!notes.length ? <ContentState title="첫 생각을 남겨보세요">긴 독후감이 아니어도 좋아요. 한 문장, 한 장의 사진부터 나에게 남겨보세요.</ContentState> : notes.map(note => {
          const image = noteImage(note);
          return <article className="reading-note" key={note.id}><p className="public-post__meta">{new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeZone:'Asia/Seoul'}).format(new Date(note.createdAt))} · {note.visibility === 'private' ? '나만 보기' : '공개'} · {note.pageLabel || `${note.currentPageSnapshot}쪽`}</p>
            {image ? <Image className="reading-note__image" src={image} alt="이 책에 남긴 나의 사진 기록" width={1000} height={800} unoptimized /> : null}{note.quoteText ? <blockquote>{note.quoteText}</blockquote> : null}{noteBody(note.body) ? <p className="public-post__body">{noteBody(note.body)}</p> : null}
            <div className="reading-note-actions"><button className="text-button" type="button" disabled={disabled} onClick={() => edit(note)}>기록 수정</button><button className="text-button" type="button" disabled={disabled} onClick={() => void removeNote(note)}>기록 삭제</button></div>
          </article>;
        })}
      </section>
    </div>
  </>;
}
