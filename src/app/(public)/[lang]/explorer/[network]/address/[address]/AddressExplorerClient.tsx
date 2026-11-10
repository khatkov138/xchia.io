'use client'
import React, { use, useTransition, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Wallet, Layers, Box, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { TxHistoryView } from "@/components/explorer/TxHistoryView"
import { fMojo } from "@/components/explorer/tx-history-core"
import { WalletLanguage } from "@/config/i18n"
import { addressTranslations } from "./address.translations"
import { AddressHeader } from "./AddressHeader"
import { AddressQrDialog } from "./AddressQrDialog"

interface AddressExplorerClientProps { dataPromise: Promise<any>; net: string; addr: string; lang: string; page: number }

export function AddressExplorerClient({ dataPromise, net, addr, lang, page }: AddressExplorerClientProps) {
  const initialServerData = use(dataPromise), router = useRouter(), sParams = useSearchParams(), perPage = 10, [isPending, startTransition] = useTransition()
  const [isQrOpen, setIsQrOpen] = useState(false)

  const t = addressTranslations[lang as WalletLanguage] || addressTranslations.en

  const { data: res } = useQuery({
    queryKey: ["addrData", addr, net, page],
    queryFn: () => fetch(`/api/v1/addresses/track-address?puzzleHash=${addr}&network=${net}&page=${page}&perPage=${perPage}`).then(r => r.json()),
    initialData: initialServerData, staleTime: 10000,
  })

  const balanceMojo = res?.balance_mojo || 0, totalBlocks = res?.total_blocks || 0, historyList = res?.history || []

  const handlePageChange = (direction: "next" | "prev") => {
    const p = new URLSearchParams(sParams.toString())
    p.set("page", (direction === "next" ? page + 1 : Math.max(1, page - 1)).toString())
    startTransition(() => { router.push(`?${p.toString()}`, { scroll: false }) })
  }

  return (
    <div className="space-y-5 w-full font-mono text-[11px] text-left">
      
      {/* 🎯 Модуль Шапки */}
      <AddressHeader addr={addr} net={net} titleExplorer={t.seoTitle} onQrOpen={() => setIsQrOpen(true)} />

      {/* Карточки метрик */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { t: t.pageTitle === "Обзор Адреса" ? "Баланс" : "Balance", v: `${fMojo(balanceMojo)} XCH`, i: <Wallet size={20} />, c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }, 
          { t: t.pageTitle === "Обзор Адреса" ? "Всего блоков активности" : "Total Activity Blocks", v: `${totalBlocks} BLOCKS`, i: <Box size={20} />, c: "bg-[#FF2E93]/10 text-[#FF2E93] border-[#FF2E93]/20" }
        ].map((b, i) => (
          <Card key={i} className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px]">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${b.c}`}>{b.i}</div>
              <div><h3 className="text-[10px] font-bold text-zinc-500 uppercase">{b.t}</h3><p className="text-lg font-black text-white tracking-tight pt-0.5">{b.v}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* История */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5 text-zinc-500">
          <div className="flex items-center gap-1.5"><Layers size={12} /><span className="text-[10px] font-bold uppercase">{t.pageTitle === "Обзор Адреса" ? "История" : "History"}</span></div>
          <span className="text-[10px] font-mono text-zinc-600">{isPending ? (t.pageTitle === "Обзор Адреса" ? "Загрузка..." : "Loading...") : (t.pageTitle === "Обзор Адреса" ? "Отображение блоков активности" : "Displaying activity blocks")}</span>
        </div>
        <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden">
          <CardContent className="p-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            <TxHistoryView historyList={historyList} net={net.toLowerCase()} lang={lang} compact={false} address={addr} />
          </CardContent>
        </Card>
        {totalBlocks > page * perPage && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={page === 1 || isPending} onClick={() => handlePageChange("prev")} className="inline-flex items-center gap-1 text-zinc-400 text-[10px] font-bold uppercase bg-zinc-900/40 border px-3 py-1.5 rounded-xl disabled:opacity-40 transition-all"><ChevronLeft size={12} /><span>{t.pageTitle === "Обзор Адреса" ? "Назад" : "Prev"}</span></button>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900/20 border px-3 py-1.5 rounded-xl">{t.pageTitle === "Обзор Адреса" ? "Стр." : "Page"} {page}</span>
            <button disabled={isPending || historyList.length < perPage} onClick={() => handlePageChange("next")} className="inline-flex items-center gap-1 text-zinc-400 text-[10px] font-bold uppercase bg-zinc-900/40 border px-3 py-1.5 rounded-xl disabled:opacity-40 transition-all"><span>{t.pageTitle === "Обзор Адреса" ? "Далее" : "Next"}</span><ChevronRight size={12} /></button>
          </div>
        )}
      </div>

      {/* 🎯 Модуль Диалога с QR */}
      <AddressQrDialog 
        isOpen={isQrOpen} 
        onOpenChange={setIsQrOpen} 
        addr={addr} 
        qrTitle={t.pageTitle === "Обзор Адреса" ? "QR-код адреса" : "Address QR Code"} 
        loadingText={t.pageTitle === "Обзор Адреса" ? "Генерация..." : "Generating..."} 
      />
    </div>
  )
}
