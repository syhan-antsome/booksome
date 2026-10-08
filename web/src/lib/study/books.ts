import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasMap } from './materials';
import type { StudyBook } from './types';
import type { ShelfSlot } from './furniture';
import { StudyCoverPool } from './cover-textures';
import {bookDimensions,packShelfBooks} from './shelf-layout';

const palette = ['#c56e4e', '#d8c6a6', '#647d72', '#eee5d5', '#a98970', '#415955', '#d7aa74', '#7d858d'];
export function makeStudyBook(book: StudyBook, covers:StudyCoverPool, invalidate:()=>void) {
  const hash=[...book.id].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,0);
  const color = palette[hash % palette.length];
  const ink = [2, 5, 7].includes(hash % palette.length) ? '#eee9df' : '#342f29';
  const {height,depth,width}=bookDimensions(book);
  function spineMap(background:string,textColor:string,artwork?:HTMLCanvasElement) {return canvasMap(128, 1024, ctx => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, 128, 1024);
    if(artwork) {
      // Borrow the cover's vertical palette and edge detail without squeezing its printed title.
      const swatch=document.createElement('canvas');swatch.width=8;swatch.height=48;
      const sample=swatch.getContext('2d')!;
      sample.drawImage(artwork,0,0,swatch.width,swatch.height);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.globalAlpha=.68;ctx.drawImage(swatch,0,0,128,1024);
      sample.clearRect(0,0,swatch.width,swatch.height);
      sample.drawImage(artwork,0,0,artwork.width*.15,artwork.height,0,0,swatch.width,swatch.height);
      ctx.globalAlpha=.32;ctx.drawImage(swatch,0,0,128,1024);ctx.globalAlpha=1;
    }
    const crease = ctx.createLinearGradient(0, 0, 128, 0); crease.addColorStop(0, 'rgba(0,0,0,.2)'); crease.addColorStop(.15, 'rgba(255,255,255,.15)'); crease.addColorStop(1, 'rgba(0,0,0,.08)'); ctx.fillStyle = crease; ctx.fillRect(0, 0, 128, 1024);
    ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const full=[...book.title],characters=full.length>16?[...full.slice(0,15),'…']:full; const spacing = Math.min(81, 690 / characters.length);
    ctx.font = '500 46px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    ctx.strokeStyle=textColor==='#342f29'?'rgba(255,248,232,.75)':'rgba(30,27,23,.75)';ctx.lineWidth=5;ctx.lineJoin='round';
    characters.forEach((char, i) => {ctx.strokeText(char,64,140+i*spacing,93);ctx.fillText(char, 64, 140 + i * spacing, 93);});
    ctx.save(); ctx.translate(64, 890); ctx.rotate(Math.PI / 2); ctx.font = '400 24px sans-serif'; ctx.lineWidth=3;ctx.strokeText(book.author,0,0,180);ctx.fillText(book.author, 0, 0, 180); ctx.restore();
    ctx.globalAlpha = .45; ctx.fillRect(27, 70, 74, 2); ctx.fillRect(27, 961, 74, 2);
  });}
  const spine=spineMap(color,ink);
  const cover = canvasMap(256, 384, ctx => {
    ctx.scale(.5, .5);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 768); ctx.fillStyle = ink; ctx.textBaseline = 'top'; ctx.font = '500 48px "Pretendard", sans-serif';
    let text = '', y = 110; for (const char of book.title) { if (ctx.measureText(text + char).width > 380 && text) { ctx.fillText(text, 64, y); text = char; y += 67; } else text += char; } ctx.fillText(text, 64, y);
    ctx.font = '400 22px sans-serif'; ctx.fillText(book.author, 64, y + 106); ctx.globalAlpha = .2; ctx.fillRect(64, 550, 360, 2); ctx.fillRect(64, 572, 240, 2);
  });
  const pages = canvasMap(64, 128, ctx => { ctx.fillStyle = '#e5dfd2'; ctx.fillRect(0, 0, 64, 128); ctx.strokeStyle = '#ccc3b4'; for (let i = 2; i < 64; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); } });
  const pageMaterial = new THREE.MeshStandardMaterial({ map: pages, roughness: .94 });
  const front = new THREE.MeshStandardMaterial({ map: cover, roughness: .75 });
  const side = new THREE.MeshStandardMaterial({ map: spine, roughness: .74 });
  const back = new THREE.MeshStandardMaterial({ color, roughness: .78 });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width,height,depth,2,.007), [front, back, pageMaterial, pageMaterial, side, pageMaterial]);
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData.book = book; mesh.userData.height = height; mesh.userData.depth = depth;
  mesh.userData.coverStatus=book.coverUrl?'loading':'missing';
  if(book.coverUrl)void covers.load(book).then(({texture,color:coverColor})=>{
    if(mesh.userData.disposed||covers.disposed)return;
    front.map?.dispose();front.map=texture;front.color.set('#ffffff');front.needsUpdate=true;
    back.color.set(coverColor);
    const rgb=new THREE.Color(coverColor);const light=rgb.r*.2126+rgb.g*.7152+rgb.b*.0722>.36;
    side.map?.dispose();side.map=spineMap(coverColor,light?'#342f29':'#fff7e7',texture.image as HTMLCanvasElement);side.needsUpdate=true;
    mesh.userData.coverStatus='loaded';invalidate();
  }).catch(()=>{if(!mesh.userData.disposed&&!covers.disposed){mesh.userData.coverStatus='error';invalidate();}});
  return { mesh, width, height,depth };
}

export function populateBooks(parent: THREE.Group, books: StudyBook[], slots: ShelfSlot[], invalidate: () => void,reserved:ReadonlySet<string>=new Set()) {
  const group = new THREE.Group(); parent.add(group); const targets: THREE.Mesh[] = [],covers=new StudyCoverPool();
  let deskHeight=0,underDeskHeight=0;
  for (const {book,slot,offset,scale} of packShelfBooks(books,slots,reserved).placed) {
    const {mesh,width,height,depth}=makeStudyBook(book,covers,invalidate),space=width*scale;
    const fittedHeight=height*scale;
    mesh.scale.setScalar(scale);
    mesh.position.set(slot.x+offset+space/2,slot.y+fittedHeight/2,slot.z+.28-depth*scale/2);
    mesh.rotation.y=0;
    mesh.userData.standing=true;mesh.userData.shelf=slot;mesh.userData.location='shelves';mesh.userData.pullDepth=depth*scale;mesh.userData.shelfPull=true;
    mesh.userData.invalidate = invalidate; group.add(mesh); targets.push(mesh);
  }
  // Desk volumes are views of the same registered books, not additional records.
  for(let i=1;i<Math.min(books.length,6);i++) {
    const {mesh,width}=makeStudyBook(books[i],covers,invalidate);mesh.rotation.z=Math.PI/2;
    if(i<4){mesh.rotation.y=-.13;mesh.position.set(-4.18,1.95+deskHeight+width/2,1.16);deskHeight+=width+.008;}
    else {mesh.position.set(-1.72,.71+underDeskHeight+width/2,1.75);underDeskHeight+=width+.008;}
    mesh.userData.location='desk';group.add(mesh);targets.push(mesh);
  }
  return { group, targets,covers };
}

export function disposeObject(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>(), materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
  object.traverse(child => {
    child.userData.disposed = true;
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture&&!value.userData.studyCover) textures.add(value); }
  });
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
}
