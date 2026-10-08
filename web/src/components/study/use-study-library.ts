'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePortalSession } from '@/components/portal-session';
import { portalRequest } from '@/lib/portal-request';
import type { ReadingBook } from '@/lib/reading';
import { StudyLibraryStore } from '@/lib/study/library-store';
import type { StudyBook } from '@/lib/study/types';

const noBooks:StudyBook[]=[];
export function useStudyLibrary() {
  const {signedIn,profileId,checking,loggingOut}=usePortalSession();
  const [store]=useState(()=>new StudyLibraryStore(signal=>portalRequest<ReadingBook[]>('/reading-life/books',{signal})));
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
  const canRead=signedIn&&Boolean(profileId)&&!checking&&!loggingOut;
  useEffect(()=>{
    if(!canRead||!profileId){store.reset();return;}
    const refresh=()=>{if(!document.hidden)void store.load(profileId);};
    void store.load(profileId);
    window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{store.cancel();window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[canRead,profileId,store]);
  const own=canRead&&snapshot.ownerId===profileId;
  return {
    books:own?snapshot.books:noBooks,
    loading:checking||(canRead&&(!own||snapshot.status==='loading'||snapshot.status==='idle')),
    refreshing:own&&snapshot.refreshing,
    error:own?snapshot.error:'',expired:own&&snapshot.expired,accountChanged:own&&snapshot.accountChanged,
    signedIn:canRead,checking,
    ownerId:canRead?profileId:null,
    reload:()=>{if(own&&snapshot.accountChanged){window.location.reload();return;}if(canRead&&profileId)void store.load(profileId);},
  };
}
