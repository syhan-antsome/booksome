import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: '내 서재', robots: { index: false, follow: false } };

export default function MePage() {
  redirect('/library');
}
