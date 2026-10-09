import type {ShelfSlot} from './shelves';
import type {DeskBody} from './desk-collision';

export type DecorSurface='shelves'|'desk';
export type DeskSlot=ShelfSlot&{depth:number};
export const DESK_SURFACE_Y=1.89;
export const deskBounds={minX:-5.19,maxX:-.49,minZ:.855,maxZ:2.845};
const deskSlots:DeskSlot[]=[
  {id:'desk-back-left',label:'왼쪽 뒤 · 작은 자리',x:-5.16,y:DESK_SURFACE_Y,z:.91,width:.38,depth:.72,maxHeight:.92},
  {id:'desk-front-left',label:'왼쪽 앞',x:-5.14,y:DESK_SURFACE_Y,z:2.05,width:.76,depth:.68,maxHeight:1.35},
  {id:'desk-front-middle',label:'앞쪽 가운데',x:-4.24,y:DESK_SURFACE_Y,z:2.08,width:.72,depth:.64,maxHeight:1.10},
  {id:'desk-back-right',label:'오른쪽 뒤',x:-1.08,y:DESK_SURFACE_Y,z:.90,width:.53,depth:.65,maxHeight:1.10},
];
export const studyDeskSlots=()=>deskSlots;
export const decorationSurface=(slotId:string):DecorSurface=>slotId.startsWith('desk-')?'desk':'shelves';
export const isDeskSlot=(slot:ShelfSlot):slot is DeskSlot=>'depth' in slot;
// Includes the closed books' full pull distance. These areas stay reserved even
// before a reader has books, so adding one never displaces their decorations.
export const deskProtectedZones:DeskBody[]=[
  {id:'open-book',x:-2.20,z:1.875,width:2.04,depth:1.47,bottom:1.89,top:4},
  {id:'recent-books',x:-4.19,z:1.405,width:1.18,depth:1.17,bottom:1.89,top:4},
  {id:'notebook',x:-.84,z:2.27,width:.80,depth:1.05,bottom:1.89,top:4},
];
