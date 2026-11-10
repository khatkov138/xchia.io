'use client'
import React from "react"
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Clock, Box, ChevronDown, HelpCircle } from "lucide-react"
import Link from "next/link"
// Импортируем твою функцию (поправь путь к файлу, если он другой)
import { ParsedTx, fMojo, fHash, fDate} from "./tx-history-core"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import TxBundleDetails from "./TxBundleDetails"
import { puzzleHashToAddress } from "@/lib/utils/crypto"

interface TxRowProps { 
  t: ParsedTx; 
  net: string; 
  lang: string; 
  isOpen: boolean; 
  compact: boolean; 
  onToggle: () => void; 
  address?: string // Если пустой — режим кошелька
}

export default function TxRow({ t, net, lang, isOpen, compact, onToggle, address }: TxRowProps) {
  if (!t) return null
  const isRec = t.type === "RECEIVE", cid = t.display_id || ""
  const getCoinUrl = (id: string) => `/${lang}/explorer/${net}/coin/${id.startsWith("0x") ? id : `0x${id}`}`
  
  const isBundleTx = address ? (t.raw_sent?.is_bundle || false) : false
  const curAddr = address ? address.toLowerCase().trim() : ""
  
  const totalBurnedMojo = t.raw_sent?.spent?.filter(i => i.addr && i.addr.toLowerCase().trim() === curAddr).reduce((acc, i) => acc + (i.mojo || 0), 0) || Math.abs(t.mojo)
  const ourChangeMojo = t.raw_sent?.created?.filter(o => o.change && o.addr && o.addr.toLowerCase().trim() === curAddr).reduce((acc, o) => acc + (o.mojo || 0), 0) || 0
  const pureAddressSpend = address ? (totalBurnedMojo - ourChangeMojo) : Math.abs(t.mojo)

  const rowClass = "border-b border-zinc-900/30 last:border-0 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/10 font-mono w-full"

  // ЛОГИКА ПОДПИСИ: На полученных переводим puzzle_hash в реальный адрес Bech32m
  const renderSubtitleText = () => {
    if (address) {
      // Режим Эксплорера одного адреса
      return fHash(cid || t.row_key)
    }

    // Режим Кошелька
    if (isRec) {
      // Заюзали твою функцию! Переводим хэш в понятный xch/txch адрес
      const fullAddress = puzzleHashToAddress(t.puzzle_hash, net)
      return `to: ${fHash(fullAddress || t.puzzle_hash || "")}`
    } else {
      // Для отправленных пока оставляем как было
      return fHash(cid || t.row_key)
    }
  }
  // 🎯 ОБЪЕКТ ЛОКАЛИЗАЦИИ СТРОК (EN / RU)
  const t_local = {
    en: {
      tooltip: "The coin of this address was spent together with other addresses within a single Spend Bundle (Joint Spend)",
      received: "Received XCH",
      sent: "Sent XCH",
      moreDetails: "More details"
    },
    ru: {
      tooltip: "Монета этого адреса была потрачена совместно с другими адресами в рамках одного Spend Bundle (Совместная трата)",
      received: "Получено XCH",
      sent: "Отправлено XCH",
      moreDetails: "More details" // В оригинале было на английском, сохранил
    }
  }[lang === "ru" ? "ru" : "en"] // Фолбэк на "en", если язык левый

  const renderBundleBadge = () => isBundleTx && (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="bg-zinc-800 text-zinc-400 text-[8px] px-1.5 py-0.5 rounded border border-zinc-700/60 uppercase tracking-wider font-sans font-black inline-flex items-center gap-1 cursor-help select-none">
            <span>SET</span><HelpCircle size={10} className="text-zinc-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-zinc-950 text-zinc-300 text-[9px] font-sans font-medium p-2 rounded-lg border border-zinc-800 shadow-2xl max-w-xs text-center leading-normal z-50">
          <p>{t_local.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // === 1. КОМПАКТНЫЙ РЕЖИМ ===
  if (compact) {
    return (
      <div className={`${rowClass} cursor-pointer p-2.5 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center ${isRec ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700/50"}`}>
            {isRec ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{isRec ? t_local.received : t_local.sent}</span>{renderBundleBadge()}
            </div>
            <p className="text-[10px] text-zinc-500 truncate max-w-[160px]">
              {renderSubtitleText()}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xs font-black ${isRec ? "text-emerald-400" : "text-zinc-400"}`}>
            {isRec ? "+" : "-"}{fMojo(isRec ? Math.abs(t.mojo) : pureAddressSpend)} XCH
          </p>
          <div className="flex items-center justify-end gap-2 mt-0.5 text-[9px] text-zinc-500 font-bold">
            <div className="flex items-center gap-1"><Clock size={9} /><span>{fDate(t.ts)}</span></div>
            <div className="flex items-center gap-1"><Box size={9} /><span>#{t.blk}</span></div>
          </div>
        </div>
      </div>
    )
  }

  // === 2. ОБЫЧНЫЙ РЕЖИМ: ПОЛУЧЕНИЕ (RECEIVE) ===
  if (isRec) {
    return (
      <div className={rowClass}>
        <Link href={cid ? getCoinUrl(cid) : "#"} className="p-2.5 flex items-center justify-between gap-2 group/item w-full block">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
              <ArrowDownLeft size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white group-hover/item:underline inline-flex items-center gap-1">
                <span>{t_local.received}</span><ExternalLink size={10} className="opacity-0 group-hover/item:opacity-100 text-zinc-500 transition-opacity" />
              </p>
              <p className="text-[10px] text-zinc-500 truncate max-w-[260px] mt-0.5">
                {renderSubtitleText()}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-emerald-400">+{fMojo(t.mojo)} XCH</p>
            <div className="flex items-center justify-end gap-2 mt-0.5 text-[9px] text-zinc-500 font-bold">
              <div className="flex items-center gap-1"><Clock size={9} /><span>{fDate(t.ts)}</span></div>
              <div className="flex items-center gap-1"><Box size={9} /><span>#{t.blk}</span></div>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  // === 3. ОБЫЧНЫЙ РЕЖИМ: ОТПРАВКА (SENT) ===
  return (
    <div className="border-b border-zinc-900/30 last:border-0 rounded-xl overflow-hidden transition-colors hover:bg-zinc-900/10 font-mono w-full">
      <div onClick={onToggle} className="flex items-center justify-between p-2.5 group/item gap-2 cursor-pointer select-none">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg border shrink-0 flex items-center justify-center bg-zinc-800 text-zinc-400 border-zinc-700/50">
              <ArrowUpRight size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{t_local.sent}</span>{renderBundleBadge()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 font-sans font-medium hover:text-zinc-300 transition-colors">
                <span>{t_local.moreDetails}</span>
                <ChevronDown size={10} className={`transition-transform duration-200 text-zinc-500 ${isOpen ? "rotate-180 text-zinc-400" : ""}`} />
              </p>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-black text-zinc-400">-{fMojo(pureAddressSpend)} XCH</p>
          <div className="flex items-center justify-end gap-2 mt-0.5 text-[9px] text-zinc-500 font-bold">
            <div className="flex items-center gap-1"><Clock size={9} /><span>{fDate(t.ts)}</span></div>
            <div className="flex items-center gap-1"><Box size={9} /><span>#{t.blk}</span></div>
          </div>
        </div>
      </div>
      {isOpen && t.raw_sent && (
        <div className="px-2.5 pb-3 pt-2.5 border-t border-zinc-900/40 bg-zinc-950/40 text-[10px] text-zinc-400 animate-in fade-in slide-in-from-top-1 duration-150">
          <TxBundleDetails t={t} rawSent={t.raw_sent} curAddr={curAddr} getCoinUrl={getCoinUrl} />
        </div>
      )}
    </div>
  )
}
