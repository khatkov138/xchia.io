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
