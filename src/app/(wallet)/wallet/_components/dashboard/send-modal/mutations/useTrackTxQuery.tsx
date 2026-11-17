'use client'

import { useQuery } from "@tanstack/react-query"
import { callChiaRpc, ChiaNetwork } from "@/lib/utils/chia-rpc-client"

export interface TrackTxResult {
  success: boolean
  status: "IN_MEMPOOL" | "CONFIRMED" | "PENDING_NODE"
  block_height: number | null
}

function normalizeHex(hash: string): string {
  const clean = String(hash || "").replace(/^0x/i, "").trim().toLowerCase()
  return clean ? `0x${clean}` : ""
}

export function useTrackTxQuery(txId: string, targetCoinId: string, network: ChiaNetwork) {
  const cleanTxId = normalizeHex(txId)
  const cleanCoinId = normalizeHex(targetCoinId)

  return useQuery<TrackTxResult | null>({
    queryKey: ["track-tx-v2", cleanTxId, cleanCoinId, network],
    queryFn: async () => {
      if (!cleanTxId || !cleanCoinId || !network) return null

      // 1. Проверяем наличие транзакции в мемпуле
      try {
        const mempoolRes = await callChiaRpc(network, "get_mempool_item_by_tx_id", {
          tx_id: cleanTxId,
        })
        if (mempoolRes?.success) {
          return { success: true, status: "IN_MEMPOOL", block_height: null }
        }
      } catch {
        // Если нода ответила success: false — транзакции уже (или еще) нет в мемпуле, идем проверять блокчейн
      }

      // 2. Проверяем подтверждение монеты в блокчейне
      try {
        const coinRes = await callChiaRpc(network, "get_coin_record_by_name", {
          name: cleanCoinId,
        })
        const coinRecord = coinRes?.coin_record
        if (coinRes?.success && coinRecord) {
          return {
            success: true,
            status: "CONFIRMED",
            block_height: Number(coinRecord.confirmed_block_index ?? 0),
          }
        }
      } catch {
        // Монета еще не попала в подтвержденный блок
      }

      return { success: true, status: "PENDING_NODE", block_height: null }
    },
    enabled: !!cleanTxId && !!cleanCoinId && !!network,
    refetchInterval: (query) => {
      if (query.state.data?.status === "CONFIRMED") return false
      return 6000
    },
    staleTime: 0,
  })
}
