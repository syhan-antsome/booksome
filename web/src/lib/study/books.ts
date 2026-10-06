import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasMap } from './materials';
import type { StudyBook } from './types';
import type { ShelfSlot } from './furniture';

const palette = ['#c56e4e', '#d8c6a6', '#647d72', '#eee5d5', '#a98970', '#415955', '#d7aa74', '#7d858d'];
export function makeStudyBook(book: StudyBook, index: number) {
  const color = palette[index % palette.length];
  const ink = [2, 5, 7].includes(index % palette.length) ? '#eee9df' : '#342f29';
  const height = .735 + (index % 4) * .033;
  const width = book.totalPages ? Math.min(.21, Math.max(.07, book.totalPages * .00036)) : .12 + (index % 4) * .026;
  const spine = canvasMap(128, 1024, ctx => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 1024);
    const crease = ctx.createLinearGradient(0, 0, 128, 0); crease.addColorStop(0, 'rgba(0,0,0,.2)'); crease.addColorStop(.15, 'rgba(255,255,255,.15)'); crease.addColorStop(1, 'rgba(0,0,0,.08)'); ctx.fillStyle = crease; ctx.fillRect(0, 0, 128, 1024);
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const characters = [...book.title]; const spacing = Math.min(81, 690 / characters.length);
    ctx.font = '500 64px "Pretendard", "Apple SD Gothic Neo", sans-serif';
    characters.forEach((char, i) => ctx.fillText(char, 64, 140 + i * spacing, 93));
    ctx.save(); ctx.translate(64, 890); ctx.rotate(Math.PI / 2); ctx.font = '400 24px sans-serif'; ctx.fillText(book.author, 0, 0, 180); ctx.restore();
    ctx.globalAlpha = .45; ctx.fillRect(27, 70, 74, 2); ctx.fillRect(27, 961, 74, 2);
  });
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
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width,height,.56,2,.007), [front, back, pageMaterial, pageMaterial, side, pageMaterial]);
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData.book = book; mesh.userData.height = height; mesh.userData.depth = .56;
  // Covers remain a best-effort enhancement. The deterministic title spine is always present.
  if (book.coverUrl && /^https?:\/\//.test(book.coverUrl)) new THREE.TextureLoader().load(book.coverUrl, map => {
    if (mesh.userData.disposed) { map.dispose(); return; }
    map.colorSpace = THREE.SRGBColorSpace; front.map?.dispose(); front.map = map; front.needsUpdate = true;
    mesh.userData.invalidate?.();
  }, undefined, () => { /* Keep the generated cover when the remote image does not allow WebGL CORS. */ });
  return { mesh, width, height };
}

export function populateBooks(parent: THREE.Group, books: StudyBook[], slots: ShelfSlot[], invalidate: () => void) {
  const group = new THREE.Group(); parent.add(group); const targets: THREE.Mesh[] = [];
  const occupied = slots.map(() => 0);
  const stackHeights = slots.map(()=>0);
  const kinds:('standing'|'stack'|null)[]=slots.map(()=>null);
  let deskHeight=0,underDeskHeight=0;
  for (let i = 0; i < books.length; i++) {
    if (i === 0) continue; // The current book is represented by the open volume on the desk.
    const { mesh, width, height } = makeStudyBook(books[i], i);
    if (i < 4) { mesh.rotation.z = Math.PI / 2; mesh.rotation.y = -.13; mesh.position.set(-4.18, 1.95+deskHeight+width/2, 1.16);deskHeight+=width+.008; mesh.userData.location='desk';mesh.userData.invalidate = invalidate; group.add(mesh); targets.push(mesh); continue; }
    if(i<6){mesh.rotation.z=Math.PI/2;mesh.position.set(-1.72,.71+underDeskHeight+width/2,1.75);underDeskHeight+=width+.008;mesh.userData.location='desk';mesh.userData.invalidate=invalidate;group.add(mesh);targets.push(mesh);continue;}
    let slotIndex = Math.floor((i-6)/4)%slots.length;
    const horizontal = Math.floor((i-6)/4)%5===2;
    const space = horizontal ? height : width;
    const kind=horizontal?'stack':'standing';
    const unavailable=(index:number)=>(kinds[index]!==null&&kinds[index]!==kind)||(horizontal?stackHeights[index]+width>slots[index].maxHeight:occupied[index]+space+.1>slots[index].width);
    for (let attempt = 0; attempt < slots.length && unavailable(slotIndex); attempt++) slotIndex = (slotIndex + 1) % slots.length;
    const slot = slots[slotIndex];
    if (!slot || unavailable(slotIndex)) { disposeObject(mesh); continue; }
    kinds[slotIndex]=kind;
    const fittedHeight=horizontal?height:Math.min(height,slot.maxHeight);
    mesh.scale.y=fittedHeight/height;
    mesh.position.set(slot.x + (horizontal?height/2:occupied[slotIndex]+width/2), slot.y + (horizontal?stackHeights[slotIndex]+width/2:fittedHeight/2), slot.z);
    mesh.rotation.z=horizontal?Math.PI/2:0;
    mesh.userData.standing=!horizontal;mesh.userData.shelf=slot;mesh.userData.location='shelves';
    if(horizontal) stackHeights[slotIndex]+=width+.009; else occupied[slotIndex] += space + .037;
    mesh.userData.invalidate = invalidate; group.add(mesh); targets.push(mesh);
  }
  return { group, targets };
}

export function disposeObject(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>(), materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>();
  object.traverse(child => {
    child.userData.disposed = true;
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); }
  });
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
}
