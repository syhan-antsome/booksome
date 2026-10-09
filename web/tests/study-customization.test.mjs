import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const modules=new Map();
async function moduleUrl(url){
  if(modules.has(url.href))return modules.get(url.href);
  let source=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [,specifier] of [...source.matchAll(/from '([^']+)'/g)]){const target=specifier.startsWith('three')?import.meta.resolve(specifier):specifier.startsWith('.')?await moduleUrl(new URL(specifier+'.ts',url)):null;if(target)source=source.replaceAll(`from '${specifier}'`,`from '${target}'`);}
  const target='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,target);return target;
}
const load=async name=>import(await moduleUrl(new URL(`../src/lib/study/${name}.ts`,import.meta.url)));
const {decorCatalog,decorForSurface}=await load('decor-catalog');
const {studyShelfSlots}=await load('shelves');
const {buildShelfPages,packShelfBooks}=await load('shelf-layout');
const {makeDecoration,fitDecoration,fitDeskDecoration}=await load('decor-models');
const {disposeObject,populateBooks}=await load('books');
const {makeRoom,makeShelves,makeDecor,makeDesk,makeOpenBook}=await load('furniture');
const {studyDeskSlots,deskProtectedZones,deskBounds,decorationSurface}=await load('desk-layout');
const {deskBodiesOverlap}=await load('desk-collision');
const {BOOK_PULL_FRACTION}=await load('book-pull');
const {makePenthouse,setStudyArchitecture}=await load('penthouse');
const {sceneryOptions}=await load('scenery-options');
const {blocksStudyPointer}=await load('pointer-surface');
const {studyRoomPose,studyCameraPose,createStudyCamera,resizeStudyCamera}=await load('camera');
const {createStudyControls,setStudyNavigation,resizeStudyControls,setStudyControlLimits,FOREST_ELEVATION,FOREST_MIN_EYE_Y}=await load('navigation-controls');
const {StudyTheme}=await load('theme');
const {CityBackdrop}=await load('city-backdrop');
const {defaultStudySettings}=await load('types');
const {StudyCustomizationStore,defaultRoomDocument,normalizeRoomDocument,roomStorageKey}=await load('customization-store');
const slots=studyShelfSlots();
const books=Array.from({length:61},(_,i)=>({id:`owned-${i}`,title:`책 ${i}`,author:'저자',totalPages:1500,currentPage:10,status:'reading',coverUrl:null}));
const prop=(slot,page=0,id=slot.id)=>({id,type:'fern',slotId:slot.id,page,color:0,rotation:0});
const memory=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('penthouse rotation limits top-down views to 30 degrees while allowing a 45-degree skyward view',()=>{
  const camera=new THREE.PerspectiveCamera(),pose=studyRoomPose('new-york');camera.position.copy(pose.eye);
  const controls=createStudyControls(camera,null,'new-york',pose.target);
  assert.ok(controls instanceof OrbitControls);
  const offset=new THREE.Vector3(),angle=()=>THREE.MathUtils.radToDeg(Math.asin(offset.copy(camera.position).sub(controls.target).normalize().y));
  for(const zoom of [.65,.79,1.8,3.6]){
    camera.zoom=zoom;
    for(const [input,expected] of [[Math.PI*20,30],[-Math.PI*20,-45]]){
      controls.rotateUp(input);assert.ok(Math.abs(angle()-expected)<1e-9);
      for(let i=0;i<12;i++){
        controls.rotateUp(input);controls.rotateLeft(Math.PI/3);
        assert.ok(Math.abs(angle()-expected)<1e-9);
        assert.ok(camera.up.distanceTo(new THREE.Vector3(0,1,0))<1e-9);
        assert.ok(Math.abs(camera.position.distanceTo(controls.target)-32)<1e-9);
      }
    }
    const shift=new THREE.Vector3(1,2,-3);camera.position.add(shift);controls.target.add(shift);controls.update();
    assert.ok(Math.abs(angle()+45)<1e-9);assert.equal(camera.zoom,zoom);
  }
  controls.rotateUp(THREE.MathUtils.degToRad(60));assert.ok(Math.abs(angle()-15)<1e-9);
  const before=offset.copy(camera.position).sub(controls.target).clone();controls.rotateLeft(Math.PI/2);
  assert.ok(Math.abs(before.angleTo(camera.position.clone().sub(controls.target))-Math.acos(Math.sin(THREE.MathUtils.degToRad(15))**2))<1e-9);
});

test('room, shelf and desk presets remain reachable with the penthouse angle limit',()=>{
  const poses=[studyRoomPose('new-york'),studyCameraPose([6.5,3.4,14.15],[.3,2.6,-3.15],1.8),studyCameraPose([9.75,7.4,10.05],[-2.75,1.6,1.95],2)];
  const camera=new THREE.PerspectiveCamera();camera.position.copy(poses[0].eye);
  const controls=createStudyControls(camera,null,'new-york',poses[0].target);
  for(const pose of [...poses,poses[0]]){
    camera.position.copy(pose.eye);camera.zoom=pose.zoom;controls.target.copy(pose.target);controls.update();
    assert.ok(camera.position.distanceTo(pose.eye)<1e-9);assert.ok(controls.target.distanceTo(pose.target)<1e-9);assert.equal(camera.zoom,pose.zoom);
  }
});

