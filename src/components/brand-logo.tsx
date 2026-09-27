import { Image } from 'react-native';
const wordmark = require('../../assets/booksome-wordmark.png');
export function BrandLogo({ width = 162 }: { width?: number }) {
  return <Image accessibilityLabel="북썸 BookSome" source={wordmark} resizeMode="contain" style={{ width, height: width * 312 / 1996 }} />;
}
