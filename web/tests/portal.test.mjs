import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function load(file) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const navigation = await load('../src/lib/navigation.ts');
const api = await load('../src/lib/api.ts');
const portal = await load('../src/lib/portal-request.ts');
const reading = await load('../src/lib/reading.ts');

test('book conversation login and signup stay in the portal, including older reader links', () => {
  const next = navigation.conversationPath('room-f04b477a');
  assert.equal(next, '/rooms/room-f04b477a?participate=1#discussion-compose');
  for (const mode of ['login', 'signup']) {
    assert.equal(new URL(navigation.authHref(mode, next), 'https://booksome.top').searchParams.get('next'), next);
  }
  assert.equal(navigation.safeNextPath('/app/room/room-f04b477a'), next);
  assert.equal(navigation.safeNextPath('/app/rooms'), '/rooms');
});

test('portal mutations use the same-origin cookie proxy without browser Authorization tokens', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url, init) => {
      assert.equal(url, '/api/reader/rooms/test/posts');
      assert.equal(init.credentials, 'same-origin');
      assert.equal(init.headers.get('X-Booksome-Client'), 'reader');
      assert.equal(init.headers.has('Authorization'), false);
      return Response.json({ id: 'saved-post' }, { status: 201 });
    };
    assert.deepEqual(await portal.portalRequest('/rooms/test/posts', { method: 'POST', body: JSON.stringify({ body: 'public thought' }) }), { id: 'saved-post' });
    global.fetch = async () => Response.json({ message: '저장 실패' }, { status: 503 });
    await assert.rejects(portal.portalRequest('/rooms/test/posts'), error => error.status === 503 && error.message === '저장 실패');
  } finally { global.fetch = original; }
});

test('expired portal sessions retry only after cookie-session refresh succeeds', async () => {
  const original = global.fetch;
  const requests = [];
  try {
    global.fetch = async url => {
      requests.push(url);
      if (url === '/api/auth/session') return Response.json({});
      if (requests.length === 1) return Response.json({}, { status: 401 });
      return new Response(null, { status: 204 });
    };
    await portal.portalRequest('/rooms/posts/one/reaction', { method: 'PUT' });
    assert.deepEqual(requests, ['/api/reader/rooms/posts/one/reaction', '/api/auth/session', '/api/reader/rooms/posts/one/reaction']);
  } finally { global.fetch = original; }
});

test('cover bytes use explicit cookie credentials and share the existing refresh before retry',async()=>{
  const original=global.fetch;let refreshed=false,refreshCount=0;
  const path='/api/study/books/33333333-3333-3333-3333-333333333333/cover';
  try {
    global.fetch=async(url,init)=>{
      assert.equal(init.credentials,'same-origin');
      if(url==='/api/auth/session'){refreshCount++;await Promise.resolve();refreshed=true;return Response.json({});}
      assert.equal(url,path);assert.equal(new Headers(init.headers).has('Authorization'),false);
      return refreshed?new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}}):Response.json({},{status:401});
    };
    const controller=new AbortController();
    const images=await Promise.all([portal.portalCover(path,controller.signal),portal.portalCover(path,controller.signal)]);
    assert.equal(refreshCount,1);assert.equal(images[0].type,'image/png');assert.equal(images[0].size,3);
    await assert.rejects(portal.portalCover('https://evil.example/cover',controller.signal));
  }finally{global.fetch=original;}
});

test('authentication preserves selected book through login and signup, and blocks external destinations', () => {
  const next = '/library/add?query=9788936434120';
  assert.equal(navigation.safeNextPath('/app/books/add?query=9788936434120'), next);
  assert.equal(new URL(navigation.authHref('signup', next), 'https://booksome.top').searchParams.get('next'), next);
  for (const bad of ['https://evil.example', '//evil.example', '/app\\\\evil.example', '/login', '/api/auth/session', '/application']) {
    assert.equal(navigation.safeNextPath(bad), '/');
  }
  assert.equal(navigation.safeNextPath('/me'), '/library');
  assert.equal(navigation.safeNextPath('/app/../../api/auth/session'), '/');
  assert.equal(navigation.safeNextPath('/app/books/add?query=A%2FB'), '/library/add?query=A%2FB');
});