test('all landscapes keep the horizon upright, allow skyward views and support the existing pan mode',()=>{
  const camera=new THREE.PerspectiveCamera(),pose=studyRoomPose('forest');camera.position.copy(pose.eye);
  for(const {id:backdrop} of sceneryOptions){
    camera.up.set(.6,.8,0);
    const controls=createStudyControls(camera,null,backdrop,pose.target);
    assert.ok(controls instanceof OrbitControls);assert.deepEqual(camera.up.toArray(),[0,1,0]);
    if(backdrop==='forest')assert.ok(controls.maxPolarAngle>THREE.MathUtils.degToRad(120)&&controls.maxPolarAngle<=THREE.MathUtils.degToRad(135));else assert.equal(controls.maxPolarAngle,THREE.MathUtils.degToRad(135));
    for(const mode of ['pan','orbit']){
      setStudyNavigation(controls,mode);resizeStudyControls(controls);
      assert.equal(controls.mouseButtons.LEFT,mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE);
      assert.equal(controls.enableRotate,mode==='orbit');
    }
  }
});

test('existing browser appearance preferences migrate without inventing any decoration records',()=>{
  const storage=memory();storage.setItem('booksome-study-settings-v1',JSON.stringify({light:45,plants:false,rug:true,accent:'#6f8977'}));
  const store=new StudyCustomizationStore(()=>storage);store.setOwner('a');assert.equal(store.getSnapshot().document.settings.light,45);assert.equal(store.getSnapshot().document.settings.plants,false);assert.equal(store.getSnapshot().document.decorations.length,0);
  store.setOwner(null);assert.equal(store.getSnapshot().document.settings.light,100);
});

test('a fully decorated first page stays intact while newly added books occupy the next page',()=>{
  const props=slots.map(slot=>prop(slot));
  assert.equal(buildShelfPages([],props).length,1);
  const pages=buildShelfPages(books,props);
  assert.equal(pages[0].books.length,0);assert.equal(pages[0].decorations.length,slots.length);assert.equal(pages[0].emptySlots.length,0);
  assert.deepEqual(pages.flatMap(page=>page.books).map(book=>book.id),books.map(book=>book.id));
  assert.ok(pages.slice(1).every(page=>page.books.length<=24));
});

test('reserved cubbies reduce capacity without hiding books and only unused cubbies remain available',()=>{
  const props=slots.slice(0,-1).map(slot=>prop(slot));
  const pages=buildShelfPages(books,props),page=pages[0];
  assert.ok(page.books.length>0&&page.books.length<24);
  const reserved=new Set(props.map(item=>item.slotId)),packed=packShelfBooks(page.books,slots,reserved);
  assert.equal(packed.placed.length,page.books.length);
  assert.ok(packed.placed.every(item=>!reserved.has(item.slot.id)));
  assert.ok(page.emptySlots.every(slot=>!reserved.has(slot.id)&&!packed.occupied.has(slot.id)));
  assert.equal(new Set(pages.flatMap(page=>page.books).map(book=>book.id)).size,books.length);
});

test('account-scoped room storage survives reload and stale callbacks cannot edit a different account',()=>{
  const storage=memory(),store=new StudyCustomizationStore(()=>storage);
  store.setOwner('a');store.begin('a');
  const document={settings:{...defaultStudySettings,wood:'walnut'},decorations:[prop(slots[0])]};
  store.update('a',document);assert.equal(store.save('a'),true);assert.ok(storage.values.has(roomStorageKey('a')));
  store.setOwner('b');assert.equal(store.getSnapshot().document.decorations.length,0);assert.equal(store.getSnapshot().editing,false);
  store.update('a',document);assert.equal(store.save('a'),false);assert.equal(storage.values.has(roomStorageKey('b')),false);
  const reopened=new StudyCustomizationStore(()=>storage);reopened.setOwner('a');assert.deepEqual(reopened.getSnapshot().document,document);
});

test('undo and cancel restore the previous room, and failed saves retain the editable draft',()=>{
  let fail=true;const storage=memory(),store=new StudyCustomizationStore(()=>({...storage,setItem:(key,value)=>{if(fail)throw new Error('Quota');storage.setItem(key,value);}}));
  store.setOwner('a');store.begin('a');store.update('a',{settings:defaultStudySettings,decorations:[prop(slots[0])]});
  store.update('a',{...store.getSnapshot().document,settings:{...defaultStudySettings,wall:'sage'}});store.undo('a');
  assert.equal(store.getSnapshot().document.settings.wall,'cream');assert.equal(store.getSnapshot().document.decorations.length,1);
  assert.equal(store.save('a'),false);assert.equal(store.getSnapshot().editing,true);assert.equal(store.getSnapshot().dirty,true);assert.ok(store.getSnapshot().error);
  fail=false;assert.equal(store.save('a'),true);store.begin('a');store.update('a',defaultRoomDocument);store.cancel('a');assert.equal(store.getSnapshot().document.decorations.length,1);
  store.setOwner(null);store.begin(null);assert.equal(store.save(null),false);assert.equal(store.getSnapshot().document.decorations.length,0);
});

test('invalid, duplicate or out-of-room placements and malformed preferences cannot enter the scene',()=>{
  const input={settings:{light:Infinity,wood:'unknown',accent:'javascript:bad'},decorations:[prop(slots[0]),prop(slots[0],0,'duplicate'),{...prop(slots[1]),type:'unknown'},{...prop(slots[2]),slotId:'outside-room'},{...prop(slots[3]),page:-1},{...prop(slots[4]),color:100,rotation:50}]};
  const result=normalizeRoomDocument(input);
  assert.equal(result.settings.light,100);assert.equal(result.settings.wood,'oak');assert.equal(result.decorations.length,2);
  assert.equal(result.decorations[1].color,0);assert.equal(result.decorations[1].rotation,0);
  const storage=memory();storage.setItem(roomStorageKey('a'),'{broken');const store=new StudyCustomizationStore(()=>storage);store.setOwner('a');assert.deepEqual(store.getSnapshot().document,defaultRoomDocument);
});

