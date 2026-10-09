import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { canvasMap, disposeStudyMaterials, loadStudyMaterials } from './materials';
import { makeDecor, makeDesk, makeOpenBook, makeRoom, makeShelves, makeTrailingPlant } from './furniture';
import {makePenthouse} from './penthouse';
import {blocksStudyPointer} from './pointer-surface';
import { disposeObject, populateBooks } from './books';
import { BOOK_PULL_FRACTION, BookPullMotion } from './book-pull';
import { createStudyCamera, resizeStudyCamera, studyCameraPose, studyRoomPose,studyViewSize } from './camera';
import {createStudyControls,resizeStudyControls,setStudyNavigation} from './navigation-controls';
import { DeskBookFlash } from './desk-book-flash';
import { deskBodiesOverlap, resolveDeskCollisions, type DeskBody } from './desk-collision';
import { groundStudyObject } from './grounding';
import { NotebookCue } from './notebook-cue';
import type { StudyBackdrop,StudyBook, StudySettings, StudyView } from './types';
import {makeDecoration,fitDecoration,fitDeskDecoration} from './decor-models';
import {studyDeskSlots,decorationSurface,isDeskSlot,type DecorSurface} from './desk-layout';
import type {StudyDecoration} from './decor-catalog';
import {packShelfBooks} from './shelf-layout';
import {StudyTheme} from './theme';
import {CityBackdrop,type BackdropStatus} from './city-backdrop';
import {sceneryOptions} from './scenery-options';

export type DecorationEditor={active:boolean;placing:boolean;selectedId:string|null;label:string;surface:DecorSurface};
export type StudyScene = { ready: Promise<void>; setView: (view: StudyView) => void;setSceneryView:(backdrop?:StudyBackdrop)=>void;retryBackdrop:()=>void; setNavigation: (mode: 'orbit' | 'pan') => void; setBooks: (books: StudyBook[]) => void; setContent:(books:StudyBook[],decorations:StudyDecoration[],deskBooks?:StudyBook[])=>void;setDecorationEditor:(editor:DecorationEditor)=>void; setSettings: (settings: StudySettings) => void; selectBook: (id: string) => StudyView | null; clearSelection: () => void; dispose: () => void };

