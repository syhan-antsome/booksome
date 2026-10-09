'use client';

import Image from 'next/image';
import { useState } from 'react';

type BookCoverProps = {
  src?: string | null;
  title: string;
  className?: string;
  loading?: 'eager' | 'lazy';
};

export function BookCover({ src, title, className = '', loading = 'lazy' }: BookCoverProps) {
  const [failed, setFailed] = useState<string | null>(null);
  if (src && src !== failed) {
    return (
      <span className={`book-cover book-cover--image ${className}`}>
        <Image alt={`${title} 표지`} className="book-cover__image" fill sizes="(max-width: 640px) 32vw, 230px" src={src} loading={loading} unoptimized onError={() => setFailed(src)} />
      </span>
    );
  }

  return (
    <div aria-label={`${title} 표지 없음`} className={`book-cover book-cover--empty ${className}`} role="img">
      <span>{title}</span>
    </div>
  );
}
