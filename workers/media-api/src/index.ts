type UploadKind = 'avatar' | 'room-cover' | 'meetup-photo' | 'post-media';

type NaverBookItem = {
  title?: string;
  link?: string;
  image?: string;
  author?: string;
  discount?: string;
  publisher?: string;
  pubdate?: string;
  isbn?: string;
  description?: string;
};

type SeojiBookItem = {
  AUTHOR?: string;
  BOOK_INTRODUCTION?: string;
  BOOK_INTRODUCTION_URL?: string;
  BOOK_SUMMARY?: string;
  BOOK_SUMMARY_URL?: string;
  EA_ISBN?: string;
  INPUT_DATE?: string;
  PAGE?: string;
  PUBLISHER?: string;
  PUBLISH_PREDATE?: string;
  REAL_PUBLISH_DATE?: string;
  RELATED_ISBN?: string;
  SET_ISBN?: string;
  TITLE?: string;
  TITLE_URL?: string;
};

const allowedKinds: Record<UploadKind, { prefix: string; maxBytes: number }> = {
  avatar: { prefix: 'avatars', maxBytes: 2 * 1024 * 1024 },
  'room-cover': { prefix: 'room-covers', maxBytes: 5 * 1024 * 1024 },
  'meetup-photo': { prefix: 'meetups', maxBytes: 8 * 1024 * 1024 },
  'post-media': { prefix: 'post-media', maxBytes: 8 * 1024 * 1024 },
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return withCors(
          new Response(null, {
            status: 204,
          }),
          env,
        );
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return json(
          {
            ok: true,
            service: 'booksome-media-api',
            env: env.APP_ENV,
          },
          env,
        );
      }

      if (request.method === 'GET' && url.pathname.startsWith('/v1/media/')) {
        return handleGetMedia(request, env);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/v1/books/isbn/')) {
        return handleGetBookByIsbn(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/v1/uploads/request') {
        return handleUploadRequest(request, env);
      }

      if (request.method === 'PUT' && url.pathname.startsWith('/v1/uploads/blob/')) {
        return handleUploadBlob(request, env, ctx);
      }

      return json({ error: 'Not found' }, env, 404);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      return json({ error: 'Internal error' }, env, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleGetBookByIsbn(request: Request, env: Env) {
  const url = new URL(request.url);
  const isbn = normalizeIsbn(url.pathname.slice('/v1/books/isbn/'.length));

  if (!isbn || !isLikelyIsbn(isbn)) {
    return json({ error: 'Invalid ISBN' }, env, 400);
  }

  if ((!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) && !env.NL_SEOJI_CERT_KEY) {
    return json({ error: 'Book search is not configured' }, env, 500);
  }

  if (env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET) {
    try {
      const naverResult = await lookupNaverBookByIsbn(isbn, env);

      if (naverResult.items.length > 0 || !env.NL_SEOJI_CERT_KEY) {
        return json(
          {
            isbn,
            total: naverResult.total,
            items: naverResult.items,
          },
          env,
        );
      }
    } catch (error) {
      if (!env.NL_SEOJI_CERT_KEY) {
        return json(
          {
            error: 'Book search failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          env,
          502,
        );
      }
    }
  }

  const seojiResult = await lookupSeojiBookByIsbn(isbn, env);

  return json(
    {
      isbn,
      total: seojiResult.total,
      items: seojiResult.items,
    },
    env,
  );
}

async function lookupNaverBookByIsbn(isbn: string, env: Env) {
  const naverUrl = new URL('https://openapi.naver.com/v1/search/book_adv.json');
  naverUrl.searchParams.set('d_isbn', isbn);
  naverUrl.searchParams.set('start', '1');
  naverUrl.searchParams.set('display', '10');

  const response = await fetch(naverUrl.toString(), {
    headers: {
      'X-Naver-Client-Id': env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver book search failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    total?: number;
    items?: NaverBookItem[];
  };
  const items = (payload.items ?? []).map(toNaverBookSearchResult).filter((item) => item !== null);

  return {
    total: payload.total ?? items.length,
    items,
  };
}

async function lookupSeojiBookByIsbn(isbn: string, env: Env) {
  if (!env.NL_SEOJI_CERT_KEY) {
    return {
      total: 0,
      items: [],
    };
  }

  const seojiUrl = new URL('https://www.nl.go.kr/seoji/SearchApi.do');
  seojiUrl.searchParams.set('cert_key', env.NL_SEOJI_CERT_KEY);
  seojiUrl.searchParams.set('isbn', isbn);
  seojiUrl.searchParams.set('result_style', 'json');
  seojiUrl.searchParams.set('page_no', '1');
  seojiUrl.searchParams.set('page_size', '10');

  const response = await fetch(seojiUrl.toString(), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`NL seoji book search failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    TOTAL_COUNT?: string;
    docs?: SeojiBookItem[];
  };
  const items = (payload.docs ?? []).map(toSeojiBookSearchResult).filter((item) => item !== null);

  return {
    total: parsePositiveInteger(payload.TOTAL_COUNT) ?? items.length,
    items,
  };
}

async function handleUploadRequest(request: Request, env: Env) {
  const body = (await request.json()) as {
    kind?: UploadKind;
    entityId?: string;
    extension?: string;
    mimeType?: string;
  };

  if (!body.kind || !(body.kind in allowedKinds) || !body.entityId) {
    return json({ error: 'Invalid upload request payload' }, env, 400);
  }

  const extension = normalizeExtension(body.extension);
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const rule = allowedKinds[body.kind];
  const objectKey = `${rule.prefix}/${body.entityId}/${fileName}`;

  return json(
    {
      kind: body.kind,
      entityId: body.entityId,
      objectKey,
      maxBytes: rule.maxBytes,
      uploadUrl: `/v1/uploads/blob/${body.kind}/${body.entityId}/${fileName}`,
      acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      note: 'Initial BookSome flow uploads bytes through this Worker. Move to presigned uploads later if needed.',
    },
    env,
  );
}

async function handleUploadBlob(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [, , , kind, entityId, fileName] = parts;

  if (!kind || !entityId || !fileName || !isUploadKind(kind)) {
    return json({ error: 'Invalid upload path' }, env, 400);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    return json({ error: 'Unsupported content type' }, env, 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  const absoluteMax = Number(env.UPLOAD_MAX_BYTES || '8388608');
  const allowedMax = Math.min(allowedKinds[kind].maxBytes, absoluteMax);

  if (contentLength > allowedMax) {
    return json({ error: 'File too large' }, env, 413);
  }

  if (!request.body) {
    return json({ error: 'Missing request body' }, env, 400);
  }

  const objectKey = `${allowedKinds[kind].prefix}/${entityId}/${fileName}`;

  const uploadPromise = env.BOOKSOME_MEDIA.put(objectKey, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      kind,
      entityId,
      uploadedAt: new Date().toISOString(),
    },
  });

  ctx.waitUntil(
    uploadPromise.then(() => {
      console.log(
        JSON.stringify({
          level: 'info',
          action: 'upload_saved',
          objectKey,
          kind,
          entityId,
        }),
      );
    }),
  );

  await uploadPromise;

  return json(
    {
      ok: true,
      objectKey,
      bucket: env.MEDIA_BUCKET_NAME,
      mediaUrl: `/v1/media/${encodeObjectKey(objectKey)}`,
    },
    env,
    201,
  );
}

async function handleGetMedia(request: Request, env: Env) {
  const url = new URL(request.url);
  const objectKey = decodeURIComponent(url.pathname.slice('/v1/media/'.length));

  if (!objectKey) {
    return json({ error: 'Missing media object key' }, env, 400);
  }

  const object = await env.BOOKSOME_MEDIA.get(objectKey);

  if (!object) {
    return json({ error: 'Media not found' }, env, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable');

  return withCors(
    new Response(object.body, {
      headers,
    }),
    env,
  );
}

function json(payload: unknown, env: Env, status = 200) {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    }),
    env,
  );
}

function withCors(response: Response, env: Env) {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', env.ALLOWED_ORIGIN);
  headers.set('access-control-allow-methods', 'GET,POST,PUT,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type, authorization');
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function normalizeExtension(input?: string) {
  if (!input) return 'jpg';
  const cleaned = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['jpg', 'jpeg', 'png', 'webp'].includes(cleaned)) {
    return cleaned === 'jpeg' ? 'jpg' : cleaned;
  }
  return 'jpg';
}

function isUploadKind(value: string): value is UploadKind {
  return value in allowedKinds;
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split('/').map(encodeURIComponent).join('/');
}

function normalizeIsbn(value: string) {
  return decodeURIComponent(value).replace(/[^0-9Xx]/g, '').toUpperCase();
}

function isLikelyIsbn(value: string) {
  return /^[0-9X]{10}$/.test(value) || /^(978|979)[0-9]{10}$/.test(value);
}

function toNaverBookSearchResult(item: NaverBookItem) {
  const isbn = extractPrimaryIsbn(item.isbn ?? '');

  if (!item.title || !item.author || !isbn) {
    return null;
  }

  return {
    title: cleanNaverText(item.title),
    author: cleanNaverText(item.author),
    publisher: cleanNaverText(item.publisher ?? ''),
    publishedDate: cleanNaverText(item.pubdate ?? ''),
    isbn,
    imageUrl: item.image ?? null,
    link: item.link ?? null,
    description: cleanNaverText(item.description ?? ''),
    source: 'naver',
    sourcePayload: item,
  };
}

function toSeojiBookSearchResult(item: SeojiBookItem) {
  const isbn = extractPrimaryIsbn(item.EA_ISBN || item.SET_ISBN || item.RELATED_ISBN || '');
  const title = cleanSeojiText(item.TITLE ?? '');

  if (!title || !isbn) {
    return null;
  }

  const introduction = cleanSeojiText(item.BOOK_INTRODUCTION ?? '');
  const summary = cleanSeojiText(item.BOOK_SUMMARY ?? '');
  const link = cleanSeojiText(item.TITLE_URL ?? item.BOOK_INTRODUCTION_URL ?? item.BOOK_SUMMARY_URL ?? '');

  return {
    title,
    author: cleanSeojiText(item.AUTHOR ?? '') || '작가 미상',
    publisher: cleanSeojiText(item.PUBLISHER ?? ''),
    publishedDate: normalizeSeojiPublishedDate(item.REAL_PUBLISH_DATE || item.PUBLISH_PREDATE || item.INPUT_DATE || ''),
    isbn,
    imageUrl: null,
    link: link || null,
    description: introduction || summary,
    source: 'nl-seoji',
    sourcePayload: item,
  };
}

function extractPrimaryIsbn(value: string) {
  const candidates = value.split(/\s+/).map(normalizeIsbn).filter(Boolean);
  return candidates.find((isbn) => /^(978|979)[0-9]{10}$/.test(isbn)) ?? candidates.find((isbn) => /^[0-9X]{10}$/.test(isbn)) ?? '';
}

function cleanNaverText(value: string) {
  return value
    .replace(/<\/?b>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function cleanSeojiText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSeojiPublishedDate(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 8);
}

function parsePositiveInteger(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
