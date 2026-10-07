import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as THREE from 'three';

// Load repository TS for Node geometry tests; no browser or operating data is used.
const modules=new Map();
async function moduleUrl(url) {
  if(modules.has(url.href))return modules.get(url.href);
  const source=await readFile(url,'utf8');let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [,specifier] of [...js.matchAll(/from '([^']+)'/g)]) {
    const target=specifier.startsWith('three')?import.meta.resolve(specifier):specifier.startsWith('.')?await moduleUrl(new URL(specifier+'.ts',url)):null;
    if(target)js=js.replaceAll(`from '${specifier}'`,`from '${target}'`);
  }
  const target='data:text/javascript;base64,'+Buffer.from(js).toString('base64');modules.set(url.href,target);return target;
}
const {populateBooks,disposeObject}=await import(await moduleUrl(new URL('../src/lib/study/books.ts',import.meta.url)));
const {makeShelves}=await import(await moduleUrl(new URL('../src/lib/study/furniture.ts',import.meta.url)));

test('24 thick books stand spine-out inside actual shelf slots with full-depth pull and distinct desk instances',()=>{
  const original=global.document;
  const context={fillRect(){},scale(){},save(){},restore(){},translate(){},rotate(){},fillText(){},strokeText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(value){return {width:value.length*24};},createLinearGradient(){return {addColorStop(){}};}};
  global.document={createElement(){return {width:0,height:0,getContext(){return context;}};}};
  const root=new THREE.Group(),wood=new THREE.MeshStandardMaterial();
  try {
    const slots=makeShelves(root,{wood});
    const books=Array.from({length:24},(_,i)=>({id:`test-book-${i}`,title:`검증 도서 ${i}`,author:'검증 저자',status:'reading',totalPages:1500,currentPage:0,coverUrl:null}));
    const layer=populateBooks(root,books,slots,()=>{});root.updateMatrixWorld(true);
    const shelf=layer.targets.filter(object=>object.userData.location==='shelves');
    assert.equal(shelf.length,24);assert.deepEqual(new Set(shelf.map(object=>object.userData.book.id)),new Set(books.map(book=>book.id)));
    for(const object of shelf){
      const box=new THREE.Box3().setFromObject(object),slot=object.userData.shelf;
      assert.ok(box.min.x>=slot.x-.001&&box.max.x<=slot.x+slot.width+.001);
      assert.ok(box.min.y>=slot.y-.001&&box.max.y<=slot.y+slot.maxHeight+.001);
      assert.ok(Math.abs(object.geometry.parameters.depth/object.geometry.parameters.height-2/3)<1e-9);
      assert.equal(object.scale.x,object.scale.y);assert.equal(object.scale.y,object.scale.z);
      const spineNormal=new THREE.Vector3(0,0,1).applyQuaternion(object.quaternion);
      assert.ok(spineNormal.distanceTo(new THREE.Vector3(0,0,1))<1e-9);
      assert.ok(Math.abs(box.max.z-(slot.z+.28))<.001);
      assert.ok(Math.abs(object.userData.pullDepth-object.geometry.parameters.depth*object.scale.z)<1e-9);
      for(const neighbor of shelf){
        if(neighbor===object||neighbor.userData.shelf!==slot)continue;
        const other=new THREE.Box3().setFromObject(neighbor);
        assert.ok(box.max.x<=other.min.x||other.max.x<=box.min.x);
      }
    }
    const same=layer.targets.filter(object=>object.userData.book.id==='test-book-1');
    assert.equal(same.length,2);assert.notEqual(same[0].uuid,same[1].uuid);
    assert.ok(layer.targets.every(object=>object.userData.coverStatus==='missing'));
    layer.covers.dispose();disposeObject(root);
  }finally{wood.dispose();global.document=original;}
});
