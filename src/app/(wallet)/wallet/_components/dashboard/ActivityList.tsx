'use client'

import React, { useState } from "react"
import { Layers, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useWalletDashboard } from "@/hooks/useWalletDashboard"
import { useWalletTransactions } from "@/hooks/useWalletTransactions"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { TxHistoryView } from "@/components/explorer/TxHistoryView" 
import { TransactionDetailModal } from "./TransactionDetailModal"

export function ActivityList() {
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const perPage = 10
  
  const { isLoading: isDashLoading } = useWalletDashboard()
  const { historyList, totalBlocks, page, setPage, isLoading: isTxLoading, isFetching } = useWalletTransactions(perPage)
  
  const network = useUserSettingsStore((state: any) => state.network)
  const language = useUserSettingsStore((state: any) => state.language) ?? "en" // 🎯 Дефолтим на en

  const isDataLoading = isDashLoading || isTxLoading

  return (
    <div className="space-y-2.5 font-mono text-[11px]">
      {/* 🎯 TRANSLATED TO ENGLISH */}
      <div className="flex items-center justify-between px-0.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
        <div className="flex items-center gap-1.5">
          <Layers size={12} /> <span>Latest Activity</span>
        </div>
        {isFetching && <span className="text-zinc-600 animate-pulse text-[9px]">Updating...</span>}
      </div>
      
      <Card className="bg-zinc-900/20 border border-zinc-900/50 rounded-[24px] overflow-hidden">
        <CardContent className="p-2 space-y-1.5">
          {/* 🎯 TRANSLATED TO ENGLISH */}
          {isDataLoading && historyList.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 uppercase tracking-wider animate-pulse text-[10px]">Syncing history...</div>
          ) : historyList.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 uppercase tracking-wider text-[10px]">No transaction history</div>
          ) : (
            <>
              <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                <TxHistoryView 
                  historyList={historyList} 
                  net={network.toLowerCase()} 
                  lang={String(language).toLowerCase()} 
                  compact={true} 
                  onRowClick={(tx) => setSelectedTx(tx)} 
                />
              </div>

              {/* 🎯 TRANSLATED TO ENGLISH */}
              {historyList.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-900/40 px-1 font-mono">
                  <button 
                    disabled={page === 1 || isFetching} 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-[9px] font-bold uppercase bg-zinc-950/40 border border-zinc-900 px-2.5 py-1 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <ChevronLeft size={10} /><span>Back</span>
                  </button>
                  <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900/30 border border-zinc-900/30 px-2.5 py-1 rounded-xl">
                    Page {page}
                  </span>
                  <button 
                    disabled={isFetching || historyList.length < perPage || page * perPage >= totalBlocks} 
                    onClick={() => setPage(p => p + 1)} 
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-[9px] font-bold uppercase bg-zinc-950/40 border border-zinc-900 px-2.5 py-1 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    <span>Next</span><ChevronRight size={10} />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TransactionDetailModal 
        selectedTx={selectedTx} 
        onClose={() => setSelectedTx(null)} 
      />
    </div>
  )
}
