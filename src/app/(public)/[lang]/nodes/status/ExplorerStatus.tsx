'use client'

import React, { useState, useEffect } from "react"
import { NetworkStatusCard } from "./_components/NetworkStatusCard"
import { useNodesStatus } from "@/hooks/useNodesStatus"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider" // 🚀 Подключаем твой стор локализации
import { statusTranslations } from "./status.translations" // 🚀 Наш локальный импорт

export default function ExplorerStatus() {
  const [isClientReady, setIsClientReady] = useState(false)
  const { isPythonDown, networks } = useNodesStatus()

  // 🏭 Достаем активный язык кошелька/интерфейса из стора ('ru' | 'en')
  const language = useUserSettingsStore((state) => state.language)
  const t = statusTranslations[language || "en"]

  useEffect(() => { 
    setIsClientReady(true) 
  }, [])

  const mainnet = networks.mainnet
  const testnet = networks.testnet11

  // 🎯 Фикс: Крутим лоадер, пока идет загрузка ХОТЯ БЫ одной ноды
  const isGlobalLoading = (mainnet.isLoading || testnet.isLoading) && !isPythonDown

  if (!isClientReady || isGlobalLoading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-3 text-center flex-1 text-[9px]">
      <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#FF2E93] rounded-full animate-spin" />
      <p className="font-bold text-zinc-500 uppercase tracking-widest animate-pulse">{t.loading}</p>
    </div>
  )

  return (
    <div className="w-full space-y-6 py-4 text-[9px]">
      
      {/* ЗАГОЛОВОК ИНФРАСТРУКТУРЫ */}
      <div className="text-center space-y-2 max-w-xl mx-auto border-b border-zinc-900/60 pb-5">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
           {t.titlePre} <span className="bg-gradient-to-r from-[#FF2E93] to-[#8B5CF6] bg-clip-text text-transparent">{t.titlePost}</span>
        </h1>
        <p className="text-xs text-zinc-550 font-medium">
          {t.subtitle}
        </p>
      </div>

      {/* СЕТКА КАРТОЧЕК */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
        
        {/* Панель 1: MAINNET */}
        <div className="flex flex-col h-full min-h-[250px]">
          <NetworkStatusCard 
            networkName="MAINNET"
            nodeData={mainnet.nodeData}
            isRpcDown={mainnet.isRpcDown || isPythonDown}
          />
        </div>

        {/* Панель 2: TESTNET11 */}
        <div className="flex flex-col h-full min-h-[250px]">
          <NetworkStatusCard 
            networkName="TESTNET11"
            nodeData={testnet.nodeData}
            isRpcDown={testnet.isRpcDown || isPythonDown}
          />
        </div>

      </div>
    </div>
  )
}
