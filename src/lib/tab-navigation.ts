export const tabOrder = ['today', 'library', 'record', 'rooms', 'profile'] as const;
export type BottomNavKey = typeof tabOrder[number];
export const tabPaths = ['/', '/library', '/record', '/rooms', '/profile'] as const;

export function tabForPath(path: string): BottomNavKey | undefined {
  const normalized = path === '/' ? '/' : path.replace(/\/$/, '');
  const index = tabPaths.findIndex(item => item === normalized);
  return index < 0 ? undefined : tabOrder[index];
}

export function tabSlideDirection(from: BottomNavKey, to: BottomNavKey): 'left' | 'right' | 'none' {
  const difference = tabOrder.indexOf(to) - tabOrder.indexOf(from);
  return difference > 0 ? 'right' : difference < 0 ? 'left' : 'none';
}

export function tabSlideOffset(direction: unknown, width: number, reduceMotion: boolean) {
  if (reduceMotion) return 0;
  return direction === 'right' ? width : direction === 'left' ? -width : 0;
}
