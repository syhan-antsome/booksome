import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export function PageShell({ children, active, stickyHeader = false }: { children: ReactNode; active?: 'books' | 'rooms' | 'about'; stickyHeader?: boolean }) {
  return (
    <div className="page-shell">
      <SiteHeader active={active} sticky={stickyHeader} />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}
