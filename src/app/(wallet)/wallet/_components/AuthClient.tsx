'use client'

import React, { useState, useCallback } from "react"
import { KeyRound, PlusCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

import { CreateWalletForm } from "./auth/CreateWalletForm"
import { ImportPhraseForm } from "./auth/import-wallet/ImportPhraseForm"

// 🚀 ПОДКЛЮЧАЕМ ЛОКАЛИЗАЦИЮ ИЗ НАШИХ ЕДИНЫХ ИСТОЧНИКОВ
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"

import { GeneratePhraseForm } from "./auth/import-wallet/GeneratePhraseForm"
import { authTranslations } from "./auth/translations/auth.translations"

function AuthTabsContainer({ 
  currentTab, 
  onTabChange, 
  onSubmit,
  t
}: { 
  currentTab: "phrase" | "create"
  onTabChange: (tabName: "phrase" | "create") => void
  onSubmit: (phrase: string) => void 
  t: any
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 bg-zinc-900/60 p-1 border border-zinc-800 rounded-2xl">
        <button
          type="button"
          onClick={() => onTabChange("phrase")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === "phrase" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
          }`}
        >
          <KeyRound size={13} />
          <span>{t.tabSignIn}</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("create")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            currentTab === "create" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
          }`}
        >
          <PlusCircle size={13} />
          <span>{t.tabCreate}</span>
        </button>
      </div>

      <Card className="bg-zinc-900/40 border border-zinc-900 shadow-2xl backdrop-blur-xl rounded-[28px] overflow-hidden">
        <CardContent className="p-5">
          {currentTab === "phrase" ? (
            <ImportPhraseForm onSubmit={onSubmit} />
          ) : (
            <GeneratePhraseForm onSubmit={onSubmit} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthClient() {
 const [currentTab, setCurrentTab] = useState<"phrase" | "create">("create")

  const [showPin, setShowPin] = useState(false)
  const [phraseToEncrypt, setPhraseToEncrypt] = useState("")

  // 🏭 Достаем активный язык кошелька/интерфейса из стора ('ru' | 'en')
  const language = useUserSettingsStore((state) => state.language)
  const t = authTranslations[language || "en"]

  const handlePhraseSubmit = useCallback((phraseToSave: string) => {
    const cleanPhrase = phraseToSave.trim()
    if (!cleanPhrase) return

    setPhraseToEncrypt(cleanPhrase)
    setShowPin(true)
  }, [])

  return (
    <div className="w-full space-y-6 pt-4 animate-in fade-in duration-300">
      {!showPin ? (
        <div className="space-y-6">
          <section className="space-y-2.5">
            <h1 className="text-3xl font-black tracking-tight text-white leading-tight">
              {t.title} <span className="bg-gradient-to-r from-[#FF2E93] to-[#B82EFF] bg-clip-text text-transparent">{t.titleGradient}</span>
            </h1>
            <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
              {t.subtitle}
            </p>
          </section>

          <AuthTabsContainer 
            currentTab={currentTab} 
            onTabChange={setCurrentTab} 
            onSubmit={handlePhraseSubmit} 
            t={t}
          />
        </div>
      ) : (
        <CreateWalletForm phraseToEncrypt={phraseToEncrypt} />
      )}
    </div>
  )
}
