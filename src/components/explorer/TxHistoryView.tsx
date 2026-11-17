'use client'
import React, { useState, useMemo } from "react"
import { Layers } from "lucide-react"
import TxRow from "./TxRow"
import { ParsedTx, TxHistoryViewProps } from "./tx-history-core"

interface ProTxHistoryViewProps extends TxHistoryViewProps { onRowClick?: (tx: ParsedTx) => void; address?: string }

export function TxHistoryView({ historyList, net, lang, compact = false, onRowClick, address }: ProTxHistoryViewProps) {
  const [openTxKey, setOpenTxKey] = useState<string | null>(null)

const txs = useMemo(() => {
  const parsedTxs: ParsedTx[] = []
  if (!historyList || !Array.isArray(historyList)) return parsedTxs

  // === РЕЖИМ 1: ЭКСПЛОРЕР (Оставляем твой оригинальный, рабочий код для одного адреса) ===
  if (address) {
    historyList.forEach((b: any) => {
      if (b.received) {
        b.received.forEach((r: any, rIdx: number) => {
          const cleanId = r.id ? r.id.replace("0x", "") : ""
          parsedTxs.push({ 
            ...r, blk: b.block, ts: b.ts, type: "RECEIVE", display_id: cleanId ? `0x${cleanId}` : "",
            mojo: r.mojo, puzzle_hash: r.puzzle_hash, addr: r.addr,
            row_key: `rec_${b.block}_${rIdx}_${cleanId.slice(0, 6)}`
          })
        })
      }
      if (b.sent) {
        b.sent.forEach((s: any, sIdx: number) => {
          const firstSpent = s.spent && s.spent.length > 0 ? s.spent[0].id : ""
          const cleanSpentId = firstSpent ? firstSpent.replace("0x", "") : ""
          parsedTxs.push({ 
            ...s, blk: b.block, ts: b.ts, type: "SENT", display_id: cleanSpentId ? `0x${cleanSpentId}` : "",
            mojo: s.spent.reduce((acc: number, i: any) => acc + i.mojo, 0) - s.created.reduce((acc: number, o: any) => acc + (o.change ? o.mojo : 0), 0), 
            raw_sent: s, puzzle_hash: s.puzzle_hash, addr: s.addr,
            row_key: `sent_${b.block}_${sIdx}_${cleanSpentId.slice(0, 6)}`
          })
        })
      }
    })
    return parsedTxs
  }

  // === РЕЖИМ 2: КОШЕЛЕК (Честный раздельный вывод: сколько сожгли и сколько получили) ===
  historyList.forEach((b: any, bIdx: number) => {
    // 1. Выводим все получения кошелька
    if (b.received) {
      b.received.forEach((r: any, rIdx: number) => {
        const cleanId = r.id ? r.id.replace("0x", "") : ""
        parsedTxs.push({ 
          ...r, 
          blk: b.block, 
          ts: b.ts, 
          type: "RECEIVE", 
          display_id: cleanId ? `0x${cleanId}` : "",
          mojo: r.mojo, 
          row_key: `w_rec_${b.block}_${rIdx}_${cleanId.slice(0, 6)}`,
          raw_sent: b.sent && b.sent.length > 0 ? b.sent[0] : null
        })
      })
    }

    // 2. Выводим все отправки кошелька (сумма spent кошелька)
    if (b.sent) {
      b.sent.forEach((s: any, sIdx: number) => {
        const firstSpent = s.spent && s.spent.length > 0 ? s.spent[0].id : ""
        const cleanSpentId = firstSpent ? firstSpent.replace("0x", "") : ""
        
        // Для кошелька сумма отправки — это просто сумма всех уничтоженных монет этого кошелька в транзакции
        const walletSpentMojo = s.spent?.reduce((acc: number, i: any) => acc + (i.mojo || 0), 0) || 0

        if (walletSpentMojo > 0) {
          parsedTxs.push({ 
            ...s, 
            blk: b.block, 
            ts: b.ts, 
            type: "SENT", 
            display_id: cleanSpentId ? `0x${cleanSpentId}` : "",
            mojo: walletSpentMojo, 
            raw_sent: s,
            row_key: `w_sent_${b.block}_${sIdx}_${cleanSpentId.slice(0, 6)}`
          })
        }
      })
    }
  })

  return parsedTxs
}, [historyList, address])



  if (txs.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center font-mono">
        <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-600 mb-2"><Layers size={16} className="stroke-[1.5]" /></div>
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">История пуста</h4>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 w-full">
      {txs.map((t, idx) => (
        <div key={t.row_key || idx} onClick={() => { if (compact && onRowClick) onRowClick(t) }} className={compact ? "cursor-pointer" : ""}>
          <TxRow t={t} net={net} lang={lang} compact={compact} isOpen={openTxKey === t.row_key} onToggle={() => setOpenTxKey(openTxKey === t.row_key ? null : t.row_key)} address={address} />
        </div>
      ))}
    </div>
  )
}
