'use client'

import React, { useState } from "react"
import { Clock, CheckCircle2, ExternalLink, Copy, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { fHash, fMojo } from "@/components/explorer/tx-history-core"

interface TransactionDetailModalProps {
  selectedTx: any | null
  onClose: () => void
}

export function TransactionDetailModal({ selectedTx, onClose }: TransactionDetailModalProps) {
  const [copied, setCopied] = useState(false)
  
  const network = useUserSettingsStore((state: any) => state.network)
  const language = useUserSettingsStore((state: any) => state.language) ?? "ru"

  const txUid = selectedTx?.display_id || selectedTx?.id || ""

  // 📡 Динамический авто-трекинг статуса транзакции в мемпуле ноды
  const { data: txStatus } = useQuery({
    queryKey: ["track-tx", txUid, network],
    queryFn: async () => {
      if (!txUid) return null
      const res = await fetch(`/api/v1/transactions/track-tx?txId=${txUid}&targetCoinId=${txUid}&network=${network}`)
      return res.ok ? res.json() : null
    },
    enabled: !!txUid,
    refetchInterval: (q) => q.state.data?.status === "CONFIRMED" ? false : 6000,
  })

  if (!selectedTx) return null

  const isIncoming = selectedTx.type === "RECEIVE"
  
  // 🚀 ЧИСТЫЙ ПРОБРОС АДРЕСА
  const computedAddress = isIncoming 
    ? selectedTx.addr 
    : (selectedTx.raw_sent?.spent?.[0]?.addr || selectedTx.addr || "Адрес кошелька")

  const handleCopy = async () => {
    if (!computedAddress) return
    await navigator.clipboard.writeText(computedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cleanNetwork = network.toLowerCase()
  const cleanLang = String(language).toLowerCase().trim()
  
  // 🎯 РЕШЕНИЕ ПРОБЛЕМЫ: Извлекаем высоту блока из твоего кастомного поля `blk`
  const blockHeight = selectedTx.blk || selectedTx.block_height || txStatus?.block_height

  // Вытаскиваем массив spent-монет (он может быть в raw_sent как для исходящих, так и прикреплен к входящим в режиме кошелька)
  const spentCoins = selectedTx.raw_sent?.spent || []
  
  // Находим самый крупный коин для зацепки графа
  const topSpentCoin = spentCoins.length > 0 
    ? [...spentCoins].sort((a: any, b: any) => Number(b.mojo) - Number(a.mojo))[0]
    : null

  // Определяем детерминированный Coin ID и режим для страницы Spend Bundle
  
   // 🌍 ГЕНЕРАЦИЯ ССЫЛКИ: Умное разделение между одиночными коинами и групповыми бандлами блоков
  let explorerUrl = ""

  if (isIncoming) {
    // 🟢 Входящие (Всегда): ведем строго на чистый роут просмотра созданной монеты по её ID
    explorerUrl = `/${cleanLang}/explorer/${cleanNetwork}/coin/${txUid}`
  } else {
    // 🔴 Исходящие: анализируем количество потраченных монет (входов)
    const spentCoins = selectedTx.raw_sent?.spent || []
    
    if (spentCoins.length > 1 && blockHeight && blockHeight !== 0) {
      // 💥 СЛУЧАЙ А: Монет несколько (Объединение UTXO / Распил) -> Отправляем на детальный аудит всего бандла в блоке
      // Сортируем и берем самый крупный коин для жесткой детерминированной зацепки графа на бэке
      const topSpentCoin = [...spentCoins].sort((a: any, b: any) => Number(b.mojo) - Number(a.mojo))[0]
      const targetCoinId = topSpentCoin?.id || txUid
      
      explorerUrl = `/${cleanLang}/explorer/${cleanNetwork}/block/${blockHeight}?coinId=${targetCoinId}&mode=spent&group=true`
    } else {
      // 🪙 СЛУЧАЙ Б: Потрачена всего 1 монета (или данных о бандле еще нет/мемпул) -> Ведем на прямую страницу этого единственного коина
      const singleCoinId = spentCoins[0]?.id || txUid
      
      explorerUrl = `/${cleanLang}/explorer/${cleanNetwork}/coin/${singleCoinId}`
    }
  }



  return (
    <Dialog open={!!selectedTx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-950 border border-zinc-900 text-zinc-100 max-w-sm rounded-[24px] p-4 font-mono text-[11px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase text-zinc-400 tracking-wider">
            Детали транзакции
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Блок отображения суммы XCH */}
          <div className="text-center p-4 bg-zinc-900/30 border border-zinc-900/60 rounded-2xl">
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">
              {isIncoming ? "Сумма получения" : "Сумма отправки"}
            </p>
            <p className={`text-2xl font-black ${isIncoming ? "text-emerald-400" : "text-white"}`}>
              {isIncoming ? "+" : "-"}{fMojo(selectedTx.mojo)} XCH
            </p>
          </div>

          {/* Индикатор статуса транзакции */}
          <div className="flex justify-between items-center text-xs px-1">
            <span className="text-zinc-500 font-medium">Статус ноды:</span>
            {txStatus?.status === "IN_MEMPOOL" || !blockHeight ? ( 
              <span className="text-amber-400 font-bold flex items-center gap-1 text-[10px] uppercase animate-pulse">
                <Clock size={12} /> В Мемпуле
              </span> 
            ) : ( 
              <span className="text-emerald-500 font-bold flex items-center gap-1 text-[10px] uppercase">
                <CheckCircle2 size={12} /> В блоке
              </span> 
            )}
          </div>

          {/* Информационный блок с адресом и временем */}
          <div className="space-y-2 bg-zinc-900/10 p-3 border border-zinc-900/40 rounded-xl break-all">
            <div className="flex justify-between items-start gap-2">
              <span className="text-zinc-500 font-semibold shrink-0">Адрес:</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-right text-zinc-300 select-all">{fHash(computedAddress)}</span>
                <button onClick={handleCopy} className="text-zinc-500 hover:text-white p-1 rounded shrink-0">
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-zinc-900/50 text-zinc-400">
              <span className="text-zinc-500 font-semibold">Время фиксации:</span>
              <span>{selectedTx.ts ? new Date(selectedTx.ts * 1000).toLocaleString("ru-RU") : "В очереди"}</span>
            </div>
          </div>
          
          {/* Ссылка на граф Lineage Tree */}
          <a 
            href={explorerUrl} 
            className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 font-bold transition-all text-xs"
          >
            <span>Исследовать в Explorer</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
