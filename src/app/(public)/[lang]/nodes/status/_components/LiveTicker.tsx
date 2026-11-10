'use client'

import React from "react"

interface LiveTickerProps {
  isSynced: boolean
  isConnecting: boolean
  cleanPercent: string
}

export function LiveTicker({ isSynced, isConnecting, cleanPercent }: LiveTickerProps) {
  return (
    <div className="p-0.5 bg-zinc-950/60 border border-zinc-900/40 rounded-xl font-mono select-none w-full">
      <div className="flex items-center p-1.5 bg-zinc-900/20 border border-zinc-900/40 rounded-lg text-white text-[8px] font-bold h-6">
        <span className={`h-1 w-1 rounded-full mr-1.5 shrink-0 ${isSynced ? "bg-emerald-400 animate-pulse" : "bg-zinc-500 animate-pulse"}`} />
        <span className="text-zinc-400 font-sans tracking-tight">
          {isSynced 
            ? "Локальное ядро полностью синхронизировано с глобальной сетью" 
            : isConnecting 
              ? "Поиск active-пиров в инфраструктуре..." 
              : `Идет процесс синхронизации базы данных узла...`
          }
        </span>
      </div>
    </div>
  )
}
