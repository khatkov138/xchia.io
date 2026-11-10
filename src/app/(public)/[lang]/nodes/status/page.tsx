import React from "react"
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSupportedLanguage, WalletLanguage } from '@/config/i18n'
import ExplorerStatus from './ExplorerStatus'

interface NodesStatusPageProps {
  params: Promise<{ lang: string }>
}

export const instant = false

// 🌐 ДИНАМИЧЕСКИЕ МЕТАДАННЫЕ ДЛЯ СТРАНИЦЫ СТАТУСА НОД
export async function generateMetadata({ params }: NodesStatusPageProps): Promise<Metadata> {
  const { lang } = await params
  
  // Валидируем локаль для безопасной типизации
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"

  const title = isRu 
    ? "Статус сети и нод Chia | XCHIA Explorer"
    : "Chia Network & Node Status | XCHIA Explorer"

  const description = isRu
    ? "Мониторинг высоты блоков, статуса синхронизации и доступности нод в сети Chia Network в реальном времени."
    : "Real-time monitoring of block height, synchronization status, and node availability across the Chia Network."

  const APP_URL = "https://xchia.io"

  return {
    title,
    description,
    alternates: {
      // Явно указываем поисковикам путь к текущей языковой версии страницы статуса
      canonical: `${APP_URL}/${currentLang}/status`, 
      languages: {
        "en": `${APP_URL}/en/status`,
        "ru": `${APP_URL}/ru/status`,
        "x-default": `${APP_URL}/en/status`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${currentLang}/status`,
      siteName: "XCHIA Explorer",
      locale: isRu ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function NodesStatusPage({ params }: NodesStatusPageProps) {
  const { lang } = await params

  if (!isSupportedLanguage(lang)) {
    notFound()
  }

  return <ExplorerStatus />
}
