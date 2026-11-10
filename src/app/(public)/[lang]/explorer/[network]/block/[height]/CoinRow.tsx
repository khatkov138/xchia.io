'use client'
import React from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

const fMojo = (m: any) => {
  if (!m || Number(m) === 0) return "0.000000000000"
  return (Number(m) / 1e12).toFixed(12).replace(/\.?0+$/, "")
}
const fHashShort = (h: string) => h ? `${h.slice(0, 10)}...${h.slice(-8)}` : "—"

interface CoinRowProps { item: any; lang: string; net: string; height: string; tab: string }

export function CoinRow({ item, lang, net, height, tab }: CoinRowProps) {
  const isAdd = tab === "additions"
  
  return (
    <div className="flex justify-between items-center py-1.5 px-2 bg-zinc-950/40 border border-zinc-900/40 rounded-xl gap-2 hover:border-zinc-800 transition-all font-mono">
      {/* Левая часть: Компактный Coin ID */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-zinc-500 text-[8px] font-bold">ID:</span>
        <Link 
          href={`/${lang}/explorer/${net}/coin/${item.id}`} 
          className="text-zinc-300 hover:text-[#FF2E93] truncate underline decoration-zinc-800"
        >
          {fHashShort(item.id)}
        </Link>
      </div>
      
      {/* Правая часть: Объём и динамическая мультиязычная кнопка бандла */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={isAdd ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
          {fMojo(item.amount)} XCH
        </span>
        <Link 
          href={`/${lang}/explorer/${net}/bundle?blockHeight=${height}&coinId=${item.id}&mode=${isAdd ? "created" : "spent"}`} 
          className={`font-bold flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            isAdd 
              ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10" 
              : "text-rose-400 bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10"
          }`}
        >
          {/* Автоматическое переключение текста на кнопке */}
          <span>{lang === "ru" ? "Бандл" : "Bundle"}</span>
          <ExternalLink size={9} />
        </Link>
      </div>
    </div>
  )
}
