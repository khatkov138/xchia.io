'use client'

import React, { useState, useEffect } from "react"
import { FlaskConical, X } from "lucide-react"

export function AlphaBanner() {
  const [isVisible, setIsVisible] = useState<boolean>(false)

  // 🎯 Фиксируем состояние в localStorage строго один раз при монтировании приложения
  useEffect(() => {
    const isDismissed = localStorage.getItem("xchia_alpha_banner_dismissed_v1")
    if (!isDismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("xchia_alpha_banner_dismissed_v1", "true")
    setIsVisible(false)
  }

  // Если юзер её уже закрывал — рендерим чистый пустой див, чтобы не прыгал лейаут
  if (!isVisible) return null

  return (
    <div className="w-full bg-[#FF2E93]/5 border border-[#FF2E93]/20 rounded-none px-4 py-2 flex items-center justify-between gap-3 select-none relative overflow-hidden group shrink-0 transition-all">
      
      {/* Мягкое фоновое кибер-свечение */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF2E93]/10 to-transparent opacity-55 pointer-events-none" />

      {/* Контентная часть */}
      <div className="flex items-center gap-2.5 min-w-0 relative z-10 font-mono flex-1">
        <div className="p-1 bg-[#FF2E93]/10 border border-[#FF2E93]/20 rounded-none text-[#FF2E93] shrink-0 animate-pulse">
          <FlaskConical size={12} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight min-w-0">
          <span className="text-[10px] font-black text-white uppercase tracking-wider shrink-0">
            ALPHA TEST
          </span>
          <span className="hidden sm:inline text-zinc-700 text-[10px] shrink-0">•</span>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide truncate">
            The project is running in early alpha mode. Experimental version.
          </p>
        </div>
      </div>

      {/* 🎯 КНОПКА ЗАКРЫТИЯ (Англофицирована, без скруглений) */}
      <button
        type="button"
        onClick={handleDismiss}
        className="text-zinc-500 hover:text-white transition-colors p-1 rounded-none hover:bg-zinc-900/40 cursor-pointer shrink-0 relative z-10 active:scale-95 flex items-center justify-center"
        title="Dismiss notice"
      >
        <X size={12} />
      </button>

    </div>
  )
}
