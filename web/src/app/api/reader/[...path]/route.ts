import { apiFetch } from '@/lib/api';
import { getSessionTokens } from '@/lib/auth';

const domains = new Set(['books', 'reading-life', 'profiles', 'rooms', 'meetups', 'market', 'media']);

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join('/');
  const verification = /^auth\/email-verification\/(request|confirm)$/.test(route);
  if ((!domains.has(path[0]) && !verification) || path.some(part => !part || part === '.' || part === '..' || /[\/\\%]/.test(part))) {
    return Response.json({ message: '지원하지 않는 요청입니다.' }, { status: 404 });
  }
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('X-Booksome-Client') !== 'reader') {
    return Response.json({ message: '허용되지 않는 요청입니다.' }, { status: 403 });
  }
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return Response.json({ message: '허용되지 않는 요청입니다.' }, { status: 403 });
  }
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > 10 * 1024 * 1024) return Response.json({ message: '10MB 이하 파일을 선택해주세요.' }, { status: 413 });
  const { accessToken } = await getSessionTokens();
  const headers = new Headers();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const contentType = request.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  try {
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
    if (body && body.byteLength > 10 * 1024 * 1024) return Response.json({ message: '10MB 이하 파일을 선택해주세요.' }, { status: 413 });
    const response = await apiFetch(`/api/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`, {
      method: request.method, headers, body, cache: 'no-store', redirect: 'error',
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return Response.json({ message: '북썸 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해주세요.' }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
