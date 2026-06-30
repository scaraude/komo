import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'macbook-pro-de-ludovic.angora-hadar.ts.net',
    'scaraude-g3.angora-hadar.ts.net',
  ],
  async headers() {
    return [
      {
        // Le service worker ne doit jamais être mis en cache : les users
        // récupèrent toujours la dernière version (cf. guide PWA Next.js).
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
