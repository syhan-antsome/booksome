import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/tab-navigation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { tabSlideDirection, tabSlideOffset, tabForPath } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

test('menu order controls both adjacent and distant tab changes', () => {
  assert.equal(tabSlideDirection('library', 'rooms'), 'right');
  assert.equal(tabSlideDirection('library', 'profile'), 'right');
  assert.equal(tabSlideDirection('profile', 'rooms'), 'left');
  assert.equal(tabSlideDirection('rooms', 'library'), 'left');
  assert.equal(tabSlideDirection('library', 'library'), 'none');
});
test('entry position comes from the correct edge and respects reduced motion', () => {
  assert.equal(tabSlideOffset('right', 390, false), 390);
  assert.equal(tabSlideOffset('left', 390, false), -390);
  assert.equal(tabSlideOffset('left', 390, true), 0);
  assert.equal(tabSlideOffset(undefined, 390, false), 0);
});
test('only main menu routes show the shared navigation', () => {
  assert.equal(tabForPath('/'), 'library');
  assert.equal(tabForPath('/library'), 'library');
  assert.equal(tabForPath('/record'), undefined);
  assert.equal(tabForPath('/rooms/'), 'rooms');
  assert.equal(tabForPath('/profile'), 'profile');
  assert.equal(tabForPath('/reading-life/book-1'), undefined);
  assert.equal(tabForPath('/books/add'), undefined);
});
