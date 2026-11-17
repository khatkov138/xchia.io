'use client'

import React from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"

import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { Button } from "@/components/ui/button"
import { ChiaNetwork } from "@/lib/utils/chia-rpc-client"
import { useSendModalContext } from "../SendModalContext"
import { TransactionReviewCard } from "../TransactionReviewCard"
import { useTrackTxQuery } from "../mutations/useTrackTxQuery" // поправь путь под свою папку

export function SendStep3() {
  const { txResponseData, onCloseForm } = useSendModalContext()
  const network = useUserSettingsStore((state) => state.network) as ChiaNetwork
  const language = useUserSettingsStore((state) => state.language)

  const txId = txResponseData?.tx_id || ""
  const currentLangStr = String(language || "ru").toLowerCase()

   const targetCoinId = React.useMemo(() => {
    const coins = txResponseData?.tracked_info?.created_coins
    if (Array.isArray(coins) && coins.length > 0) {
      return coins.at(0)?.coin_id || ""
    }
    return ""
  }, [txResponseData])


  const { data: trackData } = useTrackTxQuery(txId, targetCoinId, network)

  const blockchainStatus = trackData?.status || "IN_MEMPOOL"
  const isConfirmed = blockchainStatus === "CONFIRMED"

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200 relative select-none">
      
      {/* 1. КАРТОЧКА РЕВЬЮ */}
      <TransactionReviewCard />
      
      {/* 2. БЛОК СТАТУСА И КНОПКИ EXPLORER */}
      <div className="flex flex-col gap-3 bg-zinc-950 border border-zinc-850 p-4 rounded-xl relative z-10">
        
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border transition-all ${
            isConfirmed 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isConfirmed ? "bg-emerald-400" : "bg-blue-400 animate-pulse"}`} />
            {isConfirmed ? "ТРАНЗАКЦИЯ ПОДТВЕРЖДЕНА" : "ОЖИДАНИЕ БЛОКЧЕЙНА"}
          </div>
          
          {!isConfirmed ? (
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-mono tracking-wider font-bold">
              <Loader2 size={10} className="animate-spin text-blue-400" />
              <span>ОБРАБОТКА...</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500">
              Сеть: {network}
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
          {isConfirmed ? (
            <>
              Монеты успешно доставлены получателю и включены в блок Chia на высоте{" "}
              <strong className="text-white font-mono bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                #{trackData?.block_height}
              </strong>.
            </>
          ) : (
            <>
              Транзакция успешно отправлена в очередь сети. Мы отслеживаем её статус в реальном времени, обычно валидация занимает пару минут.
            </>
          )}
        </p>

        {isConfirmed && txId && targetCoinId && (
          <Link
            target="_blank"
            href={`/${currentLangStr}/explorer/${network}/coin/${targetCoinId}?txId=${txId}`}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 w-full h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer group mt-1"
          >
            <span>Отследить перевод в Explorer</span>
            <ExternalLink size={12} className="text-[#FF2E93] font-black transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </div>

      {/* 3. КНОПКА ЗАКРЫТИЯ */}
      <Button
        type="button"
        variant="ghost"
        onClick={onCloseForm}
        className="w-full h-10 bg-transparent hover:bg-zinc-950 text-zinc-500 hover:text-white rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center cursor-pointer transition-all duration-200"
      >
        Закрыть окно терминала
      </Button>

    </div>
  )
}
