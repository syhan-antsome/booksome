import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function load(file){const source=await readFile(new URL(file,import.meta.url),'utf8');return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));}
const {StudyLibraryStore,mapStudyBooks}=await load('../src/lib/study/library-store.ts');
const {serveStudyCover,resolveCoverSource,MAX_COVER_BYTES}=await load('../src/lib/study/cover-proxy.ts');
const custom='https://api.booksome.top/api/media/post-media/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.png';
const book=(id,profileId='a',status='reading')=>({id,profileId,title:id,author:'실제 저자',status,currentPage:24,totalPages:300,externalCoverUrl:custom});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('mapping preserves the registered custom cover, metadata and original order within reading status',()=>{
  const input=[book('finished','a','finished'),book('current')];
  const result=mapStudyBooks(input,'a');
  assert.deepEqual(result.map(item=>item.id),['current','finished']);
  assert.equal(input[0].id,'finished');assert.equal(result[0].coverUrl,custom);
  assert.equal(result[0].currentPage,24);assert.equal(result[0].totalPages,300);
  assert.throws(()=>mapStudyBooks([book('foreign','b')],'a'),/로그인 상태/);
});

test('initial and successfully empty libraries contain no sample books',async()=>{
  const store=new StudyLibraryStore(async()=>[]);
  assert.equal(store.getSnapshot().status,'idle');assert.deepEqual(store.getSnapshot().books,[]);
  await store.load('a');assert.equal(store.getSnapshot().status,'ready');assert.deepEqual(store.getSnapshot().books,[]);
});

test('a late response from the old account cannot refill the newly selected account',async()=>{
  const a=deferred(),b=deferred();let calls=0;
  const store=new StudyLibraryStore(()=>++calls===1?a.promise:b.promise);
  const first=store.load('a'),second=store.load('b');
  assert.equal(store.getSnapshot().ownerId,'b');assert.deepEqual(store.getSnapshot().books,[]);
  b.resolve([book('b-owned','b')]);await second;
  a.resolve([book('a-owned')]);await first;
  assert.deepEqual(store.getSnapshot().books.map(item=>item.id),['b-owned']);
});

test('cancel followed by reloading the same account restarts work instead of sticking in loading',async()=>{
  const old=deferred();let calls=0;
  const store=new StudyLibraryStore(()=>++calls===1?old.promise:Promise.resolve([book('new')]));
  const first=store.load('a');store.cancel();await store.load('a');
  old.resolve([book('stale')]);await first;
  assert.equal(calls,2);assert.equal(store.getSnapshot().status,'ready');assert.equal(store.getSnapshot().books[0].id,'new');
});

test('refresh clears displayed data, expiration clears books, and an owner mismatch requests a page refresh',async()=>{
  let mode='success';
  const store=new StudyLibraryStore(async()=>{if(mode==='expired')throw {status:401};return [book('one',mode==='foreign'?'b':'a')];});
  await store.load('a');mode='expired';const refresh=store.load('a');assert.deepEqual(store.getSnapshot().books,[]);await refresh;
  assert.equal(store.getSnapshot().expired,true);assert.equal(store.getSnapshot().status,'error');
  mode='foreign';await store.load('a');assert.equal(store.getSnapshot().accountChanged,true);assert.deepEqual(store.getSnapshot().books,[]);
  store.reset();assert.equal(store.getSnapshot().status,'idle');
});

const internal='http://127.0.0.1:8080',publicBase='https://api.booksome.top';
const id='33333333-3333-3333-3333-333333333333';
const png=new Uint8Array([137,80,78,71,13,10,26,10]);
const request=new Request(`http://localhost:3000/api/study/books/${id}/cover`);

test('uploaded covers use the controlled media path, and unrelated URLs cannot become server fetches',()=>{
  assert.equal(resolveCoverSource(custom,internal,publicBase),custom.replace(publicBase,internal));
  for(const source of ['http://169.254.169.254/latest/meta-data/','http://127.0.0.1:8080/api/auth/me','https://api.booksome.top/api/auth/me','https://shopping-phinf.pstatic.net.evil.example/image.jpg','https://name:password@shopping-phinf.pstatic.net/image.jpg','data:image/svg+xml,test','file:///etc/passwd'])assert.equal(resolveCoverSource(source,internal,publicBase),null);
});

test('cover ownership and login are checked before any image request',async()=>{
  let fetched=false;
  for(const status of [401,404]){
    const result=await serveStudyCover(request,id,async()=>({status}),internal,publicBase,async()=>{fetched=true;return new Response(png);});
    assert.equal(result.status,status);assert.match(result.headers.get('cache-control'),/private, no-store/);
  }
  assert.equal(fetched,false);
});

test('a registered cover is proxied as an image without forwarding credentials or trusting its MIME header',async()=>{
  const result=await serveStudyCover(request,id,async bookId=>{assert.equal(bookId,id);return {status:200,coverUrl:custom};},internal,publicBase,async(url,init)=>{
    assert.equal(url,custom.replace(publicBase,internal));assert.equal(init.redirect,'error');assert.equal(new Headers(init.headers).has('Authorization'),false);
    return new Response(png,{headers:{'Content-Type':'text/plain'}});
  });
  assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'image/png');assert.match(result.headers.get('cache-control'),/private/);
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()),png);
});

test('non-image and oversized responses fail instead of becoming executable or unbounded assets',async()=>{
  const access=async()=>({status:200,coverUrl:'https://shopping-phinf.pstatic.net/cover.jpg'});
  const html=await serveStudyCover(request,id,access,internal,publicBase,async()=>new Response('<svg><script>bad</script></svg>',{headers:{'Content-Type':'image/png'}}));
  assert.equal(html.status,415);
  let canceled=false;
  const oversized=await serveStudyCover(request,id,access,internal,publicBase,async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_COVER_BYTES+1));},cancel(){canceled=true;}})));
  assert.equal(oversized.status,502);assert.equal(canceled,true);
});
