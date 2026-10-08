import * as THREE from 'three';
import {canvasMap,type StudyMaterials} from './materials';
import type {StudySettings} from './types';

/** Keep existing PBR detail and cache patterned variants instead of making textures on every slider change. */
export class StudyTheme {
  private readonly floor:THREE.Texture;
  private readonly wall:THREE.Texture;
  private readonly rug:THREE.Texture;
  private readonly wood:THREE.Texture;
  private variants=new Map<string,THREE.Texture>();
  constructor(private readonly materials:StudyMaterials){this.floor=materials.floor.map!;this.wall=materials.plaster.map!;this.rug=materials.rug.map!;this.wood=materials.wood.map!;}
  private woodMap(finish:StudySettings['wood']) {
    if(finish!=='ivory'&&finish!=='ash')return this.wood;
    const key='wood-'+finish,existing=this.variants.get(key);if(existing)return existing;
    const map=canvasMap(512,512,ctx=>{ctx.filter='grayscale(1)';ctx.drawImage(this.wood.image as CanvasImageSource,0,0,512,512);ctx.filter='none';ctx.globalAlpha=finish==='ivory'?.60:.30;ctx.fillStyle=finish==='ivory'?'#fff7e6':'#c2c0b6';ctx.fillRect(0,0,512,512);});
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;this.variants.set(key,map);return map;
  }
  private rugMap(pattern:StudySettings['rugPattern']) {
    if(pattern==='woven')return this.rug;
    const key='rug-'+pattern,existing=this.variants.get(key);if(existing)return existing;
    const map=canvasMap(768,768,ctx=>{
      ctx.drawImage(this.rug.image as CanvasImageSource,0,0,768,768);
      ctx.fillStyle='rgba(101,76,50,.18)';
      if(pattern==='stripes'){for(let y=0;y<768;y+=192)ctx.fillRect(0,y,768,65);}
      else {for(let v=0;v<768;v+=160){ctx.fillRect(v,0,11,768);ctx.fillRect(0,v,768,11);ctx.fillRect(v+18,0,3,768);ctx.fillRect(0,v+18,768,3);}}
    });
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);this.variants.set(key,map);return map;
  }
  private floorMap(pattern:StudySettings['floor']) {
    if(pattern!=='herringbone')return this.floor;
    const existing=this.variants.get('herringbone');if(existing)return existing;
    const map=canvasMap(1024,1024,ctx=>{
      const source=this.floor.image as CanvasImageSource;ctx.fillStyle='#c5ac87';ctx.fillRect(0,0,1024,1024);
      function plank(x:number,y:number,vertical:boolean,index:number) {
        ctx.save();ctx.translate(x,y);if(vertical)ctx.rotate(Math.PI/2);
        ctx.drawImage(source,0,vertical?-64:0,256,64);
        ctx.fillStyle=index%3?'rgba(255,242,216,.06)':'rgba(76,51,27,.08)';ctx.fillRect(0,vertical?-64:0,256,64);
        ctx.strokeStyle='rgba(77,56,32,.28)';ctx.lineWidth=2;ctx.strokeRect(1,vertical?-63:1,254,62);ctx.restore();
      }
      for(let i=-8;i<9;i++)for(let j=-20;j<21;j++){const x=i*256+j*64,y=i*256-j*64;plank(x,y,false,i+j);plank(x+256,y,true,i-j);}
    });
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;this.variants.set('herringbone',map);return map;
  }
  apply(settings:StudySettings) {
    const m=this.materials;
    const wood=this.woodMap(settings.wood);if(m.wood.map!==wood){m.wood.map=wood;m.wood.needsUpdate=true;}
    m.wood.color.set({oak:'#fff4e4',walnut:'#805737',ivory:'#fffef4',ash:'#c8c5b8'}[settings.wood]);m.wood.roughness=settings.wood==='walnut'?.50:.67;
    m.plaster.color.set({cream:'#fffaf2',sage:'#b8c5a4',mist:'#bfccd0',clay:'#e1bd9e'}[settings.wall]);
    let wall=this.wall;
    if(settings.wallTexture==='linen') {
      if(!this.variants.has('linen')){const linen=m.fabric.map!.clone();linen.repeat.set(7,5);this.variants.set('linen',linen);}
      wall=this.variants.get('linen')!;
    }
    if(m.plaster.map!==wall){m.plaster.map=wall;m.plaster.needsUpdate=true;}m.plaster.bumpScale=settings.wallTexture==='linen'?.018:.009;
    const floor=this.floorMap(settings.floor);if(m.floor.map!==floor){m.floor.map=floor;m.floor.needsUpdate=true;}
    m.floor.color.set(settings.floor==='walnut'?'#9d754f':'#fff9ed');
    const rug=this.rugMap(settings.rugPattern);if(m.rug.map!==rug){m.rug.map=rug;m.rug.needsUpdate=true;}
    m.rug.color.set({sand:'#fffdf8',sage:'#b4c1a1',terracotta:'#d99b78'}[settings.rugColor]);
  }
  dispose(){this.variants.forEach(texture=>texture.dispose());this.variants.clear();this.floor.dispose();this.wall.dispose();this.rug.dispose();this.wood.dispose();}
}
