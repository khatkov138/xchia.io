import React, { Suspense } from "react"
import { Metadata } from "next"
import { BlockExplorerClient } from "./BlockExplorerClient"
import { ExplorerBreadcrumbs } from "../../../ExplorerBreadcrumbs"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"
import { blockTranslations } from "./block.translations"
import { getBlockByHeight } from "@/lib/utils/chia-block-track"

interface PageProps {
  params: Promise<{ lang: string; network: string; height: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, network, height } = await params
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"
  const safeNetwork = network || "mainnet"

  if (!height || isNaN(Number(height))) {
    return { title: isRu ? "Невалидный блок | XCHIA" : "Invalid Block | XCHIA", robots: { index: false, follow: true } }
  }
  const title = isRu
    ? `Блок Chia #${height} (${safeNetwork}) | Ledger изменений | XCHIA`
    : `Chia Block #${height} (${safeNetwork}) | Coins Ledger | XCHIA`
  const description = isRu
    ? `Обзор блока Chia #${height} в сети ${safeNetwork}. Список additions, removals и комиссии.`
    : `Ledger analysis for Chia block #${height} on ${safeNetwork}. View coin additions, removals, and fees.`
  const APP_URL = "https://xchia.io"
  const fullPath = `/explorer/${safeNetwork}/block/${height}`

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${currentLang}${fullPath}`,
      languages: {
        en: `${APP_URL}/en${fullPath}`,
        ru: `${APP_URL}/ru${fullPath}`,
        "x-default": `${APP_URL}/en${fullPath}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${currentLang}${fullPath}`,
      siteName: "XCHIA Explorer",
      locale: isRu ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

// Весь доступ к params и fetch теперь строго внутри <Suspense>
async function BlockContent({ params }: PageProps) {
  const { lang, network, height } = await params
  const safeNetwork = network || "mainnet"
  const t = blockTranslations[isSupportedLanguage(lang) ? lang : "en"]
  const dataPromise = getBlockByHeight(height, safeNetwork)

  return (
    <>
      <div className="space-y-1.5 text-left">
        <ExplorerBreadcrumbs
          items={[
            { label: `explorer (${safeNetwork})`, href: `/${lang}/explorer/${safeNetwork}` },
            { label: "block", isActive: true },
          ]}
        />
        <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">{t.pageOverview}</h1>
      </div>
      <BlockExplorerClient dataPromise={dataPromise} paramsPromise={params} />
    </>
  )
}

export default function BlockExplorerPage({ params }: PageProps) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6 flex-1 text-white font-mono">
      <div className="lg:col-span-12 space-y-6 w-full">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-10 w-64 bg-zinc-900/60 rounded-xl animate-pulse" />
              <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 h-40 animate-pulse" />
            </div>
          }
        >
          <BlockContent params={params} />
        </Suspense>
      </div>
    </div>
  )
}
