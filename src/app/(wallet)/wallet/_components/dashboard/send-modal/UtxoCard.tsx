'use client'

import React, { useState } from "react"
import Link from "next/link"
import { ExternalLink, Copy, Check } from "lucide-react"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { puzzleHashToAddress } from "@/lib/utils/crypto"

interface UtxoCardProps {
  addr: {
    index: number
    puzzle_hash: string
    mojo: number
    coins_count: number
    xch?: number | string
  }
  unspentCoins: any[]
}

export function UtxoCard({ addr, unspentCoins }: UtxoCardProps) {
  const network = useUserSettingsStore((state: any) => state.network)
  const language = useUserSettingsStore((state: any) => state.language) ?? "ru"
  const [copied, setCopied] = useState(false)
  
  const cleanNetwork = network.toLowerCase()
  const cleanLang = String(language).toLowerCase().trim()
  
  // 🚀 ЧЕСТНЫЙ ВЫЗОВ: Передаем чистую строку сети network напрямую! Функция сама все порешает.
  const realAddr = puzzleHashToAddress(addr.puzzle_hash, network)
  
  const coins = unspentCoins.filter((c: any) => c.wallet_index === addr.index)
  const activeCoinsCount = coins.filter((c: any) => c.isSpent !== true).length
  const displayXch = addr.xch !== undefined ? addr.xch : (addr.mojo / 1e12).toFixed(4)
  const shortAddr = realAddr ? `${realAddr.substring(0, 7)}...${realAddr.substring(realAddr.length - 6)}` : "..."

  const addressExplorerUrl = `/${cleanLang}/explorer/${cleanNetwork}/address/${realAddr}`
  const getCoinExplorerUrl = (coinId: string) => `/${cleanLang}/explorer/${cleanNetwork}/coin/${coinId.startsWith("0x") ? coinId : `0x${coinId}`}`

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!realAddr) return
    try {
      await navigator.clipboard.writeText(realAddr)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) { console.error(err) }
  }

  return (
    <div className="border border-zinc-800 bg-zinc-900/30 p-2.5 rounded-xl space-y-1.5 font-mono text-[11px]">
      <div className="flex justify-between items-start text-xs border-b border-zinc-800 pb-1.5">
        <div>
          <div className="text-xs font-bold text-white">{addr.index === 0 ? "Индекс 0 ⭐" : `Индекс ${addr.index}`}</div>
          <div className="flex items-center gap-1 mt-0.5 h-4">
            <Link 
              href={realAddr ? addressExplorerUrl : "#"} 
              className="text-[10px] font-medium text-zinc-500 hover:text-white hover:underline flex items-center gap-1 group/link"
            >
              <span>📍 {shortAddr}</span>
              <ExternalLink size={8} className="opacity-0 group-hover/link:opacity-100 transition-opacity text-zinc-500" />
            </Link>
            
            {realAddr && (
              <button type="button" onClick={handleCopy} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-zinc-800 flex items-center justify-center w-5 h-5 shrink-0">
                {copied ? <Check size={11} className="text-emerald-400" strokeWidth={3} /> : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-emerald-400 block">{displayXch} XCH</span>
          <span className="text-[9px] font-bold text-zinc-500 block">Монет: {activeCoinsCount} шт.</span>
        </div>
      </div>
      
      <div className="space-y-1 pt-0.5 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800/60 scrollbar-track-transparent">
        {coins.length === 0 ? (
          <span className="text-[10px] font-medium text-zinc-600 italic block pl-1">Нет доступных UTXO</span>
        ) : (
          [...coins]
            .sort((a, b) => (b.coin?.amount || 0) - (a.coin?.amount || 0))
            .map((item: any, i: number) => {
              const isSyntheticChange = item.isLocked === true
              const isSpentInput = item.isSpent === true
              const coinXch = (Number(item.coin.amount) / 1_000_000_000_000).toFixed(6)
              const coinId = item.coin_id || ""

              return (
                <Link 
                  key={i} 
                  href={coinId ? getCoinExplorerUrl(coinId) : "#"}
                  className={`flex flex-col gap-0.5 bg-zinc-950/70 px-2 py-1.5 rounded text-[10px] transition-all border block group/coin select-none ${
                    isSyntheticChange 
                      ? "border-blue-500/40 hover:border-blue-500/70" 
                      : isSpentInput
                        ? "border-red-500/20 bg-zinc-950/30 opacity-40 cursor-not-allowed pointer-events-none" 
                        : "border-zinc-850 hover:border-zinc-700 active:scale-[0.99]"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-zinc-500 group-hover/coin:text-zinc-300 flex items-center gap-1">
                      <span>P: {item.coin.parent_coin_info.substring(0, 8)}...</span>
                      {!isSpentInput && <ExternalLink size={8} className="opacity-0 group-hover/coin:opacity-100 transition-opacity" />}
                    </span>
                    <div className="text-right flex flex-col items-end">
                      <span className={`font-bold ${isSpentInput ? "line-through text-zinc-600" : "text-zinc-300 group-hover/coin:text-white"}`}>{coinXch} XCH</span>
                      <span className="text-[9px] text-zinc-500 font-medium">{item.coin.amount} Mojo</span>
                    </div>
                  </div>
                  
                  {isSyntheticChange && (
                    <div className="flex items-center gap-1 mt-0.5 text-[8px] font-bold text-blue-400 tracking-wider uppercase">
                      <span className="h-1 w-1 rounded-full bg-blue-400 animate-pulse" />
                      Мемпул-сдача
                    </div>
                  )}

                  {isSpentInput && (
                    <div className="flex items-center gap-1 mt-0.5 text-[8px] font-bold text-red-400/80 tracking-wider uppercase">
                      <span className="h-1 w-1 rounded-full bg-red-500" />
                      Списание (Мемпул)
                    </div>
                  )}
                </Link>
              )
            })
        )}
      </div>
    </div>
  )
}
