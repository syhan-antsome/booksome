import Image from 'next/image';
import Link from 'next/link';

export function BrandLogo() {
  return <Link className="wordmark" href="/" aria-label="북썸 BookSome 홈"><Image src="/images/booksome-wordmark.png" alt="booksome" width={2000} height={310} sizes="(max-width: 760px) 175px, 270px" priority /></Link>;
}