export function createStudyScene(container: HTMLElement, initialBooks: StudyBook[], initialSettings: StudySettings, onSelect: (book: StudyBook | null) => void, onOpenBook: (book: StudyBook) => void, onOpenNotebook: () => void, onContextLost: () => void, notebookHint?: HTMLAnchorElement | null,decorationHints?:HTMLElement|null,onChooseSlot:(id:string)=>void=()=>{},onChooseDecoration:(id:string|null)=>void=()=>{},onBackdropStatus:(status:BackdropStatus)=>void=()=>{}): StudyScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
  renderer.setClearColor('#faf8f4', 0); container.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '서재 화면. 왼쪽 드래그로 둘러보고 오른쪽 드래그로 화면을 이동합니다. 방향키로도 이동할 수 있습니다. 책상 위 책 목록을 누르면 책과 독서 기록을 볼 수 있습니다.');
  const scene = new THREE.Scene(), root = new THREE.Group(); scene.add(root);
  const world=new CityBackdrop(scene,status=>{container.dataset.backgroundPhase=status.phase;container.dataset.backgroundPhoto=status.phase==='ready'&&status.mode!=='forest'?status.mode:'';container.dataset.backgroundProjection=status.mode==='new-york'?'panorama':'plate';onBackdropStatus(status);invalidate();});
  const camera = createStudyCamera();
  const initialPose=studyRoomPose(initialSettings.backdrop);
  camera.position.copy(initialPose.eye);camera.zoom=initialPose.zoom;
  // Keep the penthouse upright and bounded; other rooms retain free trackball rotation.
  let controls=createStudyControls(camera,renderer.domElement,initialSettings.backdrop,initialPose.target);
  const pmrem = new THREE.PMREMGenerator(renderer); const environment = new RoomEnvironment(); const environmentTarget = pmrem.fromScene(environment, .04); environment.dispose(); pmrem.dispose(); scene.environment = environmentTarget.texture; scene.environmentIntensity = .35;
  const sky = new THREE.HemisphereLight('#fff9ef', '#b7ad98', 1.05); scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff0d5', 2.8); sun.position.set(-10, 5.5, -3.4); sun.target.position.set(2, 0, 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9; sun.shadow.camera.near = .5; sun.shadow.camera.far = 35; sun.shadow.bias = -.0003; sun.shadow.normalBias = .025; sun.shadow.radius = 5; sun.shadow.blurSamples = 8; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#fff9ef', .34); fill.position.set(5, 7, 9); scene.add(fill);
  // Real projected light, rather than a painted floor patch: furniture and books
  // receive the same soft, leafy afternoon sunlight and cast their own shadows.
  const daylightMap=canvasMap(512,512,ctx=>{
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);ctx.filter='blur(9px)';
    ctx.fillStyle='#7e7e7e';
    for(let i=0;i<35;i++){const x=40+(i*137)%440,y=20+(i*89)%470;ctx.beginPath();ctx.ellipse(x,y,12+i%5*5,5+i%4*3,i*2.1,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#b1b1b1';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(20,55);ctx.bezierCurveTo(210,180,165,240,475,480);ctx.stroke();
  });
  const daylight=new THREE.SpotLight('#ffe2b4',350,30,.39,.32,2);daylight.map=daylightMap;daylight.position.set(-9,5.4,-4);daylight.target.position.set(2,0,1.5);daylight.castShadow=true;daylight.shadow.mapSize.set(1024,1024);daylight.shadow.bias=-.0002;daylight.shadow.normalBias=.025;daylight.shadow.radius=7;daylight.shadow.blurSamples=8;scene.add(daylight,daylight.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .035 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.28; ground.receiveShadow = true; scene.add(ground);
  sun.shadow.radius = 16;
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene,camera,1,1);
  ao.updateGtaoMaterial({radius:.55,thickness:.6,distanceExponent:1.5,distanceFallOff:1.2,scale:1,samples:8});
  ao.blendIntensity=.95;
  // GTAO's normal override otherwise turns transparent panes into opaque walls
  // and erases the contact shadows of all furniture behind the glazing.
  const glassSurfaces:THREE.Mesh[]=[],hiddenGlass:THREE.Mesh[]=[],renderAO=ao.render.bind(ao);
  ao.render=(...args:Parameters<typeof ao.render>)=>{
    for(const pane of glassSurfaces)if(pane.visible){pane.visible=false;hiddenGlass.push(pane);}
    try{renderAO(...args);}finally{for(const pane of hiddenGlass)pane.visible=true;hiddenGlass.length=0;}
  };
  composer.addPass(ao); composer.addPass(new OutputPass());
  let disposed = false, frame = 0, ticking = false, renderedFrames = 0, settle = 0, activeView: StudyView = 'room', navigation: 'orbit' | 'pan' = 'orbit', books = initialBooks, settings = initialSettings;
  const targetMin = new THREE.Vector3(-5.5, -.35, -3.9), targetMax = new THREE.Vector3(5.5, 6.25, 3.7), boundedTarget = new THREE.Vector3();
  const viewOffset = new THREE.Vector3(), viewAngles = new THREE.Spherical(), upTween = new THREE.Quaternion();
  let slots: ReturnType<typeof makeShelves> = [], bookLayer: ReturnType<typeof populateBooks> | null = null;
  let deskBooks=initialBooks;
  let decorations:StudyDecoration[]=[],editor:DecorationEditor={active:false,placing:false,selectedId:null,label:'',surface:'shelves'},bookLayoutKey='',hintKey='';
  let theme:StudyTheme|null=null;
  const decorationModels=new Map<string,{object:THREE.Group;key:string}>(),hintGroup=new THREE.Group();root.add(hintGroup);
  const hintButtons=new Map<string,HTMLButtonElement>(),hintAnchor=new THREE.Vector3();
  const selectionRing=new THREE.Mesh(new THREE.TorusGeometry(.31,.008,8,48),new THREE.MeshBasicMaterial({color:'#e56943',transparent:true,opacity:.8,depthWrite:false}));
  selectionRing.rotation.x=-Math.PI/2;selectionRing.visible=false;selectionRing.raycast=()=>{};root.add(selectionRing);
  const bookMotion = new BookPullMotion();
  let deskFlash: { effect: DeskBookFlash; book: StudyBook } | null = null;
  let notebookCue: NotebookCue | null = null, cueTimer=0, cuePulsing=false;
  let graphicsLost=false;
  const notebookAnchor=new THREE.Vector3();
  const bookModels = new Map<string, { object: THREE.Object3D; rest: THREE.Vector3; pull: THREE.Vector3 }>();
  let decor: ReturnType<typeof makeDecor> | null = null, desk: ReturnType<typeof makeDesk> | null = null, openBook: THREE.Group | null = null;
  let readingChair: THREE.Group | null = null, chairFeet: THREE.Object3D | null = null;
  const plants = new THREE.Group(); root.add(plants);
  let materials: Awaited<ReturnType<typeof loadStudyMaterials>> | null = null;
  let penthouse:THREE.Group|null=null,classicWindow:THREE.Group|null=null;
  let tween: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; fromUp: THREE.Vector3; upRotation: THREE.Quaternion; zoom: number; toZoom: number; start: number } | null = null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const positions = { room: studyRoomPose(initialSettings.backdrop), shelves: studyCameraPose([6.5, 3.4, 14.15], [.3, 2.6, -3.15], 1.8), desk: studyCameraPose([9.75, 7.4, 10.05], [-2.75, 1.6, 1.95], 2) };
  camera.position.copy(positions.room.eye); camera.zoom=positions.room.zoom; controls.target.copy(positions.room.target); controls.update();
  function render() {
    const foreground=penthouse?.getObjectByName('penthouse-front-lintel');if(foreground)foreground.visible=activeView==='room'&&camera.zoom<=1.2;
    const roof=penthouse?.getObjectByName('penthouse-roof');if(roof)roof.visible=activeView==='room'&&camera.zoom<=1.2&&camera.position.y<5.18;
    container.dataset.projection = 'perspective'; container.dataset.fov = camera.getEffectiveFOV().toFixed(3);
    container.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);
    if (container.clientWidth >= 800) composer.render(); else renderer.render(scene, camera);
    viewAngles.setFromVector3(viewOffset.copy(camera.position).sub(controls.target));
    container.dataset.frames = String(++renderedFrames); container.dataset.targetY=controls.target.y.toFixed(3);container.dataset.zoom=camera.zoom.toFixed(3);container.dataset.polar=viewAngles.phi.toFixed(3);container.dataset.azimuth=viewAngles.theta.toFixed(3);container.dataset.upY=camera.up.y.toFixed(3);container.dataset.eyeY=viewOffset.y.toFixed(3);
    container.dataset.selectedBook=bookMotion.selectedId?bookModels.get(bookMotion.selectedId)?.object.userData.book.id??'':'';
    container.dataset.selectedInstance=bookMotion.selectedId??'';
    container.dataset.pullProgress=bookMotion.selectedId?bookMotion.amount(bookMotion.selectedId).toFixed(3):'0.000';
    container.dataset.pulledCount=String([...bookModels.keys()].filter(id=>bookMotion.amount(id)>.001).length);
    container.dataset.bookMoving=String(bookMotion.moving);
    container.dataset.deskFlash=deskFlash?.book.id??'';
    container.dataset.deskFlashStrength=(deskFlash?.effect.strength??0).toFixed(3);
    container.dataset.notebookHovered=String(notebookCue?.hovered??false);
    container.dataset.notebookPulse=(notebookCue?.strength??0).toFixed(3);
    const covered=new Set<string>(),missing=new Set<string>();
    for(const model of bookModels.values()){
      const status=model.object.userData.coverStatus,id=model.object.userData.book.id;
      if(status==='loaded')covered.add(id);if(status==='error')missing.add(id);
    }
    container.dataset.coversLoaded=String(covered.size);container.dataset.coversFailed=String(missing.size);
    updateNotebookHint();
    updateDecorationHints();
  }
  function tick(now: number) {
    frame = 0; if (disposed || graphicsLost || document.hidden) return; ticking = true;
    if (tween) { const t = motion.matches ? 1 : Math.min(1, (now - tween.start) / 650), eased = 1 - Math.pow(1 - t, 3); camera.position.lerpVectors(tween.from, tween.to, eased); controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased); camera.up.copy(tween.fromUp).applyQuaternion(upTween.identity().slerp(tween.upRotation,eased)); camera.zoom = tween.zoom + (tween.toZoom - tween.zoom) * eased; camera.updateProjectionMatrix(); if (t === 1) { tween = null; controls.enabled = true; } }
    controls.update();
    const correction = boundedTarget.copy(controls.target).clamp(targetMin, targetMax).sub(controls.target); controls.target.add(correction); camera.position.add(correction);
    const booksMoving=bookMotion.update(now);
    for(const [id,model] of bookModels)model.object.position.copy(model.rest).addScaledVector(model.pull,bookMotion.amount(id));
    resolveDeskProps();
    let deskBookToOpen: StudyBook | null = null;
    if(deskFlash&&!deskFlash.effect.update(now,camera)){
      deskBookToOpen=deskFlash.book;cancelDeskFlash();
    }
    const notebookMoving=notebookCue?.update(now,motion.matches)??false;
    if(cuePulsing&&!notebookMoving){cuePulsing=false;scheduleNotebookPulse();}
    render(); ticking = false;
    if (tween || booksMoving || deskFlash || notebookMoving || settle-- > 0) frame = requestAnimationFrame(tick);
    if(deskBookToOpen)onOpenBook(deskBookToOpen);
  }
  function invalidate() { if (disposed || document.hidden) return; settle = Math.max(settle, 2); if (!ticking && !frame) frame = requestAnimationFrame(tick); }
  function scheduleNotebookPulse(delay=4800) {
    window.clearTimeout(cueTimer);cueTimer=0;
    if(disposed||graphicsLost||document.hidden||motion.matches||!notebookCue||editor.active)return;
    cueTimer=window.setTimeout(()=>{cueTimer=0;if(notebookHint?.hidden){scheduleNotebookPulse();return;}notebookCue?.pulse(performance.now());cuePulsing=true;invalidate();},delay);
  }
  function hoverNotebook(hovered:boolean) {
    hovered=hovered||Boolean(notebookHint&&document.activeElement===notebookHint);
    if(!notebookCue||notebookCue.hovered===hovered)return;
    notebookCue.hovered=hovered;renderer.domElement.style.cursor=hovered?'pointer':'';invalidate();
  }
  function updateNotebookHint() {
    if(!notebookHint||!desk)return;
    if(editor.active){notebookHint.hidden=true;return;}
    notebookAnchor.set(-.02,.045,0);desk.notebook.localToWorld(notebookAnchor);notebookAnchor.project(camera);
    const visible=notebookAnchor.z>=-1&&notebookAnchor.z<=1&&Math.abs(notebookAnchor.x)<.94&&Math.abs(notebookAnchor.y)<.85&&interactiveObject(notebookAnchor.x,notebookAnchor.y)?.userData.openNotebook;
    notebookHint.hidden=!visible;
    if(visible){notebookHint.style.left=`${(notebookAnchor.x+1)*container.clientWidth/2}px`;notebookHint.style.top=`${(1-notebookAnchor.y)*container.clientHeight/2}px`;}
  }
  controls.addEventListener('change', invalidate);
  controls.addEventListener('start', invalidate); controls.addEventListener('end', invalidate);
  function resize() { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return;const dpr=Math.min(window.devicePixelRatio||1,width<700?1.25:1.75);if(renderer.getPixelRatio()!==dpr){renderer.setPixelRatio(dpr);composer.setPixelRatio(dpr);}resizeStudyCamera(camera, width, height); renderer.setSize(width, height, false); composer.setSize(width, height);world.resize(width,height);resizeStudyControls(controls); invalidate(); }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function setNavigation(mode: 'orbit' | 'pan') { controls.update(); navigation = mode;setStudyNavigation(controls,mode); container.dataset.navigation = mode; }
  function setView(view: StudyView) { controls.update(); activeView = view; const p = positions[view]; const zoom = view === 'shelves' && container.clientWidth < 700 ? 1.45 : p.zoom; const fromUp=camera.up.clone().normalize(); tween = { from: camera.position.clone(), to: p.eye.clone(), fromTarget: controls.target.clone(), toTarget: p.target.clone(), fromUp, upRotation:new THREE.Quaternion().setFromUnitVectors(fromUp,new THREE.Vector3(0,1,0)), zoom: camera.zoom, toZoom: zoom, start: performance.now() }; controls.enabled = false; invalidate(); container.dataset.view = view; }
  function setSceneryView(backdrop=settings.backdrop){positions.room=studyRoomPose(backdrop);setView('room');if(tween&&backdrop!=='new-york')tween.toZoom=.78;}
  function setBooks(next: StudyBook[],nextDeskBooks:StudyBook[]=next) {
    books = next;deskBooks=nextDeskBooks; if (!materials) return;
    const reserved=new Set(decorations.map(item=>item.slotId)),packed=packShelfBooks(books,slots,reserved);
    const key=JSON.stringify([packed.placed.map(({book,slot,offset,scale})=>[book.id,book.title,book.author,book.totalPages,book.coverUrl,slot.id,offset,scale]),deskBooks.slice(0,6).map(book=>[book.id,book.title,book.author,book.totalPages,book.coverUrl])]);
    if(bookLayer&&bookLayoutKey===key){const byId=new Map([...deskBooks,...books].map(book=>[book.id,book]));for(const model of bookModels.values())model.object.userData.book=byId.get(model.object.userData.book.id);syncDecorationHints();return;}
    bookLayoutKey=key;cancelDeskFlash();
    for(const model of bookModels.values())model.object.position.copy(model.rest);
    bookModels.clear();bookMotion.reset();
    if(openBook){openBook.userData.coverBinding=null;const cover=openBook.userData.coverMaterial as THREE.MeshStandardMaterial;cover.map=null;cover.color.set('#d8c6a6');cover.needsUpdate=true;}
    if (bookLayer) { root.remove(bookLayer.group); disposeObject(bookLayer.group);bookLayer.covers.dispose(); }
    bookLayer = populateBooks(root, books, slots, invalidate,reserved,deskBooks);
    function register(object:THREE.Object3D,depth:number) {
      const pull=new THREE.Vector3(0,0,(object.userData.pullDepth??depth)*BOOK_PULL_FRACTION);
      if(!object.userData.shelfPull)pull.applyQuaternion(object.quaternion);
      bookModels.set(object.uuid,{object,rest:object.position.clone(),pull});
    }
    bookLayer.targets.forEach(object=>register(object,object.userData.depth));
    if (openBook) {
      const book=deskBooks[0],object=openBook;
      object.visible=Boolean(book);object.userData.book=book;object.userData.location='desk';
      object.userData.coverStatus=book?.coverUrl?'loading':'missing';
      if(book){
        register(object,0);const binding=Symbol();object.userData.coverBinding=binding;const pool=bookLayer.covers;
        if(book.coverUrl)void pool.load(book).then(({texture})=>{
          if(disposed||pool.disposed||object.userData.coverBinding!==binding)return;
          const material=object.userData.coverMaterial as THREE.MeshStandardMaterial;
          material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;object.userData.coverStatus='loaded';invalidate();
        }).catch(()=>{if(!disposed&&!pool.disposed&&object.userData.coverBinding===binding){object.userData.coverStatus='error';invalidate();}});
      }
    }
    root.updateMatrixWorld(true);
    resolveDeskProps();
    let overflow=0,tilted=0;
    for(const object of bookLayer.targets) {
      const slot=object.userData.shelf as (typeof slots)[number]|undefined;
      if(!slot)continue;
      const bounds=new THREE.Box3().setFromObject(object);
      if(bounds.min.x<slot.x-.005||bounds.max.x>slot.x+slot.width+.005||bounds.min.y<slot.y-.005||bounds.max.y>slot.y+slot.maxHeight+.005)overflow++;
      if(object.userData.standing&&Math.abs(object.rotation.z)>.001)tilted++;
    }
    container.dataset.shelfOverflow=String(overflow);container.dataset.tiltedBooks=String(tilted);
    container.dataset.books = String(books.length); onSelect(null); invalidate();
    container.dataset.shelfBooks=String(bookLayer.targets.filter(object=>object.userData.location==='shelves').length);
    syncDecorationHints();
  }
  function setContent(next:StudyBook[],props:StudyDecoration[],nextDeskBooks:StudyBook[]=next) {
    decorations=props;setBooks(next,nextDeskBooks);if(!materials)return;
    const ids=new Set(props.map(item=>item.id));
    for(const [id,model] of decorationModels)if(!ids.has(id)){root.remove(model.object);disposeObject(model.object);decorationModels.delete(id);}
    for(const item of props) {
      const slot=[...slots,...studyDeskSlots()].find(slot=>slot.id===item.slotId);if(!slot)continue;
      const key=JSON.stringify([item.type,item.color,item.rotation,item.slotId]),previous=decorationModels.get(item.id);
      if(previous?.key===key){previous.object.userData.decoration=item;continue;}
      if(previous){root.remove(previous.object);disposeObject(previous.object);}
      const object=makeDecoration(item);if(isDeskSlot(slot))fitDeskDecoration(object,slot);else fitDecoration(object,slot);root.add(object);decorationModels.set(item.id,{object,key});
    }
    root.updateMatrixWorld(true);updateDeskLighting();resolveDeskProps();updateDecorationSelection();syncDecorationHints();
    const occupied=new Set(bookLayer?.targets.filter(object=>object.userData.shelf).map(object=>object.userData.shelf.id));
    container.dataset.decorationCount=String(decorationModels.size);container.dataset.decorationBookOverlap=String(props.filter(item=>occupied.has(item.slotId)).length);
    container.dataset.deskDecorationCount=String(props.filter(item=>decorationSurface(item.slotId)==='desk').length);
    container.dataset.decorations=JSON.stringify(props.map(item=>({id:item.id,type:item.type,slot:item.slotId,color:item.color,rotation:item.rotation})));
    invalidate();
  }
  function updateDecorationSelection() {
    const object=editor.active&&editor.selectedId?decorationModels.get(editor.selectedId)?.object:null;
    selectionRing.visible=Boolean(object);
    if(object){const bounds=new THREE.Box3().setFromObject(object,true),center=bounds.getCenter(new THREE.Vector3());selectionRing.position.set(center.x,bounds.min.y+.007,center.z);}
  }
  function setDecorationEditor(next:DecorationEditor) {
    const wasEditing=editor.active;editor=next;container.dataset.editing=String(next.active);
    if(next.active&&!wasEditing){clearSelection();notebookCue?.stop();window.clearTimeout(cueTimer);cuePulsing=false;}
    if(!next.active&&wasEditing)scheduleNotebookPulse(700);
    updateDecorationSelection();syncDecorationHints();invalidate();
  }
  function syncDecorationHints() {
    if(!materials)return;
    const occupied=new Set(bookLayer?.targets.filter(object=>object.userData.shelf).map(object=>object.userData.shelf.id));
    const reserved=new Set(decorations.filter(item=>item.id!==editor.selectedId).map(item=>item.slotId));
    const candidates=editor.surface==='desk'?studyDeskSlots():slots;
    const available=editor.active&&editor.placing?candidates.filter(slot=>!occupied.has(slot.id)&&!reserved.has(slot.id)):[];
    const key=JSON.stringify([editor.surface,editor.label,available.map(slot=>slot.id)]);if(key===hintKey)return;hintKey=key;
    hintButtons.clear();decorationHints?.replaceChildren();disposeObject(hintGroup);hintGroup.clear();
    for(const slot of available) {
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(slot.width-.08,isDeskSlot(slot)?slot.depth-.08:slot.maxHeight-.06),new THREE.MeshBasicMaterial({color:'#eb7955',transparent:true,opacity:.10,depthWrite:false}));
      if(isDeskSlot(slot)){plane.rotation.x=-Math.PI/2;plane.position.set(slot.x+slot.width/2,slot.y+.018,slot.z+slot.depth/2);}else plane.position.set(slot.x+slot.width/2,slot.y+slot.maxHeight/2,slot.z+.30);
      plane.userData.shelfHint=slot.id;hintGroup.add(plane);
      if(decorationHints){const button=document.createElement('button');button.type='button';button.textContent='+';button.setAttribute('aria-label',`${slot.label}에 ${editor.label||'소품'} 놓기`);button.dataset.slot=slot.id;button.addEventListener('click',()=>onChooseSlot(slot.id));decorationHints.append(button);hintButtons.set(slot.id,button);}
    }
    container.dataset.availableDecorSlots=String(available.length);invalidate();
  }
  function updateDecorationHints() {
    for(const [id,button] of hintButtons) {
      const slot=[...slots,...studyDeskSlots()].find(slot=>slot.id===id)!;
      if(isDeskSlot(slot))hintAnchor.set(slot.x+slot.width/2,slot.y+.018,slot.z+slot.depth/2);else hintAnchor.set(slot.x+slot.width/2,slot.y+slot.maxHeight/2,slot.z+.32);
      hintAnchor.project(camera);
      const visible=hintAnchor.z>=-1&&hintAnchor.z<=1&&Math.abs(hintAnchor.x)<.94&&Math.abs(hintAnchor.y)<.92&&interactiveObject(hintAnchor.x,hintAnchor.y)?.userData.shelfHint===id;
      button.hidden=!visible;
      if(visible){button.style.left=`${(hintAnchor.x+1)*container.clientWidth/2}px`;button.style.top=`${(1-hintAnchor.y)*container.clientHeight/2}px`;}
    }
  }
  function groundFloorDecor() {
    if(!decor)return;
    const rugBounds=new THREE.Box3().setFromObject(decor.rug),bounds=new THREE.Box3();
    const placements: DeskBody[]=[];
    for(const object of [decor.floorFrame,decor.ottoman,decor.footstool]) {
      bounds.setFromObject(object);
      const onRug=settings.rug&&bounds.max.x>rugBounds.min.x&&bounds.min.x<rugBounds.max.x&&bounds.max.z>rugBounds.min.z&&bounds.min.z<rugBounds.max.z;
      groundStudyObject(object,onRug?rugBounds.max.y:0);
      bounds.setFromObject(object,true);const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
      placements.push({id:object.name,x:center.x,z:center.z,width:size.x,depth:size.z,bottom:bounds.min.y,top:bounds.max.y});
    }
    if(readingChair&&chairFeet) {
      bounds.setFromObject(chairFeet,true);
      const onRug=settings.rug&&bounds.min.x>=rugBounds.min.x&&bounds.max.x<=rugBounds.max.x&&bounds.min.z>=rugBounds.min.z&&bounds.max.z<=rugBounds.max.z;
      groundStudyObject(readingChair,onRug?rugBounds.max.y:0,.003,chairFeet);
      container.dataset.chairBottom=new THREE.Box3().setFromObject(chairFeet,true).min.y.toFixed(4);
      container.dataset.chairSupport=onRug?'rug':'floor';
    }
    container.dataset.floorFrameBottom=new THREE.Box3().setFromObject(decor.floorFrame,true).min.y.toFixed(4);
    container.dataset.ottomanBottom=new THREE.Box3().setFromObject(decor.ottoman,true).min.y.toFixed(4);
    container.dataset.stoolBottom=new THREE.Box3().setFromObject(decor.footstool,true).min.y.toFixed(4);
    container.dataset.floorPlacements=JSON.stringify(placements);
  }
  function setSettings(next: StudySettings) {
    const wasPenthouse=settings.backdrop==='new-york';
    settings={...next,backdrop:next.backdrop??'forest'};plants.visible=settings.plants;if(decor)decor.rug.visible=settings.rug;groundFloorDecor();
    const isPenthouse=settings.backdrop==='new-york';
    if(isPenthouse!==(controls instanceof OrbitControls)){
      const target=controls.target.clone(),enabled=controls.enabled;
      controls.removeEventListener('change',invalidate);controls.removeEventListener('start',invalidate);controls.removeEventListener('end',invalidate);controls.dispose();
      controls=createStudyControls(camera,renderer.domElement,settings.backdrop,target);controls.enabled=enabled;
      setStudyNavigation(controls,navigation);
      controls.addEventListener('change',invalidate);controls.addEventListener('start',invalidate);controls.addEventListener('end',invalidate);
    }
    if(penthouse)penthouse.visible=isPenthouse;if(classicWindow)classicWindow.visible=!isPenthouse;
    if(decor){decor.pinBoard.position.set(isPenthouse?-5.18:-5.62,isPenthouse?2.90:2.92,isPenthouse?-3.94:1.30);decor.pinBoard.rotation.y=isPenthouse?-Math.PI/2:0;decor.pinBoard.scale.setScalar(isPenthouse?.74:1);}
    positions.room=studyRoomPose(settings.backdrop);container.dataset.penthouse=String(isPenthouse);
    const atmosphere=sceneryOptions.find(item=>item.id===settings.backdrop)!;
    if(materials){materials.coral.color.set(settings.accent);materials.cushion.color.set(settings.accent);theme?.apply(settings);world.set(settings.backdrop);}
    const garden=root.getObjectByName('study-window-garden');if(garden)garden.visible=settings.backdrop==='forest';ground.visible=settings.backdrop==='forest';
    sun.color.set(atmosphere.sun);sun.intensity=(.7+settings.light/100*1.8)*atmosphere.sunScale;
    daylight.intensity=settings.backdrop==='forest'?settings.light/100*350:0;
    sky.color.set(atmosphere.ambient);sky.groundColor.set(atmosphere.ground);sky.intensity=(.32+settings.light/100*.26)*atmosphere.skyScale;
    fill.color.set(atmosphere.ambient);scene.environmentIntensity=settings.backdrop==='tokyo'?.24:.35;
    fill.intensity=isPenthouse?.24:.34;sky.intensity*=isPenthouse?.8:1;sun.shadow.radius=isPenthouse?3.5:16;
    renderer.toneMappingExposure=isPenthouse?.75:.85;
    updateDeskLighting();
    container.dataset.backdrop=settings.backdrop;container.dataset.windowBackdrop=garden?.visible?'forest':settings.backdrop;invalidate();
    if(materials&&wasPenthouse!==isPenthouse&&activeView==='room')setSceneryView(settings.backdrop);
  }
  function cancelDeskFlash() { deskFlash?.effect.dispose();deskFlash=null; }
  function updateDeskLighting(){
    const intensity=10-settings.light/100*4+sceneryOptions.find(item=>item.id===settings.backdrop)!.lamp;
    for(const {object} of decorationModels.values()){
      const light=object.userData.light as THREE.PointLight|undefined,item=object.userData.decoration as StudyDecoration;
      if(light)light.intensity=intensity*(item.type==='desk-lamp'?1:item.type==='mushroom'?.45:.10);
    }
  }
  function resolveDeskProps() {
    if(!desk)return;
    root.updateMatrixWorld(true);
    const box=new THREE.Box3(),size=new THREE.Vector3(),center=new THREE.Vector3();
    function body(object:THREE.Object3D,id:string):DeskBody {
      box.makeEmpty();object.traverse(child=>{if(child instanceof THREE.Mesh&&!child.userData.collisionIgnore)box.expandByObject(child);});box.getSize(size);box.getCenter(center);
      return {id,x:center.x,z:center.z,width:size.x,depth:size.z,bottom:box.min.y,top:box.max.y};
    }
    const objects=[...decorationModels.values()].filter(model=>decorationSurface(model.object.userData.decoration.slotId)==='desk').map(model=>model.object);
    const props=objects.map(object=>body(object,object.userData.decoration.id));
    const obstacles=[body(desk.notebook,'desk-notebook'),...[...bookModels.entries()].filter(([,model])=>model.object.userData.location==='desk').map(([id,model])=>body(model.object,id))];
    let overlaps=0;
    const collisionPairs: { prop: DeskBody; obstacle: DeskBody }[]=[];
    props.forEach((next,i)=>{
      overlaps+=obstacles.filter(other=>deskBodiesOverlap(next,other)).length;
      overlaps+=props.slice(0,i).filter(other=>deskBodiesOverlap(next,other)).length;
      [...obstacles,...props.slice(0,i)].filter(other=>deskBodiesOverlap(next,other)).forEach(other=>collisionPairs.push({prop:next,obstacle:other}));
    });
    container.dataset.deskCollisions=String(overlaps);
    container.dataset.deskCollisionPairs=JSON.stringify(collisionPairs);
    container.dataset.deskPushes='0';
    container.dataset.deskProps=JSON.stringify(props.map(({id,x,z})=>({id,x:Number(x.toFixed(3)),z:Number(z.toFixed(3))})));
  }
  function activateBook(book:StudyBook,object?:THREE.Object3D) {
    if(deskFlash)return;
    const model=object?bookModels.get(object.uuid):[...bookModels.values()].find(item=>item.object.userData.book.id===book.id&&item.object.userData.location==='shelves');
    if(model?.object.userData.openBook){
      bookMotion.clear(performance.now(),motion.matches);onSelect(null);
      if(motion.matches){onOpenBook(book);return;}
      deskFlash={book,effect:new DeskBookFlash(model.object,root,performance.now())};invalidate();return;
    }
    if(!model){onOpenBook(book);return;}
    if(bookMotion.pick(model.object.uuid,performance.now(),motion.matches)==='open')onOpenBook(book);
    else {onSelect(book);invalidate();}
  }
  function clearSelection() {cancelDeskFlash();bookMotion.clear(performance.now(),motion.matches);onSelect(null);invalidate();}
  function selectBook(id: string):StudyView|null {
    const found=books.find(book=>book.id===id);if(!found)return null;
    const model=[...bookModels.values()].find(item=>item.object.userData.book.id===id&&item.object.userData.location==='shelves');
    if(!model){onOpenBook(found);return null;}
    if(bookMotion.selectedId===model.object.uuid){activateBook(found,model.object);return null;}
    activateBook(found,model.object);
    const view=model.object.userData.location==='desk'?'desk':'shelves';setView(view);return view;
  }
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster(); let start: { x: number; y: number; id: number; moved:boolean } | null = null;
  const pointers = new Map<number, { x: number; y: number; type: string; button: number }>();
  const screenRight = new THREE.Vector3(), screenUp = new THREE.Vector3(), screenOffset = new THREE.Vector3();
  function moveScreen(dx: number, dy: number) {
    camera.updateMatrixWorld();
    screenRight.setFromMatrixColumn(camera.matrixWorld,0);screenUp.setFromMatrixColumn(camera.matrixWorld,1);
    const span = studyViewSize(camera, camera.position.distanceTo(controls.target));
    screenOffset.copy(screenRight).multiplyScalar(-dx*span.width/renderer.domElement.clientWidth).addScaledVector(screenUp,dy*span.height/renderer.domElement.clientHeight);
    camera.position.add(screenOffset);controls.target.add(screenOffset);invalidate();
  }
  function pointerDown(event: PointerEvent) {
    hoverNotebook(false);
    renderer.domElement.focus({ preventScroll: true });
    start = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId, moved:false } : null;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,type:event.pointerType,button:event.button});
    if(pointers.size>1)start=null;
  }
  function pointerMove(event: PointerEvent) {
    if(start?.id===event.pointerId&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>7)start.moved=true;
    const previous=pointers.get(event.pointerId);
    if(previous){
      const dx=event.clientX-previous.x,dy=event.clientY-previous.y;
      const otherTouch=[...pointers.entries()].find(([id,p])=>id!==event.pointerId&&p.type==='touch')?.[1];
      if(controls.enabled){
        if(previous.type==='touch'&&otherTouch){
          const before=Math.hypot(previous.x-otherTouch.x,previous.y-otherTouch.y);
          const after=Math.hypot(event.clientX-otherTouch.x,event.clientY-otherTouch.y);
          if(before>1&&after>1)zoomBy(after/before);
          moveScreen(dx/2,dy/2);
        } else if(previous.button===2||(previous.button===0&&navigation==='pan'))moveScreen(dx,dy);
        else if(previous.button===1)zoomBy(Math.exp(-dy*.01));
      }
      previous.x=event.clientX;previous.y=event.clientY;
    }
    if(controls.enabled&&(event.buttons||pointers.size))invalidate();
    if(event.pointerType!=='touch'&&!event.buttons&&controls.enabled){
      const rect=renderer.domElement.getBoundingClientRect();
      const target=interactiveObject((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      if(editor.active)renderer.domElement.style.cursor=target?.userData.decoration||target?.userData.shelfHint?'pointer':'';
      else hoverNotebook(Boolean(target?.userData.openNotebook));
    }
  }
  function pointerCancel(event: PointerEvent) { pointers.delete(event.pointerId); if (start?.id === event.pointerId) start = null; }
  function pointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (!start || start.id !== event.pointerId || start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7 || !controls.enabled) { start = null; return; }
    start = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const object=interactiveObject((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    if(editor.active){if(object?.userData.shelfHint)onChooseSlot(object.userData.shelfHint);else if(object?.userData.decoration)onChooseDecoration(object.userData.decoration.id);else if(!editor.placing)onChooseDecoration(null);return;}
    if(object?.userData.decoration){onChooseDecoration(object.userData.decoration.id);return;}
    if(object?.userData.openNotebook)onOpenNotebook();
    else if(object?.userData.book)activateBook(object.userData.book as StudyBook,object);
    else clearSelection();
  }
  function interactiveObject(x:number,y:number):THREE.Object3D|null {
    pointer.set(x,y);raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(root,true).find(intersection=>blocksStudyPointer(intersection.object));
    let object:THREE.Object3D|null=hit?.object??null;
    while(object&&!object.userData.book&&!object.userData.openNotebook&&!object.userData.decoration&&!object.userData.shelfHint)object=object.parent;
    return object;
  }
  const notebookEnter=()=>hoverNotebook(true),notebookLeave=()=>hoverNotebook(false);
  renderer.domElement.addEventListener('pointerleave',notebookLeave);
  notebookHint?.addEventListener('pointerenter',notebookEnter);notebookHint?.addEventListener('pointerleave',notebookLeave);
  notebookHint?.addEventListener('focus',notebookEnter);notebookHint?.addEventListener('blur',notebookLeave);
  function keyDown(event: KeyboardEvent) {
    if(!controls.enabled)return;
    if(event.key==='Escape'){if(editor.active)onChooseDecoration(null);else clearSelection();return;}
    const direction:Record<string,[number,number]>={ArrowLeft:[12,0],ArrowRight:[-12,0],ArrowUp:[0,12],ArrowDown:[0,-12]};
    const delta=direction[event.key];if(delta){event.preventDefault();moveScreen(...delta);}
  }
  function wheelZoom(event: WheelEvent) {
    if(!controls.enabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    const pixels=event.deltaY*(event.deltaMode===2?renderer.domElement.clientHeight:event.deltaMode===1?16:1);
    // Exponential zoom stays positive even for a large trackpad/wheel burst.
    zoomBy(Math.exp(-THREE.MathUtils.clamp(pixels,-1000,1000)*.001));
  }
  function zoomBy(factor:number) { camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();invalidate(); }
  renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointermove', pointerMove, true); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('pointercancel', pointerCancel);renderer.domElement.addEventListener('keydown',keyDown);renderer.domElement.addEventListener('wheel',wheelZoom,{capture:true,passive:false});
  const contextLost = (event: Event) => { event.preventDefault(); graphicsLost=true;window.clearTimeout(cueTimer);notebookCue?.stop();cancelDeskFlash();cancelAnimationFrame(frame);if(notebookHint)notebookHint.hidden=true;onContextLost(); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const motionChange=()=>{notebookCue?.stop();cuePulsing=false;scheduleNotebookPulse(700);invalidate();};motion.addEventListener('change',motionChange);
  const visibility = () => { if (document.hidden) { window.clearTimeout(cueTimer);notebookCue?.stop();cuePulsing=false;cancelAnimationFrame(frame); frame = 0; } else {scheduleNotebookPulse(700);invalidate();} }; document.addEventListener('visibilitychange', visibility);
  const ready = (async () => {
    const loader = new GLTFLoader();
    const resources = await Promise.allSettled([loadStudyMaterials(renderer), loader.loadAsync('/study/models/plant-wide/model.gltf'), loader.loadAsync('/study/models/reading-chair/reading-chair.glb')]);
    if (resources[0].status !== 'fulfilled' || resources[1].status !== 'fulfilled' || resources[2].status !== 'fulfilled') { if (resources[0].status === 'fulfilled') disposeStudyMaterials(resources[0].value); if (resources[1].status === 'fulfilled') disposeObject(resources[1].value.scene); if (resources[2].status === 'fulfilled') disposeObject(resources[2].value.scene); throw new Error('Study assets could not be loaded'); }
    const m = resources[0].value, widePlant = resources[1].value, chairAsset = resources[2].value;
    materials = m;theme=new StudyTheme(m);
    if (disposed) { disposeObject(widePlant.scene); disposeObject(chairAsset.scene); disposeStudyMaterials(m); return; }
    classicWindow=makeRoom(root, m);penthouse=makePenthouse(root,m);penthouse.traverse(object=>{if(object instanceof THREE.Mesh&&object.userData.pointerPassThrough)glassSurfaces.push(object);});slots = makeShelves(root, m); desk = makeDesk(root, m); openBook = makeOpenBook(root, m); decor = makeDecor(root, m);
    notebookCue=new NotebookCue(desk.notebook);scheduleNotebookPulse(700);
    function model(asset: THREE.Group, height: number, x: number, y: number, z: number, rotation = 0, parent: THREE.Group = root) {
      const object = asset.clone(true); const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3()); const scale = height / size.y; const center = bounds.getCenter(new THREE.Vector3());
      const placed=new THREE.Group();object.position.set(-center.x,-bounds.min.y,-center.z);placed.add(object);placed.scale.setScalar(scale);placed.position.set(x,y,z);placed.rotation.y=rotation;
      object.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = child.receiveShadow = true; const source = child.material as THREE.MeshStandardMaterial; if (source.name.toLowerCase().includes('_pot')) { const ceramic = source.clone(); ceramic.map = null; ceramic.color.set('#e7dfcf'); child.material = ceramic; } else if(source.name.toLowerCase().includes('_leaves')) { const leaf=source.clone();leaf.color.set('#acb895');leaf.roughnessMap=null;leaf.roughness=.96;leaf.envMapIntensity=.22;leaf.normalScale.set(.35,.35);child.material=leaf; } } }); parent.add(placed); return placed;
    }
    const mainPlant=model(widePlant.scene,2.50,4.53,.02,.42,-.35,plants);
    groundStudyObject(mainPlant);
    const terracePlant=model(widePlant.scene,2.65,-7.35,.003,-2.0,.2,penthouse);terracePlant.name='penthouse-terrace-plant';groundStudyObject(terracePlant);
    makeTrailingPlant(plants,m,[-5.27,1.88,-1.0],Math.PI/2,1.0);
    const chair=model(chairAsset.scene,2.6,-3.12,.015,3.32,-.62);
    readingChair=chair;chair.name='reading-chair';
    chair.traverse(child=>{if(child instanceof THREE.Mesh){const material=child.material as THREE.MeshStandardMaterial;const name=material.name;if(name==='chair_oak')chairFeet=child;child.material=name==='throw_wool'?m.blanket:name==='chair_oak'?m.wood:name==='chair_accent'?m.cushion:m.fabric;}});
    chair.updateWorldMatrix(true,true);
    if(chairFeet) {
      // All four feet must share one surface; straddling the raised rug would
      // leave the outer legs hanging. Keep this chair just outside its left edge.
      const feetBounds=new THREE.Box3().setFromObject(chairFeet,true),rugBounds=new THREE.Box3().setFromObject(decor.rug);
      chair.position.x+=Math.min(0,rugBounds.min.x-.045-feetBounds.max.x);
      chair.position.z+=Math.min(0,4.10-feetBounds.max.z);
      groundStudyObject(chair,0,.003,chairFeet);
    }
    // Keep the entire plant silhouette clear of floor decor, including the seat
    // and its book. A conservative box also leaves breathing room for foliage.
    const floorObjects=[decor.floorFrame,decor.ottoman,decor.footstool];
    const bounds=new THREE.Box3(),size=new THREE.Vector3(),center=new THREE.Vector3();
    function floorBody(object:THREE.Object3D,id:string):DeskBody {
      bounds.setFromObject(object);bounds.getSize(size);bounds.getCenter(center);
      return {id,x:center.x,z:center.z,width:size.x,depth:size.z,bottom:bounds.min.y,top:bounds.max.y};
    }
    root.updateMatrixWorld(true);
    const plantBody=floorBody(mainPlant,'floor-plant');
    const floorBodies=floorObjects.map(object=>floorBody(object,object.name));
    const floorPlaced=resolveDeskCollisions(floorBodies,[plantBody],{minX:1.6,maxX:5.68,minZ:-2.25,maxZ:3.65},.14);
    const rugBounds=new THREE.Box3().setFromObject(decor.rug);
    floorPlaced.forEach((body,i)=>{
      const object=floorObjects[i];object.position.x+=body.x-floorBodies[i].x;object.position.z+=body.z-floorBodies[i].z;
      const onRug=body.x+body.width/2>rugBounds.min.x&&body.x-body.width/2<rugBounds.max.x&&body.z+body.depth/2>rugBounds.min.z&&body.z-body.depth/2<rugBounds.max.z;
      groundStudyObject(object,onRug?rugBounds.max.y:0);
    });
    const finalFloorBodies=floorObjects.map(object=>floorBody(object,object.name));
    container.dataset.floorCollisions=String(finalFloorBodies.reduce((count,body,i)=>count+Number(deskBodiesOverlap(body,plantBody,.14))+finalFloorBodies.slice(0,i).filter(other=>deskBodiesOverlap(body,other,.14)).length,0));
    container.dataset.floorFrameBottom=new THREE.Box3().setFromObject(decor.floorFrame).min.y.toFixed(4);
    container.dataset.floorPlacements=JSON.stringify(finalFloorBodies);
    container.dataset.decorOverlap=String(new THREE.Box3().setFromObject(mainPlant).intersectsBox(new THREE.Box3().setFromObject(decor.floorFrame)));
    setContent(books,decorations,deskBooks); setSettings(settings);camera.position.copy(positions.room.eye);camera.zoom=positions.room.zoom;controls.target.copy(positions.room.target);camera.updateProjectionMatrix();controls.update();container.dataset.ready = 'true'; container.dataset.view = activeView; invalidate();
  })();
  function dispose() { disposed = true; window.clearTimeout(cueTimer);notebookCue?.dispose();notebookCue=null;
    glassSurfaces.length=0;hiddenGlass.length=0;
    hintButtons.clear();decorationHints?.replaceChildren();theme?.dispose();theme=null;decorationModels.clear();world.dispose();
    motion.removeEventListener('change',motionChange);renderer.domElement.removeEventListener('pointerleave',notebookLeave);
    notebookHint?.removeEventListener('pointerenter',notebookEnter);notebookHint?.removeEventListener('pointerleave',notebookLeave);notebookHint?.removeEventListener('focus',notebookEnter);notebookHint?.removeEventListener('blur',notebookLeave);if(notebookHint)notebookHint.hidden=true;
    cancelDeskFlash();bookMotion.reset();bookModels.clear();bookLayer?.covers.dispose();cancelAnimationFrame(frame); observer.disconnect(); controls.removeEventListener('change', invalidate);controls.removeEventListener('start',invalidate);controls.removeEventListener('end',invalidate); controls.dispose(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointermove', pointerMove, true); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointercancel', pointerCancel);renderer.domElement.removeEventListener('keydown',keyDown);renderer.domElement.removeEventListener('wheel',wheelZoom,true); renderer.domElement.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibility); disposeObject(scene); sun.shadow.dispose(); daylight.shadow.dispose(); daylightMap.dispose(); ao.dispose(); composer.dispose(); environmentTarget.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
  return { ready, setView, setSceneryView,retryBackdrop:()=>{void world.set(settings.backdrop,true);},setNavigation, setBooks, setContent,setDecorationEditor,setSettings, selectBook, clearSelection, dispose };
}
