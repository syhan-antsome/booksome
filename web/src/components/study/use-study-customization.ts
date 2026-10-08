'use client';

import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {defaultRoomDocument,roomStorageKey,StudyCustomizationStore,type StudyRoomDocument} from '@/lib/study/customization-store';

export function useStudyCustomization(ownerId:string|null) {
  const [store]=useState(()=>new StudyCustomizationStore(()=>typeof window==='undefined'?null:window.localStorage));
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getServerSnapshot);
  useEffect(()=>{store.setOwner(ownerId);const changed=(event:StorageEvent)=>{if(ownerId&&event.key===roomStorageKey(ownerId)&&!store.getSnapshot().editing)store.setOwner(ownerId,true);};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[ownerId,store]);
  const own=snapshot.ownerId===ownerId;
  const commands=useMemo(()=>({begin:()=>store.begin(ownerId),update:(document:StudyRoomDocument)=>store.update(ownerId,document),undo:()=>store.undo(ownerId),cancel:()=>store.cancel(ownerId),save:()=>store.save(ownerId)}),[ownerId,store]);
  return {
    document:own?snapshot.document:defaultRoomDocument,ready:own&&snapshot.ready,editing:own&&snapshot.editing,
    dirty:own&&snapshot.dirty,canUndo:own&&snapshot.canUndo,error:own?snapshot.error:'',
    ...commands,
  };
}
