import type { ReadingBook } from '../reading';
import type { StudyBook } from './types';

class AccountChangedError extends Error {readonly accountChanged=true;constructor(){super('로그인 상태가 바뀌었어요. 새로고침해 주세요.');}}

export function mapStudyBooks(items: ReadingBook[], ownerId: string): StudyBook[] {
  if(items.some(book=>book.profileId!==ownerId))throw new AccountChangedError();
  return [...items].sort((a,b)=>Number(b.status==='reading')-Number(a.status==='reading')).map(book=>({
    id:book.id,title:book.title,author:book.author,status:book.status,currentPage:book.currentPage,
    totalPages:book.totalPages,coverUrl:book.externalCoverUrl,
  }));
}

function sameBooks(previous:StudyBook[],next:StudyBook[]) {
  return previous.length===next.length&&previous.every((book,index)=>{
    const other=next[index];
    return book.id===other.id&&book.title===other.title&&book.author===other.author&&book.status===other.status&&book.currentPage===other.currentPage&&book.totalPages===other.totalPages&&book.coverUrl===other.coverUrl;
  });
}

export type StudyLibraryState = { ownerId: string | null; status: 'idle'|'loading'|'ready'|'error'; books: StudyBook[]; refreshing:boolean; error: string; expired: boolean; accountChanged:boolean };
const emptyState:StudyLibraryState={ownerId:null,status:'idle',books:[],refreshing:false,error:'',expired:false,accountChanged:false};

/** Account-scoped state. Aborted/older responses can never refill another account's room. */
export class StudyLibraryStore {
  private state=emptyState;
  private listeners=new Set<()=>void>();
  private controller:AbortController|null=null;
  private generation=0;
  constructor(private readonly request:(signal:AbortSignal)=>Promise<ReadingBook[]>) {}
  getSnapshot=()=>this.state;
  getServerSnapshot=()=>emptyState;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private publish(next:StudyLibraryState){this.state=next;this.listeners.forEach(listener=>listener());}
  cancel(){this.controller?.abort();this.controller=null;this.generation++;}
  reset(){this.cancel();if(this.state!==emptyState)this.publish(emptyState);}
  async load(ownerId:string) {
    if(this.state.ownerId===ownerId&&this.controller&&!this.controller.signal.aborted)return;
    const background=this.state.ownerId===ownerId&&!this.state.expired&&!this.state.accountChanged&&(this.state.status==='ready'||this.state.books.length>0);
    const previousBooks=background?this.state.books:[];
    this.cancel();const generation=this.generation,controller=new AbortController();this.controller=controller;
    this.publish({ownerId,status:background?'ready':'loading',books:previousBooks,refreshing:background,error:'',expired:false,accountChanged:false});
    const requestController=new AbortController(),cancelRequest=()=>requestController.abort(controller.signal.reason);
    controller.signal.addEventListener('abort',cancelRequest,{once:true});
    const timeout=setTimeout(()=>requestController.abort(new DOMException('Request timed out','TimeoutError')),15000);
    try {
      const items=await this.request(requestController.signal);
      if(controller.signal.aborted||generation!==this.generation)return;
      const next=mapStudyBooks(items,ownerId),books=sameBooks(previousBooks,next)?previousBooks:next;
      this.publish({ownerId,status:'ready',books,refreshing:false,error:'',expired:false,accountChanged:false});
    } catch(cause) {
      if(controller.signal.aborted||generation!==this.generation)return;
      const expired=Boolean(cause&&typeof cause==='object'&&'status' in cause&&cause.status===401);
      const accountChanged=cause instanceof AccountChangedError;
      this.publish({ownerId,status:'error',books:expired||accountChanged?[]:previousBooks,refreshing:false,error:expired?'로그인이 만료됐어요. 다시 로그인해 주세요.':cause instanceof Error&&cause.name!=='TimeoutError'?cause.message:'내 책을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',expired,accountChanged});
    } finally {clearTimeout(timeout);controller.signal.removeEventListener('abort',cancelRequest);if(this.controller===controller)this.controller=null;}
  }
}
