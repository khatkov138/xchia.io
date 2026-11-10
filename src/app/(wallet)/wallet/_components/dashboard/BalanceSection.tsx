'use client'

import React from "react"
import { RefreshCw, Plus } from "lucide-react"
import { useWalletBalance } from "@/hooks/useWalletBalance"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { balanceTranslations } from "./translations/balance.translations"

export function BalanceSection() {
  const { 
    balanceXCH, 
    fiatValue, 
    currency,  
    isError, 
    isFetching, 
    refetch 
  } = useWalletBalance()

  // Читаем язык кошелька напрямую из Zustand стора настроек пользователя
  const language = useUserSettingsStore((state) => state.language)
  const t = balanceTranslations[language || "en"]

  // Достаем состояние сети, текущий статус отображения и сеттер из глобального стора
  const network = useUserSettingsStore((state) => state.network)
  const balanceDisplay = useUserSettingsStore((state) => state.balanceDisplay)
  const setBalanceDisplay = useUserSettingsStore((state) => state.setBalanceDisplay)

  const isXchTop = balanceDisplay === 'xch'
  const isMainnet = network === 'mainnet'
  const xchTicker = isMainnet ? 'XCH' : 'TXCH'

  const handleSwap = () => {
    setBalanceDisplay(isXchTop ? 'fiat' : 'xch')
  }

  return (
    <section className="text-center py-4 relative flex flex-col items-center">
      <div className="absolute inset-0 m-auto w-32 h-16 bg-[#FF2E93]/10 blur-3xl pointer-events-none" />
      
      {/* Шапка баланса */}
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2 select-none mb-1">
        <span>{t.label}</span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`text-zinc-500 hover:text-white p-1 rounded transition-colors cursor-pointer disabled:pointer-events-none ${
            isFetching ? "animate-spin text-[#FF2E93]" : ""
          }`}
        >
          <RefreshCw size={12} />
        </button>
      </p>

      {/* КОНТЕЙНЕР С РОДНЫМИ ОТСТУПАМИ */}
      <div className={`flex flex-col w-full justify-center items-center ${
        isXchTop 
          ? "flex-col space-y-1" 
          : "flex-col-reverse space-y-reverse space-y-1"
      }`}>
        
        {/* БЛОК XCH */}
        <div 
          onClick={isXchTop ? handleSwap : undefined}
          className={`tracking-tight text-white select-none transition-all duration-150 ${
            isXchTop 
              ? "text-4xl font-black cursor-pointer active:scale-98" 
              : "text-xs font-bold text-zinc-400"
          }`}
          title={isXchTop ? t.titleSwap : undefined}
        >
          {balanceXCH}{" "}
          <span className={`font-medium transition-colors duration-150 ${isXchTop ? "text-2xl text-zinc-500" : "text-[10px] text-zinc-500"}`}>
            {xchTicker}
          </span>
        </div>

        {/* БЛОК ФИАТА */}
        <div 
          onClick={!isXchTop ? handleSwap : undefined}
          suppressHydrationWarning={true} 
          className={`transition-all duration-150 select-none ${
            isError ? "text-red-500" : ""
          } ${
            isXchTop 
              ? "text-xs font-bold text-zinc-400" 
              : "text-4xl font-black text-white cursor-pointer active:scale-98"
          }`}
          title={!isXchTop ? t.titleSwap : undefined}
        >
          {/* Рендерим локализованную строку фиата */}
          {currency === "RUB" ? (
            `≈ ${fiatValue.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
          ) : (
            `≈ $${fiatValue.toFixed(2)} USD`
          )}
        </div>

      </div>

      {/* 🚀 СТИЛЬНАЯ КНОПКА КУПИТЬ XCH С ПЛЮСИКОМ */}
      <div className="mt-4">
        <a
          href="/api/deposit"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus size={10} className="stroke-[3]" />
          <span>{language === 'ru' ? 'Купить XCH' : 'Buy XCH'}</span>
        </a>
      </div>

    </section>
  )
}
