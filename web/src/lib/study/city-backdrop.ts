import * as THREE from 'three';
import {sceneryOptions} from './scenery-options';
import {makePanoramaSky} from './panorama-sky';
import type {StudyBackdrop} from './types';

export type BackdropStatus={mode:StudyBackdrop;phase:'loading'|'ready'|'error'};
type PhotoLoader=(source:string|readonly string[])=>Promise<THREE.Texture>;

/** A panoramic New York environment follows the real camera's orientation,
 * roll and lens. Other cities retain their photographic plates. The window
 * opening always sees the same environment as the space around the room. */
export class CityBackdrop {
  private mode:StudyBackdrop='forest';
  private texture:THREE.Texture|null=null;
  private reference:THREE.Texture|null=null;
  private sky:ReturnType<typeof makePanoramaSky>|null=null;
  private generation=0;
  private disposed=false;
  private width=1;
  private height=1;
  constructor(
    private readonly scene:THREE.Scene,
    private readonly changed:(status:BackdropStatus)=>void=()=>{},
    private readonly loadPhoto:PhotoLoader=source=>typeof source==='string'?new THREE.TextureLoader().loadAsync(source):new THREE.CubeTextureLoader().loadAsync([...source]),
  ){}

  set(mode:StudyBackdrop,retry=false):Promise<void> {
    if(this.disposed||(!retry&&this.mode===mode))return Promise.resolve();
    const generation=++this.generation;this.mode=mode;this.release();
    this.scene.fog=null;this.scene.backgroundRotation.set(0,0,0);
    if(mode==='forest'){
      this.scene.background=null;this.changed({mode,phase:'ready'});return Promise.resolve();
    }
    const palette=sceneryOptions.find(item=>item.id===mode)!;
    this.scene.background=new THREE.Color(palette.horizon);
    this.changed({mode,phase:'loading'});
    const sources=[palette.cubeFaces??palette.photo!,...(palette.cubeFaces?['/study/scenery/new-york-panorama-v1.webp']:[])];
    return Promise.allSettled(sources.map(source=>this.loadPhoto(source))).then(results=>{
      if(this.disposed||generation!==this.generation||results.some(result=>result.status==='rejected')){
        for(const result of results)if(result.status==='fulfilled')result.value.dispose();
        if(!this.disposed&&generation===this.generation)this.changed({mode,phase:'error'});
        return;
      }
      const [texture,reference]=results.map(result=>(result as PromiseFulfilledResult<THREE.Texture>).value);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.mapping=palette.cubeFaces?THREE.CubeReflectionMapping:THREE.UVMapping;
      texture.minFilter=texture.magFilter=THREE.LinearFilter;
      texture.generateMipmaps=false;
      this.texture=texture;this.resize(this.width,this.height);
      this.scene.background=texture;
      if(reference){
        reference.colorSpace=THREE.SRGBColorSpace;reference.minFilter=reference.magFilter=THREE.LinearFilter;reference.generateMipmaps=false;reference.wrapS=THREE.RepeatWrapping;
        this.reference=reference;this.scene.backgroundRotation.y=.88;this.sky=makePanoramaSky(texture,reference,this.scene.backgroundRotation);this.scene.add(this.sky);
      }
      this.changed({mode,phase:'ready'});
    }).catch(()=>{
      if(!this.disposed&&generation===this.generation)this.changed({mode,phase:'error'});
    });
  }

  resize(width:number,height:number) {
    if(width<=0||height<=0)return;
    this.width=width;this.height=height;
    const texture=this.texture;if(!texture||texture.mapping===THREE.CubeReflectionMapping)return;
    const image=texture.image as {width:number;height:number};
    const aspect=image.width/image.height,viewport=width/height;
    // Cover the viewport without stretching the skyline on narrow screens.
    const sx=Math.min(1,viewport/aspect),sy=Math.min(1,aspect/viewport);
    texture.repeat.set(sx,sy);texture.offset.set((1-sx)/2,(1-sy)/2);texture.updateMatrix();
  }

  private release(){if(this.sky){this.scene.remove(this.sky);this.sky.geometry.dispose();this.sky.material.dispose();this.sky=null;}this.reference?.dispose();this.reference=null;this.texture?.dispose();this.texture=null;}
  dispose(){this.disposed=true;this.generation++;this.release();this.scene.background=null;this.scene.fog=null;this.scene.backgroundRotation.set(0,0,0);}
}
