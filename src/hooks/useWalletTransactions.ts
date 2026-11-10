'use client'

import { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"

export function useWalletTransactions(perPage: number = 10) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const unhardenedPkHex = useWalletSessionStore((state: any) => state.unhardenedPkHex)
  const activeIndexes = useWalletSessionStore((state: any) => state.activeIndexes)
  const network = useUserSettingsStore((state: any) => state.network)

  const dashboardCache = queryClient.getQueryData<any>([
    "xchia-wallet-dashboard",
    network,
    unhardenedPkHex,
    activeIndexes
  ])
  
  const activeIndexesStr = dashboardCache?.meta?.active_indexes?.join(",") || activeIndexes || "0"

  const query = useQuery({
    queryKey: ["wallet-transactions-pool", network, unhardenedPkHex, activeIndexesStr, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        publicKeyHex: unhardenedPkHex,
        active_indexes: activeIndexesStr,
        network: network,
        page: String(page),
        
        perPage: String(perPage)
      })
      
      const res = await fetch(`/api/wallet/transactions?${params.toString()}`)
      if (!res.ok) throw new Error("Transactions fetch failed")
      return res.json() // Прилетает сырой, неизмененный респонс эксплорера
    },
    enabled: !!unhardenedPkHex && !!activeIndexesStr,
    staleTime: 10000,
    refetchInterval: 1000000,
  })

  // 🚀 ЧЕСТНОЕ СХЛОПЫВАНИЕ ДУБЛИКАТОВ НА ФРОНТЕНДЕ (SINGLE SOURCE OF TRUTH)
  const harmonizedHistory = useMemo(() => {
    const rawHistory = query.data?.history || []
    const seenBlocks = new Set<number>()
    
    // Фильтруем массив: если блок активности с таким номером уже был добавлен в пачку — 
    // скипаем его дубликат, который нода прислала из-за деривации мульти-адресов!
    return rawHistory.filter((blockEntry: any) => {
      if (seenBlocks.has(blockEntry.block)) {
        return false // Нашли дубликат — сносим к чертям
      }
      seenBlocks.add(blockEntry.block)
      return true
    })
  }, [query.data?.history])

  return {
    historyList: harmonizedHistory, // Сюда улетает чистый, дедуплицированный массив блоков
    totalBlocks: query.data?.total_blocks ?? 0,
    page,
    setPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch
  }
}