function canvasEnvironment() {
  const context=new Proxy({measureText:value=>({width:value.length*20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(object,key)=>key in object?object[key]:()=>{}});
  const original=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};return()=>{global.document=original;};
}
test('all 24 cubbies start available and built-in room decor stays outside shelf interiors',()=>{
  const restore=canvasEnvironment(),root=new THREE.Group();
  try{
    makeDecor(root,roomMaterials());root.updateMatrixWorld(true);
    assert.equal(slots.length,24);assert.equal(new Set(slots.map(slot=>slot.id)).size,24);
    assert.equal(buildShelfPages([],[])[0].emptySlots.length,24);assert.equal(defaultRoomDocument.decorations.length,0);
    for(const slot of slots){
      const interior=new THREE.Box3(new THREE.Vector3(slot.x,slot.y,slot.z-.49),new THREE.Vector3(slot.x+slot.width,slot.y+slot.maxHeight,slot.z+.28));
      root.traverse(object=>{if(object.isMesh)assert.equal(interior.intersectsBox(new THREE.Box3().setFromObject(object,true)),false,`built-in decoration occupies ${slot.id}`);});
    }
  }finally{disposeObject(root);restore();}
});

test('previously saved decorations keep their slot IDs while six former default-decor cubbies become usable',()=>{
  const newlyAvailable=['main-0-1','main-0-2','main-0-3','main-2-0','main-2-3','side-0-2'];
  const historicalSlots=['main-0-0','main-1-0','main-1-1','main-1-2','main-1-3','main-2-1','main-2-2','main-3-0','main-3-1','main-3-2','main-3-3','side-0-0','side-0-1','side-0-3','side-1-0','side-1-1','side-1-2','side-1-3'];
  const document={settings:defaultStudySettings,decorations:historicalSlots.map((slotId,index)=>({id:`saved-${index}`,type:'fern',slotId,page:0,color:1,rotation:2}))};
  const storage=memory();storage.setItem(roomStorageKey('reader'),JSON.stringify({version:2,document}));
  const store=new StudyCustomizationStore(()=>storage);store.setOwner('reader');
  assert.deepEqual(store.getSnapshot().document,document);
  const pages=buildShelfPages([],store.getSnapshot().document.decorations);
  assert.equal(pages.length,1);assert.deepEqual(pages[0].emptySlots.map(slot=>slot.id).sort(),newlyAvailable.sort());
  for(const slotId of newlyAvailable){
    const slot=slots.find(slot=>slot.id===slotId);assert.ok(slot);
    const reserved=new Set(slots.filter(other=>other.id!==slotId).map(slot=>slot.id));
    assert.equal(packShelfBooks(books.slice(0,1),slots,reserved).placed[0]?.slot.id,slotId);
    assert.equal(normalizeRoomDocument({settings:defaultStudySettings,decorations:[prop(slot)]}).decorations.length,1);
  }
});

test('every actual decoration model rests on and fits the smallest cubby at all four rotations',()=>{
  const restore=canvasEnvironment(),slot=slots.reduce((smallest,slot)=>slot.maxHeight<smallest.maxHeight?slot:smallest);
  try {
    for(const entry of decorForSurface('shelves'))for(let rotation=0;rotation<4;rotation++) {
      const object=makeDecoration({...prop(slot),type:entry.id,rotation});fitDecoration(object,slot);
      const bounds=new THREE.Box3().setFromObject(object,true),label=`${entry.id} rotation ${rotation}`;
      assert.ok(Math.abs(bounds.min.y-slot.y-.004)<1e-6,label);
      assert.ok(bounds.max.y<=slot.y+slot.maxHeight-.06,label);
      assert.ok(bounds.min.x>=slot.x+.08&&bounds.max.x<=slot.x+slot.width-.08,label);
      assert.ok(bounds.max.z<=slot.z+.201&&bounds.min.z>=slot.z-.49,label);
      const before=bounds.clone();fitDecoration(object,slot);assert.ok(new THREE.Box3().setFromObject(object,true).min.distanceTo(before.min)<1e-6,label+' repeated fit');
      disposeObject(object);
    }
  }finally{restore();}
});

test('desk slots fit all supported objects at all rotations without covering functional books, the notebook or book pull paths',()=>{
  const restore=canvasEnvironment(),root=new THREE.Group(),m=roomMaterials();let layer;
  function boundsOf(object){const bounds=new THREE.Box3();object.traverse(child=>{if(child.isMesh&&!child.userData.collisionIgnore)bounds.expandByObject(child,true);});return bounds;}
  function body(object,id){const bounds=boundsOf(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());return {id,x:center.x,z:center.z,width:size.x,depth:size.z,bottom:bounds.min.y,top:bounds.max.y};}
  try{
    const desk=makeDesk(root,m),open=makeOpenBook(root,m);layer=populateBooks(root,books.slice(0,6),slots,()=>{});root.updateMatrixWorld(true);
    assert.equal(desk.desk.children.filter(child=>child.userData.openNotebook).length,1);assert.equal(desk.notebook.userData.openNotebook,true);
    const volumes=layer.targets.filter(object=>object.userData.location==='desk'),rest=volumes.map(object=>object.position.clone());
    assert.equal(volumes.length,5);assert.ok(volumes.some(object=>object.position.y<1));
    const fixed=[body(open,'open'),body(desk.notebook,'notebook')];assert.equal(deskBodiesOverlap(fixed[0],fixed[1]),false);
    for(const entry of decorCatalog)for(const slot of studyDeskSlots())for(let rotation=0;rotation<4;rotation++){
      const object=makeDecoration({id:'test-prop',type:entry.id,slotId:slot.id,page:0,color:0,rotation});fitDeskDecoration(object,slot);root.add(object);root.updateMatrixWorld(true);
      const propBody=body(object,entry.id),bounds=boundsOf(object),label=`${entry.id} ${slot.id} rotation ${rotation}`;
      assert.ok(Math.abs(bounds.min.y-slot.y-.004)<1e-6,label);
      assert.ok(bounds.min.x>=slot.x+.049&&bounds.max.x<=slot.x+slot.width-.049&&bounds.min.z>=slot.z+.049&&bounds.max.z<=slot.z+slot.depth-.049,label);
      assert.ok(bounds.max.y<=slot.y+slot.maxHeight-.069,label);
      assert.ok(bounds.min.x>=deskBounds.minX&&bounds.max.x<=deskBounds.maxX&&bounds.min.z>=deskBounds.minZ&&bounds.max.z<=deskBounds.maxZ,label);
      for(const zone of deskProtectedZones)assert.equal(deskBodiesOverlap(propBody,zone),false,label+' reserved region');
      for(const amount of [0,.5,1]){
        volumes.forEach((volume,index)=>{volume.position.copy(rest[index]).addScaledVector(new THREE.Vector3(0,0,volume.userData.pullDepth??volume.userData.depth).multiplyScalar(BOOK_PULL_FRACTION).applyQuaternion(volume.quaternion),amount);});root.updateMatrixWorld(true);
        for(const obstacle of [...fixed,...volumes.map((volume,index)=>body(volume,`book-${index}`))])assert.equal(deskBodiesOverlap(propBody,obstacle),false,label+' book motion');
      }
      if(entry.category==='조명')assert.ok(object.userData.light?.isPointLight);
      root.remove(object);disposeObject(object);
    }
  }finally{layer?.covers.dispose();disposeObject(root);restore();}
});

test('desk placements stay global across shelf pages without consuming a book cubby or clearing saved shelf props',()=>{
  const desktop={id:'desk-cup',type:'mug',slotId:'desk-front-middle',page:0,color:0,rotation:0},shelf=prop(slots[0]);
  const plain=buildShelfPages(books,[shelf]),pages=buildShelfPages(books,[shelf,desktop]);
  assert.equal(pages.length,plain.length);
  pages.forEach((page,index)=>{assert.deepEqual(page.books,plain[index].books);assert.deepEqual(page.emptySlots,plain[index].emptySlots);assert.ok(page.decorations.includes(desktop));});
  assert.equal(pages[0].decorations.filter(item=>decorationSurface(item.slotId)==='shelves').length,1);
  const document={settings:defaultStudySettings,decorations:[shelf,desktop]},storage=memory(),store=new StudyCustomizationStore(()=>storage);
  store.setOwner('reader');store.begin('reader');store.update('reader',document);assert.equal(store.save('reader'),true);
  const reopened=new StudyCustomizationStore(()=>storage);reopened.setOwner('reader');assert.deepEqual(reopened.getSnapshot().document,document);
  reopened.begin('reader');reopened.update('reader',{...document,decorations:[shelf,{...desktop,color:1}]});reopened.undo('reader');assert.deepEqual(reopened.getSnapshot().document,document);
  reopened.update('reader',{...document,decorations:[shelf]});reopened.cancel('reader');assert.deepEqual(reopened.getSnapshot().document,document);
});

test('desktop-only props, protected positions and duplicate desk locations cannot enter the saved room',()=>{
  const mug={id:'cup',type:'mug',slotId:'desk-front-middle',page:8,color:0,rotation:0};
  const normalized=normalizeRoomDocument({settings:defaultStudySettings,decorations:[prop(slots[0]),mug,{...mug,id:'duplicate',page:0},{...mug,id:'shelf-cup',slotId:slots[1].id},{...mug,id:'book-zone',slotId:'desk-open-book'}]});
  assert.equal(normalized.decorations.length,2);assert.equal(normalized.decorations[1].page,0);
  assert.equal(decorForSurface('desk').length,17);assert.equal(decorForSurface('shelves').length,14);
});

test('changing shelf pages keeps the same real recent books on and below the desk',()=>{
  const restore=canvasEnvironment();
  try{
    for(const page of buildShelfPages(books,[])){
      const root=new THREE.Group(),layer=populateBooks(root,page.books,slots,()=>{},new Set(),books);
      assert.deepEqual(layer.targets.filter(object=>object.userData.location==='desk').map(object=>object.userData.book.id),books.slice(1,6).map(book=>book.id));
      assert.deepEqual(layer.targets.filter(object=>object.userData.location==='shelves').map(object=>object.userData.book.id),page.books.map(book=>book.id));
      layer.covers.dispose();disposeObject(root);
    }
  }finally{restore();}
});

test('theme changes reuse patterned textures and restore the original room materials',()=>{
  const restore=canvasEnvironment(),base=()=>new THREE.CanvasTexture({width:128,height:128});
  const materials={wood:new THREE.MeshStandardMaterial({map:base()}),floor:new THREE.MeshStandardMaterial({map:base()}),plaster:new THREE.MeshStandardMaterial({map:base()}),fabric:new THREE.MeshStandardMaterial({map:base()}),rug:new THREE.MeshStandardMaterial({map:base()})};
  const originals={wood:materials.wood.map,floor:materials.floor.map,rug:materials.rug.map};const theme=new StudyTheme(materials);
  try {
    const changed={...defaultStudySettings,wood:'ivory',floor:'herringbone',rugPattern:'stripes',wallTexture:'linen'};theme.apply(changed);
    const variants={wood:materials.wood.map,floor:materials.floor.map,rug:materials.rug.map};
    for(let i=0;i<20;i++)theme.apply({...changed,light:i*5});assert.equal(materials.wood.map,variants.wood);assert.equal(materials.floor.map,variants.floor);assert.equal(materials.rug.map,variants.rug);
    theme.apply(defaultStudySettings);assert.equal(materials.wood.map,originals.wood);assert.equal(materials.floor.map,originals.floor);assert.equal(materials.rug.map,originals.rug);
  }finally{theme.dispose();Object.values(materials).forEach(material=>material.dispose());restore();}
});

const photo=()=>new THREE.Texture({width:1672,height:941});
test('every landscape loads its own spherical environment without viewport cropping or replacing room models',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group();scene.add(room);let requests=0,released=0;
  const sources=[];
  const world=new CityBackdrop(scene,()=>{},async source=>{sources.push(source);requests++;const texture=photo();texture.addEventListener('dispose',()=>released++);return texture;});
  for(const option of sceneryOptions){
    await world.set(option.id);const texture=scene.background;
    assert.deepEqual(sources.slice(-2),[option.cubeFaces,option.panorama]);
    assert.equal(texture.colorSpace,THREE.SRGBColorSpace);assert.equal(texture.mapping,THREE.CubeReflectionMapping);assert.equal(scene.fog,null);
    for(const [width,height] of [[1440,900],[375,812],[1086,900]]){
      world.resize(width,height);assert.deepEqual(texture.repeat.toArray(),[1,1]);assert.deepEqual(texture.offset.toArray(),[0,0]);assert.equal(scene.backgroundRotation.y,option.rotation);
    }
    const before=requests;await world.set(option.id);assert.equal(requests,before);assert.equal(scene.background,texture);
    assert.ok(scene.children.includes(room));assert.equal(scene.children.filter(object=>object.name==='study-panorama-sky').length,1);
  }
  world.dispose();assert.equal(released,10);assert.equal(scene.background,null);assert.deepEqual(scene.children,[room]);assert.deepEqual(scene.backgroundRotation.toArray().slice(0,3),[0,0,0]);
});

