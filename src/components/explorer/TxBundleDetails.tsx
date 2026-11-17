'use client'
import React from "react"
import Link from "next/link"
import { CheckCircle2, Search } from "lucide-react"
import { ParsedTx, fMojo, fHash } from "./tx-history-core"

interface TxBundleDetailsProps { 
  t?: ParsedTx | null; 
  rawSent: any; 
  curAddr: string; 
  getCoinUrl: (id: string) => string;
  targetCoinId?: string; // Хэш искомой монеты для режима эксплорера блока
}

export default function TxBundleDetails({ t, rawSent, curAddr, getCoinUrl, targetCoinId }: TxBundleDetailsProps) {
  if (!rawSent) return null

  const cleanCreatedMojo = rawSent.created?.reduce((acc: number, o: any) => acc + (o.change ? 0 : (o.mojo || 0)), 0) || 0
  const totalChangeMojo = rawSent.created?.reduce((acc: number, o: any) => acc + (o.change ? (o.mojo || 0) : 0), 0) || 0

  const fullBundleSpentMojo = rawSent.spent?.reduce((acc: number, i: any) => acc + (i.mojo || 0), 0) || 0
  const fullBundleCreatedMojo = rawSent.created?.reduce((acc: number, o: any) => acc + (o.mojo || 0), 0) || 0
  
  // Вычисляем комиссию бандла
  const absoluteFeeMojo = rawSent.fee_mojo || Math.max(0, fullBundleSpentMojo - fullBundleCreatedMojo)

  const cleanTarget = targetCoinId ? targetCoinId.replace("0x", "").trim().toLowerCase() : ""

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      
      {/* ЛЕВАЯ КОЛОНКА: BURNED */}
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        {/* 🔥 Двоеточие снесено */}
        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-0.5">
          <span className="text-red-400/90 flex items-center gap-1">BURNED <span className="text-[10px] select-none text-red-500/70 font-normal">🔥</span></span>
          <span className="font-normal lowercase text-zinc-400">{fMojo(fullBundleSpentMojo)} xch</span>
        </div>
        <div className="space-y-1 max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800">
          {[...rawSent.spent]
            .sort((a, b) => { 
              const aOur = a.addr && a.addr.toLowerCase().trim() === curAddr;
              const bOur = b.addr && b.addr.toLowerCase().trim() === curAddr; 
              if (aOur && !bOur) return -1; 
              if (!aOur && bOur) return 1; 
              return b.mojo - a.mojo; 
            })
            .map((i, k) => {
              const isOur = i.addr && i.addr.toLowerCase().trim() === curAddr
              const cleanId = i.id ? i.id.replace("0x", "").trim().toLowerCase() : ""
              const isTarget = cleanTarget && cleanId === cleanTarget

              return (
                <Link 
                  key={k} 
                  href={getCoinUrl(i.id)} 
                  className={`flex justify-between items-center py-1.5 px-2 rounded text-[9px] gap-3 transition-colors group/coin border ${
                    isTarget 
                      ? "bg-zinc-900/40 border-zinc-700 border-l-2 border-l-zinc-500 text-zinc-200" 
                      : "bg-red-500/5 border-red-500/10 text-zinc-400 hover:border-red-500/30"
                  }`}
                >
                  <span className="truncate font-mono text-[9px] flex-1 inline-flex items-center gap-1.5">
                    {isOur && !isTarget && <CheckCircle2 size={10} className="text-red-400 shrink-0" />}
                    {isTarget && <Search size={10} className="text-zinc-400 shrink-0" />}
                    <span className={isTarget ? "text-zinc-200 font-bold" : "text-zinc-500 group-hover/coin:text-zinc-300"}>
                      {fHash(i.id)}
                    </span>
                    {isTarget && (
                      <span className="bg-zinc-800 text-zinc-300 text-[6px] px-1 py-px rounded border border-zinc-700 font-sans font-black uppercase tracking-wide shrink-0">
                        found
                      </span>
                    )}
                  </span>
                  <span className={`font-bold shrink-0 ${isTarget ? "text-zinc-200" : "text-red-400"}`}>
                    {fMojo(i.mojo)} XCH
                  </span>
                </Link>
              )
            })}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: CREATED */}
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        {/* 🌱 Двоеточие снесено */}
        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-zinc-500 px-0.5">
          <span className="flex items-center gap-1">CREATED <span className="text-[10px] select-none text-emerald-500/70 font-normal">🌱</span></span>
          <div className="flex items-center gap-1 font-mono font-normal lowercase text-zinc-400 flex-wrap">
            <span>{fMojo(cleanCreatedMojo)} xch</span>
            <span>•</span>
            <span className="text-blue-400/90">change: {fMojo(totalChangeMojo)} xch</span>
            <span>•</span>
            <span>fee: {absoluteFeeMojo > 0 ? fMojo(absoluteFeeMojo) : "0.0000"} xch</span>
          </div>
        </div>
        <div className="space-y-1 max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800">
          {[...rawSent.created]
            .sort((a, b) => b.mojo - a.mojo)
            .map((o, k) => {
              const cleanId = o.id ? o.id.replace("0x", "").trim().toLowerCase() : ""
              const isTarget = cleanTarget && cleanId === cleanTarget

              return (
                <Link 
                  key={k} 
                  href={getCoinUrl(o.id)} 
                  className={`flex justify-between items-center py-1.5 px-2 rounded text-[9px] gap-3 transition-colors group/coin border ${
                    isTarget 
                      ? "bg-zinc-900/40 border-zinc-700 border-l-2 border-l-zinc-500 text-zinc-200" 
                      : o.change 
                        ? "bg-blue-500/5 border-blue-500/10 text-blue-400 hover:border-blue-500/30" 
                        : "bg-zinc-500/5 border-zinc-850 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    {isTarget && <Search size={10} className="text-zinc-400 shrink-0" />}
                    <span className={`truncate font-mono text-[9px] ${isTarget ? "text-zinc-200 font-bold" : "text-zinc-500 group-hover/coin:text-zinc-300"}`}>
                      {fHash(o.id)}
                    </span>
                    
                    {/* Бэджик найденной монеты (found) */}
                    {isTarget && (
                      <span className="bg-zinc-800 text-zinc-300 text-[6px] px-1 py-px rounded border border-zinc-700 font-sans font-black uppercase tracking-wide shrink-0">
                        found
                      </span>
                    )}
                    
                    {/* Бэджик сдачи (change) */}
                    {o.change && (
                      <span className="inline-flex items-center px-1 py-px rounded bg-blue-500/10 text-blue-400 text-[7px] font-sans font-black uppercase tracking-wide shrink-0 select-none">
                        change
                      </span>
                    )}
                  </span>
                  <span className={`font-bold shrink-0 ${isTarget ? "text-zinc-200" : o.change ? "text-blue-400" : "text-zinc-300"}`}>
                    {fMojo(o.mojo)} XCH
                  </span>
                </Link>
              )
            })}
        </div>
      </div>

    </div>
  )
}
