'use client'

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useWalletDashboard } from "@/hooks/useWalletDashboard" // укажи свой путь
import { callChiaRpc, ChiaNetwork } from "@/lib/utils/chia-rpc-client"
import { calculateChiaCoinId, puzzleHashToAddress } from "@/lib/utils/crypto"


const CHUNK_SIZE = 40 // Лимит массива для RPC-валидатора

interface ParsedCoin {
  id: string
  pid: string
  ph: string
  addr: string
  amt_m: number
  c_blk: number
  s_blk: number
  ts: number
  spent: boolean
}

function parseCoinRecord(r: any, network: ChiaNetwork): ParsedCoin {
  const entry = r.coin_record ?? r
  const c = entry.coin ?? r.coin ?? {}

  const amt = Number(c.amount ?? 0)
  const ph = String(c.puzzle_hash ?? "").replace(/^0x/i, "").toLowerCase()
  const pid = String(c.parent_coin_info ?? "").replace(/^0x/i, "").toLowerCase()
  const cBlk = Number(entry.confirmed_block_index ?? entry.confirmed_block ?? 0)
  const sBlk = Number(entry.spent_block_index ?? entry.spent_block ?? 0)
  const spent = Boolean(entry.spent || entry.is_spent || sBlk > 0)

  let cid = String(r.name ?? entry.name ?? "").replace(/^0x/i, "").toLowerCase()
  if (cid.length !== 64 && pid.length === 64 && ph.length === 64) {
    cid = calculateChiaCoinId(pid, ph, amt)
  }

  const addr = ph.length === 64 ? puzzleHashToAddress(`0x${ph}`, network) : ""

  return {
    id: cid,
    pid,
    ph,
    addr,
    amt_m: amt,
    c_blk: cBlk,
    s_blk: sBlk,
    ts: Number(entry.timestamp ?? r.timestamp ?? 0),
    spent,
  }
}

// Хелпер для батчинга запросов по 40 parent_ids
async function fetchByParentIds(network: ChiaNetwork, parentIds: string[]) {
  const results: any[] = []
  for (let i = 0; i < parentIds.length; i += CHUNK_SIZE) {
    const batch = parentIds.slice(i, i + CHUNK_SIZE)
    const res = await callChiaRpc(network, "get_coin_records_by_parent_ids", {
      parent_ids: batch,
      include_spent_coins: true,
    })
    if (Array.isArray(res.coin_records)) {
      results.push(...res.coin_records)
    }
  }
  return results
}

