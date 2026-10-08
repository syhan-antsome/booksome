'use client';

import Link from 'next/link';
import {useState,type RefObject} from 'react';
import {decorCatalog,decorCategories,findDecor,type DecorType,type StudyDecoration} from '@/lib/study/decor-catalog';
import type {StudyRoomDocument} from '@/lib/study/customization-store';
import type {ShelfSlot} from '@/lib/study/shelves';
import {studyShelfSlots} from '@/lib/study/shelves';
import type {StudyBackdrop,StudySettings} from '@/lib/study/types';
import {roomThemes,rugColors,wallOptions,woodOptions} from '@/lib/study/theme-options';
import {DecorThumbnail} from './decor-thumbnail';
import {SceneryThumbnail} from './scenery-thumbnail';
import {sceneryOptions} from '@/lib/study/scenery-options';
import styles from './study.module.css';

type PanelProps={
  panelRef:RefObject<HTMLElement|null>;document:StudyRoomDocument;signedIn:boolean;dirty:boolean;canUndo:boolean;error:string;
  selectedType:DecorType|null;selected:StudyDecoration|null;placing:boolean;available:ShelfSlot[];
  placed:StudyDecoration[];onSelectPlaced:(id:string)=>void;
  onChoose:(type:DecorType|null)=>void;onPlace:(slotId:string)=>void;onMove:()=>void;onRemove:()=>void;onRotate:()=>void;onColor:(color:number)=>void;
  onSettings:(settings:StudySettings)=>void;onUndo:()=>void;onCancel:()=>void;onSave:()=>void;
  onSceneryView:(backdrop?:StudyBackdrop)=>void;backdropPhase:'loading'|'ready'|'error'|null;onRetryScenery:()=>void;
};
export function CustomizationPanel({panelRef,...props}:PanelProps) {
  const [tab,setTab]=useState<'decor'|'mood'|'scenery'>('decor'),[category,setCategory]=useState<string>('전체');
  const {document:{settings},selectedType,selected,placing,available}=props;
  const entry=selectedType?findDecor(selectedType):selected?findDecor(selected.type):null;
  function change<K extends keyof StudySettings>(key:K,value:StudySettings[K]){props.onSettings({...settings,[key]:value});}
  function chooseTab(next:typeof tab){if(next!=='decor')props.onChoose(null);setTab(next);if(next==='scenery')props.onSceneryView();}
  return <aside ref={panelRef} className={`${styles.customPanel} ${placing&&tab==='decor'?styles.choosingPlace:''}`} aria-label="서재 꾸미기">
    <div className={styles.customHead}><h2>서재 꾸미기</h2><button type="button" onClick={props.onCancel} aria-label="꾸미기 취소">×</button></div>
    <div className={styles.customTabs} role="tablist" aria-label="꾸미기 종류" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=['decor','mood','scenery'] as const;const next=event.key==='Home'?'decor':event.key==='End'?'scenery':tabs[(tabs.indexOf(tab)+(event.key==='ArrowLeft'?2:1))%3];chooseTab(next);event.currentTarget.querySelector<HTMLButtonElement>(`#study-${next}-tab`)?.focus();}}>{([['decor','소품'],['mood','색과 질감'],['scenery','풍경']] as const).map(([id,name])=><button key={id} type="button" role="tab" aria-selected={tab===id} aria-controls={`study-${id}-tools`} id={`study-${id}-tab`} onClick={()=>chooseTab(id)}>{name}</button>)}</div>
    <div className={styles.customBody} data-mode={tab}>
      <div role="tabpanel" aria-labelledby="study-decor-tab" id="study-decor-tools" hidden={tab!=='decor'}>
        {placing&&entry?<div className={styles.placementTools}>
          <div className={styles.placementItem}><DecorThumbnail type={entry.id} color={selected?.color??0}/><div><strong>{entry.name}</strong><span>표시된 빈 칸을 눌러 놓아주세요.</span></div><button type="button" onClick={()=>props.onChoose(null)}>다른 소품</button></div>
          {available.length?<label className={styles.slotPicker}>놓을 자리<select value="" onChange={event=>{if(event.target.value)props.onPlace(event.target.value);}} aria-label="빈 칸 목록으로 선택"><option value="">빈 칸 목록으로 선택 · {available.length}곳</option>{available.map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></label>:<p className={styles.help}>이 책장에 빈 칸이 없어요. 다른 책장을 보거나 놓은 소품을 치워주세요.</p>}
        </div>:null}
        {!placing&&selected&&entry?<div className={styles.placedTools}>
          <div className={styles.placementItem}><DecorThumbnail type={entry.id} color={selected.color}/><div><strong>{entry.name}</strong><span>내 책장의 작은 취향</span></div></div>
          <div className={styles.propActions}><button type="button" onClick={props.onMove}>옮기기</button><button type="button" onClick={props.onRotate}>회전</button><button type="button" onClick={props.onRemove}>치우기</button></div>
          <fieldset className={styles.propColors}><legend>소품 색상</legend>{entry.colors.map((color,index)=><button key={color} type="button" style={{backgroundColor:color}} aria-label={`${entry.name} 색상 ${index+1}`} aria-pressed={selected.color===index} onClick={()=>props.onColor(index)}/>)}</fieldset>
        </div>:null}
        <div className={styles.catalogTools}>
          <p className={styles.catalogHelp}>책이 없는 칸에 놓을 수 있어요. <span>{decorCatalog.length}가지 소품</span></p>
          <div className={styles.categories} aria-label="소품 종류">{['전체',...decorCategories].map(name=><button key={name} type="button" aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
          {props.placed.length?<details className={styles.placedList}><summary>놓은 소품 · {props.placed.length}</summary><ul>{props.placed.map(item=><li key={item.id}><button type="button" onClick={()=>props.onSelectPlaced(item.id)} aria-label={`${findDecor(item.type)?.name} 선택`}><DecorThumbnail type={item.type} color={item.color}/><span>{findDecor(item.type)?.name}<small>{studyShelfSlots().find(slot=>slot.id===item.slotId)?.label}</small></span></button></li>)}</ul></details>:null}
          <div className={styles.decorCatalog}>{decorCatalog.filter(item=>category==='전체'||item.category===category).map(item=><button key={item.id} type="button" aria-pressed={selectedType===item.id} onClick={()=>props.onChoose(item.id)}><DecorThumbnail type={item.id}/><span>{item.name}</span></button>)}</div>
        </div>
      </div>
      <div role="tabpanel" aria-labelledby="study-mood-tab" id="study-mood-tools" hidden={tab!=='mood'}>
        <div className={styles.themeChoices}>{roomThemes.map(theme=><button type="button" key={theme.id} onClick={()=>props.onSettings({...settings,...theme.settings})}>{theme.name}</button>)}</div>
        <fieldset className={styles.surfaceChoices}><legend>가구 색상</legend>{woodOptions.map(item=><button key={item.id} type="button" aria-pressed={settings.wood===item.id} onClick={()=>change('wood',item.id)}><span style={{backgroundColor:item.color}}/>{item.name}</button>)}</fieldset>
        <fieldset className={styles.surfaceChoices}><legend>벽 색상</legend>{wallOptions.map(item=><button key={item.id} type="button" aria-pressed={settings.wall===item.id} onClick={()=>change('wall',item.id)}><span style={{backgroundColor:item.color}}/>{item.name}</button>)}</fieldset>
        <fieldset className={styles.textureChoices}><legend>벽 질감</legend>{([['plaster','고운 회벽'],['linen','패브릭']] as const).map(([id,name])=><button type="button" key={id} aria-pressed={settings.wallTexture===id} onClick={()=>change('wallTexture',id)}>{name}</button>)}</fieldset>
        <fieldset className={styles.textureChoices}><legend>바닥</legend>{([['oak','밝은 원목'],['walnut','짙은 원목'],['herringbone','헤링본']] as const).map(([id,name])=><button type="button" key={id} aria-pressed={settings.floor===id} onClick={()=>change('floor',id)}>{name}</button>)}</fieldset>
        <label className={styles.check}><span>카펫 펼치기</span><input type="checkbox" checked={settings.rug} onChange={event=>change('rug',event.target.checked)}/></label>
        {settings.rug?<><fieldset className={styles.surfaceChoices}><legend>카펫 색상</legend>{rugColors.map(item=><button key={item.id} type="button" aria-pressed={settings.rugColor===item.id} onClick={()=>change('rugColor',item.id)}><span style={{backgroundColor:item.color}}/>{item.name}</button>)}</fieldset><fieldset className={styles.textureChoices}><legend>카펫 무늬</legend>{([['woven','자연스러운 직조'],['stripes','줄무늬'],['grid','체크']] as const).map(([id,name])=><button type="button" key={id} aria-pressed={settings.rugPattern===id} onClick={()=>change('rugPattern',id)}>{name}</button>)}</fieldset></>:null}
        <label className={styles.range}>햇빛 <span>{settings.light}%</span><input type="range" min="0" max="100" value={settings.light} onChange={event=>change('light',Number(event.target.value))}/></label>
        <label className={styles.check}><span>기본 식물 놓기</span><input type="checkbox" checked={settings.plants} onChange={event=>change('plants',event.target.checked)}/></label>
        <fieldset className={styles.propColors}><legend>조명과 쿠션 색상</legend>{[['#d97750','코랄'],['#6f8977','세이지'],['#7b8797','블루 그레이']].map(([color,name])=><button key={color} style={{backgroundColor:color}} type="button" aria-label={name} aria-pressed={settings.accent===color} onClick={()=>change('accent',color)}/>)}</fieldset>
      </div>
      <div role="tabpanel" aria-labelledby="study-scenery-tab" id="study-scenery-tools" hidden={tab!=='scenery'}>
        <p className={styles.sceneryIntro}>나의 서재가 머무는 풍경.<br/>마음에 드는 도시를 골라보세요.</p>
        <div className={styles.sceneryCards}>{sceneryOptions.map(item=><button key={item.id} type="button" aria-pressed={settings.backdrop===item.id} onClick={()=>{change('backdrop',item.id);if(settings.backdrop!==item.id&&(item.id==='new-york'||settings.backdrop==='new-york'))props.onSceneryView(item.id);}}><SceneryThumbnail city={item.id}/><strong>{item.name}</strong><span>{item.description}</span></button>)}</div>
        <p className={styles.help}>창밖과 도시, 서재의 빛이 함께 달라져요. 회전하면서 풍경을 살펴보세요.</p>
        {props.backdropPhase&&props.backdropPhase!=='ready'?<p role="status" className={styles.sceneryStatus}>{props.backdropPhase==='loading'?'도시 풍경을 불러오고 있어요…':<>풍경을 불러오지 못했어요. <button type="button" onClick={props.onRetryScenery}>다시 불러오기</button></>}</p>:null}
        <button className={styles.sceneryView} type="button" onClick={()=>props.onSceneryView()}>서재와 풍경 함께 보기</button>
      </div>
    </div>
    <footer className={styles.customFooter}>
      {props.error?<p role="alert" className={styles.bookError}>{props.error}</p>:null}
      <div><button type="button" className={styles.undoDecor} onClick={props.onUndo} disabled={!props.canUndo}>되돌리기</button><span>{props.signedIn?'이 계정 · 이 브라우저에 저장':'로그인하면 내 꾸미기를 저장해요'}</span></div>
      <div className={styles.customSave}><button type="button" onClick={props.onCancel}>취소</button>{props.signedIn?<button type="button" className={styles.saveDecor} onClick={props.onSave}>{props.dirty?'꾸미기 저장':'완료'}</button>:<Link href="/login?next=%2Fstudy">로그인하고 저장</Link>}</div>
    </footer>
  </aside>;
}
