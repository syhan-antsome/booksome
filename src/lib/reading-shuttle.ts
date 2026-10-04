export const MAX_READING_PAGE = 999999;
export function clampReadingPage(page: number, total: number | null) {
  return Math.min(total ?? MAX_READING_PAGE, Math.max(0, Math.round(page)));
}
export function pageFromDrag(start: number, distance: number, total: number | null) {
  // The ruler moves with the finger beneath a fixed marker:
  // dragging left advances through the book; dragging right goes back.
  return clampReadingPage(start - distance / 3, total);
}
export function parseReadingPosition(page: string, total: string): { error: string } | { currentPage: number; totalPages: number | null } {
  if (!/^\d{1,6}$/.test(page.trim()) || (total.trim() && !/^\d{1,6}$/.test(total.trim()))) {
    return { error: '페이지는 0 이상의 정수로 입력해주세요.' } as const;
  }
  const currentPage = Number(page);
  const totalPages = total.trim() ? Number(total) : null;
  if (totalPages !== null && totalPages < 1) return { error: '전체 페이지는 1 이상으로 입력해주세요.' } as const;
  if (totalPages !== null && currentPage > totalPages) return { error: '읽은 페이지가 전체 페이지보다 많아요.' } as const;
  return { currentPage, totalPages } as const;
}
