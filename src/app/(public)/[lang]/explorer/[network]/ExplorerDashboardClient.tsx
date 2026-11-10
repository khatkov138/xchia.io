'use client'

import React, { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Box, Cpu } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ExplorerSearchForm } from "./ExplorerSearchForm"
import { networkTranslations } from "./network.translations"
import { WalletLanguage } from "@/config/i18n"
import { useNodesStatus } from "@/hooks/useNodesStatus"

const fMojo = (m: any) => (!m || Number(m) === 0) ? "0.000000000000" : (Number(m) / 1e12).toFixed(12).replace(/\.?0+$/, "")
const fHashShort = (h: string) => h ? `${h.slice(0, 10)}...${h.slice(-8)}` : "—"

export function ExplorerDashboardClient({ lang, net }: { lang: WalletLanguage, net: string }) {
  const t = networkTranslations[lang] || networkTranslations.en

  // 1. WebSocket хук статуса ноды
  const nodesStatus = useNodesStatus()
  const currentNetStatus = nodesStatus.networks[net]
  const peakHeight = currentNetStatus?.nodeData?.currentHeight || 0

  // Дебаунс высоты против спама HTTP-запросами
  const [debouncedHeight, setDebouncedHeight] = useState(peakHeight)

  useEffect(() => {
    if (debouncedHeight === 0 && peakHeight > 0) {
      setDebouncedHeight(peakHeight)
      return
    }
    const handler = setTimeout(() => {
      setDebouncedHeight(peakHeight)
    }, 3000)

    return () => clearTimeout(handler)
  }, [peakHeight, debouncedHeight])

  // 2. РЕАКТИВНЫЙ HTTP ЗАПРОС (Кэш завязан на заторможенную высоту)
  const { data: activityData } = useQuery({
    queryKey: ["explorerDashboard", net, debouncedHeight],
    queryFn: () => fetch(`/api/v1/blocks/latest-activity?network=${net}&height=${debouncedHeight}`).then(r => r.json()),
    enabled: debouncedHeight > 0,
    staleTime: 15000, 
    placeholderData: (previousData) => previousData, 
  })

  const latestBlocks = activityData?.blocks || []
  const latestCoins = activityData?.coins || []

  return (
    <div className="w-full space-y-4 font-mono text-[11px] text-left animate-in fade-in duration-150">
      
      {/* Изолированная форма поиска */}
      <ExplorerSearchForm 
        lang={lang} 
        net={net} 
        placeholder={t.searchPlaceholder} 
        btnText={t.searchBtn} 
      />

      {/* 📊 КОЛОНКИ СЕТИ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch"> {/* 🔥 items-stretch заставляет колонки растягиваться по высоте */}
        
        {/* ЛЕВАЯ КОЛОНКА: ПОСЛЕДНИЕ БЛОКИ */}
        <div className="flex flex-col space-y-2"> {/* 🔥 flex flex-col для дочернего выравнивания */}
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 pl-1 flex items-center gap-1.5 shrink-0">
            <Box size={12} className="text-[#FF2E93]" />
            <span>{lang === "ru" ? "Последние блоки" : "Latest Blocks"}</span>
          </h3>
          {/* 🔥 h-full flex-1 заставляет карточку занимать всё доступное пространство */}
          <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden p-2 space-y-1 h-full flex-1 flex flex-col justify-start">
            {latestBlocks.length === 0 ? (
              <div className="text-center my-auto py-12 text-zinc-600 font-bold uppercase">{t.emptyData}</div>
            ) : (
              latestBlocks.map((b: any, idx: number) => (
                <div key={idx} className="border-b border-zinc-900/30 last:border-0 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/10 p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center bg-zinc-800 text-[#FF2E93] border-zinc-700/50">
                      <Box size={16} />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/${lang}/explorer/${net}/block/${b.height}`} className="text-xs font-black text-white hover:underline block font-mono">
                        Block #{b.height}
                      </Link>
                      <p className="text-[10px] text-zinc-500 truncate max-w-[180px] mt-0.5">
                        Farmer: {fHashShort(b.farmer)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-black text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-1.5 py-0.5 rounded uppercase">
                      Confirmed
                    </span>
                    <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-zinc-500 font-bold">
                      <Box size={9} />
                      <span>{b.time_ago}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: СВЕЖИЕ МОНЕТЫ */}
        <div className="flex flex-col space-y-2"> {/* 🔥 flex flex-col для дочернего выравнивания */}
          <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 pl-1 flex items-center gap-1.5 shrink-0">
            <span className="text-emerald-400 text-xs">🌱</span>
            <span>{lang === "ru" ? "Свежие монеты" : "Fresh Coins"}</span>
          </h3>
          {/* 🔥 h-full flex-1 заставляет карточку занимать всё доступное пространство */}
          <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden p-2 space-y-1 h-full flex-1 flex flex-col justify-start">
            {latestCoins.length === 0 ? (
              <div className="text-center my-auto py-12 text-zinc-600 font-bold uppercase">{t.emptyData}</div>
            ) : (
              latestCoins.map((c: any, idx: number) => (
                <div key={idx} className="border-b border-zinc-900/30 last:border-0 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/10 p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                      <Cpu size={16} />
                    </div>
                    <div className="min-w-0">
                      <Link href={`/${lang}/explorer/${net}/coin/${c.id}`} className="text-xs font-black text-white hover:underline truncate max-w-[160px] block font-mono">
                        {fHashShort(c.id)}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-500 font-bold">
                        <Box size={9} />
                        <Link href={`/${lang}/explorer/${net}/block/${c.height}`} className="hover:text-zinc-300 underline">
                          #{c.height}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-400">{fMojo(c.amount)} XCH</p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

      </div>
    </div>
  )
}
