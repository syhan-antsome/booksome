import type { Metadata } from 'next';
import { connection } from 'next/server';
import { VirtualStudy } from '@/components/study/virtual-study';

export const metadata: Metadata = { title: '내 입체 서재', robots: { index: false, follow: false } };
export default async function StudyPage() { await connection();return <VirtualStudy />; }
