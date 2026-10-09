import type { CSSProperties } from 'react';

const paths = {
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M6 10h12v11H6zM12 14v3',
  notebook: 'M6 3h14v18H6zM3 7h5M3 12h5M3 17h5M11 8h5M11 12h5',
  book: 'M12 5C8 2 4 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-2-1-6-2-10 1v16',
  quote: 'M4 6h6v7H5c0 3 1 4 4 5M14 6h6v7h-5c0 3 1 4 4 5',
  photo: 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M16 8h.01',
  pen: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z',
  info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  heart: 'M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-6 4 0 11 8 17 8-6 14-13 8-17Z',
  comment: 'M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z',
} as const;
export function ReadingIcon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}
