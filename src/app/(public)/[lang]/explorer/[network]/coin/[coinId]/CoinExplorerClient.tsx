'use client'
import React, { use } from "react"
import { useQuery } from "@tanstack/react-query"
import { LockKeyhole, LockKeyholeOpen, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { puzzleHashToAddress } from "@/lib/utils/crypto"

const fMojo = (m: any) => m ? (Number(m) / 1e12).toFixed(12).replace(/\.?0+$/, "") : "0"
const fDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("ru-RU") : "—"

export function CoinExplorerClient({ dataPromise, paramsPromise }: { dataPromise: Promise<any>, paramsPromise: Promise<any> }) {
  const init = use(dataPromise), p = use(paramsPromise)
  const net = p?.network || "mainnet", cid = p?.coinId || "", lang = p?.lang || "ru"

  // Живой поллинг состояния монеты
  const { data: coin } = useQuery({
    queryKey: ["explorer-coin", cid, net],
    queryFn: async () => {
      const res = await fetch(`/api/v1/coins/track-coin?coinId=${cid}&network=${net}`)
      if (!res.ok) throw new Error("Network response was not ok")
      return res.json()
    },
    initialData: init,
    refetchInterval: (q) => ["SPENT", "UNSPENT"].includes(q.state.data?.status) ? false : 10000,
    staleTime: 0, 
    gcTime: 300000, 
    refetchOnWindowFocus: true,
  })

  const d = coin || init
  if (!d) return <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-8 text-center text-zinc-500 font-bold uppercase text-xs">Загрузка...</div>
  if (d.success === false) return <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-8 text-center text-zinc-500 font-bold uppercase text-xs">Монета не найдена</div>
  
  const status = d?.status || "NOT_FOUND", isSpent = status === "SPENT"
  const addr = d?.puzzle_hash ? puzzleHashToAddress(d.puzzle_hash, net) : null
  const cBundle = d?.created_bundle_id || d?.parent_coin_info || d?.blk
  const sBundle = d?.spent_bundle_id || d?.tx_id

  const Row = ({ l, v, lk }: { l: string, v: any, lk?: string }) => (
    <div className="flex flex-col py-1 border-b border-zinc-900/60 gap-1 last:border-0 last:pt-0.5">
      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">{l}</span>
      {lk ? <Link href={lk} className={`font-mono break-all hover:text-[#FF2E93] transition-colors font-medium flex items-center gap-1 ${l.includes('Address')?'text-zinc-300':l.includes('Parent')?'text-zinc-400':'text-emerald-400'}`}><span>{v}</span>{l.includes('Bundle') && <ExternalLink size={10} className="text-zinc-600" />}</Link> : <span className={`font-mono font-medium ${l.includes('ID')?'text-[#FF2E93]':'text-zinc-300'}`}>{v}</span>}
    </div>
  )

  return (
    <div className="w-full space-y-4 text-left animate-in fade-in duration-200">
      
      {/* 🎯 КАРТОЧКА СТАТУСА С ОГОНЬКОМ И ТРАВКОЙ */}
      <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${!isSpent ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/5 text-zinc-500 border-zinc-900"}`}>
              {!isSpent ? <LockKeyhole size={20} /> : <LockKeyholeOpen size={20} className="stroke-[1.5]" />}
            </div>
            <div>
              <h3 className="text-xs font-black text-white">
                {isSpent ? "Статус: Потрачена (Spent) 🔥" : "Статус: Не потрачена (Unspent) 🌱"}
              </h3>
              <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
                {isSpent ? "Монета безвозвратно уничтожена в бандле" : "Монета жива и готова к трате"}
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${isSpent ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-emerald-500/10 text-emerald-400"}`}>
            <span className={`inline-block h-1 w-1 rounded-full mr-1.5 ${!isSpent ? 'animate-pulse bg-emerald-400' : 'bg-zinc-600'}`} />
            {status}
          </span>
        </CardContent>
      </Card>

      <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 space-y-3.5 text-[11px]">
        <Row l="Coin ID (Name)" v={cid} />
        <div className="flex justify-between items-center py-1 border-b border-zinc-900/60">
          <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Объём монеты</span>
          <span className="font-black text-emerald-400 text-xs font-mono">{fMojo(d.amount_mojo || d.amount)} XCH</span>
        </div>
        
        {addr && <Row l="Address" v={addr} lk={`/${lang}/explorer/${net}/address/${addr}`} />}
        {d.parent_coin_info && <Row l="Parent Coin ID (Родитель)" v={d.parent_coin_info} lk={`/${lang}/explorer/${net}/coin/${d.parent_coin_info}`} />}
        
        {/* 🎯 СТРОКА СОЗДАНИЯ */}
        <div className="flex justify-between items-center py-1 border-b border-zinc-900/60 gap-4 font-mono">
          <div className="flex flex-col gap-0.5">
            <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Created In Block (Блок создания)</span>
            <Link href={`/${lang}/explorer/${net}/block/${cBundle}`} className="text-zinc-300 break-all hover:text-[#FF2E93] transition-colors font-medium flex items-center gap-1">
              <span>#{cBundle}</span>
              <ExternalLink size={10} className="text-zinc-600" />
            </Link>
          </div>
          <Link href={`/${lang}/explorer/${net}/bundle?blockHeight=${cBundle}&coinId=${cid}&mode=created`} className="text-emerald-400 hover:text-[#FF2E93] transition-colors font-sans font-bold text-[10px] bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 flex items-center gap-1 shrink-0">
            <span>Подробности рождения</span> 🌱
          </Link>
        </div>
        
        {/* 🎯 СТРОКА ТРАТЫ */}
        <div className="flex justify-between items-center py-1 border-b border-zinc-900/60 gap-4 font-mono">
          <div className="flex flex-col gap-0.5 w-full">
            <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Spent In Block (Блок Траты)</span>
            {isSpent ? (
              <Link href={`/${lang}/explorer/${net}/block/${sBundle}`} className="text-zinc-300 break-all hover:text-[#FF2E93] transition-colors font-medium flex items-center gap-1">
                <span>#{sBundle}</span>
                <ExternalLink size={10} className="text-zinc-600" />
              </Link>
            ) : (
              <span className="text-zinc-500 font-medium text-[10px]">Монета еще не потрачена</span>
            )}
          </div>
          {isSpent && (
            <Link href={`/${lang}/explorer/${net}/bundle?blockHeight=${sBundle}&coinId=${cid}&mode=spent`} className="text-rose-400 hover:text-[#FF2E93] transition-colors font-sans font-bold text-[10px] bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 flex items-center gap-1 shrink-0">
              <span>Подробности сжигания</span> 🔥
            </Link>
          )}
        </div>
        
        <div className="flex justify-between items-center py-1 border-b border-zinc-900/60">
          <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Время блока (UTC)</span>
          <span className="text-zinc-300 font-medium font-mono">{fDate(d.timestamp || d.ts)}</span>
        </div>
      </div>
    </div>
  )
}
