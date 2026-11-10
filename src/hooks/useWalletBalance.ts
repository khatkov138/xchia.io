'use client'

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useWalletDashboard } from "./useWalletDashboard"

const INTERNAL_NEXT_PRICES_API = "/api/nextjs/prices"

interface PricesResponse {
  success: boolean;
  source: string;
  usd: number;
  rub: number;
}

// Легковесный, чистый хелпер для вывода XCH в UI без мутаций кэша
export function formatXchBalance(mojo: number, decimals: number = 4): string {
  const xch = mojo / 1_000_000_000_000
  return xch.toFixed(decimals)
}

export function useWalletBalance() {
  // Достаем чистый числовой баланс mojo прямо из актуального контракта дашборда
  const { totalMojo, error, refetch, isFetching } = useWalletDashboard()
  
  const currency = useUserSettingsStore((state) => state.currency)
  const setCurrency = useUserSettingsStore((state) => state.setCurrency)

  // Поллинг рыночных цен Chia
  const { data: marketData, isError: isPriceError } = useQuery<PricesResponse, Error>({
    queryKey: ["xchMarketPriceNextRouter"],
    queryFn: async () => {
      const res = await fetch(INTERNAL_NEXT_PRICES_API);
      if (!res.ok) throw new Error("Internal Next.js price route unavailable");
      return res.json();
    },
    staleTime: 15000, 
    gcTime: 30000
  });

  const isNodeError = Boolean(error)
  const isError = isNodeError || isPriceError

  // Конвертируем mojo в XCH для различных сценариев UI
  const balanceXCH = isNodeError ? "0.0000" : formatXchBalance(totalMojo, 4)
  const numericXCH = isNodeError ? 0 : totalMojo / 1_000_000_000_000
  
  const isLoading = isFetching && (!marketData || isNodeError)

  // 🎯 Абсолютно чистый расчет фиатной стоимости на базе чисел
  const fiatValue = useMemo(() => {
    if (isError || !marketData) return 0
    
    const usdPrice = marketData.usd || 0
    const rubPrice = marketData.rub || 0
    
    return currency === "RUB" ? numericXCH * rubPrice : numericXCH * usdPrice
  }, [isError, currency, numericXCH, marketData])

  const toggleCurrency = () => {
    if (!isNodeError) {
      setCurrency(currency === "RUB" ? "USD" : "RUB")
    }
  }

  return {
    balanceXCH,    // Строка для красивого рендера ("0.9391")
    numericXCH,    // Числовое представление XCH для калькуляторов (0.939191...)
    fiatValue,     // 🔢 Чистое фиатное число
    currency,
    isError,
    isLoading, 
    isFetching,
    refetch,
    toggleCurrency
  }
}
