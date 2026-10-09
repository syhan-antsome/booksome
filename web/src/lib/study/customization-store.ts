import {defaultStudySettings,type StudySettings} from './types';
import {findDecor,decorSupportsSurface,type StudyDecoration} from './decor-catalog';
import {studyShelfSlots} from './shelves';
import {studyDeskSlots,decorationSurface} from './desk-layout';

export type StudyRoomDocument={settings:StudySettings;decorations:StudyDecoration[]};
export const defaultRoomDocument:StudyRoomDocument={settings:defaultStudySettings,decorations:[]};
export const roomStorageKey=(ownerId:string)=>`booksome-study-room-v2:${encodeURIComponent(ownerId)}`;
const enumValue=<T extends string>(value:unknown,choices:readonly T[],fallback:T):T=>choices.includes(value as T)?value as T:fallback;
export function normalizeRoomDocument(value:unknown):StudyRoomDocument {
  const raw=value&&typeof value==='object'?value as Record<string,unknown>:{},source=raw.settings&&typeof raw.settings==='object'?raw.settings as Record<string,unknown>:{};
  const settings:StudySettings={
    plants:typeof source.plants==='boolean'?source.plants:true,rug:typeof source.rug==='boolean'?source.rug:true,
    light:typeof source.light==='number'&&Number.isFinite(source.light)?Math.max(0,Math.min(100,source.light)):100,
    accent:enumValue(source.accent,['#d97750','#6f8977','#7b8797'],'#d97750'),
    wood:enumValue(source.wood,['oak','walnut','ivory','ash'],'oak'),wall:enumValue(source.wall,['cream','sage','mist','clay'],'cream'),
    wallTexture:enumValue(source.wallTexture,['plaster','linen'],'plaster'),floor:enumValue(source.floor,['oak','walnut','herringbone'],'oak'),
    rugColor:enumValue(source.rugColor,['sand','sage','terracotta'],'sand'),rugPattern:enumValue(source.rugPattern,['woven','stripes','grid'],'woven'),
    backdrop:enumValue(source.backdrop,['forest','new-york','tokyo','london','seoul'],'forest'),
  };
  const validSlots=new Set([...studyShelfSlots(),...studyDeskSlots()].map(slot=>slot.id)),seenSlots=new Set<string>(),seenIds=new Set<string>(),decorations:StudyDecoration[]=[];
  for(const value of (Array.isArray(raw.decorations)?raw.decorations:[]).slice(0,216)) {
    if(!value||typeof value!=='object')continue;
    const item=value as Record<string,unknown>,catalog=typeof item.type==='string'?findDecor(item.type):undefined;
    if(!catalog||typeof item.id!=='string'||!/^[\w-]{1,80}$/.test(item.id)||typeof item.slotId!=='string'||!validSlots.has(item.slotId)||!Number.isInteger(item.page)||(item.page as number)<0||(item.page as number)>999)continue;
    const surface=decorationSurface(item.slotId),page=surface==='desk'?0:item.page as number;
    if(!decorSupportsSurface(catalog.id,surface))continue;
    const location=`${page}:${item.slotId}`;if(seenSlots.has(location)||seenIds.has(item.id))continue;
    seenSlots.add(location);seenIds.add(item.id);
    decorations.push({id:item.id,type:catalog.id,slotId:item.slotId,page,color:Number.isInteger(item.color)&&Number(item.color)>=0&&Number(item.color)<3?Number(item.color):0,rotation:Number.isInteger(item.rotation)&&Number(item.rotation)>=0&&Number(item.rotation)<4?Number(item.rotation):0});
  }
  return {settings,decorations};
}
type RoomSnapshot={ownerId:string|null;ready:boolean;document:StudyRoomDocument;saved:StudyRoomDocument;editing:boolean;dirty:boolean;canUndo:boolean;error:string};
const initial:RoomSnapshot={ownerId:null,ready:false,document:defaultRoomDocument,saved:defaultRoomDocument,editing:false,dirty:false,canUndo:false,error:''};
type StorageAccess=()=>Pick<Storage,'getItem'|'setItem'>|null;
const equal=(a:StudyRoomDocument,b:StudyRoomDocument)=>JSON.stringify(a)===JSON.stringify(b);
export class StudyCustomizationStore {
  private state=initial;
  private listeners=new Set<()=>void>();
  private history:StudyRoomDocument[]=[];
  constructor(private readonly storage:StorageAccess){}
  getSnapshot=()=>this.state;
  getServerSnapshot=()=>initial;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private publish(next:RoomSnapshot){this.state=next;this.listeners.forEach(listener=>listener());}
  setOwner(ownerId:string|null,force=false) {
    if(!force&&this.state.ready&&this.state.ownerId===ownerId)return;
    let document=defaultRoomDocument;
    try {const storage=this.storage(),raw=ownerId?storage?.getItem(roomStorageKey(ownerId)):null;if(raw){const stored=JSON.parse(raw);if(stored?.version===2)document=normalizeRoomDocument(stored.document);}else if(ownerId){const legacy=storage?.getItem('booksome-study-settings-v1');if(legacy)document=normalizeRoomDocument({settings:JSON.parse(legacy)});}}
    catch { /* A denied or malformed store still allows a fresh preview. */ }
    if(force&&this.state.ownerId===ownerId&&equal(document,this.state.saved))return;
    this.history=[];this.publish({ownerId,ready:true,document,saved:document,editing:false,dirty:false,canUndo:false,error:''});
  }
  begin(ownerId:string|null){if(!this.state.ready||this.state.ownerId!==ownerId)return;this.history=[];this.publish({...this.state,editing:true,dirty:false,canUndo:false,error:''});}
  update(ownerId:string|null,document:StudyRoomDocument) {
    if(this.state.ownerId!==ownerId||!this.state.editing)return;
    if(document.decorations.length>216){this.publish({...this.state,error:'소품을 치운 뒤 새로운 소품을 놓아주세요.'});return;}
    const normalized=normalizeRoomDocument(document);if(equal(normalized,this.state.document))return;
    if(JSON.stringify(normalized.decorations)===JSON.stringify(this.state.document.decorations))normalized.decorations=this.state.document.decorations;
    this.history.push(this.state.document);if(this.history.length>30)this.history.shift();
    this.publish({...this.state,document:normalized,dirty:!equal(normalized,this.state.saved),canUndo:true,error:''});
  }
  undo(ownerId:string|null){if(this.state.ownerId!==ownerId||!this.state.editing)return;const document=this.history.pop();if(document)this.publish({...this.state,document,dirty:!equal(document,this.state.saved),canUndo:this.history.length>0,error:''});}
  cancel(ownerId:string|null){if(this.state.ownerId!==ownerId)return;this.history=[];this.publish({...this.state,document:this.state.saved,editing:false,dirty:false,canUndo:false,error:''});}
  save(ownerId:string|null) {
    if(!ownerId||this.state.ownerId!==ownerId||!this.state.editing)return false;
    try {
      const storage=this.storage();if(!storage)throw new Error('Storage unavailable');
      storage.setItem(roomStorageKey(ownerId),JSON.stringify({version:2,document:this.state.document}));
      this.history=[];this.publish({...this.state,saved:this.state.document,editing:false,dirty:false,canUndo:false,error:''});return true;
    }catch{this.publish({...this.state,error:'이 브라우저에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.'});return false;}
  }
}
