'use client'

import React, { useState, useRef, useEffect, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Check } from "lucide-react"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"

export const LangDropdown = React.memo(function LangDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const language = useUserSettingsStore((state) => state.language)
  const setLanguage = useUserSettingsStore((state) => state.setLanguage)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLangSelect = (nextLang: 'ru' | 'en') => {
    setIsOpen(false)
    if (language === nextLang) return

    // 1. Сначала железно обновляем Zustand стейт настроек
    setLanguage(nextLang)

    // 2. Если мы находимся в изолированной зоне кошелька — роутинг URL по локалям не трогаем
    if (pathname === '/wallet' || pathname.startsWith('/wallet/')) {
      return
    }

    // 3. 🌍 ПУБЛИЧНЫЙ РОУТИНГ: Подменяем локаль в URL без потери страницы и query-параметров (?txId=...)
    const segments = pathname.split("/")
    
    // Если первый сегмент после слэша — текущий язык, подменяем его
    if (segments[1] === "en" || segments[1] === "ru") {
      segments[1] = nextLang
    } else {
      // Резервный фолбэк: если зашли на роут без префикса, насильно пушим его в начало
      segments.splice(1, 0, nextLang)
    }

    const newPathname = segments.join("/")
    const currentParams = searchParams.toString()
    const finalUrl = currentParams ? `${newPathname}?${currentParams}` : newPathname

    // Устанавливаем куку для мгновенного подхвата на сервере в middleware/proxy
    document.cookie = `xchia_lang=${nextLang}; path=/; max-age=31536000; SameSite=Lax`

    startTransition(() => {
      router.push(finalUrl)
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 hover:text-white font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl active:scale-[0.95] transition-all cursor-pointer disabled:opacity-50"
      >
        <span>{language.toUpperCase()}</span>
        <ChevronDown size={11} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[110px] bg-[#0c0c0e] border border-zinc-800 rounded-xl p-1 shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 z-50">
          <div className="px-2 pt-1 pb-0.5 text-[7px] font-black text-zinc-600 tracking-wider uppercase">Язык / Lang</div>

          <button
            type="button"
            onClick={() => handleLangSelect('ru')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${language === 'ru' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>Русский</span>
            {language === 'ru' && <Check size={11} className="text-zinc-500" />}
          </button>

          <button
            type="button"
            onClick={() => handleLangSelect('en')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${language === 'en' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}
          >
            <span>English</span>
            {language === 'en' && <Check size={11} className="text-zinc-500" />}
          </button>
        </div>
      )}
    </div>
  )
})
