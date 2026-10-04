import type { MetadataRoute } from 'next';
import { getRooms } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://booksome.top';
  const rooms = await getRooms();
  return [...['/', '/books', '/rooms', '/about', '/terms', '/privacy'].map<MetadataRoute.Sitemap[number]>((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7
  })), ...(rooms.data ?? []).map(room => ({ url: `${baseUrl}/rooms/${encodeURIComponent(room.slug)}`, changeFrequency: 'weekly' as const, priority: 0.6 }))];
}
