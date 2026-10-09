import {STUDY_PAGE_SIZE,type StudyBook} from './types';
import {studyShelfSlots,type ShelfSlot} from './shelves';
import type {StudyDecoration} from './decor-catalog';
import {decorationSurface} from './desk-layout';

export function bookDimensions(book:StudyBook) {
  const hash=[...book.id].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,0),height=.735+(hash%4)*.033;
  return {height,depth:height*2/3,width:book.totalPages?Math.min(.21,Math.max(.07,book.totalPages*.00036)):.12+(hash%4)*.026};
}
export type PackedBook={book:StudyBook;slot:ShelfSlot;offset:number;scale:number};
export function packShelfBooks(books:StudyBook[],slots:ShelfSlot[],reserved:ReadonlySet<string>=new Set()) {
  const ordered=slots.filter(slot=>!reserved.has(slot.id)).sort((a,b)=>Math.round(b.y*10)-Math.round(a.y*10)||a.x-b.x);
  const occupied=ordered.map(()=>0),placed:PackedBook[]=[];let nextSlot=0;
  for(const book of books) {
    const {height,width}=bookDimensions(book);let index=nextSlot;
    const full=(i:number)=>!ordered[i]||occupied[i]+width*Math.min(1,ordered[i].maxHeight/height)+.04>ordered[i].width;
    for(let attempt=0;attempt<ordered.length&&full(index);attempt++)index=(index+1)%ordered.length;
    const slot=ordered[index];if(!slot||full(index))break;
    const scale=Math.min(1,slot.maxHeight/height);
    placed.push({book,slot,offset:occupied[index],scale});occupied[index]+=width*scale+.012;nextSlot=index;
  }
  return {placed,remaining:books.slice(placed.length),occupied:new Set(placed.map(item=>item.slot.id))};
}
export type StudyShelfPage={books:StudyBook[];decorations:StudyDecoration[];emptySlots:ShelfSlot[]};
export function buildShelfPages(books:StudyBook[],decorations:StudyDecoration[]):StudyShelfPage[] {
  const slots=studyShelfSlots(),shelfDecorations=decorations.filter(item=>decorationSurface(item.slotId)==='shelves'),deskDecorations=decorations.filter(item=>decorationSurface(item.slotId)==='desk');
  const lastDecorPage=Math.max(0,...shelfDecorations.map(item=>item.page)),pages:StudyShelfPage[]=[];
  let remaining=books,page=0;
  do {
    const props=shelfDecorations.filter(item=>item.page===page),reserved=new Set(props.map(item=>item.slotId));
    const packed=packShelfBooks(remaining.slice(0,STUDY_PAGE_SIZE),slots,reserved),placed=packed.placed.map(item=>item.book);
    pages.push({books:placed,decorations:[...props,...deskDecorations],emptySlots:slots.filter(slot=>!reserved.has(slot.id)&&!packed.occupied.has(slot.id))});
    remaining=remaining.slice(placed.length);page++;
  }while(remaining.length||page<=lastDecorPage);
  return pages;
}