test('late environments cannot replace newer cities or forest, or survive scene disposal',async()=>{
  const scene=new THREE.Scene(),pending=[],states=[];
  const world=new CityBackdrop(scene,state=>states.push(state),()=>new Promise(resolve=>pending.push(resolve)));
  let released=0;const watched=()=>{const texture=photo();texture.addEventListener('dispose',()=>released++);return texture;};
  const first=world.set('new-york'),second=world.set('tokyo'),tokyo=watched();pending[2](tokyo);pending[3](watched());await second;
  pending[0](watched());pending[1](watched());await first;assert.equal(scene.background,tokyo);assert.equal(released,2);assert.deepEqual(states.at(-1),{mode:'tokyo',phase:'ready'});
  const third=world.set('london'),fourth=world.set('forest'),forest=watched();pending[6](forest);pending[7](watched());await fourth;
  pending[4](watched());pending[5](watched());await third;
  assert.equal(scene.background,forest);assert.equal(released,6);assert.deepEqual(states.at(-1),{mode:'forest',phase:'ready'});
  const fifth=world.set('seoul');world.dispose();const before=states.length;pending[8](watched());pending[9](watched());await fifth;
  assert.equal(scene.background,null);assert.equal(released,10);assert.equal(states.length,before);
});

test('a failed environment keeps a usable room and retries only on an explicit request',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group(),states=[];scene.add(room);let requests=0,fail=true;
  const world=new CityBackdrop(scene,state=>states.push(state),async source=>{requests++;if(Array.isArray(source)&&fail)throw new Error('image unavailable');return photo();});
  await world.set('forest');assert.deepEqual(states.at(-1),{mode:'forest',phase:'error'});assert.ok(scene.background.isColor);assert.deepEqual(scene.children,[room]);
  await world.set('forest');assert.equal(requests,2);
  fail=false;await world.set('forest',true);assert.equal(requests,4);assert.ok(scene.background.isTexture);assert.deepEqual(states.at(-1),{mode:'forest',phase:'ready'});world.dispose();
});

