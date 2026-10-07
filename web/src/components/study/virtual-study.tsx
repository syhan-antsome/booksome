'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { ReaderLink, SessionLink } from '@/components/portal-session';
import { BookCover } from '@/components/book-cover';
import { defaultStudySettings, STUDY_PAGE_SIZE, studyBookPage, studyBookHref, studyCoverHref, type StudyBook, type StudySettings, type StudyView } from '@/lib/study/types';
import type { StudyScene } from '@/lib/study/scene';
import { useStudyLibrary } from './use-study-library';
import styles from './study.module.css';

const settingsKey = 'booksome-study-settings-v1';
function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); else if (!open && dialog?.open) dialog.close(); }, [open]);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.dialogHead}><h2>{title}</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>{children}</dialog>;
}

export function VirtualStudy() {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null), engine = useRef<StudyScene | null>(null);
  const notebookHint=useRef<HTMLAnchorElement>(null);
  const openingPage=useRef(false);
  const {books,ownerId,loading:loadingBooks,error:bookError,expired,accountChanged,signedIn,checking,reload}=useStudyLibrary();
  const [page,setPage]=useState<{ownerId:string|null;index:number}>({ownerId:null,index:0});
  const pages=Math.max(1,Math.ceil(books.length/STUDY_PAGE_SIZE));
  const shelfPage=page.ownerId===ownerId?Math.min(page.index,pages-1):0;
  const displayedBooks=useMemo(()=>books.slice(shelfPage*STUDY_PAGE_SIZE,(shelfPage+1)*STUDY_PAGE_SIZE),[books,shelfPage]);
  const appliedBooks=useRef<StudyBook[]|null>(null),pendingBook=useRef<{id:string;ownerId:string|null}|null>(null);
  const [settings, setSettings] = useState<StudySettings>(defaultStudySettings);
  const [navigation, setNavigation] = useState<'orbit' | 'pan'>('orbit');
  const latest = useRef({ books:displayedBooks, settings,navigation });
  useEffect(() => { latest.current = { books:displayedBooks, settings,navigation }; }, [displayedBooks, settings,navigation]);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [view, setView] = useState<StudyView>('room'), [selected, setSelected] = useState<StudyBook | null>(null);
  const visibleSelection=selected?books.find(book=>book.id===selected.id)??null:null;
  const [customizing, setCustomizing] = useState(false), [libraryOpen, setLibraryOpen] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(settingsKey) || 'null') as Partial<StudySettings> | null; if (saved) { const next = { plants: typeof saved.plants === 'boolean' ? saved.plants : true, rug: typeof saved.rug === 'boolean' ? saved.rug : true, light: typeof saved.light === 'number' && Number.isFinite(saved.light) ? Math.max(0, Math.min(100, saved.light)) : 100, accent: ['#d97750', '#6f8977', '#7b8797'].includes(saved.accent || '') ? saved.accent! : '#d97750' }; const frame = requestAnimationFrame(() => setSettings(next)); return () => cancelAnimationFrame(frame); } } catch { /* An unavailable browser store does not block the room. */ }
  }, []);
  useEffect(() => {
    let active = true, room: StudyScene | null = null;
    openingPage.current=false;
    import('@/lib/study/scene').then(module => {
      if (!active || !container.current) return;
      function navigate(href:string) {if(active&&!openingPage.current){openingPage.current=true;router.push(href);}}
      room = module.createStudyScene(
        container.current, latest.current.books, latest.current.settings,
        book => { if (active) setSelected(book); },
        book => navigate(studyBookHref(book)),
        () => navigate('/library'),
        () => { if (active) setError('그래픽 화면이 중단됐어요. 다시 열거나 기존 서재를 이용해주세요.'); },
        notebookHint.current
      );
      appliedBooks.current=latest.current.books;
      room.setNavigation(latest.current.navigation); engine.current = room;
      return room.ready.then(() => { if (active) setReady(true); });
    }).catch(() => { if (active) setError('3D 서재를 열지 못했어요. 브라우저의 그래픽 지원과 연결을 확인해주세요.'); });
    return () => { active = false; room?.dispose(); engine.current = null;appliedBooks.current=null; };
  }, [retry,router]);
  useEffect(() => {
    const scene=engine.current;if(!scene)return;
    if(appliedBooks.current!==displayedBooks){scene.setBooks(displayedBooks);appliedBooks.current=displayedBooks;}
    if(pendingBook.current&&pendingBook.current.ownerId!==ownerId)pendingBook.current=null;
    if(ready&&pendingBook.current&&displayedBooks.some(book=>book.id===pendingBook.current?.id)){
      scene.selectBook(pendingBook.current.id);pendingBook.current=null;
    }
  }, [displayedBooks,ready,ownerId]);
  useEffect(() => { engine.current?.setSettings(settings); }, [settings]);
  function changeSettings(next: StudySettings) { setSettings(next); try { localStorage.setItem(settingsKey, JSON.stringify(next)); } catch { /* Keep changes for this visit when storage is unavailable. */ } }
  function changeView(next: StudyView) { setView(next); engine.current?.setView(next); }
  function changeNavigation(next: 'orbit' | 'pan') { setNavigation(next); engine.current?.setNavigation(next); }
  function prepareNotebookNavigation() {openingPage.current=true;engine.current?.clearSelection();}
  function changeShelfPage(index:number) {pendingBook.current=null;setPage({ownerId,index});}
  function selectListedBook(id:string) {
    const nextPage=studyBookPage(books,id);if(nextPage===null)return;
    setLibraryOpen(false);
    if(nextPage!==shelfPage||!ready){pendingBook.current={id,ownerId};setPage({ownerId,index:nextPage});setView('shelves');return;}
    const nextView=engine.current?.selectBook(id);if(nextView)setView(nextView);
  }
  return <div className={styles.study}>
    <header className={styles.header}><div className={styles.brand}><BrandLogo /><span className={styles.divider} /><h1>내 서재</h1></div><div className={styles.actions}><div className={styles.session}><SessionLink/></div><button type="button" onClick={() => setCustomizing(true)} disabled={!ready}>꾸미기</button><button className={styles.primary} type="button" onClick={() => setLibraryOpen(true)}>책 추가</button></div></header>
    <main id="main-content" className={styles.main}>
      <div ref={container} className={styles.canvas} role="region" aria-label="밝은 원목 가상 서재" />
      <Link ref={notebookHint} href="/library" onNavigate={prepareNotebookNavigation} className={styles.notebookHint} aria-label="수첩을 열어 책과 독서 기록 보기" hidden>수첩 열기 <span aria-hidden="true">↗</span></Link>
      {!ready && !error ? <div className={styles.loading} role="status"><span />서재에 빛을 들이고 있어요…</div> : null}
      {error ? <div className={styles.error} role="alert"><h2>잠시 서재를 열 수 없어요</h2><p>{error}</p><button type="button" onClick={() => { setError(''); setReady(false); setView('room'); setRetry(value => value + 1); }}>다시 열기</button><Link href="/library">기존 내 서재 열기</Link></div> : null}
      {ready&&loadingBooks&&books.length===0 ? <div className={styles.empty} role="status"><p>{checking?'로그인을 확인하고 있어요…':'내 책을 책장에 놓고 있어요…'}</p></div> : null}
      {ready&&!loadingBooks&&bookError ? <div className={styles.empty} role="alert"><p>{bookError}</p>{expired?<Link href="/login?next=%2Fstudy">다시 로그인하기</Link>:<button type="button" onClick={reload}>{accountChanged?'새로고침':'다시 불러오기'}</button>}</div> : null}
      {ready&&!loadingBooks&&!bookError&&books.length===0 ? <div className={styles.empty}><p>{signedIn?'첫 책을 기다리는 나의 공간.':'나의 책으로 채워갈 서재.'}</p>{signedIn?<ReaderLink href="/library/add">첫 책 등록하기</ReaderLink>:<Link href="/login?next=%2Fstudy">로그인하고 내 서재 채우기</Link>}</div> : null}
    </main>
    <nav className={styles.views} aria-label="서재 시점">{([['room', '전체'], ['shelves', '책장'], ['desk', '책상']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => changeView(key)} disabled={!ready}>{label}</button>)}</nav>
    <div className={styles.navigation} aria-label="화면 조작">
      {([['orbit', '둘러보기'], ['pan', '화면 이동']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={navigation === key} title={key === 'pan' ? '드래그하거나 방향키로 위치를 옮겨요. 두 손가락으로 확대하고 이동할 수도 있어요.' : '어느 방향으로든 계속 드래그해 회전해요. 처음 구도를 누르면 원래 화면으로 돌아와요.'} disabled={!ready} onClick={() => changeNavigation(key)}>{label}</button>)}
      <button className={styles.cameraReset} type="button" disabled={!ready} title="회전·위치·확대를 처음 구도로 되돌려요" onClick={() => changeView('room')}>처음 구도</button>
    </div>
    <div className={styles.caption}><span>{loadingBooks?'내 서재를 확인하는 중…':bookError?'내 책을 불러오지 못했어요':signedIn?`내 서재의 책 · ${books.length}권`:'로그인하면 나의 책이 놓여요'}</span><Link href="/library" onNavigate={prepareNotebookNavigation}>수첩 열기 · 책과 독서 기록</Link></div>
    {pages>1?<nav className={styles.shelfPages} aria-label="책장 페이지"><button type="button" aria-label="이전 책장" disabled={shelfPage===0||!ready} onClick={()=>changeShelfPage(shelfPage-1)}>←</button><span aria-live="polite">책장 {shelfPage+1} / {pages}</span><button type="button" aria-label="다음 책장" disabled={shelfPage===pages-1||!ready} onClick={()=>changeShelfPage(shelfPage+1)}>→</button></nav>:null}
    <Dialog open={customizing} title="서재 꾸미기" onClose={() => setCustomizing(false)}>
      <p className={styles.help}>이 브라우저에 저장돼요.</p>
      <label className={styles.range}>햇빛 <span>{settings.light}%</span><input type="range" min="0" max="100" value={settings.light} onChange={event => changeSettings({ ...settings, light: Number(event.target.value) })} /></label>
      <label className={styles.check}><span>식물 놓기</span><input type="checkbox" checked={settings.plants} onChange={event => changeSettings({ ...settings, plants: event.target.checked })} /></label>
      <label className={styles.check}><span>러그 펼치기</span><input type="checkbox" checked={settings.rug} onChange={event => changeSettings({ ...settings, rug: event.target.checked })} /></label>
      <fieldset className={styles.colors}><legend>조명과 소품의 색</legend>{[['#d97750', '코랄'], ['#6f8977', '세이지'], ['#7b8797', '블루 그레이']].map(([color, label]) => <button key={color} style={{ backgroundColor: color }} type="button" aria-label={label} aria-pressed={settings.accent === color} onClick={() => changeSettings({ ...settings, accent: color })} />)}</fieldset>
      <button className={styles.reset} type="button" onClick={() => changeSettings(defaultStudySettings)}>처음 모습으로</button>
    </Dialog>
    <Dialog open={libraryOpen} title="서재의 책" onClose={() => setLibraryOpen(false)}>
      {signedIn ? <button className={styles.loadMine} disabled={loadingBooks} type="button" onClick={reload}>{loadingBooks ? '내 책을 가져오는 중…' : '내 책 새로고침'}</button> : checking ? <p className={styles.help}>로그인을 확인하고 있어요…</p> : <Link className={styles.loadMine} href="/login?next=%2Fstudy">로그인하고 내 책 불러오기</Link>}
      {bookError ? <p className={styles.bookError} role="alert">{bookError}</p> : null}
      {signedIn&&!loadingBooks&&!bookError&&books.length===0 ? <p className={styles.help}>아직 등록한 책이 없어요. 첫 책을 찾아볼까요?</p> : null}
      <ReaderLink className={styles.addReal} href="/library/add">새 책 등록하기</ReaderLink>
      {books.length ? <ul className={styles.bookList}>{books.map(book => <li key={book.id}><button type="button" onClick={()=>selectListedBook(book.id)}><BookCover src={studyCoverHref(book)} title={book.title} /><span>{book.title}<small>{book.author||'저자 정보 없음'}</small></span></button></li>)}</ul> : null}
    </Dialog>
    {visibleSelection ? <aside className={styles.selection} aria-label="선택한 책">
      <div><BookCover src={studyCoverHref(visibleSelection)} title={visibleSelection.title}/><strong title={visibleSelection.title} aria-live="polite">{visibleSelection.title}</strong><Link href={studyBookHref(visibleSelection)} prefetch={false} aria-label={`${visibleSelection.title} 상세 보기`}>상세 보기 →</Link><button type="button" aria-label="책 다시 꽂기" onClick={()=>engine.current?.clearSelection()}>×</button></div>
      <p>나온 책을 한 번 더 눌러도 상세로 이동해요.</p>
    </aside> : null}
  </div>;
}
