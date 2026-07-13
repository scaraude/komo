import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'macbook-pro-de-ludovic.angora-hadar.ts.net',
    'scaraude-g3.angora-hadar.ts.net',
  ],
  experimental: {
    serverActions: {
      // Défaut Next = 1 Mo, trop bas pour un upload de photo (avatar
      // recadré/compressé côté client, mais on garde une marge de sécurité).
      bodySizeLimit: '5mb',
    },
  },
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
