import type { Metadata } from 'next';
import { Noto_Serif_KR } from 'next/font/google';
import type { ReactNode } from 'react';
import '@/app/globals.css';

const notoSerifKr = Noto_Serif_KR({
  display: 'swap',
  preload: false,
  variable: '--font-noto-serif-kr'
});

export const metadata: Metadata = {
  metadataBase: new URL('https://booksome.top'),
  title: {
    default: 'BookSome — 읽은 책이, 나의 시간이 되도록',
    template: '%s | BookSome'
  },
  description: '책을 등록하고 읽은 페이지, 문장과 생각을 기록하는 개인 독서 기록 서비스 BookSome.',
  openGraph: {
    title: 'BookSome',
    description: '읽은 책이, 나의 시간이 되도록',
    locale: 'ko_KR',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={notoSerifKr.variable}
      data-scroll-behavior="smooth"
      lang="ko"
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
