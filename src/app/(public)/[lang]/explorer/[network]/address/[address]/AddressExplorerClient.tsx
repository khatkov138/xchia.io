'use client'
import React, { use, useTransition, useState, useMemo } from "react"
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
import { useXchPrice } from "@/hooks/useXchPrice"
import { trackAddress } from "@/lib/utils/chia-track-address"

interface AddressExplorerClientProps {
  dataPromise: Promise<any>
  net: string
  addr: string
  lang: string
  page: number
}

export function AddressExplorerClient({ dataPromise, net, addr, lang, page }: AddressExplorerClientProps) {
  const initialServerData = use(dataPromise)
  const router = useRouter()
  const sParams = useSearchParams()
  const perPage = 10
  const [isPending, startTransition] = useTransition()
  const [isQrOpen, setIsQrOpen] = useState(false)

  const t = addressTranslations[lang as WalletLanguage] || addressTranslations.en
  const isRu = t.pageTitle === "Обзор Адреса"

  const { usdPrice, isReady: isPriceReady } = useXchPrice()

  const { data: res } = useQuery({
    queryKey: ["addrData", addr, net, page],
    queryFn: () => trackAddress(addr, net, page, perPage),
    initialData: initialServerData,
    staleTime: 15000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const balanceMojo = res?.balance_mojo || 0
  const isHeavyBalance = Boolean(res?.is_heavy_balance)
  const totalBlocks = res?.total_blocks || 0
  const historyList = res?.history || []

  const formattedUsdBalance = useMemo(() => {
    const isMainnet = net.toLowerCase() === "mainnet" || net.toLowerCase() === "xch"
    if (!isMainnet || !isPriceReady || usdPrice === null) return null

    const numericXch = balanceMojo / 1_000_000_000_000
    const usdTotal = numericXch * usdPrice

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usdTotal)
  }, [balanceMojo, net, isPriceReady, usdPrice])

  const handlePageChange = (direction: "next" | "prev") => {
    const p = new URLSearchParams(sParams.toString())
    p.set("page", (direction === "next" ? page + 1 : Math.max(1, page - 1)).toString())
    startTransition(() => {
      router.push(`?${p.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-5 w-full font-mono text-[11px] text-left">
      <AddressHeader addr={addr} net={net} titleExplorer={t.seoTitle} onQrOpen={() => setIsQrOpen(true)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            t: isRu ? "Баланс" : "Balance",
            v: `${fMojo(balanceMojo)}${isHeavyBalance ? "+" : ""} XCH`,
            sub: isHeavyBalance
              ? (isRu ? "Много UTXO (окно)" : "Heavy UTXO address")
              : formattedUsdBalance ? `≈ ${formattedUsdBalance}` : null,
            i: <Wallet size={20} />,
            c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          },
          {
            t: isRu ? "Всего блоков активности" : "Total Activity Blocks",
            v: `${totalBlocks}${res?.has_more_history ? "+" : ""} BLOCKS`,
            sub: null,
            i: <Box size={20} />,
            c: "bg-[#FF2E93]/10 text-[#FF2E93] border-[#FF2E93]/20",
          },
        ].map((b, i) => (
          <Card key={i} className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px]">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${b.c}`}>{b.i}</div>
              <div>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase">{b.t}</h3>
                <div className="flex items-baseline gap-2 pt-0.5 flex-wrap">
                  <p className="text-lg font-black text-white tracking-tight">{b.v}</p>
                  {b.sub && (
                    <span className="text-xs font-semibold text-emerald-400/80">
                      {b.sub}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5 text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Layers size={12} />
            <span className="text-[10px] font-bold uppercase">{isRu ? "История" : "History"}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-600">
            {isPending
              ? isRu
                ? "Загрузка..."
                : "Loading..."
              : isRu
                ? "Отображение блоков активности"
                : "Displaying activity blocks"}
          </span>
        </div>
        <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden">
          <CardContent className="p-3 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            <TxHistoryView historyList={historyList} net={net.toLowerCase()} lang={lang} compact={false} address={addr} />
          </CardContent>
        </Card>
        {(totalBlocks > perPage || page > 1) && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              disabled={page === 1 || isPending}
              onClick={() => handlePageChange("prev")}
              className="inline-flex items-center gap-1 text-zinc-400 text-[10px] font-bold uppercase bg-zinc-900/40 border px-3 py-1.5 rounded-xl disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={12} />
              <span>{isRu ? "Назад" : "Prev"}</span>
            </button>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900/20 border px-3 py-1.5 rounded-xl">
              {isRu ? "Стр." : "Page"} {page}
            </span>
            <button
              disabled={isPending || historyList.length < perPage}
              onClick={() => handlePageChange("next")}
              className="inline-flex items-center gap-1 text-zinc-400 text-[10px] font-bold uppercase bg-zinc-900/40 border px-3 py-1.5 rounded-xl disabled:opacity-40 transition-all"
            >
              <span>{isRu ? "Далее" : "Next"}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <AddressQrDialog
        isOpen={isQrOpen}
        onOpenChange={setIsQrOpen}
        addr={addr}
        qrTitle={isRu ? "QR-код адреса" : "Address QR Code"}
        loadingText={isRu ? "Генерация..." : "Generating..."}
      />
    </div>
  )
}
