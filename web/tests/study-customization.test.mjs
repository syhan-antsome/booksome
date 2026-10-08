import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TrackballControls} from 'three/addons/controls/TrackballControls.js';

const modules=new Map();
async function moduleUrl(url){
  if(modules.has(url.href))return modules.get(url.href);
  let source=ts.transpileModule(await readFile(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [,specifier] of [...source.matchAll(/from '([^']+)'/g)]){const target=specifier.startsWith('three')?import.meta.resolve(specifier):specifier.startsWith('.')?await moduleUrl(new URL(specifier+'.ts',url)):null;if(target)source=source.replaceAll(`from '${specifier}'`,`from '${target}'`);}
  const target='data:text/javascript;base64,'+Buffer.from(source).toString('base64');modules.set(url.href,target);return target;
}
const load=async name=>import(await moduleUrl(new URL(`../src/lib/study/${name}.ts`,import.meta.url)));
const {decorCatalog}=await load('decor-catalog');
const {studyShelfSlots}=await load('shelves');
const {buildShelfPages,packShelfBooks}=await load('shelf-layout');
const {makeDecoration,fitDecoration}=await load('decor-models');
const {disposeObject,populateBooks}=await load('books');
const {makeRoom,makeShelves}=await load('furniture');
const {makePenthouse}=await load('penthouse');
const {blocksStudyPointer}=await load('pointer-surface');
const {studyRoomPose,studyCameraPose}=await load('camera');
const {createStudyControls,setStudyNavigation,resizeStudyControls}=await load('navigation-controls');
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

test('only New York uses bounded upright rotation and both controller types support the existing pan mode',()=>{
  const camera=new THREE.PerspectiveCamera(),pose=studyRoomPose('forest');camera.position.copy(pose.eye);
  for(const backdrop of ['forest','tokyo','london','new-york','forest','new-york']){
    camera.up.set(.6,.8,0);
    const controls=createStudyControls(camera,null,backdrop,pose.target);
    assert.equal(controls instanceof OrbitControls,backdrop==='new-york');
    assert.equal(controls instanceof TrackballControls,backdrop!=='new-york');
    if(backdrop==='new-york')assert.deepEqual(camera.up.toArray(),[0,1,0]);
    else assert.deepEqual(camera.up.toArray(),[.6,.8,0]);
    for(const mode of ['pan','orbit']){
      setStudyNavigation(controls,mode);resizeStudyControls(controls);
      assert.equal(controls.mouseButtons.LEFT,mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE);
      assert.equal(controls instanceof OrbitControls?controls.enableRotate:!controls.noRotate,mode==='orbit');
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
test('every actual decoration model rests on and fits the smallest cubby at all four rotations',()=>{
  const restore=canvasEnvironment(),slot=slots.reduce((smallest,slot)=>slot.maxHeight<smallest.maxHeight?slot:smallest);
  try {
    for(const entry of decorCatalog)for(let rotation=0;rotation<4;rotation++) {
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
test('New York stays spherical while flat city photos cover desktop and mobile, preserving room models and texture reuse',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group();scene.add(room);let requests=0,released=0;
  const world=new CityBackdrop(scene,()=>{},async()=>{requests++;const texture=photo();texture.addEventListener('dispose',()=>released++);return texture;});
  try {
    for(const city of ['new-york','tokyo','london']) {
      await world.set(city);const texture=scene.background;
      assert.equal(texture.colorSpace,THREE.SRGBColorSpace);assert.equal(texture.mapping,city==='new-york'?THREE.CubeReflectionMapping:THREE.UVMapping);assert.equal(scene.fog,null);
      for(const [width,height] of [[1440,900],[375,812],[1086,900]]) {
        world.resize(width,height);
        if(city==='new-york'){
          assert.deepEqual(texture.repeat.toArray(),[1,1]);assert.deepEqual(texture.offset.toArray(),[0,0]);assert.equal(scene.backgroundRotation.y,.88);
        }else{
          const visibleAspect=1672*texture.repeat.x/(941*texture.repeat.y);
          assert.ok(Math.abs(visibleAspect-width/height)<1e-8);assert.ok(texture.repeat.x<=1&&texture.repeat.y<=1);
          assert.ok(Math.abs(texture.offset.x-(1-texture.repeat.x)/2)<1e-8);assert.equal(scene.backgroundRotation.y,0);
        }
      }
      const before=requests;await world.set(city);assert.equal(requests,before);assert.equal(scene.background,texture);assert.ok(scene.children.includes(room));assert.equal(Boolean(scene.getObjectByName('study-panorama-sky')),city==='new-york');
    }
    await world.set('forest');assert.equal(scene.background,null);assert.equal(released,4);assert.deepEqual(scene.backgroundRotation.toArray().slice(0,3),[0,0,0]);assert.deepEqual(scene.children,[room]);
  }finally{world.dispose();}
});

test('late photograph loads cannot replace a newer city, refill the forest, or survive scene disposal',async()=>{
  const scene=new THREE.Scene(),pending=[],states=[];
  const world=new CityBackdrop(scene,state=>states.push(state),()=>new Promise(resolve=>pending.push(resolve)));
  let released=0;const watched=()=>{const texture=photo();texture.addEventListener('dispose',()=>released++);return texture;};
  const first=world.set('new-york'),second=world.set('tokyo'),tokyo=watched();pending[2](tokyo);await second;
  pending[0](watched());pending[1](watched());await first;assert.equal(scene.background,tokyo);assert.equal(released,2);assert.deepEqual(states.at(-1),{mode:'tokyo',phase:'ready'});
  const third=world.set('london');await world.set('forest');pending[3](watched());await third;
  assert.equal(scene.background,null);assert.equal(released,4);assert.deepEqual(states.at(-1),{mode:'forest',phase:'ready'});
  const fourth=world.set('new-york');world.dispose();const before=states.length;pending[4](watched());pending[5](watched());await fourth;
  assert.equal(scene.background,null);assert.equal(released,6);assert.equal(states.length,before);
});

test('a failed city photo retains a usable room and can be explicitly retried without automatic request loops',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group(),states=[];scene.add(room);let requests=0;
  const world=new CityBackdrop(scene,state=>states.push(state),async()=>{if(++requests===1)throw new Error('image unavailable');return photo();});
  await world.set('london');assert.deepEqual(states.at(-1),{mode:'london',phase:'error'});assert.ok(scene.background.isColor);assert.deepEqual(scene.children,[room]);
  await world.set('london');assert.equal(requests,1);
  await world.set('london',true);assert.equal(requests,2);assert.ok(scene.background.isTexture);assert.deepEqual(states.at(-1),{mode:'london',phase:'ready'});world.dispose();
});

test('a partial panoramic load releases its cube, and a complete environment releases both textures and its joining mesh',async()=>{
  const scene=new THREE.Scene(),room=new THREE.Group();scene.add(room);let fail=true,released=0;
  const world=new CityBackdrop(scene,()=>{},async source=>{
    if(!Array.isArray(source)&&fail)throw new Error('panorama reference unavailable');
    const texture=Array.isArray(source)?new THREE.CubeTexture(Array.from({length:6},()=>({width:1254,height:1254}))):photo();
    texture.addEventListener('dispose',()=>released++);return texture;
  });
  await world.set('new-york');assert.equal(released,1);assert.ok(scene.background.isColor);assert.deepEqual(scene.children,[room]);
  fail=false;await world.set('new-york',true);const sky=scene.getObjectByName('study-panorama-sky');assert.ok(sky);let geometryReleased=0,materialReleased=0;
  sky.geometry.addEventListener('dispose',()=>geometryReleased++);sky.material.addEventListener('dispose',()=>materialReleased++);
  await world.set('forest');assert.equal(scene.background,null);assert.equal(scene.getObjectByName('study-panorama-sky'),undefined);assert.equal(released,3);assert.equal(geometryReleased,1);assert.equal(materialReleased,1);assert.deepEqual(scene.children,[room]);world.dispose();
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

function roomMaterials(){return {...Object.fromEntries(['floor','facade','wood','fabric','plaster','ceramic','cork','coral','rug'].map(name=>[name,new THREE.MeshStandardMaterial()])),garden:new THREE.Texture()};}
test('the penthouse has connected structural slabs, supported terrace rails, real lower storeys and no synthetic reading books',()=>{
  const root=new THREE.Group(),m=roomMaterials(),house=makePenthouse(root,m);house.visible=true;root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(house,true),slabs=[];let glass=0,lowerShadows=0,books=0;
  house.traverse(object=>{if(object.name==='penthouse-floor-slab')slabs.push(new THREE.Box3().setFromObject(object,true));if(object.name==='penthouse-glass'){glass++;assert.equal(blocksStudyPointer(object),false);}if(object.userData.book)books++;});
  house.getObjectByName('penthouse-lower-storeys').traverse(object=>{if(object.isMesh&&object.castShadow)lowerShadows++;});
  assert.equal(slabs.length,4);assert.ok(bounds.min.y<-10);assert.ok(bounds.max.y>5.4);assert.equal(books,0);assert.equal(lowerShadows,0);assert.ok(glass>=20);
  for(const slab of slabs)assert.ok(slab.min.x<-8.8&&slab.max.x>6.0);
  const terrace=house.getObjectByName('penthouse-terrace');assert.ok(new THREE.Box3().setFromObject(terrace,true).min.y<0);assert.ok(terrace.children.some(object=>object.name==='penthouse-glass'));
  house.visible=false;house.traverse(object=>{if(object.isMesh)assert.equal(blocksStudyPointer(object),false);});
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

test('New York has a grounded penthouse overview and other cities retain their original room pose',()=>{
  const ny=studyRoomPose('new-york'),forest=studyRoomPose('forest');
  assert.ok(ny.eye.x<0&&ny.eye.y>4.8&&ny.eye.y<5.18&&ny.eye.z>0);assert.equal(ny.zoom,.79);
  assert.deepEqual(studyRoomPose('tokyo'),forest);assert.deepEqual(studyRoomPose('london'),forest);
  assert.ok(Math.abs(ny.eye.distanceTo(ny.target)-32)<1e-8);
});
