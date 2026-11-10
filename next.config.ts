import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['chia-wallet-lib', 'clvm-lib', 'chia-bls'],
  
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // 🎯 ШАГ 1: НАСТРОЙКА БРОНИ И ИСКЛЮЧЕНИЙ ДЛЯ МАТЧЕРА
  async headers() {
    // Разрешаем 'self' и порты локального питона для сокетов, чтобы браузер не ругался
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data:;
      font-src 'self';
      connect-src 'self' ws: wss: localhost:8000 ws://localhost:8000 wss://localhost:8000;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        // 🎯 ФИКС: Добавили |ws в регулярку, чтобы Next.js полностью игнорировал путь сокетов и не зацикливал редирект!
        source: '/((?!api|ws).*)*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
