import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-page" id="main-content">
      <BrandLogo />
      <section>
        <div className="auth-page__intro"><h1>{title}</h1><p>{description}</p></div>
        <div className="auth-page__form">{children}</div>
      </section>
      <Link className="auth-page__back" href="/">← 홈으로</Link>
    </main>
  );
}
