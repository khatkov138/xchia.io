'use client'

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

const INTERNAL_NEXT_PRICES_API = "/api/nextjs/prices"
const STORAGE_KEY = "xch_last_prices"

export interface PricesResponse {
  success: boolean
  source: string
  usd: number
  rub: number
}

interface CachedPrices {
  usd: number
  rub: number
}

export function useXchPrice() {
  const [mounted, setMounted] = useState(false)
  const [cachedPrices, setCachedPrices] = useState<CachedPrices | null>(null)

  const { data: marketData, isError } = useQuery<PricesResponse>({
    queryKey: ["xchMarketPriceNextRouter"],
    queryFn: async () => {
      const res = await fetch(INTERNAL_NEXT_PRICES_API)
      if (!res.ok) {
        throw new Error("Internal Next.js price route unavailable")
      }
      const json: PricesResponse = await res.json()

      if (json?.usd && json?.rub && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ usd: json.usd, rub: json.rub })
          )
        } catch {
          // Игнорируем ошибку доступа к localStorage
        }
      }
      return json
    },
    staleTime: 15000,
    gcTime: 30000
  })

  useEffect(() => {
    setMounted(true)

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as CachedPrices
        if (typeof parsed?.usd === "number" && typeof parsed?.rub === "number") {
          setCachedPrices(parsed)
        }
      }
    } catch {
      // Игнорируем ошибку парсинга или доступа к хранилищу
    }
  }, [])

  const usdPrice = marketData?.usd ?? cachedPrices?.usd ?? null
  const rubPrice = marketData?.rub ?? cachedPrices?.rub ?? null

  return {
    price: usdPrice,
    usdPrice,
    rubPrice,
    isReady: mounted && usdPrice !== null && rubPrice !== null,
    isError,
    marketData
  }
}
