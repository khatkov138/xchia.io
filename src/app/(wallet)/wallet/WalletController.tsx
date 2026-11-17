'use client'

import React, { useEffect } from "react"
import { useWalletAuth } from "@/hooks/useWalletAuth"
import { useIdleTimer } from "@/hooks/useIdleTimer"

// 🌐 ИМПОРТЫ: Только живые стейты из памяти браузера
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useSecureStore } from "@/store/useSecureStore"

import { UnlockPinForm } from "./_components/UnlockPinForm"
import AuthClient from "./_components/AuthClient" 
import DashboardClient from "./_components/DashboardClient"

export function WalletController() {
  const { initWalletState } = useWalletAuth()

  // Достаем флаги из сторов сессии
  const isScreenLocked = useWalletSessionStore((state) => state.isScreenLocked)
  const noWalletMode = useWalletSessionStore((state) => state.noWalletMode)
  const unhardenedPkHex = useWalletSessionStore((state) => state.unhardenedPkHex)

  // Контроль простоя (таймаут неактивности)
  useIdleTimer()

  // Накатываем стейты из sessionStorage и IndexedDB при старте
  useEffect(() => {
    initWalletState()
  }, [initWalletState])

  // Считываем состояние кошелька на диске напрямую из ядра Zustand, чтобы не ждать хуков React
  const registerHasWallet = useSecureStore.getState().hasWallet

  // 🚀 ИДЕАЛЬНЫЙ ТУПОЙ РОУТИНГ БЕЗ ЕДИНОЙ ВСПЫШКИ И ПРЫЖКОВ ВЕРСТКИ:
  
  // 1. Кошелька нет на устройстве (первый вход)
  if (noWalletMode || !registerHasWallet) {
    return <AuthClient />
  }

  // 2. Кошелек создан, но сессия пустая / протухла (экран заперт И в памяти пусто)
  if (isScreenLocked && !unhardenedPkHex) {
    return <UnlockPinForm />
  }

  // 3. Сессия активна (при F5 ключи на месте благодаря sessionStorage) — мгновенно летит дашборд
  return <DashboardClient />
}
