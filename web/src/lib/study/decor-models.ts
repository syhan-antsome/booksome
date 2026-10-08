import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {canvasMap} from './materials';
import {groundStudyObject} from './grounding';
import {findDecor,type StudyDecoration} from './decor-catalog';
import type {ShelfSlot} from './shelves';

function surface(color:string,wood=false) {
  const map=canvasMap(128,128,ctx=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,128,128);
    if(wood){ctx.strokeStyle='rgba(75,40,14,.18)';ctx.lineWidth=1;for(let i=0;i<25;i++){ctx.beginPath();ctx.moveTo(i*6,0);ctx.bezierCurveTo(i*6-4,43,i*6+3,93,i*6,128);ctx.stroke();}}
    else {for(let i=0;i<360;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.14)':'rgba(50,30,15,.09)';ctx.fillRect((i*73)%128,(i*47)%128,1,1);}}
  });
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:wood?.006:.003,roughness:wood?.65:.86});
}
function add(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:THREE.Material,position:[number,number,number]=[0,0,0]) {
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function ball(parent:THREE.Object3D,material:THREE.Material,scale:[number,number,number],position:[number,number,number]) {
  const mesh=add(parent,new THREE.SphereGeometry(1,20,14),material,position);mesh.scale.set(...scale);return mesh;
}
function tubeBetween(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,material:THREE.Material) {
  const delta=b.clone().sub(a),mesh=add(parent,new THREE.CylinderGeometry(r,r,delta.length(),12),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
}
function pot(parent:THREE.Group,material:THREE.Material) {
  add(parent,new THREE.LatheGeometry([new THREE.Vector2(.11,.005),new THREE.Vector2(.13,.015),new THREE.Vector2(.165,.22),new THREE.Vector2(.17,.235),new THREE.Vector2(.147,.24),new THREE.Vector2(.143,.205)],32),material);
  add(parent,new THREE.CylinderGeometry(.143,.143,.012,24),new THREE.MeshStandardMaterial({color:'#514438',roughness:1}),[0,.207,0]);
}
function makePlant(parent:THREE.Group,type:string,material:THREE.Material) {
  pot(parent,material);
  const leafMap=canvasMap(128,256,ctx=>{
    const gradient=ctx.createLinearGradient(0,0,128,0);gradient.addColorStop(0,'#244f38');gradient.addColorStop(.48,'#628954');gradient.addColorStop(1,'#315c3e');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,256);
    ctx.strokeStyle='#a6b477';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,8);ctx.lineTo(64,256);ctx.stroke();
    ctx.globalAlpha=.5;ctx.lineWidth=1;for(let i=0;i<8;i++){const y=25+i*29;ctx.beginPath();ctx.moveTo(64,y);ctx.lineTo(10,y-16);ctx.moveTo(64,y);ctx.lineTo(119,y-16);ctx.stroke();}
  });
  const leafMaterial=new THREE.MeshStandardMaterial({map:leafMap,roughness:.72,side:THREE.DoubleSide});
  const stemMaterial=new THREE.MeshStandardMaterial({color:type==='mini-tree'?'#786044':'#708456',roughness:.92});
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.55,.2,-.42,.78,0,1);shape.bezierCurveTo(.44,.78,.55,.2,0,0);
  const geometry=new THREE.ShapeGeometry(shape,10),position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);position.setZ(i,Math.sin(y*Math.PI)*.15*(1-Math.abs(x)));uv.setXY(i,x+.5,y);}
  geometry.computeVertexNormals();
  const transforms:THREE.Matrix4[]=[],dummy=new THREE.Object3D();
  const leaf=(origin:THREE.Vector3,direction:THREE.Vector3,width:number,length:number)=>{dummy.position.copy(origin);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());dummy.scale.set(width,length,length);dummy.updateMatrix();transforms.push(dummy.matrix.clone());};
  if(type==='succulent') {
    for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){const a=i*Math.PI/4+ring*.45;leaf(new THREE.Vector3(0,.22+ring*.025,0),new THREE.Vector3(Math.cos(a)*(.9-ring*.23),.35+ring*.3,Math.sin(a)*(.9-ring*.23)),.17-ring*.025,.25-ring*.045);}
  } else if(type==='fern') {
    for(let branch=0;branch<5;branch++) {
      const a=branch*2.4,end=new THREE.Vector3(Math.cos(a)*.19,.62-branch*.023,Math.sin(a)*.19),base=new THREE.Vector3(0,.21,0);tubeBetween(parent,base,end,.006,stemMaterial);
      for(let j=1;j<6;j++)for(const side of [-1,1]){const p=base.clone().lerp(end,j/6),d=new THREE.Vector3(Math.cos(a+side*1.25),.3,Math.sin(a+side*1.25));leaf(p,d,.10,.16-j*.012);}
    }
  } else if(type==='mini-tree') {
    tubeBetween(parent,new THREE.Vector3(0,.2,0),new THREE.Vector3(.02,.56,0),.016,stemMaterial);
    for(let branch=0;branch<5;branch++) {
      const a=branch*2.4,base=new THREE.Vector3(0,.40,0),tip=new THREE.Vector3(Math.cos(a)*.13,.57+(branch%2)*.04,Math.sin(a)*.13);tubeBetween(parent,base,tip,.007,stemMaterial);
      for(let i=0;i<5;i++)leaf(tip.clone().add(new THREE.Vector3(Math.cos(i*2.4)*.025,0,Math.sin(i*2.4)*.025)),new THREE.Vector3(Math.cos(a+i)*.45,.8,Math.sin(a+i)*.45),.12,.17);
    }
  } else {
    for(let branch=0;branch<6;branch++) {
      const a=branch*2.4,base=new THREE.Vector3(0,.21,0),tip=new THREE.Vector3(Math.cos(a)*.14,.43+(branch%3)*.055,Math.sin(a)*.14);tubeBetween(parent,base,tip,.007,stemMaterial);
      leaf(tip,new THREE.Vector3(Math.cos(a)*.35,.85,Math.sin(a)*.35),.19,.24);
      leaf(base.clone().lerp(tip,.55),new THREE.Vector3(Math.cos(a+1.8)*.7,.65,Math.sin(a+1.8)*.7),.17,.21);
    }
  }
  const leaves=new THREE.InstancedMesh(geometry,leafMaterial,transforms.length);transforms.forEach((matrix,index)=>leaves.setMatrixAt(index,matrix));leaves.castShadow=leaves.receiveShadow=true;parent.add(leaves);
}
function makeFrame(parent:THREE.Group,type:string,material:THREE.Material) {
  const frame=new THREE.Group();parent.add(frame);
  add(frame,new RoundedBoxGeometry(.60,.74,.07,3,.018),material,[0,.37,0]);
  const art=canvasMap(256,320,ctx=>{
    ctx.fillStyle='#f3ead9';ctx.fillRect(0,0,256,320);
    if(type==='botanical') {
      ctx.strokeStyle='#62795b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(125,285);ctx.quadraticCurveTo(148,151,123,49);ctx.stroke();
      for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#8b9d77':'#697f61';ctx.beginPath();ctx.ellipse(133+(i%2?-22:20),82+i*26,27,9,i%2?.5:-.45,0,Math.PI*2);ctx.fill();}
    }else if(type==='sunset') {
      const sky=ctx.createLinearGradient(0,0,0,320);sky.addColorStop(0,'#f0d4b2');sky.addColorStop(1,'#b57861');ctx.fillStyle=sky;ctx.fillRect(0,0,256,320);
      ctx.fillStyle='#f6e2b2';ctx.beginPath();ctx.arc(165,107,35,0,Math.PI*2);ctx.fill();
      for(let j=0;j<3;j++){ctx.fillStyle=['#b78b73','#8e796a','#637568'][j];ctx.beginPath();ctx.moveTo(0,210+j*25);ctx.bezierCurveTo(80,158+j*38,139,247-j*10,256,188+j*27);ctx.lineTo(256,320);ctx.lineTo(0,320);ctx.fill();}
    }else {ctx.fillStyle='#ce7957';ctx.beginPath();ctx.ellipse(95,198,39,74,-.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#cbb095';ctx.beginPath();ctx.ellipse(165,127,38,69,.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#78846e';ctx.fillRect(55,275,148,3);}
  });
  add(frame,new THREE.PlaneGeometry(.52,.66),new THREE.MeshStandardMaterial({map:art,roughness:.94}),[0,.37,.04]);
  frame.rotation.x=-.10;groundStudyObject(frame,0);
  frame.updateMatrixWorld(true);const hinge=frame.localToWorld(new THREE.Vector3(0,.50,-.041)),foot=new THREE.Vector3(0,.008,-.23),r=.013;
  const delta=foot.clone().sub(hinge);foot.y=.003+r*Math.hypot(delta.x,delta.z)/delta.length();
  tubeBetween(parent,hinge,foot,r,material);
}

export function makeDecoration(item:StudyDecoration):THREE.Group {
  const entry=findDecor(item.type)!;const color=entry.colors[item.color]??entry.colors[0],group=new THREE.Group(),material=surface(color,entry.category==='액자'||item.type==='bird');
  group.userData.decoration=item;
  if(entry.category==='화분')makePlant(group,item.type,material);
  else if(entry.category==='액자')makeFrame(group,item.type,material);
  else if(item.type==='ceramic-vase') {
    const profile=[[.11,0],[.20,.05],[.22,.20],[.15,.37],[.10,.49],[.11,.52],[.08,.52],[.08,.47]].map(([x,y])=>new THREE.Vector2(x,y));
    add(group,new THREE.LatheGeometry(profile,40),material);
    add(group,new THREE.CylinderGeometry(.083,.083,.008,24),new THREE.MeshStandardMaterial({color:'#6b5b48',roughness:1}),[0,.46,0]);
  }else if(item.type==='stone-arch') {
    const arch=new THREE.Shape();arch.moveTo(-.30,0);arch.lineTo(-.30,.28);arch.quadraticCurveTo(-.30,.60,0,.60);arch.quadraticCurveTo(.30,.60,.30,.28);arch.lineTo(.30,0);arch.lineTo(.15,0);arch.lineTo(.15,.28);arch.quadraticCurveTo(.15,.43,0,.43);arch.quadraticCurveTo(-.15,.43,-.15,.28);arch.lineTo(-.15,0);arch.closePath();
    add(group,new THREE.ExtrudeGeometry(arch,{depth:.17,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:3,curveSegments:20}),material,[0,0,-.085]);
  }else if(item.type==='bird') {
    ball(group,material,[.22,.14,.13],[0,.25,0]);ball(group,material,[.105,.105,.10],[.18,.34,0]);ball(group,material,[.16,.06,.11],[-.04,.28,.085]);
    const beak=add(group,new THREE.ConeGeometry(.035,.12,12),surface('#b8844f',true),[.29,.35,0]);beak.rotation.z=-Math.PI/2;
    for(const x of [-.09,.09])add(group,new THREE.CylinderGeometry(.016,.019,.13,12),material,[x,.08,0]);
    add(group,new THREE.CylinderGeometry(.19,.20,.03,32),material,[0,.015,0]);
  }else if(item.type==='orbit') {
    const metal=new THREE.MeshStandardMaterial({color,metalness:.75,roughness:.36});material.dispose();material.map?.dispose();material.bumpMap?.dispose();
    add(group,new THREE.CylinderGeometry(.17,.19,.045,32),metal,[0,.0225,0]);add(group,new THREE.CylinderGeometry(.018,.03,.22,16),metal,[0,.15,0]);
    for(let i=0;i<3;i++){const ring=add(group,new THREE.TorusGeometry(.23,.010,10,56),metal,[0,.40,0]);ring.rotation.set(i*.55,i*1.05,i*.38);}
    ball(group,surface('#bfc6b2'),[.065,.065,.065],[0,.40,0]);
  }else if(item.type==='moon') {
    add(group,new THREE.CylinderGeometry(.16,.18,.045,32),material,[0,.0225,0]);add(group,new THREE.CylinderGeometry(.014,.018,.14,12),material,[0,.115,0]);
    const crescent=new THREE.Shape();crescent.moveTo(.08,.48);crescent.bezierCurveTo(-.32,.51,-.39,-.10,.05,-.10);crescent.bezierCurveTo(-.20,.00,-.14,.37,.08,.48);crescent.closePath();
    add(group,new THREE.ExtrudeGeometry(crescent,{depth:.08,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:24}),material,[.04,.23,-.04]);
  }else if(item.type==='mushroom') {
    add(group,new THREE.CylinderGeometry(.11,.13,.035,32),material,[0,.0175,0]);add(group,new THREE.CylinderGeometry(.055,.07,.30,24),material,[0,.17,0]);
    const shade=ball(group,material,[.28,.15,.28],[0,.40,0]);shade.userData.lamp=true;
    add(group,new THREE.CircleGeometry(.24,32),new THREE.MeshStandardMaterial({color:'#ffe3ad',emissive:'#ffd293',emissiveIntensity:.5,side:THREE.DoubleSide}),[0,.36,0]).rotation.x=Math.PI/2;
  }else {
    add(group,new THREE.CylinderGeometry(.13,.15,.05,32),material,[0,.025,0]);add(group,new THREE.CylinderGeometry(.10,.105,.27,32),material,[0,.185,0]);
    add(group,new THREE.CylinderGeometry(.006,.006,.03,8),new THREE.MeshStandardMaterial({color:'#51443d',roughness:1}),[0,.335,0]);
    const flame=ball(group,new THREE.MeshStandardMaterial({color:'#ffe1a7',emissive:'#ffbb67',emissiveIntensity:1.2}),[.028,.065,.028],[0,.40,0]);flame.rotation.z=.12;
  }
  group.rotation.y=item.rotation*Math.PI/2;
  return group;
}

/** Fit every orientation inside its cubby and place its actual lowest vertex on the shelf. */
export function fitDecoration(object:THREE.Group,slot:ShelfSlot) {
  object.position.set(0,0,0);object.scale.setScalar(1);
  object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object,true),size=bounds.getSize(new THREE.Vector3());
  const scale=Math.min(1,(slot.width-.18)/size.x,(slot.maxHeight-.07)/size.y,.68/size.z);
  object.scale.setScalar(scale);object.updateMatrixWorld(true);bounds.setFromObject(object,true);const center=bounds.getCenter(new THREE.Vector3());
  object.position.x=slot.x+slot.width/2-center.x;object.position.z=slot.z+.20-bounds.max.z;
  groundStudyObject(object,slot.y,.004);
}