test('a partial panorama releases its cube, and a complete environment releases both textures and joining mesh',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group();scene.add(room);let fail=true,released=0;
  const world=new CityBackdrop(scene,()=>{},async source=>{
    if(!Array.isArray(source)&&fail)throw new Error('panorama reference unavailable');
    const texture=Array.isArray(source)?new THREE.CubeTexture(Array.from({length:6},()=>({width:1254,height:1254}))):photo();
    texture.addEventListener('dispose',()=>released++);return texture;
  });
  await world.set('seoul');assert.equal(released,1);assert.ok(scene.background.isColor);assert.deepEqual(scene.children,[room]);
  fail=false;await world.set('seoul',true);const sky=scene.getObjectByName('study-panorama-sky');assert.ok(sky);let geometryReleased=0,materialReleased=0;
  sky.geometry.addEventListener('dispose',()=>geometryReleased++);sky.material.addEventListener('dispose',()=>materialReleased++);
  world.dispose();assert.equal(scene.background,null);assert.equal(scene.getObjectByName('study-panorama-sky'),undefined);assert.equal(released,3);assert.equal(geometryReleased,1);assert.equal(materialReleased,1);assert.deepEqual(scene.children,[room]);
});

test('saved city choices migrate safely and changing the scenery preserves decoration identity through undo and reload',()=>{
  assert.equal(normalizeRoomDocument({settings:{backdrop:'unknown'}}).settings.backdrop,'forest');
  const storage=memory(),store=new StudyCustomizationStore(()=>storage);store.setOwner('a');store.begin('a');
  store.update('a',{settings:defaultStudySettings,decorations:[prop(slots[0])]});store.save('a');store.begin('a');
  const previous=store.getSnapshot().document.decorations;
  store.update('a',{...store.getSnapshot().document,settings:{...defaultStudySettings,backdrop:'tokyo'}});
  assert.equal(store.getSnapshot().document.decorations,previous);store.undo('a');assert.equal(store.getSnapshot().document.settings.backdrop,'forest');
  store.update('a',{...store.getSnapshot().document,settings:{...defaultStudySettings,backdrop:'new-york'}});store.save('a');
  const reopened=new StudyCustomizationStore(()=>storage);reopened.setOwner('a');assert.equal(reopened.getSnapshot().document.settings.backdrop,'new-york');assert.equal(reopened.getSnapshot().document.decorations.length,1);
  reopened.setOwner('b');assert.equal(reopened.getSnapshot().document.settings.backdrop,'forest');
});

