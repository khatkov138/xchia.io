'use client'

import React, { useState, useMemo, useTransition } from "react"
import { Copy, Check, Loader2, AlertTriangle, ExternalLink } from "lucide-react"
import { useWalletDashboard } from "@/hooks/useWalletDashboard"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { puzzleHashToAddress } from "@/lib/utils/crypto"
import { useRouter } from "next/navigation"
import { addressCardTranslations } from "./translations/address-card.transaltions"

// 🚀 ПОДКЛЮЧАЕМ ЛОКАЛИЗАЦИЮ ИЗ НАШЕГО ЛОКАЛЬНОГО СЛОВАРЯ

export function AddressCard() {
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  // 🏭 ИСПРАВЛЕНО: Достаем активный язык кошелька напрямую из Zustand стора
  const language = useUserSettingsStore((state) => state.language)
  const t = addressCardTranslations[language || "en"]

  const network = useUserSettingsStore((state) => state.network)
  const isMainnet = network === 'mainnet'

  const { addresses, isLoading: isDashboardLoading } = useWalletDashboard()

  const targetObj = addresses && addresses.length > 0
    ? (addresses.find((a: any) => a.index === 0) || addresses[0])
    : null

  const address0 = puzzleHashToAddress(targetObj?.puzzle_hash, network)
  const isLoaded = !isDashboardLoading && address0 !== ""

  const formattedAddress = useMemo(() => {
    if (!address0 || address0.length < 12) return null
    return {
      start: address0.slice(0, 7),
      middle: address0.slice(7, -6),
      end: address0.slice(-6)
    }
  }, [address0])

  const copyAddress = async () => {
    if (!isLoaded) return
    try {
      await navigator.clipboard.writeText(address0)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(t.errorCopy, err)
    }
  }

  const handleNavigateToExplorer = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLoaded || isPending) return
    startTransition(() => {
      router.push(`/${language || "en"}/explorer/${network}/address/${address0}`)
    })
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-900 shadow-xl backdrop-blur-xl rounded-[24px] p-4 space-y-2.5 relative w-full">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-0.5 select-none group cursor-help relative">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            {t.label} ({isMainnet ? 'mainnet' : 'testnet11'})
          </span>

          {!isMainnet && (
            <div className="flex items-center">
              <AlertTriangle size={11} className="text-zinc-500 group-hover:text-[#FF2E93] transition-colors duration-200" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-[240px] p-2.5 bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-normal z-50 transition-all duration-100">
                <span className="text-[#FF2E93] font-black block mb-0.5">{t.tooltipTitle}</span>
                {t.tooltipText}
                <div className="absolute top-full left-4 border-4 border-transparent border-t-[#0c0c0e]" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={copyAddress}
          disabled={!isLoaded}
          className={`flex items-center gap-1 text-[10px] font-bold bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-855/60 transition-all ${
            isLoaded ? "text-zinc-400 hover:text-white cursor-pointer active:scale-95" : "text-zinc-600 border-zinc-900/40 cursor-not-allowed opacity-50"
          }`}
        >
          {copied ? (
            <Check size={11} className="text-emerald-400" />
          ) : (
            <Copy size={11} />
          )}
          <span>{copied ? t.btnCopied : t.btnCopy}</span>
        </button>
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl font-mono text-[11px] min-h-[42px] flex items-center justify-between overflow-hidden gap-3 group/addr">
        {isLoaded && formattedAddress ? (
          <>
            <div className="text-left break-all select-all leading-normal tracking-wider flex-1">
              <span className="text-zinc-100 font-bold">{formattedAddress.start}</span>
              <span className="text-zinc-500 font-medium">{formattedAddress.middle}</span>
              <span className="text-zinc-100 font-bold">{formattedAddress.end}</span>
            </div>
            
            <button
              onClick={handleNavigateToExplorer}
              disabled={isPending}
              className="shrink-0 p-1 rounded-md border border-transparent bg-zinc-900/40 text-zinc-500 hover:text-emerald-400 hover:border-zinc-800 transition-all duration-150 cursor-pointer active:scale-90 disabled:opacity-40"
              title={t.titleExplorer}
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin text-[#FF2E93]" />
              ) : (
                <ExternalLink size={12} />
              )}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider animate-pulse w-full justify-center">
            <Loader2 size={12} className="animate-spin text-[#FF2E93]" />
            <span>{t.loading}</span>
          </div>
        )} 
      </div>
    </div>
  )
}
