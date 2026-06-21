type UploadKind = 'avatar' | 'room-cover' | 'meetup-photo' | 'post-media';

type NaverBookItem = {
  title?: string;
  link?: string;
  image?: string;
  author?: string;
  translator?: string;
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
  TRANSLATOR?: string;
  TRANSLATOR_NAME?: string;
};

type RecognizedReadingLine = {
  id: string;
  text: string;
};

type PostClassificationKind = 'impression' | 'quote' | 'question';

type BookLookupConfig = {
  naverClientId?: string;
  naverClientSecret?: string;
  nlSeojiCertKey?: string;
};

type NaverOcrConfig = {
  invokeUrl?: string;
  secret?: string;
};

type SupabaseConfig = {
  url?: string;
  serviceRoleKey?: string;
};

type NaverOcrResponse = {
  images?: Array<{
    fields?: Array<{
      inferText?: string;
      lineBreak?: boolean;
    }>;
  }>;
};

type EnvWithSecrets = Env & {
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  NL_SEOJI_CERT_KEY?: string;
  NAVER_OCR_INVOKE_URL?: string;
  NAVER_OCR_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type SupabaseUserResponse = {
  id?: string;
};

type ReviewablePostRow = {
  id: string;
  room_id: string;
  author_id: string | null;
  kind: PostClassificationKind | 'notice';
  body: string;
  quote_text: string | null;
  chapter_label: string | null;
  classification_status?: string | null;
  moderation_status?: string | null;
  visibility?: string | null;
};

type AiClassification = {
  kind: PostClassificationKind;
  confidence: number;
  reason: string;
};

const readingPageOcrPrompt =
  'Extract exact visible Korean text from this image for a reading-note app. Return JSON only with this shape: {"lines":["..."]}. Each item must be one visible sentence or short line. Preserve Korean text, spacing, and punctuation as much as possible. Do not summarize, translate, describe the image, or add explanations. Omit uncertain text. If no readable text is visible, return {"lines":[]}.';

const postClassificationSystemPrompt =
  [
    '너는 한국어 독서 앱 BookSome의 짧은 글을 분류한다.',
    '분류 기준은 순서대로 적용한다.',
    '1. 문장이 질문이면 "question"이다. 물음표가 없어도 질문이다. 혼잣말식 질문, 구어체 질문, 토론을 여는 물음도 question이다. 예: "이 책 작가가 누구지", "이 책은 정말 유익할까", "왜 이런 결말일까", "이 인물은 왜 그랬지".',
    '2. 질문이 아니고, 책 속 문장/구절/인용/기억하고 싶은 문장을 옮기거나 공유하는 글이면 "quote"이다. 책 문장 뒤에 "라는 문장이 좋다", "이 문장이 남았다", "밑줄", "기억하고 싶다" 같은 짧은 감상이 붙어도 quote이다. 예: "작은 마음은 언제나 중요하다\\n\\n라는 문장이 너무 좋네요"는 quote이다.',
    '3. 위 둘이 아니면 모두 "impression"이다. impression은 나머지/기본 분류다.',
    '질문성과 감상이 섞이면 question을 우선한다.',
    '반드시 question, quote, impression 중 하나의 단어만 출력한다. 설명, 문장부호, JSON, markdown을 출력하지 않는다.',
  ].join(' ');

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

      if (request.method === 'GET' && url.pathname === '/v1/books/search') {
        return handleSearchBooks(request, env);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/v1/books/isbn/')) {
        return handleGetBookByIsbn(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/v1/ocr/reading-page') {
        return handleReadingPageOcr(request, env);
      }

      if (request.method === 'POST' && url.pathname.startsWith('/v1/posts/') && url.pathname.endsWith('/review')) {
        return handleReviewPost(request, env, ctx);
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

async function handleReadingPageOcr(request: Request, env: Env) {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    return json({ error: 'Unsupported content type' }, env, 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  const maxBytes = Number(env.OCR_MAX_BYTES || '5242880');

  if (contentLength > maxBytes) {
    return json({ error: 'Image too large' }, env, 413);
  }

  const imageBuffer = await request.arrayBuffer();

  if (imageBuffer.byteLength === 0) {
    return json({ error: 'Missing image body' }, env, 400);
  }

  if (imageBuffer.byteLength > maxBytes) {
    return json({ error: 'Image too large' }, env, 413);
  }

  const recognitionResult = await recognizeReadingPageText(env, imageBuffer, contentType);
  const lines = extractRecognizedReadingLines(recognitionResult.text);

  return json(
    {
      ok: true,
      source: recognitionResult.source,
      text: recognitionResult.text,
      lines,
    },
    env,
  );
}

async function handleReviewPost(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const postId = extractReviewPostId(url.pathname);

  if (!postId) {
    return json({ error: 'Invalid post id' }, env, 400);
  }

  const config = getSupabaseConfig(env);
  if (!config.url || !config.serviceRoleKey) {
    return json({ error: 'Post review is not configured' }, env, 503);
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return json({ error: 'Missing authorization token' }, env, 401);
  }

  const user = await getSupabaseUser(config, accessToken);
  if (!user?.id) {
    return json({ error: 'Invalid authorization token' }, env, 401);
  }

  const post = await fetchSupabasePost(config, postId);
  if (!post) {
    return json({ error: 'Post not found' }, env, 404);
  }

  if (post.author_id !== user.id) {
    return json({ error: 'Cannot review this post' }, env, 403);
  }

  ctx.waitUntil(reviewPostWithAi(env, config, postId));

  return json(
    {
      ok: true,
      postId,
      status: 'queued',
    },
    env,
    202,
  );
}

async function reviewPostWithAi(env: Env, config: SupabaseConfig, postId: string) {
  try {
    const post = await fetchSupabasePost(config, postId);
    if (!post) {
      return;
    }

    await patchSupabasePost(config, postId, {
      classification_status: 'pending',
      moderation_status: 'pending',
      visibility: 'pending',
      hidden_at: null,
    });

    const moderation = await moderateRoomPost(env, post);

    if (moderation.status !== 'approved') {
      await patchSupabasePost(config, postId, {
        classification_status: 'skipped',
        moderation_status: moderation.status,
        visibility: 'hidden',
        hidden_at: new Date().toISOString(),
        ai_reason: moderation.reason,
        reviewed_at: new Date().toISOString(),
      });
      return;
    }

    const classification = await classifyRoomPost(env, post);

    await patchSupabasePost(config, postId, {
      kind: classification.kind,
      classification_status: 'done',
      moderation_status: 'approved',
      visibility: 'public',
      hidden_at: null,
      ai_confidence: classification.confidence,
      ai_reason: classification.reason,
      reviewed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        action: 'post_ai_review_failed',
        postId,
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    try {
      await patchSupabasePost(config, postId, {
        classification_status: 'failed',
        moderation_status: 'failed',
        visibility: 'hidden',
        hidden_at: new Date().toISOString(),
        ai_reason: error instanceof Error ? error.message.slice(0, 500) : 'AI review failed',
        reviewed_at: new Date().toISOString(),
      });
    } catch (patchError) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          action: 'post_ai_review_failure_patch_failed',
          postId,
          message: patchError instanceof Error ? patchError.message : 'Unknown error',
        }),
      );
    }
  }
}

async function moderateRoomPost(env: Env, post: ReviewablePostRow) {
  const content = [
    post.body,
    post.chapter_label ? `Context label: ${post.chapter_label}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    max_tokens: 120,
    temperature: 0,
  });
  const text = extractAiText(result).trim();

  if (/^safe\b/i.test(text)) {
    return {
      status: 'approved' as const,
      reason: 'safe',
    };
  }

  if (/^unsafe\b/i.test(text) || /\bunsafe\b/i.test(text)) {
    return {
      status: 'needs_review' as const,
      reason: text.slice(0, 500) || 'unsafe',
    };
  }

  return {
    status: 'needs_review' as const,
    reason: text.slice(0, 500) || 'uncertain',
  };
}

async function classifyRoomPost(env: Env, post: ReviewablePostRow): Promise<AiClassification> {
  const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role: 'system',
        content: postClassificationSystemPrompt,
      },
      {
        role: 'user',
        content: [
          `"${post.body}" 라는 문장이 질문이면 "question", 인용/책 문장이면 "quote", 나머지는 "impression"으로 분류해줘.`,
          post.chapter_label ? `쪽/챕터/장면: ${post.chapter_label}` : '',
        ]
        .filter(Boolean)
        .join('\n'),
      },
    ],
    max_tokens: 180,
    temperature: 0,
  });
  const text = extractAiText(result);
  const kind = parseClassificationLabel(text);
  const confidence = kind ? 0.86 : 0.5;
  const reason = kind
    ? `AI label: ${kind}`
    : `AI label parse failed: ${text.slice(0, 300) || 'empty response'}`;

  return {
    kind: kind ?? 'impression',
    confidence,
    reason,
  };
}

async function recognizeReadingPageText(env: Env, imageBuffer: ArrayBuffer, contentType: string) {
  const naverOcrText = await recognizeReadingPageWithNaverOcr(env, imageBuffer, contentType);

  if (extractRecognizedReadingLines(naverOcrText).length > 0) {
    return {
      source: 'naver-clova-ocr',
      text: naverOcrText,
    };
  }

  const markdownText = await convertReadingPageToMarkdown(env, imageBuffer, contentType);

  if (containsHangul(markdownText) && extractRecognizedReadingLines(markdownText).length > 0) {
    return {
      source: 'workers-ai-markdown',
      text: markdownText,
    };
  }

  const image = Array.from(new Uint8Array(imageBuffer));

  try {
    const primaryResult = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image,
      max_tokens: 1400,
      prompt: readingPageOcrPrompt,
      temperature: 0,
    });

    return {
      source: 'workers-ai-vision',
      text: extractAiText(primaryResult),
    };
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        action: 'reading_page_ocr_primary_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );

    const fallbackResult = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image,
      max_tokens: 1200,
      prompt: readingPageOcrPrompt,
      temperature: 0.1,
    });

    return {
      source: 'workers-ai-llava',
      text: extractAiText(fallbackResult),
    };
  }
}

async function recognizeReadingPageWithNaverOcr(env: Env, imageBuffer: ArrayBuffer, contentType: string) {
  const config = getNaverOcrConfig(env);

  if (!config.invokeUrl || !config.secret) {
    return '';
  }

  try {
    const response = await fetch(config.invokeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-OCR-SECRET': config.secret,
      },
      body: JSON.stringify({
        images: [
          {
            data: arrayBufferToBase64(imageBuffer),
            format: getNaverOcrImageFormat(contentType),
            name: 'reading-page',
          },
        ],
        lang: 'ko',
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        version: 'V2',
      }),
    });

    if (!response.ok) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          action: 'naver_ocr_failed',
          status: response.status,
        }),
      );
      return '';
    }

    const payload = (await response.json()) as NaverOcrResponse;
    return extractNaverOcrLines(payload).join('\n');
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        action: 'naver_ocr_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
    return '';
  }
}

async function convertReadingPageToMarkdown(env: Env, imageBuffer: ArrayBuffer, contentType: string) {
  try {
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const result = await env.AI.toMarkdown({
      blob: new Blob([imageBuffer], { type: contentType }),
      name: `reading-page.${extension}`,
    });

    if (result.format === 'markdown') {
      return result.data.trim();
    }

    console.warn(
      JSON.stringify({
        level: 'warn',
        action: 'reading_page_markdown_failed',
        message: result.error,
      }),
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        action: 'reading_page_markdown_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }

  return '';
}

async function handleGetBookByIsbn(request: Request, env: Env) {
  const url = new URL(request.url);
  const isbn = normalizeIsbn(url.pathname.slice('/v1/books/isbn/'.length));
  const bookLookupConfig = getBookLookupConfig(env);

  if (!isbn || !isLikelyIsbn(isbn)) {
    return json({ error: 'Invalid ISBN' }, env, 400);
  }

  if ((!bookLookupConfig.naverClientId || !bookLookupConfig.naverClientSecret) && !bookLookupConfig.nlSeojiCertKey) {
    return json({ error: 'Book search is not configured' }, env, 500);
  }

  if (bookLookupConfig.naverClientId && bookLookupConfig.naverClientSecret) {
    try {
      const naverResult = await lookupNaverBookByIsbn(isbn, bookLookupConfig);

      if (naverResult.items.length > 0 || !bookLookupConfig.nlSeojiCertKey) {
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
      if (!bookLookupConfig.nlSeojiCertKey) {
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

  const seojiResult = await lookupSeojiBookByIsbn(isbn, bookLookupConfig);

  return json(
    {
      isbn,
      total: seojiResult.total,
      items: seojiResult.items,
    },
    env,
  );
}

async function handleSearchBooks(request: Request, env: Env) {
  const url = new URL(request.url);
  const query = normalizeBookSearchQuery(url.searchParams.get('query') ?? url.searchParams.get('q') ?? '');
  const display = parseBookSearchDisplay(url.searchParams.get('display'));
  const bookLookupConfig = getBookLookupConfig(env);

  if (query.length < 2) {
    return json({ error: 'Query must be at least 2 characters' }, env, 400);
  }

  if (
    (!bookLookupConfig.naverClientId || !bookLookupConfig.naverClientSecret) &&
    !bookLookupConfig.nlSeojiCertKey
  ) {
    return json({ error: 'Book search is not configured' }, env, 500);
  }

  if (bookLookupConfig.naverClientId && bookLookupConfig.naverClientSecret) {
    try {
      const naverResult = await lookupNaverBooksByTitle(query, bookLookupConfig, display);

      if (naverResult.items.length > 0 || !bookLookupConfig.nlSeojiCertKey) {
        return json(
          {
            query,
            total: naverResult.total,
            items: naverResult.items,
          },
          env,
        );
      }
    } catch (error) {
      if (!bookLookupConfig.nlSeojiCertKey) {
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

  try {
    const seojiResult = await lookupSeojiBooksByTitle(query, bookLookupConfig, display);

    return json(
      {
        query,
        total: seojiResult.total,
        items: seojiResult.items,
      },
      env,
    );
  } catch (error) {
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

async function lookupNaverBookByIsbn(isbn: string, config: BookLookupConfig) {
  if (!config.naverClientId || !config.naverClientSecret) {
    throw new Error('Naver book search is not configured');
  }

  const naverUrl = new URL('https://openapi.naver.com/v1/search/book_adv.json');
  naverUrl.searchParams.set('d_isbn', isbn);
  naverUrl.searchParams.set('start', '1');
  naverUrl.searchParams.set('display', '10');

  const response = await fetch(naverUrl.toString(), {
    headers: {
      'X-Naver-Client-Id': config.naverClientId,
      'X-Naver-Client-Secret': config.naverClientSecret,
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

async function lookupNaverBooksByTitle(title: string, config: BookLookupConfig, display: number) {
  if (!config.naverClientId || !config.naverClientSecret) {
    throw new Error('Naver book search is not configured');
  }

  const naverUrl = new URL('https://openapi.naver.com/v1/search/book_adv.json');
  naverUrl.searchParams.set('d_titl', title);
  naverUrl.searchParams.set('start', '1');
  naverUrl.searchParams.set('display', String(display));

  const response = await fetch(naverUrl.toString(), {
    headers: {
      'X-Naver-Client-Id': config.naverClientId,
      'X-Naver-Client-Secret': config.naverClientSecret,
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

async function lookupSeojiBookByIsbn(isbn: string, config: BookLookupConfig) {
  if (!config.nlSeojiCertKey) {
    return {
      total: 0,
      items: [],
    };
  }

  const seojiUrl = new URL('https://www.nl.go.kr/seoji/SearchApi.do');
  seojiUrl.searchParams.set('cert_key', config.nlSeojiCertKey);
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

async function lookupSeojiBooksByTitle(title: string, config: BookLookupConfig, display: number) {
  if (!config.nlSeojiCertKey) {
    return {
      total: 0,
      items: [],
    };
  }

  const seojiUrl = new URL('https://www.nl.go.kr/seoji/SearchApi.do');
  seojiUrl.searchParams.set('cert_key', config.nlSeojiCertKey);
  seojiUrl.searchParams.set('title', title);
  seojiUrl.searchParams.set('result_style', 'json');
  seojiUrl.searchParams.set('page_no', '1');
  seojiUrl.searchParams.set('page_size', String(display));

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

function getBookLookupConfig(env: Env): BookLookupConfig {
  const secretEnv = env as EnvWithSecrets;

  return {
    naverClientId: secretEnv.NAVER_CLIENT_ID,
    naverClientSecret: secretEnv.NAVER_CLIENT_SECRET,
    nlSeojiCertKey: secretEnv.NL_SEOJI_CERT_KEY,
  };
}

function getNaverOcrConfig(env: Env): NaverOcrConfig {
  const secretEnv = env as EnvWithSecrets;

  return {
    invokeUrl: secretEnv.NAVER_OCR_INVOKE_URL,
    secret: secretEnv.NAVER_OCR_SECRET,
  };
}

function getSupabaseConfig(env: Env): SupabaseConfig {
  const secretEnv = env as EnvWithSecrets;

  return {
    url: secretEnv.SUPABASE_URL,
    serviceRoleKey: secretEnv.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function extractReviewPostId(pathname: string) {
  const match = pathname.match(/^\/v1\/posts\/([0-9a-fA-F-]{36})\/review$/);
  return match?.[1] ?? null;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function getSupabaseUser(config: SupabaseConfig, accessToken: string) {
  if (!config.url || !config.serviceRoleKey) return null;

  const response = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SupabaseUserResponse;
}

async function fetchSupabasePost(config: SupabaseConfig, postId: string) {
  if (!config.url || !config.serviceRoleKey) return null;

  const url = new URL(`${config.url.replace(/\/$/, '')}/rest/v1/posts`);
  url.searchParams.set('id', `eq.${postId}`);
  url.searchParams.set(
    'select',
    'id,room_id,author_id,kind,body,quote_text,chapter_label,classification_status,moderation_status,visibility',
  );

  const response = await fetch(url.toString(), {
    headers: getSupabaseServiceHeaders(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Supabase post: ${response.status}`);
  }

  const rows = (await response.json()) as ReviewablePostRow[];
  return rows[0] ?? null;
}

async function patchSupabasePost(config: SupabaseConfig, postId: string, payload: Record<string, unknown>) {
  if (!config.url || !config.serviceRoleKey) return;

  const url = new URL(`${config.url.replace(/\/$/, '')}/rest/v1/posts`);
  url.searchParams.set('id', `eq.${postId}`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      ...getSupabaseServiceHeaders(config),
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update Supabase post: ${response.status}`);
  }
}

function getSupabaseServiceHeaders(config: SupabaseConfig) {
  return {
    accept: 'application/json',
    apikey: config.serviceRoleKey ?? '',
    authorization: `Bearer ${config.serviceRoleKey ?? ''}`,
  };
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

function normalizeBookSearchQuery(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function parseBookSearchDisplay(value: string | null) {
  if (!value) return 10;

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue)) return 10;

  return Math.min(Math.max(parsedValue, 1), 20);
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
    translator: extractBookTranslator(item),
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
    translator: extractBookTranslator(item),
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

function extractBookTranslator(item: object) {
  const record = item as Record<string, unknown>;
  const candidateKeys = [
    'translator',
    'translators',
    'translatorName',
    'translator_name',
    'TRANSLATOR',
    'TRANSLATORS',
    'TRANSLATOR_NAME',
    'TRANSLATOR_NM',
    'TRNSLATOR',
    'TRNSLATOR_NM',
    'TRSLTR',
    'TRSLTR_NM',
    '번역자',
    '옮긴이',
  ];

  for (const key of candidateKeys) {
    const translator = cleanBookTextValue(record[key]);
    if (translator) return translator;
  }

  return null;
}

function cleanBookTextValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const cleanedValue = cleanSeojiText(cleanNaverText(value));
    return cleanedValue || null;
  }

  if (Array.isArray(value)) {
    const cleanedValues = value.map(cleanBookTextValue).filter((item) => item !== null);
    return cleanedValues.length > 0 ? cleanedValues.join(', ') : null;
  }

  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>;
    const nestedKeys = ['name', 'NAME', 'nm', 'NM', 'text', 'TEXT', 'value', 'VALUE'];

    for (const key of nestedKeys) {
      const cleanedValue = cleanBookTextValue(record[key]);
      if (cleanedValue) return cleanedValue;
    }
  }

  return null;
}

function normalizeSeojiPublishedDate(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 8);
}

function parsePositiveInteger(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9]/g, ''));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractAiText(payload: { description?: string } | Record<string, unknown>) {
  const recordPayload: Record<string, unknown> = payload;

  if (typeof recordPayload.description === 'string') {
    return recordPayload.description.trim();
  }

  for (const key of ['response', 'text', 'result', 'output']) {
    const value = recordPayload[key];
    if (typeof value === 'string') {
      return value.trim();
    }
  }

  return '';
}

function extractRecognizedReadingLines(value: string): RecognizedReadingLine[] {
  const normalizedText = value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  if (!normalizedText) {
    return [];
  }

  const jsonLines = extractJsonLines(normalizedText);
  const rawLines = jsonLines.length > 0
    ? jsonLines
    : normalizedText.includes('\n')
    ? normalizedText.split('\n')
    : normalizedText.split(/(?<=[.!?。！？…다요죠까네군요])\s+/);
  const seen = new Set<string>();

  return rawLines
    .map((line) =>
      line
        .replace(/^[\s>*#\-–—•·\d.)\]]+/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => {
      if (line.length < 2) return false;
      if (/^(empty|string|none|null)$/i.test(line)) return false;
      if (/^(text|line|sentence)\s*\d*[:.)-]?$/i.test(line)) return false;
      if (/^(한국어\s*)?책\s*페이지를\s*읽고\s*있습니다\.?$/i.test(line)) return false;
      if (/^i am reading (a )?(korean )?book page\.?$/i.test(line)) return false;

      const dedupeKey = line.toLowerCase();
      if (seen.has(dedupeKey)) return false;

      seen.add(dedupeKey);
      return true;
    })
    .slice(0, 28)
    .map((text, index) => ({
      id: `line-${index + 1}`,
      text,
    }));
}

function extractNaverOcrLines(payload: NaverOcrResponse) {
  const lines: string[] = [];
  let currentLineParts: string[] = [];

  for (const image of payload.images ?? []) {
    for (const field of image.fields ?? []) {
      const text = field.inferText?.replace(/\s+/g, ' ').trim();
      if (!text) continue;

      currentLineParts.push(text);

      if (field.lineBreak) {
        lines.push(normalizeOcrLine(currentLineParts.join(' ')));
        currentLineParts = [];
      }
    }
  }

  if (currentLineParts.length > 0) {
    lines.push(normalizeOcrLine(currentLineParts.join(' ')));
  }

  return lines.filter(Boolean);
}

function normalizeOcrLine(value: string) {
  return value.replace(/\s+([,.:;!?])/g, '$1').trim();
}

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

function extractJsonLines(value: string): string[] {
  try {
    const parsedValue: unknown = JSON.parse(value);
    if (!isObjectRecord(parsedValue)) return [];

    const lines = parsedValue.lines;
    if (Array.isArray(lines)) {
      return lines.filter((line): line is string => typeof line === 'string');
    }

    const text = parsedValue.text;
    if (typeof text === 'string') {
      return text.split('\n');
    }
  } catch {
    return [];
  }

  return [];
}

function parseClassificationLabel(value: string): PostClassificationKind | null {
  const normalizedValue = value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/["'`.,:;!?()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const firstToken = normalizedValue.split(' ')[0];
  if (isPostClassificationKind(firstToken)) {
    return firstToken;
  }

  for (const label of ['question', 'quote', 'impression'] as const) {
    if (normalizedValue.includes(label)) {
      return label;
    }
  }

  return null;
}

function isPostClassificationKind(value: unknown): value is PostClassificationKind {
  return value === 'impression' || value === 'quote' || value === 'question';
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNaverOcrImageFormat(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}