test('home login stays home and all older portal library destinations resolve to desktop pages', () => {
  assert.equal(navigation.safeNextPath(), '/');
  assert.equal(new URL(navigation.authHref('login', '/'), 'https://booksome.top').searchParams.get('next'), '/');
  for (const path of ['/app/library', '/app/reading-life', '/app/record', '/app/']) assert.equal(navigation.safeNextPath(path), '/library');
  assert.equal(navigation.safeNextPath('/app/reading-life/book-one'), '/library/book-one');
  assert.equal(navigation.safeNextPath('/library/book-one'), '/library/book-one');
});

test('study login returns to the exact local study route without expanding the redirect boundary', () => {
  assert.equal(navigation.safeNextPath('/study'), '/study');
  for (const mode of ['login', 'signup']) assert.equal(new URL(navigation.authHref(mode, '/study'), 'https://booksome.top').searchParams.get('next'), '/study');
  for (const path of ['/study-admin', '/study/admin', '/study/../../api/auth/session', '//evil.example/study']) assert.equal(navigation.safeNextPath(path), '/');
});

test('progress supports unknown length without inventing percentages and rejects invalid pages', () => {
  assert.deepEqual(reading.readingPosition('24',''), { currentPage:24, totalPages:null, progressPercent:0, updateTotalPages:true });
  assert.equal(reading.readingPosition('24','120').progressPercent, 20);
  for (const [page,total] of [['','120'],['-1',''],['1.5','120'],['121','120'],['24','0'],['24','-10']]) assert.throws(() => reading.readingPosition(page,total));
  assert.equal(reading.validIsbn('978-8936434120'), true);
  assert.equal(reading.validIsbn('12345'), false);
});

test('editing photo captions preserves native annotation geometry and hides technical metadata', () => {
  const metadata = { text:'내 생각', strokes:[{ points:[[10,20]], color:'#e75b40' }] };
  const original = '__booksome_highlight_v1:' + JSON.stringify(metadata);
  assert.equal(reading.noteBody(original), '내 생각');
  const edited = reading.editedNoteBody(original, '수정한 생각');
  assert.deepEqual(JSON.parse(edited.slice(edited.indexOf(':')+1)), { ...metadata, text:'수정한 생각' });
  assert.equal(reading.noteBody('__booksome_highlight_v1:broken'), '');
  assert.throws(() => reading.editedNoteBody('__booksome_highlight_v1:broken', '새 글'));
  assert.equal(reading.noteImage({ mediaPath:'post-media/reader/사진.png' }), '/api/reader/media/post-media/reader/%EC%82%AC%EC%A7%84.png');
});

test('photo uploads retain multipart encoding and the cookie boundary', async () => {
  const original = global.fetch;
  try {
    const data = new FormData(); data.append('kind','post-media'); data.append('file',new Blob(['image'],{type:'image/png'}),'photo.png');
    global.fetch = async (url,init) => {
      assert.equal(url, '/api/reader/media/images');
      assert.equal(init.body, data);
      assert.equal(init.headers.has('Content-Type'), false);
      assert.equal(init.headers.has('Authorization'), false);
      assert.equal(init.credentials,'same-origin');
      return Response.json({ objectPath:'post-media/reader/photo.png', mediaUrl:'https://api.booksome.top/api/media/post-media/reader/photo.png' });
    };
    assert.equal((await portal.portalRequest('/media/images',{method:'POST',body:data})).objectPath,'post-media/reader/photo.png');
  } finally { global.fetch = original; }
});

