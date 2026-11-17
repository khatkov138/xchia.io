'use client'

import { useQuery } from "@tanstack/react-query"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { deriveWalletAddressData } from "@/lib/utils/chia-address"
import { callChiaRpc, ChiaNetwork } from "@/lib/utils/chia-rpc-client"
import { calculateChiaCoinId } from "@/lib/utils/crypto"

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

type DerivedWalletAddress = ReturnType<typeof deriveWalletAddressData>

const GAP = 40
const MAX_LIM = 1000
const derivationCache = new Map<string, DerivedWalletAddress>()

function getCachedAddress(masterPkHex: string, index: number, network: ChiaNetwork) {
  const key = `${network}:${masterPkHex}:${index}`
  let cached = derivationCache.get(key)
  if (!cached) {
    cached = deriveWalletAddressData(masterPkHex, index, network)
    derivationCache.set(key, cached)
  }
  return cached
}

export function useWalletDashboard() {
  const unhardenedPkHex = useWalletSessionStore((state: any) => state.unhardenedPkHex)
  const isVerifying = useWalletSessionStore((state: any) => state.isVerifying)
  const isScreenLocked = useWalletSessionStore((state: any) => state.isScreenLocked)
  const network = useUserSettingsStore((state: any) => state.network) as ChiaNetwork

  const query = useQuery({
    queryKey: ["xchia-wallet-dashboard-v2", network, unhardenedPkHex],
    queryFn: async () => {
      const phMap = new Map<string, number>()
      const addresses: ChiaAddressRecord[] = []
      const allRecords: any[] = []

      let curStart = 0
      let curEnd = GAP

      // Сканируем пачками по 40 адресов, пока не встретим 40 пустых подряд
      while (curStart < MAX_LIM) {
        const batchHashes: string[] = []

        for (let i = curStart; i < Math.min(curEnd, MAX_LIM); i++) {
          const derived = getCachedAddress(unhardenedPkHex, i, network)
          const cleanPh = derived.puzzle_hash.replace(/^0x/i, "").toLowerCase()
          phMap.set(cleanPh, i)
          batchHashes.push(derived.puzzle_hash)
          addresses.push({
            index: i,
            puzzle_hash: derived.puzzle_hash,
            address_pubkey_hex: derived.address_pubkey_hex,
            mojo: 0,
            coins_count: 0,
          })
        }

        const data = await callChiaRpc(network, "get_coin_records_by_puzzle_hashes", {
          puzzle_hashes: batchHashes,
          include_spent_coins: true,
          start_height: 0,
        })

        const records = data.coin_records ?? []
        allRecords.push(...records)

        let maxActiveIdx = -1
        for (const r of records) {
          const ph = String(r.coin.puzzle_hash).replace(/^0x/i, "").toLowerCase()
          const idx = phMap.get(ph)
          if (idx !== undefined && idx > maxActiveIdx) maxActiveIdx = idx
        }

        if (maxActiveIdx !== -1 && curEnd - maxActiveIdx < GAP) {
          curStart = curEnd
          curEnd = Math.min(maxActiveIdx + GAP + 1, MAX_LIM)
        } else {
          break
        }
      }

      // Собираем итог по балансу и живым UTXO
      let totalMojo = 0
      const activeIndexes = new Set<number>()
      const unspentCoins: ChiaCoinRecord[] = []
      const addrByPh = new Map(addresses.map((a) => [a.puzzle_hash.replace(/^0x/i, "").toLowerCase(), a]))

      for (const r of allRecords) {
        const c = r.coin
        const amt = Number(c.amount)
        const ph = String(c.puzzle_hash).replace(/^0x/i, "").toLowerCase()
        const idx = phMap.get(ph)

        if (idx === undefined || r.spent) continue

        activeIndexes.add(idx)
        totalMojo += amt

        const addrObj = addrByPh.get(ph)
        if (addrObj) {
          addrObj.mojo += amt
          addrObj.coins_count += 1
        }

        unspentCoins.push({
          coin_id: "0x" + calculateChiaCoinId(c.parent_coin_info, c.puzzle_hash, amt),
          wallet_index: idx,
          coin: {
            parent_coin_info: c.parent_coin_info,
            puzzle_hash: c.puzzle_hash,
            amount: amt,
          },
        })
      }

      return {
        totalMojo,
        addresses,
        unspentCoins: unspentCoins.sort((a, b) => a.wallet_index - b.wallet_index || b.coin.amount - a.coin.amount),
        rawRecords: allRecords,
        meta: {
          network,
          scanned: addresses.length,
          active_indexes: Array.from(activeIndexes).sort((a, b) => a - b),
        },
      }
    },
    enabled: !isVerifying && !isScreenLocked && !!unhardenedPkHex,
    staleTime: 15000,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })

  return {
    totalMojo: query.data?.totalMojo ?? 0,
    addresses: query.data?.addresses ?? [],
    unspentCoins: query.data?.unspentCoins ?? [],
    rawRecords: query.data?.rawRecords ?? [],
    meta: query.data?.meta ?? null,
    isLoading: query.isLoading || !query.data,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
