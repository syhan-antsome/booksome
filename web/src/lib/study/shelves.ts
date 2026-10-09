export type ShelfSlot={id:string;label:string;x:number;y:number;z:number;width:number;maxHeight:number};

/** Every cubby is usable; only reader-placed decorations reserve shelf space. */
export function studyShelfSlots():ShelfSlot[] {
  const slots:ShelfSlot[]=[],x=-1.45,z=-3.49;
  for(let col=0;col<4;col++)for(let row=0;row<4;row++) {
    slots.push({id:`main-${col}-${row}`,label:`큰 책장 ${col+1}열 · ${row+1}단`,x:x-2.32+col*1.55-.55,y:1.17+row*.94,z:z+.24+(col===0?1.06:0),width:1.15,maxHeight:row===3?.70:.80});
  }
  for(let row=0;row<4;row++)for(let col=0;col<2;col++) {
    slots.push({id:`side-${col}-${row}`,label:`작은 책장 ${col+1}열 · ${row+1}단`,x:col===0?2.06:3.67,y:1.18+row*.94,z:z+.2,width:col===0?1.12:1.02,maxHeight:row===3?(col===0?.86:.57):.80});
  }
  return slots;
}
