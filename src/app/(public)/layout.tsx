import React, { use } from "react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Background } from "@/components/Background"
import { UserSettingsContextProvider } from "@/providers/UserSettnigsProvider"
import { getServerSettings } from "@/lib/utils/server-utils"
import type { Metadata } from "next"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"

// ⚡ ДЛЯ NEXT.JS 16+: Отключаем ворнинги валидатора Instant Navigation для этой зоны.
// Это позволяет спокойно использовать async/await для кук прямо на сервере.
export const instant = false

interface PublicLayoutProps {
  children: React.ReactNode
  params: Promise<{ lang?: string }>
}

// 🌐 ДОБАВЛЯЕМ ДИНАМИЧЕСКИЕ МЕТАДАННЫЕ ДЛЯ ЗОНЫ ЭКСПЛОРЕРА И ЛЕНДИНГА
export async function generateMetadata({ params }: Omit<PublicLayoutProps, 'children'>): Promise<Metadata> {
  const resolvedParams = await params
  
  // 🛡️ Если lang undefined, передаем строку "en" по умолчанию для валидатора типов
  const lang = resolvedParams?.lang || "en"
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"

  const title = isRu 
    ? "XCHIA — Безопасный веб-кошелек и эксплорер нового поколения для Chia (XCH)"
    : "XCHIA — Secure Next-Gen Web Wallet & Explorer for Chia (XCH)"

  const description = isRu
    ? "Премиальный некастодиальный real-time кошелек для Chia Network в вашем браузере. 100% Open Source, локальное шифрование ключей без скачивания тяжелых программ."
    : "Premium non-custodial real-time web wallet and explorer for Chia Network in your browser. 100% Open Source, local key encryption."

  const APP_URL = "https://xchia.io"

  return {
    title,
    description,
    keywords: isRu 
      ? ["Chia Network", "XCH", "Chia кошелек", "XCHIA", "веб кошелек", "некастодиальный", "криптокошелек", "эксплорер Chia"]
      : ["Chia Network", "XCH", "Chia wallet", "XCHIA", "web wallet", "non-custodial", "crypto wallet", "Chia explorer"],
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
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "XCHIA Layout" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  }
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  // Безопасно вытаскиваем язык из URL (Next.js 16 стайл)
  const resolvedParams = await params
  const lang = resolvedParams?.lang || "en"
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"

  // 🎯 Железно дожидаемся реальных кук пользователя на сервере
  const serverSettings = await getServerSettings()

  return (
    // 📦 Оборачиваем весь публичный макет в контекст с реальными данными из кук
    <UserSettingsContextProvider serverSettings={serverSettings}>
      {/* 🎯 Динамически проставляем lang для корректного SEO и работы экранных дикторов */}
      <div 
        lang={currentLang} 
        className="relative min-h-screen w-full bg-zinc-950 flex flex-col justify-between z-0"
      >
        
        {/* 🌌 Железный фон кошелька */}
        <div className="fixed inset-0 w-screen h-screen z-[-1] overflow-hidden pointer-events-none">
          <Background />
        </div>

        {/* Container хедера и контента (остается аккуратным max-w-6xl) */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-between relative z-10">
          
          {/* Хедер сверху */}
          <div className="w-full pt-4 relative z-50">
            <Header currentLang={currentLang} />
          </div>

          {/* 🎯 Основной контент */}
          <main className="w-full flex-1 flex flex-col justify-center py-6 animate-in fade-in duration-300">
            {children}
          </main>
          
        </div>

        {/* 🚀 ПОЛНОЭКРАННЫЙ ФУТЕР */}
        <div className="w-full border-t border-zinc-900/45 bg-transparent relative z-10 mt-auto">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-6">
            <Footer currentLang={currentLang} />
          </div>
        </div>
        
      </div>
    </UserSettingsContextProvider>
  )
}
