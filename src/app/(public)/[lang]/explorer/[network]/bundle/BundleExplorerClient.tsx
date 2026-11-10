'use client'
import React, { use } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Search } from "lucide-react"
import TxBundleDetails from "@/components/explorer/TxBundleDetails"
import { bundleTranslations } from "./bundle.translations"
import { WalletLanguage } from "@/config/i18n"

const fHashLong = (h: string) => h ? `${h.slice(0, 12)}...${h.slice(-10)}` : "—"

interface BundleClientProps {
  dataPromise: Promise<any>
  paramsPromise: Promise<{ lang: string; network: string; height: string }>
  targetCoinId: string
  mode: string
}

export function BundleExplorerClient({ dataPromise, paramsPromise, targetCoinId, mode }: BundleClientProps) {
  const initialBlockData = use(dataPromise), params = use(paramsPromise)
  const network = params?.network || "mainnet", height = params?.height || "", lang = (params?.lang || "ru") as WalletLanguage

  const t = bundleTranslations[lang] || bundleTranslations.en

  const { data: blockData } = useQuery({
    queryKey: ["explorer-bundle", height, targetCoinId, mode, network],
    queryFn: () => fetch(`/api/v1/bundles/track-bundle?blockHeight=${height}&network=${network}&targetCoinId=${targetCoinId}&mode=${mode}`).then(r => r.json()),
    initialData: initialBlockData,
    refetchInterval: (q) => (q.state.data?.success && q.state.data?.bundle) ? false : 10000,
    staleTime: 0, gcTime: 300000, refetchOnWindowFocus: true,
  })

  const activeData = blockData || initialBlockData
  if (!activeData || !activeData.success || !activeData.bundle) {
    return <div className="w-full text-center py-12 text-zinc-500 font-mono text-xs uppercase border border-zinc-900 bg-[#0c0c0e] rounded-[24px]">{t.syncBlock}{height}...</div>
  }

  return (
    <div className="w-full space-y-3 font-mono text-[11px]">
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 text-zinc-400">
        <div className="flex items-center gap-1">
          <span>{t.block}</span>
          <span className="text-zinc-200 font-bold">#{height}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Search size={10} className="text-zinc-500" />
          <span>{t.findCoin}</span>
          <Link href={`/${lang}/explorer/${network}/coin/${targetCoinId}`} className="text-[#FF2E93] font-bold hover:underline transition-all">
            {fHashLong(targetCoinId)}
          </Link>
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 text-left">
        <TxBundleDetails 
          t={null} 
          rawSent={activeData.bundle} 
          curAddr="" 
          targetCoinId={targetCoinId} 
          getCoinUrl={(id) => `/${lang}/explorer/${network}/coin/${id}`} 
        />
      </div>
    </div>
  )
}
