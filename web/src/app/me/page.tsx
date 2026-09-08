import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account-panel';
import { PageShell } from '@/components/page-shell';

export const metadata: Metadata = { title: '내 서재', robots: { index: false, follow: false } };

export default function MePage() {
  return <PageShell><AccountPanel /></PageShell>;
}
