'use client'

import { useMemo } from "react"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useWalletDashboard } from "./useWalletDashboard"
import { useXchPrice } from "./useXchPrice" // Укажи свой правильный путь импорта

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

  // Получаем курс через наш изолированный хук без прямого вызова TanStack Query
  const {
    usdPrice,
    rubPrice,
    isReady: isPriceReady,
    isError: isPriceError
  } = useXchPrice()

  const isNodeError = Boolean(error)
  // Если есть кэшированная цена в localStorage, ошибка сети не сломает отображение фиата
  const isError = isNodeError || (isPriceError && !isPriceReady)

  // Конвертируем mojo в XCH для различных сценариев UI
  const balanceXCH = isNodeError ? "0.0000" : formatXchBalance(totalMojo, 4)
  const numericXCH = isNodeError ? 0 : totalMojo / 1_000_000_000_000
  
  const isLoading = isFetching && (!isPriceReady || isNodeError)

  // 🎯 Абсолютно чистый расчет фиатной стоимости на базе чисел
  const fiatValue = useMemo(() => {
    if (isError || !isPriceReady) return 0
    
    const activeRate = currency === "RUB" ? (rubPrice ?? 0) : (usdPrice ?? 0)
    return numericXCH * activeRate
  }, [isError, isPriceReady, currency, numericXCH, rubPrice, usdPrice])

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
