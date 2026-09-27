export const booksomeColors = {
  background: '#FAF9F7',
  surface: '#FFFFFF',
  accent: '#E75B40',
  action: '#C84932',
  accentSoft: '#FFE8DF',
  ink: '#262526',
  muted: '#77716D',
  line: '#E9E5E1',
  subtle: '#F0EDEA',
  danger: '#BB3434',
  success: '#39755B',
  // Compatibility names for existing feature surfaces; all share this palette.
  paper: '#FAF9F7',
  paperStrong: '#FFFFFF',
  forest: '#C84932',
  cloth: '#262526',
  forestSoft: '#FFE8DF',
  ochre: '#BD4A31',
  ochreSoft: '#FFF0E8',
  white: '#FFFFFF',
} as const;

export const booksomeLayout = {
  maxContentWidth: 480,
  pageGutter: 24,
  bottomNavSpace: 104,
} as const;

export const booksomeType = { serif: 'NotoSerifKR_500Medium' } as const;

export const booksomeRadius = { input: 16, panel: 24, button: 30 } as const;
