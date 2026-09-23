import type { ReadingLifeNote } from '../services/reading-life';

// Photo annotations are stored in the body alongside the reader's actual text.
// Lists and recaps must never display the annotation payload as prose.
export function readingNoteText(note: Pick<ReadingLifeNote, 'body' | 'quoteText'>): string {
  if (note.quoteText?.trim()) return note.quoteText.trim();
  return readingNoteBody(note.body);
}

export function readingNoteBody(value: string | null | undefined): string {
  const body = value?.trim() ?? '';
  if (!body.startsWith('__booksome_highlight_')) return body;
  const separator = body.indexOf(':');
  if (separator < 0) return '';
  try {
    const payload = JSON.parse(body.slice(separator + 1)) as { text?: unknown };
    return typeof payload.text === 'string' ? payload.text.trim() : '';
  } catch {
    return '';
  }
}

export function readingMemory(notes: ReadingLifeNote[]) {
  const ordered = [...notes].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return {
    noteCount: notes.length,
    photoCount: notes.filter(note => note.kind === 'photo').length,
    passages: ordered.filter(note => {
      const text = readingNoteText(note);
      return text && text !== '오늘은 여기까지 읽었어요.';
    }),
  };
}
