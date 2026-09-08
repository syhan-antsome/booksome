import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </main>
  );
}
