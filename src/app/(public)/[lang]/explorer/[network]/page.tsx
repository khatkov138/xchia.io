import React, { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"
import { ExplorerDashboardClient } from "./ExplorerDashboardClient"
import { ExplorerBreadcrumbs } from "../ExplorerBreadcrumbs"
import { getInitialLatestActivity } from "@/lib/utils/chia-latest-activity"

interface NetworkPageProps {
  params: Promise<{ lang: string; network: string }>
}

export const instant = false

export async function generateMetadata({ params }: NetworkPageProps): Promise<Metadata> {
  const { lang, network } = await params

  if (!isSupportedLanguage(lang) || (network !== "mainnet" && network !== "testnet11")) {
    return {}
  }

  const isMainnet = network === "mainnet"
  const isRu = lang === "ru"

  const netLabel = isMainnet ? "Mainnet" : "Testnet11"
  const ticker = isMainnet ? "XCH" : "TXCH"

  const title = isRu
    ? `Обозреватель блокчейна Chia (${netLabel}) — Блоки, Монеты и Транзакции | XCHIA`
    : `Chia Blockchain Explorer (${netLabel}) — Blocks, Coins & Transactions | XCHIA`

  const description = isRu
    ? `Быстрый обозреватель сети Chia ${netLabel} (${ticker}). Поиск по адресам, высоте блока, хэшу монеты и отслеживание транзакций в реальном времени на XCHIA.`
    : `Fast real-time Chia ${netLabel} (${ticker}) blockchain explorer. Search addresses, block heights, coin IDs, and track transactions on XCHIA.`

  const url = `https://xchia.io{lang}/explorer/${network}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `https://xchia.io{network}`,
        ru: `https://xchia.io{network}`,
        "x-default": `https://xchia.io{network}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "XCHIA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

async function DashboardDynamicContent({ params }: NetworkPageProps) {
  const { lang, network } = await params
  if (!isSupportedLanguage(lang) || (network !== "mainnet" && network !== "testnet11")) notFound()

  const safeLang = lang as WalletLanguage
  const dataPromise = getInitialLatestActivity(network)

  return (
    <>
      <div className="space-y-1.5 text-left">
        <ExplorerBreadcrumbs items={[{ label: `explorer (${network})`, isActive: true }]} />
        <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">
          {safeLang === "ru" ? "Обозреватель Сети" : "Network Ledger Explorer"}
        </h1>
      </div>

      <ExplorerDashboardClient lang={safeLang} net={network} dataPromise={dataPromise} />
    </>
  )
}

export default function ExplorerNetworkPage({ params }: NetworkPageProps) {
  return (
    <div className="w-full space-y-5 flex-1 text-white font-mono">
      <Suspense
        fallback={
          <div className="space-y-5 animate-pulse">
            <div className="h-10 w-64 bg-zinc-900/60 rounded-xl" />
            <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 min-h-[320px]" />
          </div>
        }
      >
        <DashboardDynamicContent params={params} />
      </Suspense>
    </div>
  )
}
