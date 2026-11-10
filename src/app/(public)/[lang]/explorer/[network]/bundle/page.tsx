import React, { Suspense } from "react"
import { Metadata } from "next"
import { BundleExplorerClient } from "./BundleExplorerClient"

import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"
import { bundleTranslations } from "./bundle.translations"
import { ExplorerBreadcrumbs } from "../../ExplorerBreadcrumbs"

interface PageProps {
  params: Promise<{ lang: string; network: string }>
  searchParams: Promise<{ coinId?: string; blockHeight?: string; mode?: string }>
}

export const instant = false 

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang, network } = await params
  const { coinId, blockHeight, mode } = await searchParams
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru", safeNetwork = network || "mainnet"
  const safeMode = mode === "created" ? "created" : "spent", height = blockHeight || "0"

  if (!coinId || coinId.trim() === "" || !blockHeight) {
    return { title: isRu ? "Ошибка трекера | XCHIA" : "Tracker Error | XCHIA", robots: { index: false, follow: true } }
  }

  const shortCoin = `${coinId.slice(0, 10)}...${coinId.slice(-6)}`
  const title = isRu
    ? `Target Coin ID ${shortCoin} в блоке #${height} (${safeNetwork}) | XCHIA`
    : `Target Coin ID ${shortCoin} in Block #${height} (${safeNetwork}) | XCHIA`

  const description = isRu
    ? `Анализ Spend Bundle графа изменений для Target Coin ID ${coinId} на высоте блока #${height}. Режим: ${safeMode}. Сеть: ${safeNetwork}.`
    : `Spend Bundle changes graph analysis for Target Coin ID ${coinId} at block height #${height}. Mode: ${safeMode}. Network: ${safeNetwork}.`

  const APP_URL = "https://xchia.io", fullPath = `/explorer/${safeNetwork}/bundle?blockHeight=${height}&coinId=${coinId}&mode=${safeMode}`

  return {
    title, description,
    alternates: { canonical: `${APP_URL}/${currentLang}${fullPath}`, languages: { "en": `${APP_URL}/en${fullPath}`, "ru": `${APP_URL}/ru${fullPath}`, "x-default": `${APP_URL}/en${fullPath}` } },
    openGraph: { title, description, url: `${APP_URL}/${currentLang}${fullPath}`, siteName: "XCHIA Explorer", locale: isRu ? "ru_RU" : "en_US", type: "website" },
    twitter: { card: "summary_large_image", title, description }
  }
}

export default async function BundleExplorerPage({ params, searchParams }: PageProps) {
  const { lang, network } = await params
  const { coinId, blockHeight, mode } = await searchParams
  const safeNetwork = network || "mainnet", safeMode = mode === "created" ? "created" : "spent", height = blockHeight || ""
  const t = bundleTranslations[isSupportedLanguage(lang) ? lang : "en"]

  if (!coinId || !height) return <div className="p-8 text-center text-zinc-500 font-mono text-xs uppercase">{t.errorNav}</div>

  const dataPromise = (async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const safeCoinId = coinId.startsWith("0x") ? coinId : `0x${coinId}`
      const res = await fetch(`${backendUrl}/api/v1/bundles/track-bundle?blockHeight=${height}&network=${safeNetwork}&targetCoinId=${safeCoinId}&mode=${safeMode}`)
      return res.ok ? await res.json() : null
    } catch { return null }
  })()

  const extendedParams = params.then(p => ({ ...p, height }))

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6 flex-1 text-white font-mono">
      <div className="lg:col-span-12 space-y-6 w-full">
        <div className="space-y-1.5 text-left">
          <ExplorerBreadcrumbs items={[{ label: `explorer (${safeNetwork})`, href: `/${lang}/explorer/${safeNetwork}` }, { label: `block #${height}`, href: `/${lang}/explorer/${safeNetwork}/block/${height}` }, { label: "bundle", isActive: true }]} />
          <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">{t.pageTitle}</h1>
        </div>
        <Suspense fallback={<div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 h-40 animate-pulse" />}>
          <BundleExplorerClient dataPromise={dataPromise} paramsPromise={extendedParams} targetCoinId={coinId} mode={safeMode} />
        </Suspense>
      </div>
    </div>
  )
}
