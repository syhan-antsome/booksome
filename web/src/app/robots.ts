import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/app/', '/login', '/signup', '/password-reset', '/me']
    },
    sitemap: 'https://booksome.top/sitemap.xml'
  };
}
