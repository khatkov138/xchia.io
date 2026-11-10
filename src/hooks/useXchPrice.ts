'use client'

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

const INTERNAL_NEXT_PRICES_API = "/api/nextjs/prices"

interface PricesResponse {
  success: boolean;
  source: string;
  usd: number;
  rub: number;
}

export function useXchPrice() {
  const [mounted, setMounted] = useState(false)
  const [localUsd, setLocalUsd] = useState<number | null>(null)

  // 📡 Фоновый запрос курса к API через TanStack Query
  const { data: marketData } = useQuery<PricesResponse>({
    queryKey: ["xchMarketPriceNextRouter"],
    queryFn: async () => {
      const res = await fetch(INTERNAL_NEXT_PRICES_API)
      const json: PricesResponse = await res.json()
      
      if (json?.usd && typeof window !== "undefined") {
        localStorage.setItem("xch_last_price_usd", json.usd.toString())
      }
      return json
    },
    staleTime: 15000
  })

  // 🎯 Синхронизация кэша строго после монтажа в DOM браузера
  useEffect(() => {
    setMounted(true)
    
    const saved = localStorage.getItem("xch_last_price_usd")
    if (saved) {
      setLocalUsd(parseFloat(saved))
    }
  }, [])

  // Обновляем локальный стейт, если прилетел свежий ответ от сети
  useEffect(() => {
    if (marketData?.usd) {
      setLocalUsd(marketData.usd)
    }
  }, [marketData])

  const displayPrice = localUsd ?? marketData?.usd

  return {
    price: displayPrice,
    isReady: mounted && !!displayPrice,
    marketData
  }
}
