import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/providers/Providers"; 

import "./globals.css";
import { AlphaBanner } from "@/components/AlphaBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// 1. Оставляем здесь только общие технические метаданные.
// Базовые Title и Description отсюда удаляем — их переопределят внутренние зоны.
export const metadata: Metadata = {
  metadataBase: new URL("https://xchia.io"),
  authors: [{ name: "XCHIA Team" }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  // 🎯 Свойство icons удалено. Next.js автоматически подцепит динамическую 
  // изумрудную иконку из файла src/app/icon.tsx и сгенерирует ссылки сам.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white font-sans select-none">
       {/* 🚀 Глобальный провайдер кэша TanStack Query */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
