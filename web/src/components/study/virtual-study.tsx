'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { ReaderLink, SessionLink } from '@/components/portal-session';
import { BookCover } from '@/components/book-cover';
import {studyBookHref,studyCoverHref,type StudyBackdrop,type StudyBook,type StudySettings,type StudyView} from '@/lib/study/types';
import type { StudyScene } from '@/lib/study/scene';
import type {BackdropStatus} from '@/lib/study/city-backdrop';
import { useStudyLibrary } from './use-study-library';
import {useStudyCustomization} from './use-study-customization';
import {CustomizationPanel} from './customization-panel';
import {MouseButtonIcon} from './mouse-button-icon';
import {findDecor,type DecorType,type StudyDecoration} from '@/lib/study/decor-catalog';
import {buildShelfPages} from '@/lib/study/shelf-layout';
import {studyShelfSlots} from '@/lib/study/shelves';
import {sceneryOptions} from '@/lib/study/scenery-options';
import styles from './study.module.css';

function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); else if (!open && dialog?.open) dialog.close(); }, [open]);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className={styles.dialogHead}><h2>{title}</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></div>{children}</dialog>;
}

export function VirtualStudy() {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null), engine = useRef<StudyScene | null>(null);
  const notebookHint=useRef<HTMLAnchorElement>(null);
  const decorationHints=useRef<HTMLDivElement>(null),studyRoot=useRef<HTMLDivElement>(null),customPanel=useRef<HTMLElement>(null),customButton=useRef<HTMLButtonElement>(null);
  const decorActions=useRef<{place:(id:string)=>void;select:(id:string|null)=>void}>({place:()=>{},select:()=>{}});
  const openingPage=useRef(false);
  const {books,ownerId,loading:loadingBooks,refreshing:refreshingBooks,error:bookError,expired,accountChanged,signedIn,checking,reload}=useStudyLibrary();
  const room=useStudyCustomization(expired||accountChanged?null:ownerId),settings=room.document.settings,customizing=room.editing;
  const [page,setPage]=useState<{ownerId:string|null;index:number}>({ownerId:null,index:0});
  const shelfPlan=useMemo(()=>buildShelfPages(books,room.document.decorations),[books,room.document.decorations]),pages=shelfPlan.length;
  const shelfPage=page.ownerId===ownerId?Math.min(page.index,pages-1):0;
  const content=shelfPlan[shelfPage],displayedBooks=content.books;
  const appliedContent=useRef<typeof content|null>(null),pendingBook=useRef<{id:string;ownerId:string|null}|null>(null);
  const [selectedType,setSelectedType]=useState<DecorType|null>(null),[selectedDecorId,setSelectedDecorId]=useState<string|null>(null),[placing,setPlacing]=useState(false),[saveNotice,setSaveNotice]=useState('');
  const selectedDecoration=customizing?room.document.decorations.find(item=>item.id===selectedDecorId)??null:null;
  const eligibleSlots=useMemo(()=>{const current=placing&&selectedDecoration?.page===shelfPage?studyShelfSlots().find(slot=>slot.id===selectedDecoration.slotId):undefined;return current?[...content.emptySlots,current]:content.emptySlots;},[content.emptySlots,placing,selectedDecoration,shelfPage]);
  const [navigation, setNavigation] = useState<'orbit' | 'pan'>('orbit');
  const editorState={active:customizing,placing:customizing&&placing,selectedId:selectedDecoration?.id??null,label:findDecor(selectedType??'')?.name??''};
  const latest = useRef({content, settings,navigation,editor:editorState});
  useEffect(() => { latest.current = {content, settings,navigation,editor:editorState}; });
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [backdropStatus,setBackdropStatus]=useState<BackdropStatus|null>(null);
  const backdropPhase=settings.backdrop!=='forest'&&backdropStatus?.mode===settings.backdrop?backdropStatus.phase:null;
  const [view, setView] = useState<StudyView>('room'), [selected, setSelected] = useState<StudyBook | null>(null);
  const visibleSelection=selected?books.find(book=>book.id===selected.id)??null:null;
  const [libraryOpen, setLibraryOpen] = useState(false);
  useEffect(()=>{if(!saveNotice)return;const timer=setTimeout(()=>setSaveNotice(''),3200);return()=>clearTimeout(timer);},[saveNotice]);
  useEffect(()=>{if(!customizing||!customPanel.current)return;const panel=customPanel.current;const measure=()=>studyRoot.current?.style.setProperty('--decor-panel-height',`${panel.getBoundingClientRect().height+32}px`);const observer=new ResizeObserver(measure);observer.observe(panel);measure();return()=>observer.disconnect();},[customizing]);
  useEffect(() => {
    let active = true, room: StudyScene | null = null;
    openingPage.current=false;
    import('@/lib/study/scene').then(module => {
      if (!active || !container.current) return;
      function navigate(href:string) {if(active&&!openingPage.current){openingPage.current=true;router.push(href);}}
      room = module.createStudyScene(
        container.current, latest.current.content.books, latest.current.settings,
        book => { if (active) setSelected(book); },
        book => navigate(studyBookHref(book)),
        () => navigate('/library'),
        () => { if (active) setError('그래픽 화면이 중단됐어요. 다시 열거나 기존 서재를 이용해주세요.'); },
        notebookHint.current,decorationHints.current,id=>decorActions.current.place(id),id=>decorActions.current.select(id),status=>{if(active)setBackdropStatus(status);}
      );
      room.setContent(latest.current.content.books,latest.current.content.decorations);appliedContent.current=latest.current.content;
      room.setNavigation(latest.current.navigation); engine.current = room;
      room.setDecorationEditor(latest.current.editor);
      return room.ready.then(() => { if (active) setReady(true); });
    }).catch(() => { if (active) setError('3D 서재를 열지 못했어요. 브라우저의 그래픽 지원과 연결을 확인해주세요.'); });
    return () => { active = false; room?.dispose(); engine.current = null;appliedContent.current=null; };
  }, [retry,router]);
  useEffect(() => {
    const scene=engine.current;if(!scene)return;
    if(appliedContent.current!==content){scene.setContent(content.books,content.decorations);appliedContent.current=content;}
    if(pendingBook.current&&pendingBook.current.ownerId!==ownerId)pendingBook.current=null;
    if(ready&&pendingBook.current&&displayedBooks.some(book=>book.id===pendingBook.current?.id)){
      scene.selectBook(pendingBook.current.id);pendingBook.current=null;
    }
  }, [content,displayedBooks,ready,ownerId]);
  useEffect(() => { engine.current?.setSettings(settings); }, [settings]);
  useEffect(()=>{engine.current?.setDecorationEditor({active:customizing,placing:customizing&&placing,selectedId:selectedDecoration?.id??null,label:findDecor(selectedType??'')?.name??''});},[customizing,placing,selectedDecoration,selectedType,ready]);
  useEffect(()=>{decorActions.current={place:placeDecoration,select:selectDecoration};});
  function changeSettings(next:StudySettings){room.update({...room.document,settings:next});}
  function beginCustomizing(){room.begin();setSelectedType(null);setSelectedDecorId(null);setPlacing(false);engine.current?.clearSelection();changeView('shelves');}
  function finishCustomizing(save:boolean){if(save&&!room.save())return;if(!save)room.cancel();if(save)setSaveNotice('꾸미기를 저장했어요');setSelectedType(null);setSelectedDecorId(null);setPlacing(false);customButton.current?.focus();}
  function chooseDecoration(type:DecorType|null){setSelectedType(type);setSelectedDecorId(null);setPlacing(Boolean(type));}
  function selectDecoration(id:string|null){const item=room.document.decorations.find(item=>item.id===id);if(item&&!room.editing)room.begin();setSelectedDecorId(item?.id??null);setSelectedType(item?.type??null);setPlacing(false);}
  function placeDecoration(slotId:string){
    if(!customizing||!selectedType||!eligibleSlots.some(slot=>slot.id===slotId))return;
    const item:StudyDecoration=selectedDecoration?{...selectedDecoration,slotId,page:shelfPage}:{id:crypto.randomUUID(),type:selectedType,slotId,page:shelfPage,color:0,rotation:0};
    room.update({...room.document,decorations:selectedDecoration?room.document.decorations.map(previous=>previous.id===item.id?item:previous):[...room.document.decorations,item]});setSelectedDecorId(item.id);setPlacing(false);
  }
  function editDecoration(change:Partial<StudyDecoration>){if(selectedDecoration)room.update({...room.document,decorations:room.document.decorations.map(item=>item.id===selectedDecoration.id?{...item,...change}:item)});}
  function removeDecoration(){if(!selectedDecoration)return;room.update({...room.document,decorations:room.document.decorations.filter(item=>item.id!==selectedDecoration.id)});setSelectedDecorId(null);setSelectedType(null);setPlacing(false);}
  function changeView(next: StudyView) { setView(next); engine.current?.setView(next); }
  function previewScenery(backdrop?:StudyBackdrop){setView('room');engine.current?.setSceneryView(backdrop);}
  function changeNavigation(next: 'orbit' | 'pan') { setNavigation(next); engine.current?.setNavigation(next); }
  function prepareNotebookNavigation() {openingPage.current=true;engine.current?.clearSelection();}
  function changeShelfPage(index:number) {pendingBook.current=null;if(!placing){setSelectedDecorId(null);setSelectedType(null);}setPage({ownerId,index});}
  function selectListedBook(id:string) {
    const nextPage=shelfPlan.findIndex(page=>page.books.some(book=>book.id===id));if(nextPage<0)return;
    setLibraryOpen(false);
    if(nextPage!==shelfPage||!ready){pendingBook.current={id,ownerId};setPage({ownerId,index:nextPage});setView('shelves');return;}
    const nextView=engine.current?.selectBook(id);if(nextView)setView(nextView);
  }
  return <div ref={studyRoot} className={styles.study} data-customizing={customizing} data-backdrop={settings.backdrop}>
    <header className={styles.header}><div className={styles.brand}><BrandLogo /><span className={styles.divider} /><h1>내 서재</h1></div><div className={styles.actions}><div className={styles.session}><SessionLink/></div><button ref={customButton} type="button" aria-pressed={customizing} onClick={()=>customizing?finishCustomizing(false):beginCustomizing()} disabled={!ready||!room.ready||loadingBooks||expired||accountChanged||Boolean(signedIn&&bookError&&!books.length)}>꾸미기</button><button className={styles.primary} type="button" onClick={() => setLibraryOpen(true)} disabled={customizing}>책 추가</button></div></header>
    <main id="main-content" className={styles.main}>
      <div ref={container} className={styles.canvas} role="region" aria-label={`${sceneryOptions.find(item=>item.id===settings.backdrop)?.name??'숲'} 풍경의 입체 서재`} />
      <div ref={decorationHints} className={styles.decorMarkers} aria-label="소품을 놓을 수 있는 빈 칸"/>
      <Link ref={notebookHint} href="/library" onNavigate={prepareNotebookNavigation} className={styles.notebookHint} aria-label="책 목록과 독서 기록 보기" hidden>책 목록 <span aria-hidden="true">↗</span></Link>
      {!ready && !error ? <div className={styles.loading} role="status"><span />서재에 빛을 들이고 있어요…</div> : null}
      {error ? <div className={styles.error} role="alert"><h2>잠시 서재를 열 수 없어요</h2><p>{error}</p><button type="button" onClick={() => { setError(''); setReady(false); setView('room'); setRetry(value => value + 1); }}>다시 열기</button><Link href="/library">기존 내 서재 열기</Link></div> : null}
      {ready&&loadingBooks&&books.length===0 ? <div className={styles.empty} role="status"><p>{checking?'로그인을 확인하고 있어요…':'내 책을 책장에 놓고 있어요…'}</p></div> : null}
      {ready&&!loadingBooks&&bookError&&books.length===0 ? <div className={styles.empty} role="alert"><p>{bookError}</p>{expired?<Link href="/login?next=%2Fstudy">다시 로그인하기</Link>:<button type="button" onClick={reload}>{accountChanged?'새로고침':'다시 불러오기'}</button>}</div> : null}
      {ready&&!customizing&&!loadingBooks&&!bookError&&books.length===0 ? <div className={styles.empty}><p>{signedIn?'첫 책을 기다리는 나의 공간.':'나의 책으로 채워갈 서재.'}</p>{signedIn?<ReaderLink href="/library/add">첫 책 등록하기</ReaderLink>:<Link href="/login?next=%2Fstudy">로그인하고 내 서재 채우기</Link>}</div> : null}
      {ready&&!customizing&&backdropPhase&&backdropPhase!=='ready'?<div className={styles.backdropNotice} role="status">{backdropPhase==='loading'?'도시 풍경을 불러오고 있어요…':<>풍경을 불러오지 못했어요. <button type="button" onClick={()=>engine.current?.retryBackdrop()}>다시 불러오기</button></>}</div>:null}
    </main>
    <nav className={styles.views} aria-label="서재 시점">{([['room', '전체'], ['shelves', '책장'], ['desk', '책상']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => changeView(key)} disabled={!ready}>{label}</button>)}</nav>
    <div className={styles.navigation} aria-label="화면 조작">
      {([['orbit', '둘러보기'], ['pan', '화면 이동']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={navigation === key} title={key === 'pan' ? '마우스 오른쪽 버튼을 누른 채 드래그해 이동해요. 이 모드를 고르면 왼쪽 드래그와 터치도 이동합니다.' : '마우스 왼쪽 버튼을 누른 채 드래그해 둘러봐요. 모바일에서는 한 손가락으로 움직입니다.'} disabled={!ready} onClick={() => changeNavigation(key)}><span className={styles.mouseHint}><MouseButtonIcon button={key==='orbit'?'left':'right'}/></span>{label}</button>)}
      <button className={styles.cameraReset} type="button" disabled={!ready} title="회전·위치·확대를 처음 구도로 되돌려요. 꾸미기 설정은 유지합니다." onClick={() => changeView('room')}>초기화</button>
    </div>
    <div className={styles.caption}><span>{loadingBooks?'내 서재를 확인하는 중…':signedIn&&books.length?`내 서재의 책 · ${books.length}권`:bookError?'내 책을 불러오지 못했어요':signedIn?'내 서재의 책 · 0권':'로그인하면 나의 책이 놓여요'}</span>{bookError&&books.length>0?<span role="status">최근 변경을 확인하지 못했어요. <button type="button" onClick={reload}>다시 확인</button></span>:null}<Link href="/library" onNavigate={prepareNotebookNavigation}>책 목록 · 독서 기록</Link></div>
    {saveNotice?<div className={styles.saveNotice} role="status">{saveNotice}</div>:null}
    {pages>1?<nav className={styles.shelfPages} aria-label="책장 페이지"><button type="button" aria-label="이전 책장" disabled={shelfPage===0||!ready} onClick={()=>changeShelfPage(shelfPage-1)}>←</button><span aria-live="polite">책장 {shelfPage+1} / {pages}</span><button type="button" aria-label="다음 책장" disabled={shelfPage===pages-1||!ready} onClick={()=>changeShelfPage(shelfPage+1)}>→</button></nav>:null}
    {customizing?<CustomizationPanel panelRef={customPanel} document={room.document} signedIn={signedIn} dirty={room.dirty} canUndo={room.canUndo} error={room.error} selectedType={selectedType} selected={selectedDecoration} placing={placing} available={eligibleSlots} placed={content.decorations} onSelectPlaced={selectDecoration} onChoose={chooseDecoration} onPlace={placeDecoration} onMove={()=>setPlacing(true)} onRemove={removeDecoration} onRotate={()=>selectedDecoration&&editDecoration({rotation:(selectedDecoration.rotation+1)%4})} onColor={color=>editDecoration({color})} onSettings={changeSettings} onSceneryView={previewScenery} backdropPhase={backdropPhase} onRetryScenery={()=>engine.current?.retryBackdrop()} onUndo={()=>{room.undo();chooseDecoration(null);}} onCancel={()=>finishCustomizing(false)} onSave={()=>finishCustomizing(true)}/>:null}
    <Dialog open={libraryOpen} title="서재의 책" onClose={() => setLibraryOpen(false)}>
      {signedIn ? <button className={styles.loadMine} disabled={loadingBooks||refreshingBooks} type="button" onClick={reload}>{loadingBooks ? '내 책을 가져오는 중…' : refreshingBooks?'최신 책 확인 중…':'내 책 새로고침'}</button> : checking ? <p className={styles.help}>로그인을 확인하고 있어요…</p> : <Link className={styles.loadMine} href="/login?next=%2Fstudy">로그인하고 내 책 불러오기</Link>}
      {bookError ? <p className={styles.bookError} role="alert">{bookError}</p> : null}
      {signedIn&&!loadingBooks&&!bookError&&books.length===0 ? <p className={styles.help}>아직 등록한 책이 없어요. 첫 책을 찾아볼까요?</p> : null}
      <ReaderLink className={styles.addReal} href="/library/add">새 책 등록하기</ReaderLink>
      {books.length ? <ul className={styles.bookList}>{books.map(book => <li key={book.id}><button type="button" onClick={()=>selectListedBook(book.id)}><BookCover src={studyCoverHref(book)} title={book.title} /><span>{book.title}<small>{book.author||'저자 정보 없음'}</small></span></button></li>)}</ul> : null}
    </Dialog>
    {visibleSelection&&!customizing ? <aside className={styles.selection} aria-label="선택한 책">
      <div><BookCover src={studyCoverHref(visibleSelection)} title={visibleSelection.title}/><strong title={visibleSelection.title} aria-live="polite">{visibleSelection.title}</strong><Link href={studyBookHref(visibleSelection)} prefetch={false} aria-label={`${visibleSelection.title} 상세 보기`}>상세 보기 →</Link><button type="button" aria-label="책 다시 꽂기" onClick={()=>engine.current?.clearSelection()}>×</button></div>
      <p>나온 책을 한 번 더 눌러도 상세로 이동해요.</p>
    </aside> : null}
  </div>;
}
