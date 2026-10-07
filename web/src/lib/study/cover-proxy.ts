export const MAX_COVER_BYTES=8*1024*1024;
const imageHosts=new Set(['shopping-phinf.pstatic.net','bookthumb-phinf.pstatic.net','search1.kakaocdn.net','search2.kakaocdn.net','t1.daumcdn.net','www.nl.go.kr']);
const mediaPath=/^\/api\/media\/(avatars|room-covers|meetups|post-media)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
export type CoverAccess={status:200;coverUrl:string|null}|{status:401|404|502};

/** Sources come only from the authenticated book row, never from a URL parameter. */
export function resolveCoverSource(value:string,internalBase:string,publicBase:string) {
  let source:URL;
  try{source=new URL(value,publicBase);}catch{return null;}
  if(source.username||source.password||!['http:','https:'].includes(source.protocol))return null;
  const mediaOrigins=new Set([new URL(internalBase).origin,new URL(publicBase).origin,'https://api.booksome.top']);
  if(mediaOrigins.has(source.origin)&&mediaPath.test(source.pathname))return new URL(source.pathname,internalBase).href;
  if(!imageHosts.has(source.hostname)||source.port&&source.port!=='443')return null;
  source.protocol='https:';source.hash='';return source.href;
}

export function coverContentType(bytes:Uint8Array) {
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value))return 'image/png';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
  return null;
}

async function boundedImage(response:Response) {
  if(Number(response.headers.get('Content-Length'))>MAX_COVER_BYTES){await response.body?.cancel().catch(()=>{});throw new Error('Image too large');}
  if(!response.body)throw new Error('Image missing');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  try {
    while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.byteLength;if(length>MAX_COVER_BYTES)throw new Error('Image too large');chunks.push(chunk.value);}
  }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}

export async function serveStudyCover(request:Request,bookId:string,readBook:(id:string)=>Promise<CoverAccess>,internalBase:string,publicBase:string,fetchImage:typeof fetch=fetch) {
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
  const fail=(status:number)=>Response.json({message:'표지를 불러올 수 없습니다.'},{status,headers});
  if(request.headers.get('Sec-Fetch-Site')==='cross-site')return fail(403);
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(bookId))return fail(404);
  const access=await readBook(bookId).catch(()=>({status:502} as const));
  if(access.status!==200)return fail(access.status);
  if(!access.coverUrl)return fail(404);
  const source=resolveCoverSource(access.coverUrl,internalBase,publicBase);if(!source)return fail(422);
  try {
    const response=await fetchImage(source,{headers:{Accept:'image/jpeg,image/png,image/webp'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)return fail(502);
    const bytes=await boundedImage(response),contentType=coverContentType(bytes);if(!contentType)return fail(415);
    return new Response(bytes,{headers:{...headers,'Content-Type':contentType,'Content-Length':String(bytes.byteLength)}});
  }catch{return fail(502);}
}
