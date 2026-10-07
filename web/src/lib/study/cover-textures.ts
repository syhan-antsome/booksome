import * as THREE from 'three';
import { studyCoverHref, type StudyBook } from './types';
import { portalCover } from '../portal-request';

export type StudyCover={texture:THREE.CanvasTexture;color:string};
/** One bounded GPU texture per book, shared by its shelf and desk representations. */
export class StudyCoverPool {
  private jobs=new Map<string,Promise<StudyCover>>();
  private textures=new Set<THREE.Texture>();
  private queue:{begin:()=>void;cancel:()=>void}[]=[];
  private active=0;
  private controllers=new Set<AbortController>();
  disposed=false;
  load(book:StudyBook):Promise<StudyCover> {
    const url=studyCoverHref(book);if(!url)return Promise.reject(new Error('No cover'));
    const key=book.id+'\n'+book.coverUrl;
    const existing=this.jobs.get(key);if(existing)return existing;
    const job=new Promise<StudyCover>((resolve,reject)=>{
      const controller=new AbortController();let objectUrl:string|null=null;
      const finish=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);this.controllers.delete(controller);this.active--;this.drain();};
      const decode=(source:string)=>new THREE.ImageLoader().load(source,image=>{
        try {
          if(this.disposed)throw new Error('Disposed');
          const canvas=document.createElement('canvas');canvas.width=384;canvas.height=576;
          const context=canvas.getContext('2d')!;context.fillStyle='#eee7da';context.fillRect(0,0,384,576);
          const fit=Math.min(384/image.width,576/image.height),width=image.width*fit,height=image.height*fit;
          context.drawImage(image,(384-width)/2,(576-height)/2,width,height);
          const sample=document.createElement('canvas');sample.width=sample.height=16;
          const sampled=sample.getContext('2d')!;sampled.drawImage(image,0,0,16,16);
          const pixels=sampled.getImageData(0,0,16,16).data,channels=[0,0,0];let weight=0;
          for(let i=0;i<pixels.length;i+=4){const alpha=pixels[i+3]/255;weight+=alpha;channels.forEach((_,c)=>{channels[c]+=pixels[i+c]*alpha;});}
          const color=weight?'#'+channels.map(value=>Math.round(value/weight).toString(16).padStart(2,'0')).join(''):'#d8c6a6';
          const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.userData.studyCover=true;
          this.textures.add(texture);resolve({texture,color});
        }catch(error){reject(error);}finally{finish();}
      },undefined,()=>{reject(new Error('Cover unavailable'));finish();});
      const begin=()=>{
        this.controllers.add(controller);
        void portalCover(url,controller.signal).then(blob=>{
          if(this.disposed)throw new Error('Disposed');
          objectUrl=URL.createObjectURL(blob);decode(objectUrl);
        }).catch(error=>{reject(error);finish();});
      };
      this.queue.push({begin,cancel:()=>reject(new Error('Disposed'))});this.drain();
    });
    this.jobs.set(key,job);return job;
  }
  private drain(){while(!this.disposed&&this.active<3&&this.queue.length){const job=this.queue.shift()!;this.active++;job.begin();}}
  dispose(){this.disposed=true;this.controllers.forEach(controller=>controller.abort());this.queue.forEach(job=>job.cancel());this.queue=[];this.textures.forEach(texture=>texture.dispose());this.textures.clear();this.jobs.clear();}
}
