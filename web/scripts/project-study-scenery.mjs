// Technical projection only: image creation/detail restoration uses Image Gen.
// node scripts/project-study-scenery.mjs <theme> <source.png> [version]
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const [theme,source,version='v1']=process.argv.slice(2);
if(!/^(tokyo|london|seoul|forest)$/.test(theme??'')||!source)throw new Error('Provide a supported theme and panorama source.');
const output=resolve('public/study/scenery'),references=resolve('/private/tmp',`booksome-${theme}-cube-ref`);
await mkdir(`${output}/${theme}-cube-${version}`,{recursive:true});await mkdir(references,{recursive:true});
const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});
const size=1024;
const directions={px:(u,v)=>[1,-v,-u],nx:(u,v)=>[-1,-v,u],py:(u,v)=>[u,1,v],ny:(u,v)=>[u,-1,-v],pz:(u,v)=>[u,-v,1],nz:(u,v)=>[-u,-v,-1]};
function sample(x,y,c){
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const at=(xx,yy)=>data[(Math.max(0,Math.min(info.height-1,yy))*info.width+((xx%info.width)+info.width)%info.width)*info.channels+c];
  return Math.round((at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy);
}
for(const [face,direction] of Object.entries(directions)){
  const buffer=Buffer.alloc(size*size*3);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const [cx,cy,cz]=direction((x+.5)/size*2-1,(y+.5)/size*2-1),length=Math.hypot(cx,cy,cz);
    // Match Three.js' external cube X inversion and panorama-sky.ts longitude.
    const longitude=Math.atan2(cz,-cx),latitude=Math.asin(cy/length);
    const sx=(longitude/(2*Math.PI)+.5)*info.width-.5,sy=(.5-latitude/Math.PI)*info.height-.5;
    for(let c=0;c<3;c++)buffer[(y*size+x)*3+c]=sample(sx,sy,c);
  }
  const image=sharp(buffer,{raw:{width:size,height:size,channels:3}});
  await image.clone().png().toFile(`${references}/${face}.png`);
  await image.webp({quality:92}).toFile(`${output}/${theme}-cube-${version}/${face}.webp`);
}
await sharp(source).webp({quality:94}).toFile(`${output}/${theme}-panorama-${version}.webp`);
// A rectilinear thumbnail, not the distorted spherical panorama.
await sharp(`${references}/nz.png`).resize(672,378,{fit:'cover'}).webp({quality:88}).toFile(`${output}/${theme}-photo-${version}.webp`);
console.log(`${theme}: six cube faces, panorama and thumbnail saved (${info.width}×${info.height} source)`);