function roomMaterials(){return {...Object.fromEntries(['floor','facade','wood','fabric','plaster','ceramic','cork','coral','rug','treeBark'].map(name=>[name,new THREE.MeshStandardMaterial()])),garden:new THREE.Texture()};}
test('the penthouse has connected structural slabs, supported terrace rails, real lower storeys and no synthetic reading books',()=>{
  const root=new THREE.Group(),m=roomMaterials(),house=makePenthouse(root,m);house.visible=true;root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(house,true),slabs=[];let glass=0,lowerShadows=0,books=0;
  house.traverse(object=>{if(object.name==='penthouse-floor-slab')slabs.push(new THREE.Box3().setFromObject(object,true));if(object.name==='penthouse-glass'){glass++;assert.equal(blocksStudyPointer(object),false);}if(object.userData.book)books++;});
  house.getObjectByName('penthouse-lower-storeys').traverse(object=>{if(object.isMesh&&object.castShadow)lowerShadows++;});
  assert.equal(house.userData.lowerStoreys,6);assert.equal(slabs.length,7);assert.ok(bounds.min.y<-21);assert.ok(bounds.max.y>5.4);assert.equal(books,0);assert.equal(lowerShadows,0);assert.ok(glass>=62);
  for(const slab of slabs)assert.ok(slab.min.x<-8.8&&slab.max.x>6.0);
  for(let row=1;row<slabs.length;row++)assert.ok(Math.abs(slabs[row-1].getCenter(new THREE.Vector3()).y-slabs[row].getCenter(new THREE.Vector3()).y-3.48)<1e-6);
  const rear=house.getObjectByName('penthouse-rear-facade'),rearBounds=new THREE.Box3().setFromObject(rear,true);
  assert.equal(rear.isGroup,true);assert.ok(rearBounds.min.y<slabs.at(-1).max.y&&rearBounds.max.y>slabs[0].min.y);
  const side=house.getObjectByName('penthouse-side-facade'),sideBounds=new THREE.Box3().setFromObject(side,true);
  assert.equal(side.isMesh,true);assert.equal(side.material.transparent,false);
  assert.ok(sideBounds.min.y<slabs.at(-1).max.y&&sideBounds.max.y>slabs[0].min.y);
  assert.ok(sideBounds.min.z<-4.2&&sideBounds.max.z>4.2);
  const terrace=house.getObjectByName('penthouse-terrace');assert.ok(new THREE.Box3().setFromObject(terrace,true).min.y<0);assert.ok(terrace.getObjectByName('penthouse-glass'));
  house.visible=false;house.traverse(object=>{if(object.isMesh)assert.equal(blocksStudyPointer(object),false);});
  disposeObject(root);
});

test('rear windows match front windows on all six storeys and have real room depth behind transparent glazing',()=>{
  const root=new THREE.Group(),house=makePenthouse(root,roomMaterials()),front=[],rear=[],ray=new THREE.Raycaster();house.visible=true;root.updateMatrixWorld(true);
  house.traverse(object=>{if(object.name==='penthouse-glass'&&object.parent.userData.facade)(object.parent.userData.facade==='rear'?rear:front).push(object);});
  assert.equal(front.length,24);assert.equal(rear.length,24);
  const counts=Array(6).fill(0);
  rear.forEach((window,index)=>{
    const outside=window.getWorldPosition(new THREE.Vector3()),opposite=front[index].getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(outside.x-opposite.x)<1e-9&&Math.abs(outside.y-opposite.y)<1e-9&&Math.abs(outside.z+opposite.z)<1e-9);
    assert.deepEqual(window.geometry.parameters,front[index].geometry.parameters);assert.ok(window.material===front[index].material);counts[window.parent.userData.storey]++;
    assert.equal(blocksStudyPointer(window),false);
    const sample=outside.clone();sample.x+=window.geometry.parameters.width*.2;
    ray.set(sample.add(new THREE.Vector3(0,0,-20)),new THREE.Vector3(0,0,1));
    const hits=ray.intersectObject(house,true).filter(hit=>{for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;return true;});assert.ok(hits[0].object===window);
    const interior=hits.find(hit=>blocksStudyPointer(hit.object));
    assert.ok(interior.object.parent===window.parent);assert.ok(interior.point.z-outside.z>1);
  });
  assert.deepEqual(counts,[4,4,4,4,4,4]);disposeObject(root);
});

