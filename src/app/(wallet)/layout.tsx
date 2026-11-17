import React from "react"
import type { Metadata } from "next"
import { Background } from "@/components/Background"
import { UserSettingsContextProvider } from "@/providers/UserSettnigsProvider"
import { getServerSettings } from "@/lib/utils/server-utils"
import Header from "@/components/Header"
import { Footer } from "@/components/Footer"

// ⚡ ДЛЯ NEXT.JS 16+: Это единственный легальный флаг, который нам нужен.
// Он отключает валидацию Instant Navigation для зоны кошелька, разрешая асинхронный кук-авейт.
export const instant = false

// 🛡️ ЖЕЛЕЗНО ЗАКРЫВАЕМ ВСЮ ЗОНУ КОШЕЛЬКА ОТ ИНДЕКСАЦИИ ПОИСКОВИКАМИ
export const metadata: Metadata = {
  title: "XCHIA Web Wallet — Dashboard",
  description: "Приватная зона веб-кошелька XCHIA.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

interface LayoutProps {
  children: React.ReactNode
}

export default async function WalletLayout({ children }: LayoutProps) {
  // 🎯 Спокойно дожидаемся кук на сервере. Валидатор Next.js ругаться не будет благодаря флагу выше.
  const serverSettings = await getServerSettings()

  return (
    <UserSettingsContextProvider serverSettings={serverSettings}>
      <div className="relative min-h-screen w-full bg-zinc-950 flex flex-col justify-between z-0">
        
        {/* 🌌 ЕДИНЫЙ ЖЕЛЕЗНЫЙ ФОН НА ВСЕ ПРИЛОЖЕНИЕ КОШЕЛЬКА */}
        <div className="fixed inset-0 w-screen h-screen z-[-1] overflow-hidden pointer-events-none">
          <Background />
        </div>

        {/* Контентная область кошелька в строгих рамках max-w-md */}
        <div className="w-full max-w-md mx-auto px-6 py-10 flex-1 flex flex-col justify-between relative z-10">
          <div className="w-full space-y-6">
            
            {/* 🎯 ВЕРХНИЙ МОНОЛИТ: Шапка переключена в режим кошелька */}
            <Header variant="wallet" />

            {/* Динамический контент страниц кошелька */}
            <main className="w-full animate-in fade-in duration-300">
              {children}
            </main>
          </div>

          {/* 🎯 НИЖНИЙ МОНОЛИТ: Ультра-плотный футер кошелька */}
          <Footer variant="wallet" />
        </div>

      </div>
    </UserSettingsContextProvider>
  )
}
