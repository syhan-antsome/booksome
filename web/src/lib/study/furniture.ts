import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { StudyMaterials } from './materials';
import { canvasMap } from './materials';
import { groundStudyObject } from './grounding';

export type ShelfSlot = { x: number; y: number; z: number; width: number; maxHeight: number };
export function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = .025) {
  const geometry = new RoundedBoxGeometry(...size, 4, Math.min(radius, ...size.map(n => n / 3)));
  if (material.userData.physicalGrain || material.userData.physicalFloor) {
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));
      if(material.userData.physicalFloor) uv.setXY(i,x*.55,z*.55);
      else if(ny>.65) uv.setXY(i,x*.8,z*.8);
      else if(nx>.65) uv.setXY(i,(size[1]>.5?y:z)*.8,(size[1]>.5?z:y)*.8);
      else uv.setXY(i,(size[1]>.5?y:x)*.8,(size[1]>.5?x:y)*.8);
    }
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, top: number, bottom: number, height: number, position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 40), material); mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material); mesh.scale.set(...size); mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function makeRoom(root: THREE.Group, m: StudyMaterials) {
  box(root, [11.8, .26, 8.5], [0, -.14, 0], m.floor, .04);
  box(root, [11.8, 5.3, .22], [0, 2.65, -4.15], m.plaster, .04).castShadow = false;
  // One continuous wall with an actual opening avoids seams around the window.
  const wallShape=new THREE.Shape();wallShape.moveTo(-4.25,0);wallShape.lineTo(4.25,0);wallShape.lineTo(4.25,5.3);wallShape.lineTo(-4.25,5.3);wallShape.closePath();
  const opening=new THREE.Path();opening.moveTo(-.32,1.8);opening.lineTo(-.32,4.45);opening.lineTo(2.65,4.45);opening.lineTo(2.65,1.8);opening.closePath();wallShape.holes.push(opening);
  const wallGeometry=new THREE.ExtrudeGeometry(wallShape,{depth:.22,bevelEnabled:false});
  const wallUV=wallGeometry.attributes.uv,wallPosition=wallGeometry.attributes.position;
  for(let i=0;i<wallUV.count;i++)wallUV.setXY(i,wallPosition.getX(i)*.25,wallPosition.getY(i)*.25);
  const wall=new THREE.Mesh(wallGeometry,m.plaster);wall.rotation.y=Math.PI/2;wall.position.x=-5.91;wall.castShadow=wall.receiveShadow=true;root.add(wall);
  const garden = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 2.65), new THREE.MeshBasicMaterial({ map: m.garden })); garden.rotation.y = Math.PI / 2; garden.position.set(-5.92, 3.125, -1.16); root.add(garden);
  for (const z of [-2.65, .32]) box(root, [.2, 2.8, .11], [-5.62, 3.125, z], m.wood);
  for (const y of [1.78, 3.125, 4.48]) box(root, [.2, .11, 3.1], [-5.62, y, -1.16], m.wood);
  box(root, [.7, .14, 3.35], [-5.48, 1.8, -1.16], m.wood);
  box(root, [.12, .18, 8.25], [-5.63, .13, 0], m.wood);
  box(root, [11.55, .18, .12], [0, .13, -4.01], m.wood);
  return root;
}
export function makeShelves(root: THREE.Group, m: StudyMaterials) {
  const slots: ShelfSlot[] = [];
  const x = -1.45, width = 6.2, z = -3.49, depth = 1.04;
  box(root, [width-.22, 4.80, .085], [x, 2.42, z-depth/2+.05], m.wood);
  function roundedFrame(cx:number,w:number,h:number,d:number,base=.04,cabinet=true,bz=z) {
    const r=.32,t=.18,left=cx-w/2,right=cx+w/2,top=base+h;
    const shape=new THREE.Shape();
    shape.moveTo(left+.055,base);shape.lineTo(right-.055,base);shape.quadraticCurveTo(right,base,right,base+.055);
    shape.lineTo(right,top-r);shape.quadraticCurveTo(right,top,right-r,top);shape.lineTo(left+r,top);shape.quadraticCurveTo(left,top,left,top-r);
    shape.lineTo(left,base+.055);shape.quadraticCurveTo(left,base,left+.055,base);
    const inner=new THREE.Path(),il=left+t,ir=right-t,it=top-t,ib=base+(cabinet?1.04:t),cr=.17;
    inner.moveTo(il,ib);inner.lineTo(il,it-cr);inner.quadraticCurveTo(il,it,il+cr,it);inner.lineTo(ir-cr,it);inner.quadraticCurveTo(ir,it,ir,it-cr);inner.lineTo(ir,ib);inner.closePath();shape.holes.push(inner);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-.04,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:4,curveSegments:28});
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++){
      const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),horizontal=py>top-.4;
      if(Math.abs(n.getY(i))>.65)uv.setXY(i,px*.8,pz*.8);
      else if(Math.abs(n.getX(i))>.65)uv.setXY(i,py*.8,pz*.8);
      else uv.setXY(i,(horizontal?px:py)*.8,(horizontal?py:px)*.8);
    }
    const frame=new THREE.Mesh(geometry,m.wood);
    frame.position.z=bz-d/2+.02;frame.castShadow=frame.receiveShadow=true;root.add(frame);
  }
  roundedFrame(x+.775,width-1.55,4.94,depth);
  roundedFrame(x-2.325,1.55,4.94,2.15,.04,true,z+.50);
  box(root, [width-1.55, .14, depth], [x+.775, .12, z], m.wood);
  box(root, [1.55,.14,2.15], [x-2.325,.12,z+.50], m.wood);
  for (let col = 0; col < 4; col++) {
    const cx = x - 2.32 + col * 1.55;
    const forward=col===0?1.06:0;
    box(root, [1.49, .91, .045], [cx, .56, z + .515+forward], m.wood, .012);
    box(root, [.34, .007, .006], [cx, .95, z + .544+forward], new THREE.MeshStandardMaterial({color:'#a68a63',roughness:.8}), .002);
    if (col < 3) box(root, [.095, 3.81, depth], [cx + .775, 2.95, z], m.wood);
    for (let row = 0; row < 4; row++) if(!((col===0&&row>0)||(col===2&&(row===0||row===3)))) slots.push({ x: cx - .55, y: 1.17 + row * .94, z: z + .24+forward, width: 1.15, maxHeight: row===3?.70:.80 });
  }
  for (let row = 0; row < 4; row++) {
    box(root, [width-1.55, .1, depth], [x+.775, 1.1 + row * .94, z], m.wood);
    box(root,[1.55,.1,2.15],[x-2.325,1.1+row*.94,z+.50],m.wood);
  }
  // A lighter modular extension with open edges, like the reference.
  const ex = 3.64;
  roundedFrame(4.22,1.63,4.70,.92,.11,false);
  for (let row = 0; row < 4; row++) {
    const y = 1.1 + row * .94;
    box(root, [3.6, .13, .92], [ex, y, z], m.wood, .04);
    if(row!==2) slots.push({ x: 2.06, y: y + .08, z: z + .2, width: 1.12, maxHeight: row===3?.86:.80 });
    slots.push({ x: 3.67, y: y + .08, z: z + .2, width: 1.02, maxHeight: row===3?.57:.80 });
  }
  return slots;
}
export function makeDesk(root: THREE.Group, m: StudyMaterials) {
  const desk = new THREE.Group(); desk.position.set(-2.84, 0, 1.85); root.add(desk);
  box(desk, [4.85, .22, 2.14], [0, 1.78, 0], m.wood, .085);
  // Broad oak end panels give the desk the substantial silhouette of the concept.
  for (const x of [-2.1, 2.1]) box(desk, [.34, 1.67, 1.83], [x, .835, 0], m.wood, .045);
  box(desk, [4.2, .24, .12], [0, 1.50, -.82], m.wood);
  box(desk, [1.30, .12, 1.40], [1.16, .64, -.12], m.wood, .035);
  const lamp = new THREE.Group(); lamp.name='desk-lamp';lamp.position.set(-1.86, 1.9, .63); desk.add(lamp);
  cylinder(lamp, .3, .34, .07, [0, .035, 0], m.coral);
  const tube = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .07, 0), new THREE.Vector3(0, .7, 0), new THREE.Vector3(.22, 1.1, 0), new THREE.Vector3(.26, 1.25, 0)]);
  lamp.add(new THREE.Mesh(new THREE.TubeGeometry(tube, 24, .035, 8, false), m.coral));
  const shade = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.39, 0), new THREE.Vector2(.36, .11), new THREE.Vector2(.22, .34), new THREE.Vector2(.08, .42)], 48), m.coral); shade.position.set(.26, 1.0, 0); lamp.add(shade);
  const diffuser = new THREE.Mesh(new THREE.CircleGeometry(.365, 48), new THREE.MeshStandardMaterial({ color: '#fff3cb', emissive: '#ffd597', emissiveIntensity: .8, side: THREE.DoubleSide })); diffuser.rotation.x = Math.PI / 2; diffuser.position.set(.26, 1.01, 0); lamp.add(diffuser);
  const lampLight = new THREE.PointLight('#ffdb9a', 6, 4); lampLight.position.set(.26, .93, 0); lamp.add(lampLight);
  // Ceramic mug with a real hole and handle.
  const mugGroup=new THREE.Group();mugGroup.name='desk-mug';mugGroup.position.set(-.9,1.9,.4);desk.add(mugGroup);
  const mug = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.13, 0), new THREE.Vector2(.17, .03), new THREE.Vector2(.18, .29), new THREE.Vector2(.165, .3), new THREE.Vector2(.155, .05)], 40), m.ceramic); mug.castShadow = true; mugGroup.add(mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.115, .025, 10, 28), m.ceramic); handle.position.set(.2,.16,0); mugGroup.add(handle);
  cylinder(mugGroup, .151, .151, .008, [0,.26,0], new THREE.MeshStandardMaterial({ color: '#634634', roughness: .35 }));
  const notebook=new THREE.Group();notebook.name='desk-notebook';notebook.position.set(1.72,1.94,.42);desk.add(notebook);
  notebook.userData.openNotebook=true;
  box(notebook, [.70, .075, .95], [0,0,0], m.ceramic, .025);
  box(notebook, [.013, .005, .95], [.2,.042,0], m.coral, .001);
  const notebookCover=canvasMap(384,512,ctx=>{
    ctx.fillStyle='#f2ecdf';ctx.fillRect(0,0,384,512);ctx.textAlign='center';
    ctx.fillStyle='#aa5038';ctx.font='500 25px "Pretendard",sans-serif';ctx.fillText('나의 독서 수첩',192,204);
    ctx.fillStyle='#55493d';ctx.font='600 42px "Pretendard",sans-serif';ctx.fillText('책과 기록',192,265);
    ctx.fillStyle='#c6b8a5';ctx.fillRect(100,307,184,2);
  });
  const notebookLabel=new THREE.Mesh(new THREE.PlaneGeometry(.52,.70),new THREE.MeshStandardMaterial({map:notebookCover,roughness:.94}));
  notebookLabel.rotation.x=-Math.PI/2;notebookLabel.position.set(-.045,.04,0);notebook.add(notebookLabel);
  const pencilPot=new THREE.Group();pencilPot.name='pencil-pot';pencilPot.position.set(-2.16,1.9,-.62);desk.add(pencilPot);
  cylinder(pencilPot, .135, .115, .3, [0,.14,0], new THREE.MeshStandardMaterial({ color: '#a8b4a0', roughness: .75 }));
  for (let i = 0; i < 5; i++) { const pen = cylinder(pencilPot, .011, .014, .49, [-.09 + i * .044,.41,(i % 2) * .05], m.wood); pen.rotation.z = (i - 2) * .11; }
  return { desk, lampLight, notebook, props:[lamp,pencilPot,mugGroup,notebook], bounds:{minX:-5.19,maxX:-.49,minZ:.855,maxZ:2.845} };
}
export function makeOpenBook(root: THREE.Group, m: StudyMaterials) {
  const group = new THREE.Group(); group.position.set(-2.2, 1.95, 1.87); group.rotation.y = -.12; root.add(group);
  group.userData.openBook=true;
  const coverMaterial=m.coral.clone();group.userData.coverMaterial=coverMaterial;
  const paper = canvasMap(768, 1024, ctx => {
    ctx.fillStyle = '#f0e6d1'; ctx.fillRect(0, 0, 768, 1024); ctx.fillStyle = '#655e51';
    for (let line = 0; line < 32; line++) for (let word = 0; word < 7; word++) { const width = 38 + ((line * 17 + word * 31) % 37); ctx.fillRect(82 + word * 85, 102 + line * 25, width, 4.0); }
  });
  for (const sign of [-1, 1]) {
    const cover = box(group, [.86, .035, 1.13], [sign * .435, -.035, 0], coverMaterial, .015); cover.rotation.z = -sign * .035;
    box(group, [.83, .055, 1.09], [sign * .43, .003, 0], new THREE.MeshStandardMaterial({color:'#ddd1b9',roughness:.97}), .012);
    const geometry = new THREE.PlaneGeometry(.84, 1.1, 16, 12);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) { const x = positions.getX(i);const edge=sign<0?(x+.42)/.84:(.42-x)/.84; positions.setZ(i, .005+.040*Math.sin(edge*Math.PI)+.030*edge); }
    geometry.computeVertexNormals();
    const page = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: paper, roughness: .94, side: THREE.DoubleSide })); page.rotation.x = -Math.PI / 2; page.position.set(sign * .43, .025, 0); page.receiveShadow = true; group.add(page);
  }
  box(group, [.045, .007, 1.07], [.035, .066, .025], m.coral, .002);
  const outline=new THREE.Path(),w=1.06,d=.69,r=.14;
  outline.moveTo(-w+r,-d);outline.lineTo(w-r,-d);outline.quadraticCurveTo(w,-d,w,-d+r);outline.lineTo(w,d-r);outline.quadraticCurveTo(w,d,w-r,d);outline.lineTo(-w+r,d);outline.quadraticCurveTo(-w,d,-w,d-r);outline.lineTo(-w,-d+r);outline.quadraticCurveTo(-w,-d,-w+r,-d);
  const haloCurve=new THREE.CatmullRomCurve3(outline.getPoints(80).map(p=>new THREE.Vector3(p.x,-.025,p.y)),true);
  for(const [radius,opacity] of [[.011,.85],[.032,.12]]) {
    const halo=new THREE.Mesh(new THREE.TubeGeometry(haloCurve,100,radius,8,true),new THREE.MeshBasicMaterial({color:'#ff9b79',transparent:true,opacity,depthWrite:false}));
    halo.userData.collisionIgnore=true;group.add(halo);
  }
  return group;
}
export function makeTrailingPlant(root:THREE.Group,m:StudyMaterials,position:[number,number,number],rotation=0,scale=1) {
  const plant=new THREE.Group();plant.position.set(...position);plant.rotation.y=rotation;plant.scale.setScalar(scale);root.add(plant);
  cylinder(plant,.18,.135,.24,[0,.12,0],m.ceramic);cylinder(plant,.16,.16,.012,[0,.244,0],new THREE.MeshStandardMaterial({color:'#5c4d36',roughness:1}));
  const leafMap=canvasMap(256,384,ctx=>{ctx.fillStyle='#73815b';ctx.fillRect(0,0,256,384);ctx.strokeStyle='#a4af84';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(128,14);ctx.lineTo(128,370);ctx.stroke();ctx.lineWidth=2;for(let j=0;j<8;j++){const y=45+j*39;ctx.beginPath();ctx.moveTo(128,y);ctx.lineTo(33,y-31);ctx.moveTo(128,y);ctx.lineTo(221,y-31);ctx.stroke();}});
  const leaves=new THREE.MeshStandardMaterial({map:leafMap,roughness:.72,side:THREE.DoubleSide,color:'#eff0d4',emissive:'#74815b',emissiveIntensity:.16});
  const stems=new THREE.MeshStandardMaterial({color:'#74845a',roughness:.8});
  for(let branch=0;branch<3;branch++) {
    const path=new THREE.CatmullRomCurve3([new THREE.Vector3((branch-1)*.06,.25,0),new THREE.Vector3((branch-1)*.14,.12,.2),new THREE.Vector3((branch-1)*.14-.08,-.32,.29),new THREE.Vector3((branch-1)*.19+.04,-.67,.3),new THREE.Vector3((branch-1)*.16-.08,-.95,.36)]);
    plant.add(new THREE.Mesh(new THREE.TubeGeometry(path,32,.009,6,false),stems));
    for(let j=0;j<8;j++) {
      const leaf=new THREE.Shape();leaf.moveTo(0,-.21);leaf.bezierCurveTo(-.18,-.08,-.17,.18,-.045,.18);leaf.quadraticCurveTo(0,.18,0,.12);leaf.quadraticCurveTo(.05,.24,.13,.17);leaf.bezierCurveTo(.22,.02,.12,-.12,0,-.21);
      const geometry=new THREE.ShapeGeometry(leaf,14),p=geometry.attributes.position,uv=geometry.attributes.uv;
      for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k);p.setZ(k,.07*Math.sin((y+.21)/.42*Math.PI)-Math.abs(x)*.13);uv.setXY(k,(x+.2)/.4,(y+.21)/.42);}
      geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,leaves);mesh.position.copy(path.getPoint(.1+j*.115));mesh.position.x+=(j%2?.10:-.10);mesh.rotation.set(-.25,(branch-1)*.35,j%2?-.48:.48);mesh.scale.setScalar(.50+(j%3)*.08);mesh.castShadow=true;plant.add(mesh);
    }
  }
  const prototype=plant.children.find(child=>child instanceof THREE.Mesh&&child.material===leaves) as THREE.Mesh;
  for(let i=0;i<7;i++){
    const angle=i*2.4,leaf=new THREE.Mesh(prototype.geometry,leaves);leaf.position.set(Math.cos(angle)*.15,.33+(i%3)*.038,Math.sin(angle)*.15);leaf.rotation.set(-1.0+(i%2)*.2,angle,Math.cos(angle)*.3);leaf.scale.setScalar(.65+(i%3)*.08);leaf.castShadow=true;plant.add(leaf);
  }
  return plant;
}
export function makeDecor(root: THREE.Group, m: StudyMaterials) {
  const rug = box(root, [6.4, .075, 4.9], [.25, .045, 1.05], m.rug, .16);
  const ottoman = new THREE.Group(); ottoman.position.set(3.55, .45, .0); root.add(ottoman);
  sphere(ottoman, [.64, .46, .64], [0, 0, 0], m.fabric);
  const footstool=new THREE.Group();footstool.name='floor-stool';footstool.position.set(4.15,0,1.12);root.add(footstool);
  cylinder(footstool, .35, .4, .1, [0,.68,0], m.wood);
  for (let i = 0; i < 3; i++) { const angle = i * Math.PI * 2 / 3; const leg = cylinder(footstool, .045, .07, .61, [Math.cos(angle) * .24, .32, Math.sin(angle) * .24], m.wood); leg.rotation.z = Math.cos(angle) * .15; }
  ottoman.name='floor-ottoman';
  const board = box(root, [.13, 1.75, 1.62], [-5.62, 2.92, 1.3], m.wood, .03);
  const pinSurface = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 1.57), m.cork); pinSurface.rotation.y = Math.PI / 2; pinSurface.position.set(-5.54, 2.92, 1.3); root.add(pinSurface);
  for (let i = 0; i < 4; i++) {
    const note = box(root, [.015, .45 + (i % 2) * .17, .43], [-5.51, 2.48 + Math.floor(i / 2) * .76, .96 + (i % 2) * .66], m.ceramic, .001);
    const pin = sphere(root, [.025, .025, .025], [-5.48, note.position.y + .16, note.position.z], m.coral); pin.name = 'note-pin';
  }
  board.name = 'pin-board';
  function art(x: number, y: number, z: number, width: number, height: number, botanical = false) {
    const map = canvasMap(384, 512, ctx => {
      ctx.fillStyle = '#eee6d5'; ctx.fillRect(0, 0, 384, 512);
      if (botanical) { ctx.strokeStyle = '#87947a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(190, 434); ctx.lineTo(220, 110); ctx.stroke(); for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#9ca98a' : '#79876d'; ctx.beginPath(); ctx.ellipse(207 + (i % 2 ? -41 : 38), 145 + i * 36, 46, 17, i % 2 ? -.4 : .5, 0, Math.PI * 2); ctx.fill(); } }
      else { ctx.fillStyle = '#d67952'; ctx.beginPath(); ctx.ellipse(148, 298, 62, 104, -.28, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#dba889'; ctx.beginPath(); ctx.ellipse(237, 230, 53, 104, .35, 0, Math.PI * 2); ctx.fill(); }
    });
    const frame=new THREE.Group();frame.position.set(x,y,z);root.add(frame);
    box(frame, [width + .09, height + .09, .065], [0,0,0], m.wood, .02);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: .85 })); canvas.position.z=.039; frame.add(canvas);
    return frame;
  }
  art(-.67,1.57,-2.91,.72,.79); art(2.75,3.38,-2.99,.65,.82,true);
  const floorFrame=art(5.13,.74,-1.35,.79,1.2,true);floorFrame.rotation.x=-.09;floorFrame.rotation.y=-.12;
  floorFrame.name='floor-frame';groundStudyObject(floorFrame);
  // A real folding support makes the freestanding frame believable from behind.
  for(const x of [-.23,.23]) {
    const hinge=new THREE.Vector3(x,.27,-.055);
    const worldHinge=floorFrame.localToWorld(hinge.clone());
    const foot=floorFrame.localToWorld(new THREE.Vector3(x,-.645,-.43));
    // Include the tilted leg's radius so its end cap actually meets the floor.
    for(let i=0;i<4;i++) {
      const direction=foot.clone().sub(worldHinge);
      foot.y=.003+.024*Math.hypot(direction.x,direction.z)/direction.length();
    }
    floorFrame.worldToLocal(foot);
    const direction=foot.clone().sub(hinge);
    const midpoint=hinge.clone().add(foot).multiplyScalar(.5);
    const support=cylinder(floorFrame,.024,.024,direction.length(),[midpoint.x,midpoint.y,midpoint.z],m.wood);
    support.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    sphere(floorFrame,[.035,.035,.025],[x,.27,-.055],m.wood);
  }
  // Mushroom lamps and tactile ceramics in deliberately unfilled cubbies.
  for (const [x, y] of [[-3.78, 2.10], [-.68, 3.98]]) {
    cylinder(root, .105, .12, .26, [x, y + .14, x< -2?-2.04:-3.1], m.ceramic);
    sphere(root, [.32, .19, .32], [x, y + .37, x< -2?-2.04:-3.1], m.ceramic);
  }
  const deskFlowers=new THREE.Group();deskFlowers.name='desk-flowers';root.add(deskFlowers);
  const vase = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.1, 0), new THREE.Vector2(.21, .13), new THREE.Vector2(.17, .35), new THREE.Vector2(.075, .43)], 40), m.coral); vase.position.set(-.75, 1.89, 1.58); vase.castShadow = true; deskFlowers.add(vase);
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),m.ceramic,14*7*5);petals.castShadow=petals.receiveShadow=true;deskFlowers.add(petals);
  const dummy=new THREE.Object3D();let petal=0;
  const stemMaterial=new THREE.MeshStandardMaterial({color:'#7f8e66',roughness:.8});
  for (let i = 0; i < 14; i++) {
    const a=i*2.4,x=-.75+Math.cos(a)*.15,z=1.58+Math.sin(a)*.14,y=2.38+(i%4)*.043;
    cylinder(deskFlowers,.005,.005,.29,[x,y-.145,z],stemMaterial);
    for(let f=0;f<7;f++)for(let p=0;p<5;p++) {const angle=p*Math.PI*2/5+f*.5,phi=f*2.4;dummy.position.set(x+Math.cos(phi)*.044+Math.cos(angle)*.023,y+Math.sin(f*1.6)*.034,z+Math.sin(phi)*.044+Math.sin(angle)*.023);dummy.scale.set(.021,.011,.033);dummy.rotation.set(Math.sin(f)*.6,angle,Math.cos(i+f)*.5);dummy.updateMatrix();petals.setMatrixAt(petal++,dummy.matrix);}
  }
  return { rug,floorFrame,deskFlowers,ottoman,footstool };
}