test('the extended lower edge stays below landscape viewports after panning the room upward and rotating',()=>{
  const root=new THREE.Group(),m=roomMaterials(),house=makePenthouse(root,m),slabs=[];house.visible=true;root.updateMatrixWorld(true);
  house.traverse(object=>{if(object.name==='penthouse-floor-slab')slabs.push(object);});
  const bottomSlab=slabs.at(-1),edge=new THREE.Box3().setFromObject(bottomSlab,true),target=studyRoomPose('new-york').target;target.y=-.35;
  const camera=createStudyCamera(),ray=new THREE.Raycaster();camera.zoom=.65;
  for(const [width,height] of [[1512,770],[1536,1024],[1920,1080]]){
    resizeStudyCamera(camera,width,height);
    for(const polar of [Math.PI/3,1.461,Math.PI/2,Math.PI*3/4])for(let yaw=0;yaw<24;yaw++){
      camera.position.setFromSpherical(new THREE.Spherical(32,polar,yaw*Math.PI/12)).add(target);camera.lookAt(target);camera.updateMatrixWorld();
      for(const x of [edge.min.x+.002,edge.max.x-.002])for(const z of [edge.min.z+.002,edge.max.z-.002]){
        const worldPoint=new THREE.Vector3(x,edge.max.y,z),point=worldPoint.clone().project(camera);
        if(Math.abs(point.x)>1||point.y<-1)continue;
        // A far corner may project into the viewport while nearer opaque floors
        // and walls occlude it. Transparent glazing does not count as occlusion.
        ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);
        const hit=ray.intersectObject(house,true).find(hit=>blocksStudyPointer(hit.object));
        assert.ok(hit&&hit.object!==bottomSlab&&hit.distance<camera.position.distanceTo(worldPoint)-.01,`lower edge exposed at ${width}x${height}, polar=${polar}, yaw=${yaw}`);
      }
    }
  }
  disposeObject(root);
});

test('real shelf book models remain reachable in the focused camera and through the penthouse front glazing',()=>{
  const restore=canvasEnvironment(),root=new THREE.Group(),m=roomMaterials();let layer;
  try{
    const classic=makeRoom(root,m);classic.visible=false;
    const house=makePenthouse(root,m);house.visible=true;house.getObjectByName('penthouse-front-lintel').visible=false;house.getObjectByName('penthouse-roof').visible=false;
    const shelf=makeShelves(root,m);layer=populateBooks(root,books.slice(0,7),shelf,()=>{});root.updateMatrixWorld(true);
    const pose=studyCameraPose([6.5,3.4,14.15],[.3,2.6,-3.15],1.8),ray=new THREE.Raycaster();let throughGlass=0;
    for(const target of layer.targets.filter(object=>object.userData.location==='shelves')){
      const bounds=new THREE.Box3().setFromObject(target,true),center=bounds.getCenter(new THREE.Vector3());center.z=bounds.max.z+.001;
      for(const eye of [pose.eye,new THREE.Vector3(center.x,center.y+.20,32)]){
        ray.set(eye,center.clone().sub(eye).normalize());
        const hits=ray.intersectObject(root,true);if(hits.some(hit=>hit.object.userData.pointerPassThrough))throughGlass++;
        const hit=hits.find(hit=>blocksStudyPointer(hit.object));let object=hit?.object;
        while(object&&!object.userData.book)object=object.parent;
        assert.equal(object?.userData.book?.id,target.userData.book.id);
      }
    }
    assert.ok(throughGlass>0);
  }finally{layer?.covers.dispose();disposeObject(root);restore();}
});

test('all city overviews preserve the proven penthouse composition and the forest keeps its familiar room composition',()=>{
  const ny=studyRoomPose('new-york'),forest=studyRoomPose('forest');
  assert.ok(ny.eye.x<0&&ny.eye.y>4.8&&ny.eye.y<5.18&&ny.eye.z>0);assert.equal(ny.zoom,.79);
  for(const city of ['tokyo','london','seoul'])assert.deepEqual(studyRoomPose(city),ny);
  assert.ok(forest.eye.y>ny.eye.y&&forest.eye.y<7);assert.equal(forest.zoom,.79);
  assert.ok(Math.abs(ny.eye.distanceTo(ny.target)-32)<1e-8);
});

