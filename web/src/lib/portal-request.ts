// Browser domain requests reuse the existing same-origin HTTP-only cookie proxy.
export class PortalRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let refresh: Promise<boolean> | null = null;
let endingSession = false;

export async function signOutPortal() {
  endingSession = true;
  try {
    // Finish an existing cookie refresh before clearing the newest session cookies.
    if (refresh) await refresh;
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('로그아웃하지 못했어요. 다시 시도해주세요.');
  } catch (cause) {
    endingSession = false;
    throw cause;
  }
}

export async function portalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Booksome-Client', 'reader');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const request = () => fetch(`/api/reader${path}`, { ...init, headers, credentials: 'same-origin', cache: 'no-store' });
  const response = await withSessionRefresh(request);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new PortalRequestError(response.status, response.status === 401 ? '로그인이 만료됐어요. 다시 로그인해주세요.' : body.message || '요청을 처리하지 못했어요. 다시 시도해주세요.');
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

async function withSessionRefresh(request:()=>Promise<Response>) {
  let response = await request();
  if (response.status === 401 && !endingSession) {
    if (!refresh) refresh = fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(result => result.ok).catch(() => false).finally(() => { refresh = null; });
    if (await refresh && !endingSession) response = await request();
  }
  return response;
}

export async function portalCover(path:string,signal:AbortSignal) {
  if(!/^\/api\/study\/books\/[0-9a-f-]{36}\/cover$/i.test(path))throw new Error('잘못된 표지 요청입니다.');
  const response=await withSessionRefresh(()=>fetch(path,{credentials:'same-origin',cache:'no-store',signal}));
  if(!response.ok)throw new PortalRequestError(response.status,'표지를 불러오지 못했어요.');
  return response.blob();
}
