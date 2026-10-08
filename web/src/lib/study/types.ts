export type StudyView = 'room' | 'shelves' | 'desk';
export type StudyBackdrop='forest'|'new-york'|'tokyo'|'london';
export type StudyBook = { id: string; title: string; author: string; totalPages: number | null; status: 'reading' | 'finished'; coverUrl: string | null; currentPage: number };
export type StudySettings = {
  plants: boolean; rug: boolean; light: number; accent: string;
  wood:'oak'|'walnut'|'ivory'|'ash'; wall:'cream'|'sage'|'mist'|'clay'; wallTexture:'plaster'|'linen';
  floor:'oak'|'walnut'|'herringbone'; rugColor:'sand'|'sage'|'terracotta'; rugPattern:'woven'|'stripes'|'grid';
  backdrop:StudyBackdrop;
};
export const STUDY_PAGE_SIZE=24;
export function studyBookPage(books:Pick<StudyBook,'id'>[],id:string) {const index=books.findIndex(book=>book.id===id);return index<0?null:Math.floor(index/STUDY_PAGE_SIZE);}
export function studyBookHref(book: Pick<StudyBook,'id'>) { return `/library/${encodeURIComponent(book.id)}`; }
export function studyCoverHref(book: Pick<StudyBook,'id'|'coverUrl'>) { return book.coverUrl ? `/api/study/books/${encodeURIComponent(book.id)}/cover` : null; }
export const defaultStudySettings: StudySettings = { plants:true,rug:true,light:100,accent:'#d97750',wood:'oak',wall:'cream',wallTexture:'plaster',floor:'oak',rugColor:'sand',rugPattern:'woven',backdrop:'forest' };
