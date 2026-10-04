import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/reading-shuttle.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { pageFromDrag, parseReadingPosition, clampReadingPage } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
test('left advances and right goes back while staying inside the book', () => {
  assert.equal(pageFromDrag(128, -72, 216), 152);
  assert.equal(pageFromDrag(128, 72, 216), 104);
  assert.equal(pageFromDrag(10, 1000, 216), 0);
  assert.equal(pageFromDrag(210, -1000, 216), 216);
});
test('unknown total allows recording pages without inventing a book length', () => {
  assert.deepEqual(parseReadingPosition('152', ''), { currentPage: 152, totalPages: null });
  assert.equal(clampReadingPage(1234, null), 1234);
});
test('direct input rejects non-integers and impossible positions', () => {
  for (const [page, total] of [['', ''], ['-1', '100'], ['1.5', '100'], ['1e2', '200'], ['101', '100'], ['0', '0']]) assert.ok(parseReadingPosition(page, total).error);
  assert.deepEqual(parseReadingPosition('0', '200'), { currentPage: 0, totalPages: 200 });
});
