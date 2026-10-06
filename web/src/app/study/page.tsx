import type { Metadata } from 'next';
import { VirtualStudy } from '@/components/study/virtual-study';

export const metadata: Metadata = { title: '가상 서재 미리보기', robots: { index: false, follow: false } };
export default function StudyPage() { return <VirtualStudy />; }
