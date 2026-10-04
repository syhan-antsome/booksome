import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { PortalSession } from '@/components/portal-session';
import '@/app/globals.css';

const pretendard = localFont({ src: '../fonts/PretendardVariable.woff2', weight: '100 900', variable: '--font-pretendard', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL('https://booksome.top'),
  title: {
    default: '북썸 BookSome — 읽는 즐거움, 쌓이는 나의 이야기',
    template: '%s | 북썸 BookSome'
  },
  description: '책을 찾고 내 서재에 담아 읽은 페이지, 문장과 생각을 기록하세요. 개인 기록은 나만 간직하고, 책 이야기에서 다른 독자와 대화하는 북썸 BookSome.',
  openGraph: {
    title: '북썸 BookSome',
    description: '읽는 즐거움, 쌓이는 나의 이야기',
    siteName: '북썸 BookSome',
    images: [{ url: '/images/reading-table-coral.webp', width: 1280, height: 1280, alt: '책과 문장, 나의 생각이 쌓이는 북썸' }],
    locale: 'ko_KR',
    type: 'website'
  },
  twitter: { card: 'summary_large_image' }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={pretendard.variable}
      data-scroll-behavior="smooth"
      lang="ko"
    >
      <body><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><PortalSession>{children}</PortalSession></body>
    </html>
  );
}
