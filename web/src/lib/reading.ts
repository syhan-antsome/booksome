export type ReadingBook = { id: string; profileId: string; isbn13: string | null; title: string; author: string; publisher: string | null; publishedDate: string | null; description: string | null; externalCoverUrl: string | null; status: 'reading' | 'finished'; currentPage: number; totalPages: number | null; progressPercent: number; pinnedAt: string | null; visibility: string; createdAt: string; updatedAt: string };
export type ReadingNote = { id: string; readingBookId: string; kind: 'quote' | 'photo'; quoteText: string | null; body: string | null; pageLabel: string | null; currentPageSnapshot: number; progressPercentSnapshot: number; totalPagesSnapshot: number | null; mediaPath: string | null; mediaUrl: string | null; visibility: string; createdAt: string; updatedAt: string };

export function normalizeIsbn(value: string) { return value.replace(/[-\s]/g, '').toUpperCase(); }
export function validIsbn(value: string) { return /^(97[89]\d{10}|\d{9}[\dX])$/.test(normalizeIsbn(value)); }
export function readingPosition(page: string, total: string) {
  const currentPage = Number(page);
  const totalPages = total.trim() ? Number(total) : null;
  if (!page.trim() || !Number.isSafeInteger(currentPage) || currentPage < 0 || (totalPages !== null && (!Number.isSafeInteger(totalPages) || totalPages <= 0 || currentPage > totalPages))) throw new Error('읽은 쪽수와 전체 쪽수를 확인해주세요. 전체 쪽수는 비워둘 수 있어요.');
  return { currentPage, totalPages, progressPercent: totalPages ? Math.round(currentPage / totalPages * 100) : 0, updateTotalPages: true };
}
export function noteBody(value: string | null) {
  const body = value?.trim() ?? '';
  if (!body.startsWith('__booksome_highlight_')) return body;
  try { const data = JSON.parse(body.slice(body.indexOf(':') + 1)) as { text?: unknown }; return typeof data.text === 'string' ? data.text.trim() : ''; } catch { return ''; }
}
export function editedNoteBody(original: string | null, text: string) {
  if (!original?.startsWith('__booksome_highlight_')) return text.trim() || null;
  const divider = original.indexOf(':');
  try { const data = JSON.parse(original.slice(divider + 1)); return original.slice(0, divider + 1) + JSON.stringify({ ...data, text: text.trim() || null }); } catch { throw new Error('이 사진 기록의 원본 형식을 확인하지 못했어요.'); }
}
export function noteImage(note: ReadingNote) {
  if (note.mediaPath) return '/api/reader/media/' + note.mediaPath.split('/').map(encodeURIComponent).join('/');
  return note.mediaUrl && /^https?:\/\//.test(note.mediaUrl) ? note.mediaUrl : null;
}
