import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// The pure helper has type-only imports. Transpile for the project's Node 20+
// runtime without adding another test runner or changing production output.
const source = await readFile(new URL('../src/lib/reading-memory.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { readingMemory, readingNoteText } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('photo annotations show only the reader text, never stored geometry', () => {
  assert.equal(readingNoteText({ body: '__booksome_highlight_v2__:{"text":" 나의 생각 ","strokes":[1,2]}' }), '나의 생각');
  assert.equal(readingNoteText({ body: '__booksome_highlight_v1__:{"rects":[1,2]}' }), '');
  assert.equal(readingNoteText({ body: '__booksome_highlight_v2__:invalid-json' }), '');
});

test('quotes and ordinary prose remain intact', () => {
  assert.equal(readingNoteText({ quoteText: ' 책의 문장 ', body: '나의 감상' }), '책의 문장');
  assert.equal(readingNoteText({ body: '나의 감상' }), '나의 감상');
  assert.equal(readingNoteText({ body: null }), '');
});

test('recap counts real records and excludes automatic checkpoints from passages', () => {
  const notes = [
    { id: 'later', kind: 'quote', body: '나중의 생각', createdAt: '2026-09-22T12:00:00Z', visibility: 'private' },
    { id: 'checkpoint', kind: 'quote', body: '오늘은 여기까지 읽었어요.', createdAt: '2026-09-22T11:00:00Z' },
    { id: 'earlier', kind: 'photo', body: '__booksome_highlight_v2__:{"text":"처음의 생각"}', createdAt: '2026-09-21T12:00:00Z' },
  ];
  const before = JSON.stringify(notes);
  const recap = readingMemory(notes);
  assert.equal(recap.noteCount, 3);
  assert.equal(recap.photoCount, 1);
  assert.deepEqual(recap.passages.map(note => note.id), ['earlier', 'later']);
  assert.equal(JSON.stringify(notes), before, 'recap does not reorder or alter privacy of source records');
});

test('a book without notes has an empty recap, not fabricated passages', () => {
  assert.deepEqual(readingMemory([]), { noteCount: 0, photoCount: 0, passages: [] });
});

test('web API forwarding preserves Authorization from Headers objects', async () => {
  const apiSource = await readFile(new URL('../web/src/lib/api.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { apiFetch } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (_url, init) => { forwarded = init; return new Response('[]'); };
  try {
    await apiFetch('/api/reading-life/books', { headers: new Headers({ Authorization: 'Bearer regression-test' }), cache: 'no-store' });
    assert.equal(forwarded.headers.get('Authorization'), 'Bearer regression-test');
    assert.equal(forwarded.headers.get('Accept'), 'application/json');
    assert.equal(forwarded.cache, 'no-store');
  } finally { globalThis.fetch = originalFetch; }
});
