// Only local portal/reader destinations are allowed after authentication.
export function safeNextPath(value?: string, fallback = '/') {
  if (!value) return fallback;
  if (value === '/me') return '/library';
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const destination = new URL(value, 'https://booksome.top');
    if (destination.origin !== 'https://booksome.top') return fallback;
    // Older portal participation links must return to the portal, not the Expo document.
    const legacyRoom = destination.pathname.match(/^\/app\/room\/([^/]+)\/?$/);
    if (legacyRoom) return `/rooms/${legacyRoom[1]}?participate=1#discussion-compose`;
    if (/^\/app\/rooms\/?$/.test(destination.pathname)) return '/rooms';
    if (/^\/app\/(library|reading-life|record)\/?$/.test(destination.pathname) || destination.pathname === '/app/') return '/library';
    if (/^\/app\/books\/add\/?$/.test(destination.pathname)) return `/library/add${destination.search}`;
    const legacyBook = destination.pathname.match(/^\/app\/reading-life\/([^/]+)\/?$/);
    if (legacyBook) return `/library/${legacyBook[1]}${destination.search}`;
    return /^\/(library(?:\/|$)|rooms(?:\/|$)|books$|about$|terms$|privacy$|$)/.test(destination.pathname) ? value : fallback;
  } catch { return fallback; }
}

export function conversationPath(slug: string) {
  return `/rooms/${encodeURIComponent(slug)}?participate=1#discussion-compose`;
}

export function authHref(mode: 'login' | 'signup', next: string) {
  return `/${mode}?next=${encodeURIComponent(safeNextPath(next))}`;
}
