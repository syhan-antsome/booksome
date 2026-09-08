import Image from 'next/image';

type BookCoverProps = {
  src?: string | null;
  title: string;
  className?: string;
};

export function BookCover({ src, title, className = '' }: BookCoverProps) {
  if (src) {
    return (
      <span className={`book-cover book-cover--image ${className}`}>
        <Image alt={`${title} 표지`} className="book-cover__image" fill sizes="(max-width: 640px) 32vw, 230px" src={src} unoptimized />
      </span>
    );
  }

  return (
    <div aria-label={`${title} 표지 없음`} className={`book-cover book-cover--empty ${className}`} role="img">
      <span>{title}</span>
    </div>
  );
}
