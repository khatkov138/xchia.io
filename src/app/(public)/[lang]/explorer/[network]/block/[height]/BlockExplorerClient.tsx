'use client'
import React, { use, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Box, Clock, ShieldCheck, Cpu, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CoinRow } from "./CoinRow"
import { blockTranslations } from "./block.translations"
import { WalletLanguage } from "@/config/i18n"

const fMojo = (m: any) => (!m || Number(m) === 0) ? "0.000000000000" : (Number(m) / 1e12).toFixed(12).replace(/\.?0+$/, "")
const fDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleString("ru-RU") : "—"

export function BlockExplorerClient({ dataPromise, paramsPromise }: { dataPromise: Promise<any>, paramsPromise: Promise<any> }) {
  const initialServerData = use(dataPromise), params = use(paramsPromise)
  const net = params?.network || "mainnet", height = params?.height || "", lang = (params?.lang || "ru") as WalletLanguage
  const [copiedHeight, setCopiedHeight] = useState(false), [copiedHash, setCopiedHash] = useState(false)
  const [tab, setTab] = useState<"removals" | "additions">("removals"), [page, setPage] = useState(1), itemsPerPage = 50

  const t = blockTranslations[lang] || blockTranslations.en

  const { data: res } = useQuery({
    queryKey: ["blockData", height, net],
    queryFn: () => fetch(`/api/v1/blocks/get-block?height=${height}&network=${net}`).then(r => r.json()),
    initialData: initialServerData, staleTime: 15000,
  })

  if (!res || !res.success) return <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[20px] p-4 text-center text-zinc-500 font-bold text-[10px]">{t.notFound}</div>
  const block = res.block_record || {}, headerHash = block.header_hash || "", feesMojo = res.fees_mojo || 0
  
  const sortedAdditions = useMemo(() => [...(res.additions || [])].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)), [res.additions])
  const sortedRemovals = useMemo(() => [...(res.removals || [])].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)), [res.removals])
  const activeList = tab === "additions" ? sortedAdditions : sortedRemovals
  const paginatedList = useMemo(() => activeList.slice((page - 1) * itemsPerPage, page * itemsPerPage), [activeList, page])
  const totalPages = Math.ceil(activeList.length / itemsPerPage)

  return (
    <div className="space-y-3 w-full font-mono text-[11px] text-left animate-in fade-in duration-150">
      <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-[20px] space-y-2">
        <h2 className="text-xs font-black text-[#FF2E93] uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900/50 pb-1.5"><Box size={13} /> {t.explorerTitle} ({net.toUpperCase()})</h2>
        <div className="flex items-center gap-2 text-[11px]"><span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider w-20 shrink-0">{t.blockHeight}</span><span className="text-white font-black">#{height}</span>
          <button onClick={() => { try { navigator.clipboard.writeText(String(height)); setCopiedHeight(true); setTimeout(() => setCopiedHeight(false), 2000) } catch {} }} className={`p-1 border rounded-lg text-zinc-400 ${copiedHeight ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-950 border-zinc-800"}`}>{copiedHeight ? <Check size={10} /> : <Copy size={10} />}</button></div>
        <div className="flex items-center gap-2 text-[11px] min-w-0"><span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider w-20 shrink-0">{t.blockHash}</span><span className="text-zinc-400 font-normal truncate max-w-md select-all">{headerHash}</span>
          <button onClick={() => { try { navigator.clipboard.writeText(headerHash); setCopiedHash(true); setTimeout(() => setCopiedHash(false), 2000) } catch {} }} className={`p-1 border rounded-lg text-zinc-400 shrink-0 ${copiedHash ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-950 border-zinc-800"}`}>{copiedHash ? <Check size={10} /> : <Copy size={10} />}</button></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { t: t.fee, v: `${fMojo(feesMojo)} XCH`, i: <Cpu size={14} />, c: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }, 
          { t: t.time, v: fDate(block.timestamp), i: <Clock size={14} />, c: "bg-[#FF2E93]/10 text-[#FF2E93] border-[#FF2E93]/20" },
          { t: t.activity, v: `${activeList.length} ${t.moons}`, i: <ShieldCheck size={14} />, c: tab === "additions" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400" }
        ].map((b, i) => (
          <Card key={i} className="bg-zinc-900/20 border border-zinc-900/50 rounded-[20px]"><CardContent className="p-3 flex items-center gap-2"><div className={`p-1.5 rounded-lg border shrink-0 ${b.c}`}>{b.i}</div><div className="truncate"><h3 className="text-[8px] font-bold text-zinc-500 uppercase">{b.t}</h3><p className="text-[11px] font-black text-white pt-0.5 truncate">{b.v}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex border-b border-zinc-900/80 pb-1 gap-1.5 px-0.5">
          <button onClick={() => { setTab("removals"); setPage(1) }} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${tab === "removals" ? "bg-rose-500/10 text-rose-400" : "text-zinc-500 border-transparent"}`}>{t.tabRemovals} ({sortedRemovals.length}) 🔥</button>
          <button onClick={() => { setTab("additions"); setPage(1) }} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${tab === "additions" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 border-transparent"}`}>{t.tabAdditions} ({sortedAdditions.length}) 🌱</button>
        </div>

        <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[20px] overflow-hidden"><CardContent className="p-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-900 space-y-1">
          {paginatedList.length === 0 ? <div className="text-center py-4 text-zinc-600 font-bold text-[10px]">{t.empty}</div> : paginatedList.map((item: any, idx: number) => <CoinRow key={idx} item={item} lang={lang} net={net} height={height} tab={tab} />)}
        </CardContent></Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex items-center gap-1 text-zinc-400 text-[9px] font-bold uppercase bg-zinc-900/40 border border-zinc-900 px-2.5 py-1 rounded-xl disabled:opacity-30"><ChevronLeft size={10} /><span>{lang === "ru" ? "Назад" : "Prev"}</span></button>
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/20 border px-2.5 py-1 rounded-xl">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="inline-flex items-center gap-1 text-zinc-400 text-[9px] font-bold uppercase bg-zinc-900/40 border border-zinc-900 px-2.5 py-1 rounded-xl disabled:opacity-30"><span>{lang === "ru" ? "Далее" : "Next"}</span><ChevronRight size={10} /></button>
          </div>
        )}
      </div>
    </div>
  )
}