test('API failures are distinct from successful empty results and missing rooms', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => Response.json({ query: '없음', items: [], total: 0 });
    const empty = await api.searchBooks('없음');
    assert.equal(empty.error, null);
    assert.equal(empty.data.items.length, 0);
    global.fetch = async () => Response.json({ error: 'book_lookup_not_configured' }, { status: 503 });
    assert.equal((await api.searchBooks('모순')).error, 'search-not-configured');
    global.fetch = async () => { throw new Error('offline'); };
    assert.equal((await api.getRooms()).error, 'unavailable');
    global.fetch = async () => Response.json({ room: null });
    assert.equal((await api.getRoom('missing')).error, 'not-found');
    global.fetch = async () => Response.json({}, { status: 502 });
    assert.equal((await api.getRoom('existing')).error, 'unavailable');
  } finally { global.fetch = original; }
});

test('ISBN searches use the ISBN endpoint and preserve the query for library registration', async () => {
  const original = global.fetch;
  let requested;
  try {
    global.fetch = async url => { requested = url; return Response.json({ isbn: '9788936434120', total: 1, items: [] }); };
    const result = await api.searchBooks('978-8936434120');
    assert.ok(requested.endsWith('/api/books/isbn/9788936434120'));
    assert.equal(result.data.query, '978-8936434120');
  } finally { global.fetch = original; }
});

test('public portal excludes private, hidden and unapproved discussion posts', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => Response.json([
      { id:'visible', visibility:'public', moderationStatus:'approved' },
      { id:'private', visibility:'hidden', moderationStatus:'approved' },
      { id:'pending', visibility:'public', moderationStatus:'pending' }
    ]);
    assert.deepEqual((await api.getRoomPosts('book')).data.map(post=>post.id), ['visible']);
  } finally { global.fetch = original; }
});

test('media uses the public origin while server requests use the internal API', () => {
  const internal = process.env.BOOKSOME_API_INTERNAL_URL;
  const external = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    process.env.BOOKSOME_API_INTERNAL_URL = 'http://127.0.0.1:8080';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.booksome.top';
    assert.equal(api.getApiBaseUrl(), 'http://127.0.0.1:8080');
    assert.equal(api.mediaUrl('covers/우리 책.png'), 'https://api.booksome.top/api/media/covers/%EC%9A%B0%EB%A6%AC%20%EC%B1%85.png');
  } finally {
    if (internal === undefined) delete process.env.BOOKSOME_API_INTERNAL_URL; else process.env.BOOKSOME_API_INTERNAL_URL = internal;
    if (external === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = external;
  }
});


test('logout can be retried after failure, waits for refresh and prevents re-authentication afterwards', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => Response.json({}, { status: 503 });
    await assert.rejects(portal.signOutPortal());

    const calls = [];
    let enterRefresh;
    let finishRefresh;
    const entered = new Promise(resolve => { enterRefresh = resolve; });
    const heldRefresh = new Promise(resolve => { finishRefresh = resolve; });
    global.fetch = async (url, init) => {
      calls.push(url);
      if (url === '/api/auth/session') { enterRefresh(); return heldRefresh; }
      if (url === '/api/auth/logout') {
        assert.equal(init.method, 'POST');
        assert.equal(init.credentials, 'same-origin');
        return Response.json({ signedOut: true });
      }
      return Response.json({}, { status: 401 });
    };
    const reading = portal.portalRequest('/rooms/test/posts').catch(error => error);
    await entered;
    const logout = portal.signOutPortal();
    assert.deepEqual(calls, ['/api/reader/rooms/test/posts', '/api/auth/session']);
    finishRefresh(Response.json({}));
    await logout;
    assert.equal((await reading).status, 401);
    assert.deepEqual(calls, ['/api/reader/rooms/test/posts', '/api/auth/session', '/api/auth/logout']);
    await assert.rejects(portal.portalRequest('/rooms/test/posts'), error => error.status === 401);
    assert.equal(calls.filter(url => url === '/api/auth/session').length, 1);
  } finally { global.fetch = original; }
});
