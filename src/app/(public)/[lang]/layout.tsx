import { notFound } from 'next/navigation'
import { SUPPORTED_LANGUAGES, isSupportedLanguage, WalletLanguage } from '@/config/i18n'
import type { Metadata } from "next"

// ⚡ ОТКЛЮЧАЕМ INSTANT-ВАЛИДАЦИЮ ДЛЯ ЭТОГО СЕГМЕНТА В NEXT.JS 16
export const instant = false

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }))
}

// 🌐 ДОБАВЛЯЕМ СЕРВЕРНУЮ ГЕНЕРАЦИЮ МЕТАДАННЫХ ДЛЯ ВСЕЙ ПАБЛИК-ЗОНЫ
export async function generateMetadata({ params }: Omit<LangLayoutProps, 'children'>): Promise<Metadata> {
  const { lang } = await params
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"

  const title = isRu 
    ? "XCHIA — Безопасный веб-кошелек и эксплорер нового поколения для Chia (XCH)"
    : "XCHIA — Secure Next-Gen Web Wallet & Explorer for Chia (XCH)"

  const description = isRu
    ? "Премиальный некастодиальный real-time кошелек для Chia Network в вашем браузере. 100% Open Source, локальное шифрование ключей."
    : "Premium non-custodial real-time web wallet and explorer for Chia Network in your browser. 100% Open Source."

  const APP_URL = "https://xchia.io"

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${currentLang}`,
      languages: {
        "en": `${APP_URL}/en`,
        "ru": `${APP_URL}/ru`,
        "x-default": `${APP_URL}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${currentLang}`,
      siteName: "XCHIA",
      locale: isRu ? "ru_RU" : "en_US",
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  }
}

interface LangLayoutProps {
  children: React.ReactNode
  params: Promise<{ lang: string }> 
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  // Дожидаемся разрешения параметров, как требует спецификация Next.js 16
  const { lang } = await params

  // Если префикс в URL левый (например, /fr/explorer) — отдаем 404
  if (!isSupportedLanguage(lang)) {
    notFound()
  }

  return <>{children}</>
}