export function useWalletTransactions(perPage: number = 10) {
  const [page, setPage] = useState(1)
  const network = useUserSettingsStore((state: any) => state.network) as ChiaNetwork

  // Берем уже загруженные монеты и адреса из дашборда (0 лишних запросов!)
  const { addresses, rawRecords, isLoading: isDashboardLoading } = useWalletDashboard()

  // Парсим монеты кошелька и определяем блоки активности
  const { parsedCoins, sortedBlocks, localPhSet } = useMemo(() => {
    const phSet = new Set(addresses.map((a) => a.puzzle_hash.replace(/^0x/i, "").toLowerCase()))
    const coins: ParsedCoin[] = []
    const blocksSet = new Set<number>()

    for (const r of rawRecords) {
      const p = parseCoinRecord(r, network)
      if (p.id.length !== 64) continue
      coins.push(p)
      if (p.c_blk > 0) blocksSet.add(p.c_blk)
      if (p.s_blk > 0) blocksSet.add(p.s_blk)
    }

    return {
      parsedCoins: coins,
      sortedBlocks: Array.from(blocksSet).sort((a, b) => b - a),
      localPhSet: phSet,
    }
  }, [rawRecords, addresses, network])

  const paginatedBlocks = useMemo(
    () => sortedBlocks.slice((page - 1) * perPage, page * perPage),
    [sortedBlocks, page, perPage]
  )

  const query = useQuery({
    queryKey: ["wallet-transactions-client-v2", network, paginatedBlocks, parsedCoins.length],
    queryFn: async () => {
      if (!paginatedBlocks.length) return []

      const pageBlocksSet = new Set(paginatedBlocks)
      const ourSpentInPage = parsedCoins.filter((c) => c.spent && pageBlocksSet.has(c.s_blk))

      const allInputsByParent = new Map<string, ParsedCoin[]>()
      const childrenByParent = new Map<string, ParsedCoin[]>()

      // 1. Восстанавливаем все входы (inputs) и выходы (outputs) для потраченных монет на текущей странице
      if (ourSpentInPage.length > 0) {
        const zeroParent = "0".repeat(64)
        const parentIds = Array.from(
          new Set(ourSpentInPage.filter((sc) => sc.pid !== zeroParent).map((sc) => `0x${sc.pid}`))
        )

        if (parentIds.length > 0) {
          const pRecords = await fetchByParentIds(network, parentIds)
          for (const r of pRecords) {
            const pCoin = parseCoinRecord(r, network)
            if (pCoin.spent && pageBlocksSet.has(pCoin.s_blk)) {
              const key = `${pCoin.s_blk}_${pCoin.pid}`
              const list = allInputsByParent.get(key) ?? []
              list.push(pCoin)
              allInputsByParent.set(key, list)
            }
          }
        }

        const resolvedInputIds = new Set<string>()
        for (const sc of ourSpentInPage) {
          const siblings = allInputsByParent.get(`${sc.s_blk}_${sc.pid}`) ?? [sc]
          for (const sib of siblings) {
            resolvedInputIds.add(sib.id)
          }
        }

        if (resolvedInputIds.size > 0) {
          const childParentIds = Array.from(resolvedInputIds).map((id) => `0x${id}`)
          const cRecords = await fetchByParentIds(network, childParentIds)
          for (const r of cRecords) {
            const ch = parseCoinRecord(r, network)
            const list = childrenByParent.get(ch.pid) ?? []
            list.push(ch)
            childrenByParent.set(ch.pid, list)
          }
        }
      }

      // 2. Собираем финальную структуру блоков истории 1-в-1 как в Python
      const history: any[] = []
      const zeroParent = "0".repeat(64)

      for (const blk of paginatedBlocks) {
        const receivedCoins = parsedCoins.filter((c) => c.c_blk === blk)
        const spentCoins = parsedCoins.filter((c) => c.spent && c.s_blk === blk)
        if (!receivedCoins.length && !spentCoins.length) continue

        const blkEntry: any = {
          block: blk,
          ts: receivedCoins.length ? receivedCoins[0].ts : spentCoins[0].ts,
        }

        if (receivedCoins.length) {
          receivedCoins.sort((a, b) => b.amt_m - a.amt_m)
          blkEntry.received = receivedCoins.map((rc) => ({
            id: rc.id,
            pid: rc.pid,
            mojo: rc.amt_m,
            type: rc.pid === zeroParent ? "COINBASE" : "RECEIVE",
            puzzle_hash: `0x${rc.ph}`,
            addr: rc.addr,
          }))
        }

        if (spentCoins.length) {
          const inputsMap = new Map<string, ParsedCoin>()
          const outputsMap = new Map<string, ParsedCoin>()

          for (const sc of spentCoins) {
            const fullInputs = allInputsByParent.get(`${blk}_${sc.pid}`) ?? [sc]
            for (const ip of fullInputs) {
              inputsMap.set(ip.id, ip)
              const children = childrenByParent.get(ip.id) ?? []
              for (const op of children) {
                outputsMap.set(op.id, op)
              }
            }
          }

          const inputsList = Array.from(inputsMap.values()).sort((a, b) => b.amt_m - a.amt_m)
          const outputsList = Array.from(outputsMap.values()).sort((a, b) => b.amt_m - a.amt_m)

          const uniqueSpentPhs = new Set(inputsList.map((i) => i.ph).filter(Boolean))
          const hasForeignInputs = inputsList.some((i) => !localPhSet.has(i.ph))
          const isBundle = hasForeignInputs || uniqueSpentPhs.size > 1

          const totalIn = inputsList.reduce((acc, i) => acc + i.amt_m, 0)
          const totalOut = outputsList.reduce((acc, o) => acc + o.amt_m, 0)
          let feeM = Math.max(0, totalIn - totalOut)
          if (feeM > 5_000_000_000_000 || isBundle) feeM = 0

          blkEntry.sent = [
            {
              fee_mojo: feeM,
              is_bundle: isBundle,
              spent: inputsList.map((i) => ({
                id: i.id,
                mojo: i.amt_m,
                addr: i.addr,
                puzzle_hash: `0x${i.ph}`,
              })),
              created: outputsList.map((o) => ({
                id: o.id,
                mojo: o.amt_m,
                addr: o.addr,
                puzzle_hash: `0x${o.ph}`,
                change: localPhSet.has(o.ph),
              })),
            },
          ]
        }

        history.push(blkEntry)
      }

      return history
    },
    enabled: !isDashboardLoading && paginatedBlocks.length > 0,
    staleTime: 15000,
    refetchInterval: 15000,
  })

  return {
    historyList: query.data ?? [],
    totalBlocks: sortedBlocks.length,
    page,
    setPage,
    isLoading: isDashboardLoading || query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
