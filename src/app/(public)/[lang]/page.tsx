import React from "react"
import { notFound } from "next/navigation"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"
import { LandingClientView } from "./LandingClientView"
import type { Metadata } from "next"

interface PageProps {
  params: Promise<{ lang: string }>
}

// 🟢 ТЕПЕРЬ ВСЁ КОРРЕКТНО: Серверный конфиг Next.js находится в серверном файле без директивы "use client"
export const instant = false

// 🌐 МЕТАДАННЫЕ КОНКРЕТНО ДЛЯ ГЛАВНОЙ СТРАНИЦЫ (ЛЕНДИНГА)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"

  const title = isRu 
    ? "XCHIA — Главная | Веб-кошелек Chia" 
    : "XCHIA — Home | Chia Web Wallet"

  return {
    title,
    // Все остальные теги (description, alternates) автоматически унаследуются из LangLayout выше!
  }
}

export default async function Page({ params }: PageProps) {
  // Асинхронно дожидаемся разбора параметров на сервере
  const { lang } = await params

  // Жесткая серверная валидация языка
  if (!isSupportedLanguage(lang)) {
    notFound()
  }

  const currentLang = lang as WalletLanguage

  // Просто пробрасываем проверенную локаль в наш изолированный клиентский UI
  return <LandingClientView currentLang={currentLang} />
}
