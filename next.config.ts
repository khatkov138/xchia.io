import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['chia-wallet-lib', 'clvm-lib', 'chia-bls'],

  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,

  experimental: {
    agentFeedback: true,
  },

  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.cloudflareinsights.com https://*.googletagmanager.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://*.google-analytics.com https://*.googletagmanager.com;
      font-src 'self';
      connect-src 'self' ${isDev ? 'http://localhost:3000 ws://localhost:3000' : ''} https://coinset.org https://*.coinset.org https://xchia.io https://*.xchia.io https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      ${isDev ? '' : 'upgrade-insecure-requests;'}
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/((?!api|ws|_next/static|_next/image|favicon.ico).*)*',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ],
      },
    ];
  },
};

export default nextConfig;
