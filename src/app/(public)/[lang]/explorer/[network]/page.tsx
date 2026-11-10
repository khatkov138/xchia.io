import React from "react"
import { notFound } from 'next/navigation'
import { isSupportedLanguage, WalletLanguage } from '@/config/i18n'

import { ExplorerDashboardClient } from "./ExplorerDashboardClient"
import { ExplorerBreadcrumbs } from "../ExplorerBreadcrumbs";

interface NetworkPageProps { params: Promise<{ lang: string; network: string }> }
export const instant = false

export default async function ExplorerNetworkPage({ params }: NetworkPageProps) {
  const { lang, network } = await params
  if (!isSupportedLanguage(lang) || (network !== 'mainnet' && network !== 'testnet11')) notFound()

  const safeLang = lang as WalletLanguage

  return (
    <div className="w-full space-y-5 flex-1 text-white font-mono">
      {/* Шапка Хлебных крошек */}
      <div className="space-y-1.5 text-left">
        <ExplorerBreadcrumbs items={[{ label: `explorer (${network})`, isActive: true }]} />
        <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">
          {safeLang === "ru" ? "Обозреватель Сети" : "Network Ledger Explorer"}
        </h1>
      </div>

      {/* Интерактивный клиент дашборда */}
      <ExplorerDashboardClient lang={safeLang} net={network} />
    </div>
  )
}
