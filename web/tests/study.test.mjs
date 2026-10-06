import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function load(file) {
  const source=await readFile(new URL(file,import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from 'three'/g,`from '${import.meta.resolve('three')}'`);
  return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {BookPullMotion}=await load('../src/lib/study/book-pull.ts');
const {studyBookHref}=await load('../src/lib/study/types.ts');
const {createStudyCamera,resizeStudyCamera,studyCameraPose,studyViewSize}=await load('../src/lib/study/camera.ts');
const {deskBodiesOverlap,resolveDeskCollisions}=await load('../src/lib/study/desk-collision.ts');
const {groundStudyObject}=await load('../src/lib/study/grounding.ts');

test('the actual imported chair grounds all four feet instead of its oversized rotated box',async()=>{
  const bytes=await readFile(new URL('../public/study/models/reading-chair/reading-chair.glb',import.meta.url));
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const cached=new THREE.Box3().setFromObject(scene),center=cached.getCenter(new THREE.Vector3());
  const chair=new THREE.Group();chair.add(scene);chair.scale.setScalar(2.6/cached.getSize(new THREE.Vector3()).y);
  scene.position.set(-center.x,-cached.min.y,-center.z);chair.position.set(-3.12,.015,3.32);chair.rotation.y=-.62;
  let feet;
  scene.traverse(object=>{if(object.isMesh&&object.material.name==='chair_oak')feet=object;});
  assert.ok(feet);
  chair.updateWorldMatrix(true,true);
  assert.ok(new THREE.Box3().setFromObject(feet,true).min.y>.35);
  groundStudyObject(chair,0,.003,feet);
  const minima=[Infinity,Infinity,Infinity,Infinity],point=new THREE.Vector3();
  const positions=feet.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(feet.matrixWorld);
    const height=point.y;chair.worldToLocal(point);
    const quadrant=Number(point.x>=0)+2*Number(point.z>=0);
    minima[quadrant]=Math.min(minima[quadrant],height);
  }
  minima.forEach(height=>assert.ok(Math.abs(height-.003)<1e-6));
  scene.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose();}});
});

test('a tilted frame rests on its support even inside a rotated and scaled parent',()=>{
  const parent=new THREE.Group();parent.position.set(2,1,-3);parent.rotation.set(.1,.2,.15);parent.scale.set(1.2,.8,.9);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.88,1.29,.065),new THREE.MeshBasicMaterial());
  frame.rotation.set(-.09,-.12,0);frame.position.set(1,2,0);parent.add(frame);
  for(const height of [0,.0825,0]){
    groundStudyObject(frame,height);
    const bounds=new THREE.Box3().setFromObject(frame);
    assert.ok(Math.abs(bounds.min.y-height-.003)<1e-9);
    const position=frame.position.clone();groundStudyObject(frame,height);
    assert.ok(frame.position.distanceTo(position)<1e-9);
  }
  frame.geometry.dispose();frame.material.dispose();
});

test('desk collision pushes a lamp and a neighboring pot without crossing the tabletop edge',()=>{
  const bounds={minX:0,maxX:4,minZ:0,maxZ:3};
  const book={id:'book',x:1.2,z:1.4,width:1,depth:1,bottom:1.9,top:2.5};
  const props=[{id:'lamp',x:1.2,z:1.4,width:.8,depth:.8,bottom:1.9,top:3.4},{id:'pot',x:2,z:1.4,width:.3,depth:.3,bottom:1.9,top:2.4}];
  const placed=resolveDeskCollisions(props,[book],bounds);
  assert.notDeepEqual(placed[0],props[0]);
  placed.forEach((prop,i)=>{
    assert.equal(deskBodiesOverlap(prop,book),false);
    placed.slice(0,i).forEach(other=>assert.equal(deskBodiesOverlap(prop,other),false));
    assert.ok(prop.x-prop.width/2>=bounds.minX&&prop.x+prop.width/2<=bounds.maxX);
    assert.ok(prop.z-prop.depth/2>=bounds.minZ&&prop.z+prop.depth/2<=bounds.maxZ);
  });
});

test('repeated book movement keeps pushing props clear and an unmoved layout remains stable',()=>{
  const bounds={minX:0,maxX:4,minZ:0,maxZ:3};
  let props=[{id:'lamp',x:1,z:1.8,width:.7,depth:.7,bottom:1.9,top:3.4}];
  for(let z=1;z<=2;z+=.05){
    const book={id:'book',x:1,z,width:.8,depth:.6,bottom:1.9,top:2.5};
    props=resolveDeskCollisions(props,[book],bounds);
    assert.equal(deskBodiesOverlap(props[0],book),false);
    assert.deepEqual(resolveDeskCollisions(props,[book],bounds),props);
  }
});

test('objects at separate heights may share a footprint without pushing each other',()=>{
  const prop={id:'mug',x:1,z:1,width:.4,depth:.4,bottom:1.9,top:2.2};
  const book={id:'under-desk',x:1,z:1,width:.8,depth:.6,bottom:.7,top:.9};
  assert.equal(deskBodiesOverlap(prop,book),false);
  assert.deepEqual(resolveDeskCollisions([prop],[book],{minX:0,maxX:3,minZ:0,maxZ:3}),[prop]);
});

