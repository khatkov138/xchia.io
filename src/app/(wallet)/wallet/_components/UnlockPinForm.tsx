'use client'

import React, { useState } from "react"
import { useRouter } from "next/navigation"

import { useWalletAuth } from "@/hooks/useWalletAuth"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { PinCodeLayout } from "../../_components/PinCodeLayout"

const DEFAULT_SUBTITLE = "Введи ПИН-код для подтверждения сессии и защиты активов"

export function UnlockPinForm() {
  const router = useRouter()
  
  const { unlockWithPin, hardResetWallet } = useWalletAuth()
  const isVerifying = useWalletSessionStore((state) => state.isVerifying)

  const [shake, setShake] = useState(false)
  const [isError, setIsError] = useState(false)
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE)

  const handleResetWallet = () => {
    hardResetWallet()
    router.push("/auth")
  }

  const handlePinComplete = async (pin: string, clearPin: () => void) => {
    try {
      setIsError(false)
      setSubtitle("Проверяем ПИН-код...")
      
      const success = await unlockWithPin(pin)
      if (!success) throw new Error("INVALID_PIN")
    } catch (e) {
      console.error("❌ Ошибка разблокировки:", e)

      // 🎯 1. Включаем тряску и красную подсветку с ошибкой
      setIsError(true)
      setShake(true)
      setSubtitle("Неверный ПИН-код! Попробуй еще раз")

      // 🎯 2. МГНОВЕННЫЙ СБРОС ТОЧЕК (через 300мс после затухания физической тряски)
      // Красный текст ошибки ОСТАЕТСЯ висеть на экране, пока юзер не нажмет кнопку заново!
      setTimeout(() => {
        clearPin()        // Очищаем звездочки в буфере (точки станут пустыми)
        setShake(false)   // Выключаем флаг анимации тряски
      }, 300)
    }
  }

  // 🎯 3. СБРОС ТЕКСТА ОШИБКИ И ПОДСВЕТКИ СТРОГО ПРИ ПЕРВОМ НАЖАТИИ КНОПКИ
  const handleResetErrorVisuals = () => {
    setIsError(false)
    setSubtitle(DEFAULT_SUBTITLE)
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
      <div className="h-[480px] w-full">
        <PinCodeLayout
          title="Сейф закрыт"
          subtitle={subtitle}
          isError={isError}
          isLocked={isVerifying} 
          shake={shake}
          onPinComplete={handlePinComplete}
          onResetError={handleResetErrorVisuals} // Пробрасываем триггер сброса текста
        />
      </div>
    </div>
  )
}
