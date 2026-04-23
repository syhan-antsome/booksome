type UploadKind = 'avatar' | 'room-cover' | 'meetup-photo' | 'post-media';

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
      bucket: 'BOOKSOME_MEDIA',
    },
    env,
    201,
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
