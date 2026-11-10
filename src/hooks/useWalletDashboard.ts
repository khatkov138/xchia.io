'use client'

import { useQuery } from "@tanstack/react-query"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"

export interface ChiaCoinRecord {
  coin_id: string
  wallet_index: number
  coin: {
    parent_coin_info: string
    puzzle_hash: string
    amount: number
  }
}

export interface ChiaAddressRecord {
  index: number
  puzzle_hash: string
  address_pubkey_hex: string
  mojo: number
  coins_count: number
}

export function useWalletDashboard() {
  // 🔐 Сессионные данные авторизации из Zustand-стора
  const unhardenedPkHex = useWalletSessionStore((state: any) => state.unhardenedPkHex)
  const activeIndexes = useWalletSessionStore((state: any) => state.activeIndexes)
  const setActiveIndexes = useWalletSessionStore((state: any) => state.setActiveIndexes)
  const isVerifying = useWalletSessionStore((state: any) => state.isVerifying)
  const isScreenLocked = useWalletSessionStore((state: any) => state.isScreenLocked)
  
  // 🎯 Настройки сети из провайдера (mainnet / testnet11)
  const network = useUserSettingsStore((state: any) => state.network)

  const queryKey = ["xchia-wallet-dashboard", network, unhardenedPkHex, activeIndexes]
  const currentMode = !activeIndexes ? "heavy" : "light"

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        publicKeyHex: unhardenedPkHex,
        network: network,
        mode: currentMode,
        limit: "200",
        ...(activeIndexes && { active_indexes: activeIndexes })
      })

      console.log(`📡 [API TRIGGER] Синхронизация xchia кошелька [${network.toUpperCase()}]`)
      const res = await fetch(`/api/wallet/dashboard?${params.toString()}`)
      if (!res.ok) throw new Error("Wallet sync failed")
      
      const serverData = await res.json()

      // 🔄 Автоматическая синхронизация деривационных индексов в Zustand сессии
      if (serverData?.meta?.active_indexes) {
        const freshIndexesStr = serverData.meta.active_indexes.join(",")
        if (freshIndexesStr !== activeIndexes && typeof setActiveIndexes === "function") {
          setTimeout(() => setActiveIndexes(freshIndexesStr), 0)
        }
      }

      return serverData
    },
    enabled: !isVerifying && !isScreenLocked && !!unhardenedPkHex,
    staleTime: 10000,          // Данные считаются свежими 10 секунд
    refetchInterval: 10000,    // Поллинг каждые 10 секунд под время блока Chia
    refetchIntervalInBackground: false,
  })

  // 🛠️ Только чистые, прозрачные данные без лишней самодеятельности
  const unspentCoins = (query.data?.unspent_coins ?? []) as ChiaCoinRecord[]
  const addresses = (query.data?.balance?.addresses ?? []) as ChiaAddressRecord[]
  const totalMojo = (query.data?.balance?.total_mojo ?? 0) as number

  return {
    totalMojo,         // Общий баланс кошелька в mojo (число)
    addresses,         // Все сгенерированные адреса с их mojo-балансами
    unspentCoins,      // Весь массив живых UTXO-монет кошелька
    meta: query.data?.meta ?? null,
    
    // Стейты TanStack Query
    isLoading: query.isLoading || !query.data,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch
  }
}
