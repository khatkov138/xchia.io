'use client'

import React from "react"
import { useXchPrice } from "@/hooks/useXchPrice" // 🚀 Подключаем твой новый хук

export const XchTicker = React.memo(function XchTicker() {
  // Вытаскиваем цену и статус готовности из хука
  const { price, isReady } = useXchPrice()

  // ⏳ ФАЗА СЕРВЕРА И ГИДРАТАЦИИ:
  // Четкий, плотный скелетон в тон кнопкам шапки.
  if (!isReady || !price) {
    return (
      <div className="w-[72px] h-[24px] bg-zinc-900/80 border border-zinc-800 rounded-xl" />
    )
  }

  // ФАЗА КЛИЕНТА: Моментальное отображение готового курса
  return (
    <div className="text-[10px] font-bold text-zinc-400 border border-zinc-900 bg-zinc-900/10 px-2.5 py-1 rounded-xl font-mono tracking-tight">
      XCH: ${price.toFixed(2)}
    </div>
  )
})
