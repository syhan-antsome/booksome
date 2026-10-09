import * as THREE from 'three';
import {box} from './furniture';
import type {StudyMaterials} from './materials';
import {TREEHOUSE_HEIGHT} from './scenery-options';
export {TREEHOUSE_HEIGHT} from './scenery-options';

/** The room stays at its existing coordinates. Its supporting tree extends
 * below the deck; the distant canopy is the shared panoramic environment. */
export function makeTreehouse(parent:THREE.Group,m:StudyMaterials){
  const group=new THREE.Group();group.name='study-treehouse';group.visible=false;parent.add(group);
  const wood=m.wood.clone();wood.color.set('#d6af81');
  const bark=m.treeBark.clone();
  group.userData.wood=wood;group.userData.height=TREEHOUSE_HEIGHT;

  const cradle=new THREE.Group();cradle.name='treehouse-deck-cradle';group.add(cradle);
  box(cradle,[14.97,.20,8.72],[-1.365,-.37,0],wood,.03).name='treehouse-platform';
  for(const z of [-3.3,0,3.3])box(cradle,[14.97,.42,.28],[-1.365,-.59,z],wood,.025);
  for(const x of [-7.2,-3.4,.4,4.3])box(cradle,[.27,.42,8.60],[x,-.59,0],wood,.025);

  function limb(name:string,start:[number,number,number],end:[number,number,number],base:number,tip:number){
    const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end),axis=to.clone().sub(from),height=axis.length();
    const geometry=new THREE.CylinderGeometry(tip,base,height,32,Math.max(5,Math.ceil(height*2))),p=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),theta=Math.atan2(z,x),radius=Math.hypot(x,z);
      if(radius>.0001){const ridge=1+.024*Math.sin(theta*7+y*.27)+.012*Math.cos(theta*13-y*.16);p.setXYZ(i,x*ridge+.045*Math.sin(y*.6),y,z*ridge+.04*Math.cos(y*.4));}
      uv.setXY(i,uv.getX(i)*Math.PI*(base+tip)*.6,(y+height/2)*.35);
    }
    geometry.computeVertexNormals();
    const object=new THREE.Mesh(geometry,bark);object.name=name;object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
    object.castShadow=name!=='treehouse-trunk';object.receiveShadow=true;object.userData.start=start;object.userData.end=end;group.add(object);return object;
  }
  limb('treehouse-trunk',[-1.15,-TREEHOUSE_HEIGHT,-.05],[-1.7,-3.5,-.25],1.45,.88);
  // Four real forks contact crossbeams, clear of the room floor and its books.
  for(const x of [-7.2,4.3])for(const z of [-3.3,3.3])limb('treehouse-support-branch',[-1.7,-4.7,-.25],[x,-.65,z],.55,.28);

  const braceMaterial=wood.clone();braceMaterial.color.set('#b49368');
  for(const [x,z] of [[-6.9,3.3],[-6.9,-3.3],[4.1,3.3],[4.1,-3.3]]){
    const start=new THREE.Vector3(-1.65,-3.65,-.15),end=new THREE.Vector3(x,-.74,z),axis=end.clone().sub(start);
    const brace=box(group,[.17,axis.length(),.20],start.clone().add(end).multiplyScalar(.5).toArray(),braceMaterial,.016);
    brace.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());brace.name='treehouse-wooden-brace';
  }
  // A rear bough grows around the outside of the room, never through the wall.
  limb('treehouse-rear-bough',[-1.8,-3.7,-.3],[-2.2,-1.3,-5.6],.38,.23);
  const crowns=[[-4.2,3.5,-7.0],[-1.2,3.9,-7.5],[-2.8,4.8,-7.3]] as const;
  for(const center of crowns)limb('treehouse-crown-branch',[-2.2,-1.3,-5.6],[...center],.23,.09);
  const shape=new THREE.Shape();shape.moveTo(0,-.13);shape.bezierCurveTo(.085,-.035,.078,.05,0,.13);shape.bezierCurveTo(-.078,.05,-.085,-.035,0,-.13);
  const leafGeometry=new THREE.ShapeGeometry(shape,3),leafPositions=leafGeometry.attributes.position;
  for(let i=0;i<leafPositions.count;i++)leafPositions.setZ(i,.025*(1-Math.abs(leafPositions.getY(i))/.13));leafGeometry.computeVertexNormals();
  const leaves=new THREE.InstancedMesh(leafGeometry,new THREE.MeshStandardMaterial({color:'#78964a',roughness:.95,side:THREE.DoubleSide}),900);
  leaves.name='treehouse-crown';leaves.receiveShadow=true;
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  let seed=41;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<900;i++){
    const center=crowns[i%crowns.length],theta=random()*Math.PI*2,phi=Math.acos(random()*2-1),r=Math.cbrt(random());
    dummy.position.set(center[0]+Math.sin(phi)*Math.cos(theta)*r*1.4,center[1]+Math.cos(phi)*r,center[2]+Math.sin(phi)*Math.sin(theta)*r*1.25);
    dummy.rotation.set(random()*Math.PI,random()*Math.PI*2,random()*Math.PI);dummy.scale.setScalar(.6+random()*.7);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
    color.setHSL(.24+random()*.045,.28+random()*.15,.23+random()*.14);leaves.setColorAt(i,color);
  }
  leaves.instanceMatrix.needsUpdate=true;group.add(leaves);

  const rails=new THREE.Group();rails.name='treehouse-terrace-rails';group.add(rails);
  for(const z of [-4.19,4.19])box(rails,[2.9,.10,.13],[-7.37,1.18,z],wood,.025);
  box(rails,[.13,.10,8.4],[-8.81,1.18,0],wood,.025);
  for(const z of [-4.19,-2.1,0,2.1,4.19])box(rails,[.10,1.2,.10],[-8.81,.60,z],wood,.018);
  for(const z of [-4.19,4.19])box(rails,[.10,1.2,.10],[-5.98,.60,z],wood,.018);
  return group;
}
