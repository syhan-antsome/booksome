'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ReadingDialog } from '@/components/reading-dialog';
import { ReadingIcon } from '@/components/reading-icon';
import styles from '@/components/reading-experience.module.css';
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
  const [view, setView] = useState<'notes' | 'quotes' | 'info'>('notes');
  const [dialog, setDialog] = useState<'note' | 'progress' | null>(null);
  const [focusId, setFocusId] = useState('note-body');
  const [menu, setMenu] = useState<string | null>(null);
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

  function selectView(next: 'notes' | 'quotes' | 'info') {
    setView(next);
    document.getElementById('notebook-title')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

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
      setBook(saved); setPage(String(saved.currentPage)); setTotal(saved.totalPages ? String(saved.totalPages) : ''); setDialog(null);
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
      clearComposer(); setDialog(null); setView('notes');
    }, editing ? '기록을 수정했어요.' : '나만 보는 기록을 남겼어요.');
  }
  function openComposer(focus = 'note-body') {
    if (editing) clearComposer();
    setFocusId(focus); setError(''); setMessage(''); setDialog('note');
  }
  function edit(note: ReadingNote) {
    setEditing(note); setText(noteBody(note.body)); setQuote(note.quoteText ?? '');
    setPageLabel(note.pageLabel ?? ''); setPhoto(null); upload.current = null; setMenu(null);
    setFocusId(note.quoteText ? 'note-quote' : 'note-body'); setError(''); setMessage(''); setDialog('note');
  }
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
  const visibleNotes = view === 'quotes' ? notes.filter(note => Boolean(note.quoteText?.trim())) : notes;
  const feedback = <>{error ? <p className={styles.error} role="alert">{error}</p> : null}{message ? <p className={styles.success} role="status">{message}</p> : null}</>;
  return <div className={styles.privatePage}>
    <div className={styles.privateLayout}>
      <aside className={styles.bookRail} aria-label="나의 책">
        <Link className={styles.backLink} href="/library">← 책 목록</Link>
        <div className={styles.railBook}>
          <BookCover loading="eager" className={styles.railCover} src={book.externalCoverUrl} title={book.title} />
          <div className={styles.railBookText}><p className={styles.eyebrow}>{book.status === 'finished' ? '완독한 책' : '읽고 있는 책'}</p><h2>{book.title}</h2><p className={styles.muted}>{book.author || '저자 정보 없음'}</p></div>
        </div>
        <div className={styles.progress}>
          <p><strong>{book.currentPage.toLocaleString('ko-KR')}</strong><span> / {book.totalPages ? `${book.totalPages.toLocaleString('ko-KR')}쪽` : '전체 쪽수 미등록'}</span></p>
          {book.totalPages ? <progress aria-label="읽은 쪽수" value={book.currentPage} max={book.totalPages} /> : null}
          <button type="button" className={styles.quietButton} disabled={disabled} onClick={() => { setError(''); setDialog('progress'); }}>읽은 위치 변경 <span aria-hidden="true">↗</span></button>
        </div>
        <nav className={styles.railNav} aria-label="이 책의 기록 보기">
          <button type="button" aria-pressed={view === 'notes'} onClick={() => selectView('notes')}><ReadingIcon name="notebook" />나의 독서노트<span>{notes.length}</span></button>
          <button type="button" aria-pressed={view === 'info'} onClick={() => selectView('info')}><ReadingIcon name="info" />책 정보</button>
          <button type="button" aria-pressed={view === 'quotes'} onClick={() => selectView('quotes')}><ReadingIcon name="quote" />인상 깊은 문장</button>
          <Link href="/study"><ReadingIcon name="book" />나의 책장 <span aria-hidden="true">↗</span></Link>
        </nav>
        <Link className={styles.railPublicLink} href={`/rooms?query=${encodeURIComponent(book.title)}`}><ReadingIcon name="comment" />이 책의 공개 이야기 찾기 <span aria-hidden="true">→</span></Link>
      </aside>
      <section className={styles.notebook} aria-labelledby="notebook-title">
        <header className={styles.notebookHeader}>
          <div><h1 id="notebook-title">{view === 'info' ? '책 정보' : view === 'quotes' ? '인상 깊은 문장' : '나의 독서노트'}</h1><p className={styles.scope}><ReadingIcon name="lock" />{notes.some(note => note.visibility !== 'private') ? '새 기록은 나만 볼 수 있어요' : '이 기록은 나만 볼 수 있어요'}</p></div>
          <div className={styles.createActions}><button type="button" className="button button--compact" disabled={disabled} onClick={() => openComposer()}><ReadingIcon name="plus" />내 기록 남기기</button><div className={styles.quickActions}>
            <button type="button" disabled={disabled} onClick={() => openComposer('note-quote')}><ReadingIcon name="quote" />문장</button>
            <button type="button" disabled={disabled} onClick={() => openComposer(editing ? 'note-body' : 'note-photo')}><ReadingIcon name="photo" />사진</button>
            <button type="button" disabled={disabled} onClick={() => openComposer()}><ReadingIcon name="pen" />생각</button>
          </div></div>
        </header>
        {!dialog ? feedback : null}
        {view === 'info' ? <div className={styles.bookInformation}><h2>{book.title}</h2><dl><div><dt>저자</dt><dd>{book.author || '정보 없음'}</dd></div><div><dt>출판사</dt><dd>{book.publisher || '정보 없음'}</dd></div><div><dt>출간일</dt><dd>{book.publishedDate || '정보 없음'}</dd></div><div><dt>ISBN</dt><dd>{book.isbn13 || '정보 없음'}</dd></div><div><dt>독서 상태</dt><dd>{book.status === 'finished' ? '완독' : '읽는 중'}</dd></div></dl>
          {book.description ? <p className={styles.noteText}>{book.description}</p> : <p className={styles.muted}>등록된 책 소개가 없어요.</p>}
          <button className="button button--outline" type="button" disabled={disabled} onClick={() => void finish()}>{pending === 'status' ? '변경 중…' : book.status === 'finished' ? '다시 읽는 중으로 바꾸기' : '이 책, 다 읽었어요'}</button>
        </div> : <>
          <div className={styles.timelineHeading}><h2>{view === 'quotes' ? '책 속에 남겨둔 문장' : '읽으며 남긴 순간들'}</h2><span>{visibleNotes.length}개의 기록</span></div>
          {!visibleNotes.length ? <div className={styles.empty}><ReadingIcon name={view === 'quotes' ? 'quote' : 'notebook'} /><h2>{view === 'quotes' ? '오래 간직하고 싶은 문장이 있나요?' : '이 책의 첫 순간을 남겨보세요'}</h2><p>한 문장, 한 장의 사진, 짧은 생각도 좋아요.<br />나중에 다시 펼쳐볼 나만의 독서노트가 됩니다.</p><button type="button" className="text-link" onClick={() => openComposer(view === 'quotes' ? 'note-quote' : 'note-body')}>첫 기록 남기기 <span aria-hidden="true">→</span></button></div> : <div className={styles.timeline}>{visibleNotes.map(note => {
            const image = noteImage(note);
            return <article className={styles.timelineEntry} key={note.id}>
              <div className={styles.noteMargin}><time dateTime={note.createdAt}>{new Intl.DateTimeFormat('ko-KR', { month:'long', day:'numeric', timeZone:'Asia/Seoul' }).format(new Date(note.createdAt))}</time><span>{new Intl.DateTimeFormat('ko-KR', { year:'numeric', timeZone:'Asia/Seoul' }).format(new Date(note.createdAt))}</span><strong>{note.pageLabel || `${note.currentPageSnapshot}쪽`}</strong></div>
              <div className={styles.noteContent}>
                <div className={styles.noteTopline}><span>{image ? '사진 기록' : note.quoteText ? '마음에 남은 문장' : '나의 생각'}{note.visibility !== 'private' ? ' · 기존 공개 기록' : ''}</span>
                  <div className={styles.noteMenu}><button type="button" className={styles.iconButton} aria-label="기록 관리" aria-expanded={menu === note.id} aria-controls={`note-actions-${note.id}`} onClick={() => setMenu(value => value === note.id ? null : note.id)}>···</button>{menu === note.id ? <div id={`note-actions-${note.id}`}><button type="button" disabled={disabled} onClick={() => edit(note)}>기록 수정</button><button type="button" disabled={disabled} onClick={() => { setMenu(null); void removeNote(note); }}>기록 삭제</button></div> : null}</div>
                </div>
                {image ? <Image className={styles.noteImage} src={image} alt="이 책에 남긴 나의 사진 기록" width={1000} height={800} unoptimized /> : null}
                {note.quoteText ? <blockquote className={styles.noteQuote}>{note.quoteText}</blockquote> : null}
                {noteBody(note.body) ? <p className={`${styles.noteText} ${!note.quoteText ? styles.thoughtText : ''}`}>{noteBody(note.body)}</p> : null}
              </div>
            </article>;
          })}</div>}
        </>}
      </section>
    </div>
    <ReadingDialog open={dialog === 'progress'} title="어디까지 읽었나요?" busy={disabled} onClose={() => setDialog(null)} focusId="reading-page">
      <form className={styles.editor} onSubmit={saveProgress} aria-busy={pending === 'progress'}><p className={styles.muted}>마지막으로 읽은 위치를 남겨두세요. 전체 쪽수는 비워둘 수 있어요.</p><div className={styles.pageFields}>
        <div className="discussion-field"><label htmlFor="reading-page">읽은 쪽수</label><input id="reading-page" type="number" min={0} step={1} value={page} onChange={e => setPage(e.target.value)} readOnly={disabled} required /></div>
        <div className="discussion-field"><label htmlFor="reading-total">전체 쪽수 · 선택</label><input id="reading-total" type="number" min={1} step={1} value={total} onChange={e => setTotal(e.target.value)} readOnly={disabled} /></div>
      </div>{dialog === 'progress' ? feedback : null}<button className="button" disabled={disabled} type="submit">{pending === 'progress' ? '저장 중…' : '읽은 위치 저장'}</button></form>
    </ReadingDialog>
    <ReadingDialog open={dialog === 'note'} title={editing ? '기록 수정하기' : '내 기록 남기기'} busy={disabled} onClose={() => { if (editing) clearComposer(); setDialog(null); }} focusId={focusId}>
      <form className={styles.editor} id="reading-note-composer" onSubmit={saveNote} aria-busy={pending === 'note'}>
        <p className={styles.scope}><ReadingIcon name="lock" />{editing && editing.visibility !== 'private' ? '이 기록의 기존 공개 범위는 유지됩니다.' : '나만 볼 수 있는 기록이에요.'}</p>
        <div className="discussion-field"><label htmlFor="note-quote">마음에 남은 문장 · 선택</label><textarea id="note-quote" value={quote} onChange={e => setQuote(e.target.value)} maxLength={10000} readOnly={disabled} placeholder="다시 읽고 싶은 책 속의 문장" /></div>
        <div className="discussion-field"><label htmlFor="note-body">나의 생각 · 선택</label><textarea id="note-body" value={text} onChange={e => setText(e.target.value)} maxLength={10000} readOnly={disabled} placeholder="지금 떠오르는 생각을 편하게 적어보세요." /></div>
        <div className="discussion-field"><label htmlFor="note-page-label">기록 위치 · 선택</label><input id="note-page-label" value={pageLabel} onChange={e => setPageLabel(e.target.value)} maxLength={255} placeholder={`비워두면 저장한 ${book.currentPage}쪽 위치를 사용해요`} readOnly={disabled} /></div>
        {!editing ? <div className="discussion-field"><label htmlFor="note-photo">사진 · 선택</label><input ref={fileInput} id="note-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={e => { setPhoto(e.target.files?.[0] ?? null); upload.current = null; }} /><small className={styles.muted}>8MB 이하 JPG·PNG·WEBP</small></div> : noteImage(editing) ? <p className={styles.muted}>사진 원본과 앱에서 표시한 문장은 그대로 유지됩니다.</p> : null}
        {dialog === 'note' ? feedback : null}
        <div className={styles.editorActions}><button className="button" type="submit" disabled={disabled}>{pending === 'note' ? '저장 중…' : editing ? '기록 수정 저장' : '나만 보는 기록 저장'}</button>{editing ? <button className={styles.quietButton} disabled={disabled} type="button" onClick={() => { clearComposer(); setDialog(null); }}>수정 취소</button> : null}</div>
      </form>
    </ReadingDialog>
  </div>;
}
