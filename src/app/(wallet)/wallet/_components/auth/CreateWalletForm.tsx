'use client'

import React, { useState } from "react"
import { useRouter } from "next/navigation"

import { useWalletAuth } from "@/hooks/useWalletAuth" 
import { PinCodeLayout } from "@/app/(wallet)/_components/PinCodeLayout"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider" // 🚀 Подключили стор
import { createWalletTranslations } from "./create-wallet.translations" // 🚀 Подключили локальный перевод

interface EncryptPhraseFormProps {
  phraseToEncrypt: string
}

export function CreateWalletForm({ phraseToEncrypt }: EncryptPhraseFormProps) {
  const router = useRouter()
  const { createNewWallet } = useWalletAuth()

  // 🏭 Достаем активный язык
  const language = useUserSettingsStore((state) => state.language)
  const t = createWalletTranslations[language || "en"]

  const [step, setStep] = useState<"create" | "confirm">("create")
  const [tempPin, setTempPin] = useState("")

  const [shake, setShake] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  // 🎯 ИСПРАВЛЕНО: Явно указали тип <string> для useState, чтобы туда можно было пушить любые переводы
const [subtitle, setSubtitle] = useState<string>(t.subDefault)

  const handlePinComplete = async (pin: string, clearPin: () => void) => {
    setIsLocked(true)

    if (step === "create") {
      setTempPin(pin)
      clearPin()
      setStep("confirm")
      setSubtitle(t.subConfirm)
      setIsLocked(false)
    } else {
      if (pin === tempPin) {
        try {
          await createNewWallet(phraseToEncrypt, pin)
          
          clearPin()
          setTempPin("")
          
          router.refresh()
        } catch (err: any) {
          setIsError(true)
          setSubtitle(err.message || t.errEncrypt)

          setTimeout(() => {
            setIsError(false)
            setIsLocked(false)
            setStep("create")
            clearPin()
            setTempPin("")
            setSubtitle(t.subDefault)
          }, 1500)
        }
      } else {
        setIsError(true)
        setShake(true)
        setSubtitle(t.errMatch)

        setTimeout(() => setShake(false), 300)
        setTimeout(() => {
          setIsError(false)
          setIsLocked(false)
          setStep("create")
          clearPin()
          setTempPin("")
          setSubtitle(t.subDefault)
        }, 1500)
      }
    }
  }

  return (
    <div className="h-[450px] w-full">
      <PinCodeLayout
        title={step === "create" ? t.titleCreate : t.titleConfirm}
        subtitle={subtitle}
        isError={isError}
        isLocked={isLocked}
        shake={shake}
        onPinComplete={handlePinComplete}
      />
    </div>
  )
}