test('equal sized objects project larger nearby than far away at every supported zoom',()=>{
  const camera=createStudyCamera();resizeStudyCamera(camera,1500,1100);
  camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  for(const zoom of [.65,.98,1.8,3.6]){
    camera.zoom=zoom;camera.updateProjectionMatrix();
    const width=z=>new THREE.Vector3(1,0,z).project(camera).x-new THREE.Vector3(-1,0,z).project(camera).x;
    assert.ok(width(0)>width(-10));assert.ok(Math.abs(width(0)/width(-10)-2)<1e-10);
  }
});

test('perspective pan spans match actual screen projection after rotation and zoom',()=>{
  for(const [width,height,zoom] of [[1500,1100,.98],[375,812,1.45],[1280,720,3.6]]){
    const camera=createStudyCamera(),pose=studyCameraPose([14,8.8,15.9],[0,2,.1],zoom);
    camera.position.copy(pose.eye);camera.zoom=zoom;camera.lookAt(pose.target);
    resizeStudyCamera(camera,width,height);camera.updateMatrixWorld();
    const span=studyViewSize(camera,camera.position.distanceTo(pose.target));
    const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    const center=pose.target.clone().project(camera);
    const shifted=pose.target.clone().addScaledVector(right,span.width*100/width).addScaledVector(up,span.height*80/height).project(camera);
    assert.ok(Math.abs((shifted.x-center.x)*width/2-100)<1e-8);
    assert.ok(Math.abs((shifted.y-center.y)*height/2-80)<1e-8);
    assert.ok(Math.abs(camera.position.distanceTo(pose.target)-32)<1e-10);
  }
});

test('first activation pulls and only reactivating the selected book opens details',()=>{
  const motion=new BookPullMotion();
  assert.equal(motion.pick('a',0),'pull');
  assert.equal(motion.amount('a'),0);
  motion.update(320);
  assert.equal(motion.amount('a'),1);
  assert.equal(motion.pick('a',350),'open');
  assert.equal(motion.selectedId,'a');
  assert.equal(motion.moving,false);
});

test('choosing another book returns the previous one and leaves only the new one out',()=>{
  const motion=new BookPullMotion();
  motion.pick('a',0);motion.update(320);
  assert.equal(motion.pick('b',400),'pull');
  motion.update(560);
  assert.ok(motion.amount('a')>0&&motion.amount('a')<1);
  assert.ok(motion.amount('b')>0&&motion.amount('b')<1);
  motion.update(720);
  assert.equal(motion.amount('a'),0);assert.equal(motion.amount('b'),1);
  assert.equal(motion.selectedId,'b');assert.equal(motion.moving,false);
});

test('rapid A to B to A reversals continue from the current position without snapping',()=>{
  const motion=new BookPullMotion();motion.pick('a',0);motion.update(100);
  const firstA=motion.amount('a');motion.pick('b',100);
  assert.equal(motion.amount('a'),firstA);
  motion.update(170);const a=motion.amount('a'),b=motion.amount('b');
  motion.pick('a',170);
  assert.equal(motion.amount('a'),a);assert.equal(motion.amount('b'),b);
  motion.update(490);
  assert.equal(motion.amount('a'),1);assert.equal(motion.amount('b'),0);assert.equal(motion.moving,false);
});

test('a second activation during movement opens without restarting the pull',()=>{
  const motion=new BookPullMotion();motion.pick('a',0);motion.update(80);
  const amount=motion.amount('a');assert.equal(motion.pick('a',80),'open');
  assert.equal(motion.amount('a'),amount);motion.update(320);assert.equal(motion.amount('a'),1);
});

test('clearing and replacing books discard selection and pending movements',()=>{
  const motion=new BookPullMotion();motion.pick('a',0);motion.update(320);motion.clear(400);
  assert.equal(motion.selectedId,null);motion.update(720);assert.equal(motion.amount('a'),0);
  motion.pick('b',800);motion.update(850);motion.reset();motion.update(2000);
  assert.equal(motion.selectedId,null);assert.equal(motion.amount('b'),0);assert.equal(motion.moving,false);
});

test('reduced motion keeps the same two-step interaction with immediate positions',()=>{
  const motion=new BookPullMotion();motion.pick('a',0,true);motion.pick('b',1,true);
  assert.equal(motion.amount('a'),0);assert.equal(motion.amount('b'),1);assert.equal(motion.moving,false);
  assert.equal(motion.pick('b',2,true),'open');motion.clear(3,true);assert.equal(motion.amount('b'),0);
});

test('real books use the private portal detail and demo books use an explicit demo detail',()=>{
  assert.equal(studyBookHref({id:'demo-6'}),'/study/books/demo-6');
  assert.equal(studyBookHref({id:'other',libraryId:'book-one'}),'/library/book-one');
  assert.equal(studyBookHref({id:'demo',libraryId:'../../api/auth/session'}),'/library/..%2F..%2Fapi%2Fauth%2Fsession');
});
