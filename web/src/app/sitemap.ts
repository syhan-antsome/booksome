import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://booksome.top';
  return ['/', '/books', '/rooms', '/about', '/terms', '/privacy'].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7
  }));
}
