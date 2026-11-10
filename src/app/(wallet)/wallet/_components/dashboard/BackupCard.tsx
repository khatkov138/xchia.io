'use client'

import React, { useState, useEffect, useRef } from "react"
import { Copy, Check, Eye, EyeOff, ShieldAlert, Printer, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PapperWalletPrintout } from "@/components/PapperWalletPrintout"

// 🎯 ИМПОРТ: Подключаем твой хук авторизации
import { useWalletAuth } from "@/hooks/useWalletAuth" 
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { backupTranslations } from "./translations/backup-card.translations"

export function BackupCard() {
  const { getMnemonicForSigning } = useWalletAuth()

  // 🏭 Читаем глобальный язык интерфейса кошелька из Zustand стора
  const language = useUserSettingsStore((state) => state.language)
  const t = backupTranslations[language || "en"]

  const [mnemonic, setMnemonic] = useState<string>("")
  const [showSeed, setShowSeed] = useState(false)
  const [copiedSeed, setCopiedSeed] = useState(false)
  
  const [isPinStep, setIsPinStep] = useState(false)
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState("")

  const formRef = useRef<HTMLFormElement>(null)

  const isMnemonicValid24Words = mnemonic && mnemonic.trim().split(/\s+/).length === 24

  useEffect(() => {
    if (!showSeed) {
      setMnemonic("")
      setPin("")
      setIsPinStep(false)
      setPinError("")
    }
  }, [showSeed])

  const copySeedPhrase = () => {
    if (!isMnemonicValid24Words) return
    navigator.clipboard.writeText(mnemonic)
    setCopiedSeed(true)
    setTimeout(() => setCopiedSeed(false), 2000)
  }

  const handleToggleEye = () => {
    if (showSeed) {
      setShowSeed(false)
    } else {
      setIsPinStep(!isPinStep)
    }
  }

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 6) return 

    setLoading(true)
    setPinError("")

    try {
      const decryptedMnemonic = await getMnemonicForSigning(pin)
      setMnemonic(decryptedMnemonic)
      setShowSeed(true)
      setIsPinStep(false)
    } catch (err: any) {
      console.error("❌ Ошибка расшифровки сида по ПИН-коду:", err)
      setPinError(t.pinError)
      setPin("")
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "") 
    if (val.length <= 6) {
      setPin(val)
    }

    if (val.length === 6) {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.requestSubmit()
        }
      }, 50)
    }
  }

  return (
    <>
      <Card className="bg-zinc-900/30 border border-zinc-900 rounded-[24px] shadow-xl overflow-hidden print:hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400/90">
              <ShieldAlert size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
            </div>

            <div className="flex items-center gap-2">
              {showSeed && isMnemonicValid24Words && (
                <button
                  onClick={() => window.print()}
                  className="text-zinc-400 hover:text-white px-2 py-1 rounded-md bg-zinc-950 text-[10px] font-bold border border-zinc-850 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Printer size={12} className="text-[#FF2E93]" />
                  <span>{t.btnPrint}</span>
                </button>
              )}

              <button
                onClick={handleToggleEye}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                {showSeed ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showSeed ? t.btnHide : isPinStep ? t.btnCancel : t.btnShow}</span>
              </button>

              {showSeed && isMnemonicValid24Words && (
                <button
                  onClick={copySeedPhrase}
                  className="text-zinc-400 hover:text-white px-2 py-0.5 rounded-md bg-zinc-950 text-[10px] font-mono border border-zinc-850 flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedSeed ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  <span>{copiedSeed ? t.btnCopied : t.btnCopy}</span>
                </button>
              )}
            </div>
          </div>

          {/* ЭТАП 1: Фраза успешно открыта и валидна */}
          {showSeed && !isPinStep && (
            <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl font-mono text-[11px] text-zinc-400 leading-relaxed tracking-tight select-all">
              {isMnemonicValid24Words ? mnemonic : t.errorCorrupted}
            </div>
          )}

          {/* ЭТАП 2: Запрос ПИН-кода */}
          {!showSeed && isPinStep && (
            <form ref={formRef} onSubmit={handleVerifyPin} className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold text-zinc-400 whitespace-nowrap">{t.pinLabel}</span>
                <div className="relative flex-1 max-w-[140px]">
                  {/* 🛡️ КРИТИЧЕСКИЙ ФИКС ДЛЯ КЛИЕНТА (ЗАЩИТА ОТ CHROME PASSWORD MANAGER):
                      Тип изменен на text, но свойства стиля скрывают ввод как точки, отключая менеджер паролей. */}
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••••"
                    value={pin}
                    onChange={handlePinChange}
                    disabled={loading}
                    autoFocus
                    style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-center tracking-widest focus:outline-none focus:border-[#FF2E93] text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || pin.length !== 6}
                  className="bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-40 shrink-0 cursor-pointer min-w-[60px] flex items-center justify-center"
                >
                  {loading ? <Loader2 size={10} className="animate-spin" /> : t.btnSubmit}
                </button>
              </div>
              {pinError && (
                <div className="text-[9px] text-rose-500 font-medium pl-1 text-right">
                  {pinError}
                </div>
              )}
            </form>
          )}

          {/* ЭТАП 3: Фраза скрыта (заглушка) */}
          {!showSeed && !isPinStep && (
            <div 
              onClick={() => setIsPinStep(true)}
              className="p-3 bg-zinc-950/30 border border-zinc-900/60 rounded-xl flex items-center justify-center text-[10px] text-zinc-600 font-bold uppercase tracking-wider select-none py-4 cursor-pointer hover:bg-zinc-950/50 transition-colors"
            >
              •••• •••• •••• •••• •••• ••••
            </div>
          )}
        </CardContent>
      </Card>

      {/* Рендерится только в режиме печати при наличии фразы */}
      {showSeed && isMnemonicValid24Words && (
        <div className="hidden print:block">
          <PapperWalletPrintout mnemonic={mnemonic} />
        </div>
      )}
    </>
  )
}
