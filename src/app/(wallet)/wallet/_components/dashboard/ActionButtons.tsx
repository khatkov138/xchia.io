'use client'

import React from "react"
import { ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { actionButtonsTranslations } from "./translations/action-buttons.translations"

interface ActionButtonsProps {
  onReceiveClick: () => void
  onSendClick: () => void
}

export function ActionButtons({ onReceiveClick, onSendClick }: ActionButtonsProps) {
  // 🏭 Достаем активный язык кошелька из Zustand стора настроек
  const language = useUserSettingsStore((state) => state.language)
  const t = actionButtonsTranslations[language || "en"]

  return (
    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-center select-none">
      <button 
        onClick={onReceiveClick}
        className="h-12 border border-zinc-900 bg-zinc-900/20 rounded-xl text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-900/40 active:scale-[0.98] transition-all"
      >
        <ArrowDownLeft size={14} className="text-emerald-400 shrink-0" /> 
        <span>{t.receive}</span>
      </button>

      <button 
        onClick={onSendClick}
        className="h-12 bg-white text-zinc-950 rounded-xl flex items-center justify-center gap-1.5 shadow-sm font-black cursor-pointer hover:bg-zinc-100 active:scale-[0.98] transition-all"
      >
        <ArrowUpRight size={14} className="shrink-0" /> 
        <span>{t.send}</span>
      </button>
    </div>
  )
}
