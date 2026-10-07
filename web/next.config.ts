import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  turbopack: {
    root: process.cwd()
  },
  async rewrites() {
    // Real assets win; only reader routes fall back to the Expo SPA shell.
    return { fallback: [{ source: '/app/:path*', destination: '/app/index.html' }] };
  },
  async headers() {
    return [
      { source: '/library/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/study', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/app/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-cache' }] },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Accel-Buffering', value: 'no' }
        ]
      }
    ];
  }
};

export default nextConfig;