test('the treehouse has a supporting trunk, forks and cradle without changing the personal room or creating ground geometry',()=>{
  const restore=canvasEnvironment(),root=new THREE.Group();
  try{
    const m=roomMaterials(),house=makePenthouse(root,m),shelves=makeShelves(root,m),desk=makeDesk(root,m);
    const woodColor=m.wood.color.clone(),facadeColor=m.facade.color.clone(),notebook=desk.notebook;
    const tree=house.getObjectByName('study-treehouse'),lower=house.getObjectByName('penthouse-lower-storeys');
    const rails=house.getObjectByName('penthouse-terrace-rails'),upper=house.getObjectByName('penthouse-upper-frame'),beam=[];
    upper.traverse(object=>{if(object.userData.architecturalBeam)beam.push(object);});
    for(const option of [...sceneryOptions,...sceneryOptions].reverse()){
      setStudyArchitecture(house,option.id);root.updateMatrixWorld(true);
      const forest=option.id==='forest';assert.equal(tree.visible,forest);assert.equal(lower.visible,!forest);assert.equal(rails.visible,!forest);
      assert.equal(house.userData.lowerStoreys,forest?0:6);assert.equal(desk.notebook,notebook);assert.deepEqual(shelves,studyShelfSlots());
      assert.ok(m.wood.color.equals(woodColor));assert.ok(m.facade.color.equals(facadeColor));
      for(const item of beam)assert.equal(item.material,forest?tree.userData.wood:house.userData.architecture.facade);
      assert.notEqual(tree.userData.wood,m.wood);
    }
    setStudyArchitecture(house,'forest');root.updateMatrixWorld(true);
    assert.equal(house.getObjectByName('woodland-ground'),undefined);assert.equal(tree.userData.height,18);
    const trunk=tree.getObjectByName('treehouse-trunk'),cradle=tree.getObjectByName('treehouse-deck-cradle');
    assert.ok(new THREE.Box3().setFromObject(trunk,true).min.y<-17.9);
    const fork=tree.children.filter(object=>object.name==='treehouse-support-branch');assert.equal(fork.length,4);
    for(const branch of fork){
      assert.ok(new THREE.Box3().setFromObject(branch,true).intersectsBox(new THREE.Box3().setFromObject(trunk,true)));
      const tip=new THREE.Vector3(...branch.userData.end),radius=branch.geometry.parameters.radiusTop;
      assert.ok(cradle.children.some(beam=>new THREE.Box3().setFromObject(beam,true).distanceToPoint(tip)<radius));
      assert.ok(new THREE.Box3().setFromObject(branch,true).max.y<-.27);
    }
    const crown=tree.getObjectByName('treehouse-crown');crown.computeBoundingBox();
    const crownBounds=new THREE.Box3().setFromObject(crown,true);assert.ok(crownBounds.max.z<-4.36);assert.equal(crown.count,900);
  }finally{disposeObject(root);restore();}
});

test('treehouse camera can look at the sky while staying above the forest ground after panning and zooming',()=>{
  const camera=createStudyCamera(),pose=studyRoomPose('forest');camera.position.copy(pose.eye);
  const controls=createStudyControls(camera,null,'forest',pose.target);
  for(const zoom of [.65,.79,1.45,1.8,3.6])for(const height of [-.35,0,1.6,6.25]){
    camera.zoom=zoom;const shift=new THREE.Vector3(0,height-controls.target.y,0);camera.position.add(shift);controls.target.add(shift);
    setStudyControlLimits(controls,'forest');controls.update();
    for(let i=0;i<12;i++){
      controls.rotateUp(-Math.PI*20);controls.rotateLeft(Math.PI/3);
      assert.ok(camera.position.y>=FOREST_MIN_EYE_Y-1e-8);assert.ok(camera.up.distanceTo(new THREE.Vector3(0,1,0))<1e-8);
      const elevation=THREE.MathUtils.radToDeg(Math.asin(camera.position.clone().sub(controls.target).normalize().y));
      assert.ok(elevation>=FOREST_ELEVATION.min-1e-8&&elevation<=-30);assert.equal(camera.zoom,zoom);
      if(height===6.25)assert.ok(Math.abs(elevation+45)<1e-8);
      controls.rotateUp(Math.PI*20);assert.ok(Math.abs(THREE.MathUtils.radToDeg(Math.asin(camera.position.clone().sub(controls.target).normalize().y))-30)<1e-8);
    }
  }
  setStudyControlLimits(controls,'new-york');assert.equal(controls.maxPolarAngle,THREE.MathUtils.degToRad(135));
});

test('Seoul saves and reloads in the existing account document without changing colors or shelf and desk props',()=>{
  const storage=memory(),store=new StudyCustomizationStore(()=>storage);store.setOwner('a');store.begin('a');
  const document={settings:{...defaultStudySettings,backdrop:'seoul',wood:'walnut',rugColor:'sage'},decorations:[prop(slots[0]),{id:'desk-lamp',type:'desk-lamp',slotId:'desk-back-right',page:0,color:2,rotation:3}]};
  store.update('a',document);store.save('a');
  const reopened=new StudyCustomizationStore(()=>storage);reopened.setOwner('a');assert.deepEqual(reopened.getSnapshot().document,document);
  reopened.begin('a');reopened.update('a',{...document,settings:{...document.settings,backdrop:'forest'}});reopened.cancel('a');assert.deepEqual(reopened.getSnapshot().document,document);
  reopened.setOwner('b');assert.deepEqual(reopened.getSnapshot().document,defaultRoomDocument);
});

test('tree crown disposal releases instance buffers as well as the shared geometry and material',()=>{
  const root=new THREE.Group(),geometry=new THREE.PlaneGeometry(.1,.2),material=new THREE.MeshStandardMaterial(),leaves=new THREE.InstancedMesh(geometry,material,3);
  root.add(leaves);let instances=0,geometries=0,materials=0;
  leaves.addEventListener('dispose',()=>instances++);geometry.addEventListener('dispose',()=>geometries++);material.addEventListener('dispose',()=>materials++);
  disposeObject(root);assert.deepEqual([instances,geometries,materials],[1,1,1]);
});
