import * as THREE from 'three';
import { canvasMap } from './materials';

/** Local, short-lived visual feedback; no shared room material is modified. */
export class NotebookCue {
  private readonly group = new THREE.Group();
  private readonly borderMaterial = new THREE.MeshBasicMaterial({ color: '#ef9961', transparent: true, opacity: .55, depthWrite: false, toneMapped: false });
  private readonly sheenMaterial: THREE.MeshBasicMaterial;
  private readonly border: THREE.Mesh;
  private readonly sheen: THREE.Mesh;
  private started: number | null = null;
  hovered = false;
  strength = 0;

  constructor(notebook: THREE.Group) {
    const path = new THREE.Path(), w = .365, d = .485, r = .055;
    path.moveTo(-w+r,-d);path.lineTo(w-r,-d);path.quadraticCurveTo(w,-d,w,-d+r);
    path.lineTo(w,d-r);path.quadraticCurveTo(w,d,w-r,d);path.lineTo(-w+r,d);
    path.quadraticCurveTo(-w,d,-w,d-r);path.lineTo(-w,-d+r);path.quadraticCurveTo(-w,-d,-w+r,-d);
    const curve=new THREE.CatmullRomCurve3(path.getPoints(60).map(p=>new THREE.Vector3(p.x,.048,p.y)),true);
    this.border=new THREE.Mesh(new THREE.TubeGeometry(curve,80,.011,6,true),this.borderMaterial);
    const sheenMap=canvasMap(64,32,ctx=>{
      const gradient=ctx.createLinearGradient(0,0,64,0);
      gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.5,'rgba(255,255,255,.8)');gradient.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,64,32);
    });
    this.sheenMaterial=new THREE.MeshBasicMaterial({map:sheenMap,color:'#fff1bc',transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
    this.sheen=new THREE.Mesh(new THREE.PlaneGeometry(.13,.86),this.sheenMaterial);
    this.sheen.rotation.x=-Math.PI/2;this.sheen.position.y=.052;
    this.group.add(this.border,this.sheen);
    this.group.traverse(object=>{object.userData.collisionIgnore=true;object.raycast=()=>{};});
    notebook.add(this.group);
  }

  pulse(now: number) { this.started=now; }
  stop() { this.started=null; }
  update(now: number, reducedMotion: boolean) {
    if(reducedMotion)this.stop();
    const t=this.started===null?1:THREE.MathUtils.clamp((now-this.started)/1100,0,1);
    if(t===1)this.started=null;
    this.strength=this.started===null?0:Math.sin(t*Math.PI);
    this.borderMaterial.opacity=this.hovered?.95:.55+this.strength*.4;
    this.borderMaterial.color.set(this.hovered?'#ffba75':'#ef9961');
    this.sheen.position.x=-.27+t*.54;
    this.sheenMaterial.opacity=this.strength*.65;
    return this.started!==null;
  }

  dispose() {
    this.group.removeFromParent();this.border.geometry.dispose();this.sheen.geometry.dispose();
    this.sheenMaterial.map?.dispose();this.sheenMaterial.dispose();this.borderMaterial.dispose();
  }
}
