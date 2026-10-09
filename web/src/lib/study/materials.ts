import * as THREE from 'three';

export type StudyMaterials = {
  wood: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  fabric: THREE.MeshPhysicalMaterial;
  rug: THREE.MeshPhysicalMaterial;
  blanket: THREE.MeshPhysicalMaterial;
  cushion: THREE.MeshPhysicalMaterial;
  cork: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshStandardMaterial;
  coral: THREE.MeshStandardMaterial;
  garden: THREE.Texture;
  facade: THREE.MeshStandardMaterial;
  treeBark: THREE.MeshStandardMaterial;
};

export async function loadStudyMaterials(renderer: THREE.WebGLRenderer): Promise<StudyMaterials> {
  const loader = new THREE.TextureLoader();
  const urls = ['/study/materials.jpg', '/study/textiles.jpg', '/study/garden.jpg', ...['oak', 'floor'].flatMap(name => ['color', 'normal', 'rough'].map(kind => `/study/pbr/${name}-${kind}.jpg`)), '/study/pbr/penthouse-stone-color.webp','/study/pbr/tree-bark-color-v1.webp'];
  const loaded = await Promise.allSettled(urls.map(url => loader.loadAsync(url)));
  if (loaded.some(result => result.status === 'rejected')) { loaded.forEach(result => { if (result.status === 'fulfilled') result.value.dispose(); }); throw new Error('Study materials could not be loaded'); }
  const textures = loaded.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
  const [atlas, textiles, garden, oakColor, oakNormal, oakRough, floorColor, floorNormal, floorRough,stoneColor,barkColor] = textures;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function repeat(map: THREE.Texture, x=1, y=1, color=false) { map.wrapS=map.wrapT=THREE.RepeatWrapping; map.repeat.set(x,y); map.anisotropy=anisotropy; map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace; return map; }
  function tile(source: THREE.Texture, x: number, y: number, repeatX: number, repeatY: number, pale = 0) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
    const image = source.image as HTMLImageElement;
    const context=canvas.getContext('2d')!;
    context.drawImage(image, x * image.width / 2, y * image.height / 2, image.width / 2, image.height / 2, 0, 0, 768, 768);
    if(pale){context.globalAlpha=pale;context.fillStyle='#eee6d7';context.fillRect(0,0,768,768);}
    const map = repeat(new THREE.CanvasTexture(canvas),repeatX,repeatY,true);
    const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace;
    return { map, bumpMap: bump };
  }
  garden.colorSpace=THREE.SRGBColorSpace;
  const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=1024;
  const floorContext=floorCanvas.getContext('2d')!;floorContext.drawImage(floorColor.image as HTMLImageElement,0,0,1024,1024);floorContext.globalAlpha=.40;floorContext.fillStyle='#e6d4b7';floorContext.fillRect(0,0,1024,1024);
  const paleFloor=repeat(new THREE.CanvasTexture(floorCanvas),1,1,true);floorColor.dispose();
  const woodCanvas=document.createElement('canvas');woodCanvas.width=woodCanvas.height=1024;
  const woodContext=woodCanvas.getContext('2d')!;woodContext.drawImage(oakColor.image as HTMLImageElement,0,0,1024,1024);
  woodContext.globalAlpha=.60;woodContext.translate(512,512);woodContext.rotate(Math.PI/2);
  const atlasImage=atlas.image as HTMLImageElement;woodContext.drawImage(atlasImage,0,0,atlasImage.width/2,atlasImage.height/2,-512,-512,1024,1024);
  const oakMap=repeat(new THREE.CanvasTexture(woodCanvas),1,1,true);oakColor.dispose();
  const wood = new THREE.MeshStandardMaterial({ map:oakMap, normalMap:repeat(oakNormal), roughnessMap:repeat(oakRough), normalScale:new THREE.Vector2(.35,.35), roughness:.67, color:'#fff4e4' });
  wood.userData.physicalGrain=true;
  const floor = new THREE.MeshStandardMaterial({ map:paleFloor,normalMap:repeat(floorNormal),roughnessMap:repeat(floorRough),normalScale:new THREE.Vector2(.32,.32),roughness:.85,color:'#fff9ed' });
  floor.userData.physicalFloor=true;
  const fabric = new THREE.MeshPhysicalMaterial({ ...tile(textiles,0,0,3.5,3.5),color:'#f8f2e8',roughness:.9,bumpScale:.022,sheen:.65,sheenColor:new THREE.Color('#ded1bd') });
  const rug = new THREE.MeshPhysicalMaterial({ ...tile(textiles,1,0,10,8,.30),color:'#fffdf8',roughness:.98,bumpScale:.028,sheen:.25 });
  const blanket = new THREE.MeshPhysicalMaterial({ ...tile(textiles,0,1,3,5),color:'#ffffff',roughness:.95,bumpScale:.018,sheen:.4,sheenColor:new THREE.Color('#bd8c69'),side:THREE.DoubleSide });
  const cushion = fabric.clone(); cushion.color.set('#d89168');
  const cork = new THREE.MeshStandardMaterial({ ...tile(textiles,1,1,1,1),roughness:1,bumpScale:.028,color:'#dac6a9' });
  const plaster = new THREE.MeshStandardMaterial({ ...tile(atlas,1,1,4,2),color:'#fffaf2',roughness:.96,bumpScale:.009 });
  const stone=repeat(stoneColor,1,1,true),stoneBump=stone.clone();stoneBump.colorSpace=THREE.NoColorSpace;
  const facade=new THREE.MeshStandardMaterial({map:stone,bumpMap:stoneBump,bumpScale:.017,roughness:.92,color:'#b4aca2'});facade.userData.physicalStone=true;
  atlas.dispose(); textiles.dispose();
  const bark=repeat(barkColor,1,1,true),barkBump=bark.clone();barkBump.colorSpace=THREE.NoColorSpace;
  const treeBark=new THREE.MeshStandardMaterial({map:bark,bumpMap:barkBump,bumpScale:.065,roughness:.98,color:'#b9a38b'});
  return { wood,floor,fabric,rug,blanket,cushion,cork,plaster,garden,facade,treeBark,ceramic:new THREE.MeshStandardMaterial({color:'#ece3d2',roughness:.62}),coral:new THREE.MeshStandardMaterial({color:'#d97750',roughness:.58}) };
}

export function disposeStudyMaterials(materials: StudyMaterials) {
  const textures = new Set<THREE.Texture>();
  for (const value of Object.values(materials)) { if (value instanceof THREE.Texture) textures.add(value); else { Object.values(value).forEach(texture => { if (texture instanceof THREE.Texture) textures.add(texture); }); value.dispose(); } }
  textures.forEach(texture => texture.dispose());
}

export function canvasMap(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return map;
}
