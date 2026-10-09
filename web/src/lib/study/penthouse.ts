import * as THREE from 'three';
import {box} from './furniture';
import type {StudyMaterials} from './materials';

const LOWER_STOREYS=6,STOREY_HEIGHT=3.48;

/** The penthouse floor and six lower storeys belong to one building.
 * The remaining storeys are outside the framed view, not a floating platform. */
export function makePenthouse(parent:THREE.Group,m:StudyMaterials) {
  const group=new THREE.Group();group.name='study-new-york-penthouse';group.visible=false;parent.add(group);
  const bronze=new THREE.MeshStandardMaterial({color:'#39372f',roughness:.34,metalness:.72});
  const glass=new THREE.MeshPhysicalMaterial({color:'#bed2ce',transparent:true,opacity:.075,roughness:.19,metalness:.2,clearcoat:1,clearcoatRoughness:.12,side:THREE.DoubleSide,depthWrite:false});
  const lowerGlass=glass.clone();lowerGlass.opacity=.23;lowerGlass.color.set('#8dadae');
  const inside=new THREE.MeshStandardMaterial({color:'#a38969',roughness:.88,emissive:'#8b6337',emissiveIntensity:.12});
  const lining=new THREE.MeshStandardMaterial({color:'#796c58',roughness:.75});
  const glow=new THREE.MeshStandardMaterial({color:'#ffdfad',emissive:'#ffbd75',emissiveIntensity:2.2,roughness:.65});
  const curtain=new THREE.MeshStandardMaterial({color:'#b39f7d',roughness:.98,side:THREE.DoubleSide});

  function rect(target:THREE.Object3D,size:[number,number,number],position:[number,number,number],material:THREE.Material,shadow=false) {
    const geometry=new THREE.BoxGeometry(...size);
    if(material.userData.physicalStone||material.userData.physicalFloor) {
      const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        if(Math.abs(n.getY(i))>.6)uv.setXY(i,x*.65,z*.65);else if(Math.abs(n.getX(i))>.6)uv.setXY(i,z*.65,y*.65);else uv.setXY(i,x*.65,y*.65);
      }
    }
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.castShadow=shadow;mesh.receiveShadow=true;target.add(mesh);return mesh;
  }
  function pane(target:THREE.Object3D,width:number,height:number,position:[number,number,number],rotation:number,material=glass) {
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(...position);mesh.rotation.y=rotation;
    mesh.name='penthouse-glass';mesh.userData.pointerPassThrough=true;mesh.renderOrder=3;target.add(mesh);return mesh;
  }
  function drape(target:THREE.Group,width:number,height:number,position:[number,number,number]) {
    const geometry=new THREE.PlaneGeometry(width,height,12,1),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getX(i)/width+.5)*Math.PI*8)*.045);
    geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,curtain);mesh.position.set(...position);target.add(mesh);
  }

  const below=new THREE.Group();below.name='penthouse-lower-storeys';group.add(below);
  const rear=new THREE.Group();rear.name='penthouse-rear-facade';below.add(rear);
  const xs=[-8.67,-5.97,-2.05,2.02,5.96],zs=[-4.16,-.07,4.16];
  // Solid floor slabs continue through the terrace and into every facade bay.
  for(let row=0;row<=LOWER_STOREYS;row++) {
    const y=-.40-row*STOREY_HEIGHT;
    rect(below,[14.97,.42,8.72],[-1.365,y,0],m.facade).name='penthouse-floor-slab';
    rect(below,[14.97,.055,.055],[-1.365,y+.255,4.385],bronze);
    rect(rear,[14.97,.055,.055],[-1.365,y+.255,-4.385],bronze);
    rect(below,[.055,.055,8.72],[-8.875,y+.255,0],bronze);
  }
  for(let row=0;row<LOWER_STOREYS;row++) {
    const bottom=-.61-(row+1)*STOREY_HEIGHT,top=-.61-row*STOREY_HEIGHT,height=3.07,cy=(bottom+top)/2+.18;
    for(const x of xs)rect(below,[.30,STOREY_HEIGHT,.42],[x,(bottom+top)/2,4.14],m.facade);
    for(const x of xs)rect(rear,[.30,STOREY_HEIGHT,.42],[x,(bottom+top)/2,-4.14],m.facade);
    for(const z of zs)rect(below,[.42,STOREY_HEIGHT,.30],[-8.65,(bottom+top)/2,z],m.facade);
    for(let bay=0;bay<xs.length-1;bay++) {
      const x=(xs[bay]+xs[bay+1])/2,w=xs[bay+1]-xs[bay]-.33;
      // Match front and rear glazing, with real room depth rather than a window decal.
      for(const facing of ['front','rear'] as const){
        const room=new THREE.Group();room.name='penthouse-lower-apartment';room.userData.facade=facing;room.userData.storey=row;
        room.position.x=x;room.rotation.y=facing==='rear'?Math.PI:0;(facing==='rear'?rear:below).add(room);
        rect(room,[w,height,.10],[0,cy,2.22],inside);
        rect(room,[w,.10,1.65],[0,bottom+.44,3.11],m.floor);
        rect(room,[w,.12,1.65],[0,top+.18,3.11],inside);
        rect(room,[.10,height,1.65],[-w/2,cy,3.11],lining);
        rect(room,[.10,height,1.65],[w/2,cy,3.11],lining);
        rect(room,[w*.50,.28,.55],[0,bottom+.62,2.81],m.wood);
        rect(room,[w*.56,.32,.63],[0,bottom+.92,2.81],m.fabric);
        rect(room,[w*.56,.49,.12],[0,bottom+1.24,2.54],m.fabric);
        rect(room,[.18,.75,.20],[w*.32,bottom+.865,2.70],m.wood);
        rect(room,[.035,.13,.035],[w*.32,bottom+1.305,2.70],bronze);
        const shade=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,.22,20,1,true),glow);shade.position.set(w*.32,bottom+1.47,2.70);room.add(shade);
        for(const sign of [-1,1])drape(room,w*.18,height-.12,[sign*w*.38,cy,3.98]);
        pane(room,w,height,[0,cy,4.17],0,lowerGlass);
        for(const xx of [-w/2,0,w/2])rect(room,[.048,height,.07],[xx,cy,4.19],bronze);
        for(const yy of [cy-height/2,cy+height/2])rect(room,[w,.05,.07],[0,yy,4.19],bronze);
      }
    }
    for(let bay=0;bay<zs.length-1;bay++) {
      const z=(zs[bay]+zs[bay+1])/2,w=zs[bay+1]-zs[bay]-.33;
      rect(below,[.10,height,w],[-6.74,cy,z],inside);
      rect(below,[1.65,.1,w],[-7.57,bottom+.44,z],m.floor);
      rect(below,[1.65,.12,w],[-7.57,top+.18,z],inside);
      rect(below,[.55,.24,1.4],[-7.3,bottom+.60,z],m.wood);
      rect(below,[.60,.36,1.5],[-7.3,bottom+.9,z],m.fabric);
      pane(below,w,height,[-8.69,cy,z],Math.PI/2,lowerGlass);
      for(const zz of [z-w/2,z,z+w/2])rect(below,[.07,height,.048],[-8.72,cy,zz],bronze);
    }
  }
  // Keep the opposite side as the original solid, windowless exterior wall.
  const facadeHeight=LOWER_STOREYS*STOREY_HEIGHT+.01,facadeCenter=-.40-LOWER_STOREYS*STOREY_HEIGHT/2+.01;
  rect(below,[.16,facadeHeight,8.55],[6.04,facadeCenter,0],m.facade).name='penthouse-side-facade';

  const terrace=new THREE.Group();terrace.name='penthouse-terrace';group.add(terrace);
  rect(terrace,[2.94,.24,8.5],[-7.375,-.12,0],m.facade,true);
  const seam=new THREE.MeshStandardMaterial({color:'#817c72',roughness:1});
  for(let z=-4;z<=4;z+=.85)rect(terrace,[2.87,.003,.009],[-7.375,.006,z],seam);
  for(const x of [-8.1,-7.3,-6.5])rect(terrace,[.009,.003,8.40],[x,.006,0],seam);
  // Glass safety rails sit on the same slab as the apartment.
  for(const z of [-4.19,4.19]) {
    pane(terrace,2.86,1.18,[-7.37,.64,z],0);
    rect(terrace,[2.90,.045,.055],[-7.37,1.24,z],bronze);
  }
  pane(terrace,8.38,1.18,[-8.81,.64,0],Math.PI/2);
  rect(terrace,[.055,.045,8.40],[-8.81,1.24,0],bronze);
  for(const z of [-4.19,-1.4,1.4,4.19])rect(terrace,[.055,1.24,.055],[-8.81,.62,z],bronze);
  for(const z of [-4.19,4.19])rect(terrace,[.055,1.24,.055],[-5.98,.62,z],bronze);
  // A compact outdoor reading seat and table, all grounded on the terrace.
  box(terrace,[1.24,.25,1.08],[-7.34,.58,1.93],m.fabric,.09);
  box(terrace,[1.24,.78,.18],[-7.34,.96,1.46],m.fabric,.07);
  for(const x of [-7.83,-6.85])for(const z of [1.53,2.32])rect(terrace,[.06,.46,.06],[x,.23,z],bronze);
  const tabletop=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.06,32),bronze);tabletop.position.set(-7.28,.68,.39);tabletop.castShadow=true;terrace.add(tabletop);
  rect(terrace,[.045,.65,.045],[-7.28,.325,.39],bronze);
  rect(terrace,[.37,.035,.37],[-7.28,.0175,.39],bronze);

  const upper=new THREE.Group();upper.name='penthouse-upper-frame';group.add(upper);
  const roof=new THREE.Group();roof.name='penthouse-roof';upper.add(roof);
  box(roof,[12.25,.36,8.70],[.05,5.41,0],m.facade,.025);
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(11.82,8.30),m.plaster);ceiling.rotation.x=Math.PI/2;ceiling.position.set(0,5.222,0);roof.add(ceiling);
  for(const x of [-4.8,-1.4,2.0,4.8])for(const z of [-2.5,2.5]){
    const light=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.012,20),glow);light.position.set(x,5.212,z);roof.add(light);
  }
  // A structural pier separates the glazed bays; the board is on the rear wall.
  box(upper,[.56,5.3,.46],[-5.99,2.65,1.30],m.facade,.022);
  for(const [x,z] of [[-5.99,-4.15],[-5.99,4.25],[6.0,4.25],[6.0,-4.15]])box(upper,[.32,5.3,.32],[x,2.65,z],m.facade,.018);
  // The front is an architectural cutaway; the rear and terrace roof retain
  // their real structure while the bookshelf remains visible and clickable.
  box(upper,[12.31,.38,1.00],[.05,5.37,-3.88],m.facade,.025);
  box(upper,[12.31,.34,.42],[.05,5.39,4.25],m.facade,.02).name='penthouse-front-lintel';
  box(upper,[.76,.34,8.73],[5.83,5.39,0],m.facade,.02);
  box(upper,[2.97,.34,8.73],[-7.37,5.39,0],m.facade,.025);
  box(upper,[.17,.17,8.38],[-5.84,5.13,0],bronze,.01);
  for(const [start,end] of [[-4.04,1.05],[1.55,4.08]]) {
    const w=end-start,z=(start+end)/2;pane(upper,w,5.06,[-5.96,2.57,z],Math.PI/2);
    for(let zz=start;zz<=end+.001;zz+=w/3)box(upper,[.11,5.1,.065],[-5.91,2.55,zz],bronze,.005);
    for(const y of [.05,5.10])box(upper,[.12,.07,w],[-5.91,y,z],bronze,.005);
  }
  // A thin open facade edge anchors the cutaway without an opaque front wall.
  pane(upper,11.70,5.05,[.03,2.58,4.22],0);
  pane(upper,8.18,5.05,[5.99,2.58,.02],Math.PI/2);
  for(const z of [-4.07,0,4.11])box(upper,[.09,5.12,.065],[5.97,2.56,z],bronze,.005);
  for(const x of [-5.82,5.88])box(upper,[.065,5.12,.1],[x,2.56,4.22],bronze,.005);
  rect(upper,[11.79,.055,.13],[.01,.04,4.20],bronze,true);
  // The old sill plant keeps its existing position on a supported oak console.
  box(upper,[.76,.13,3.35],[-5.48,1.80,-1.16],m.wood,.035);
  for(const z of [-2.53,.21])box(upper,[.65,1.72,.12],[-5.49,.86,z],m.wood,.02);
  const canopyLamp=new THREE.PointLight('#ffe1b4',7,8,2);canopyLamp.position.set(-5.65,4.91,.0);upper.add(canopyLamp);
  for(const z of [-2.75,0,2.75]){
    const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.012,24),glow);lamp.position.set(-7.34,5.205,z);upper.add(lamp);
  }
  group.userData.floor=40;group.userData.lowerStoreys=LOWER_STOREYS;
  return group;
}
