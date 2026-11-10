'use client'

import React from "react"
import Link from "next/link"
import { WalletLanguage } from "@/config/i18n"

import { UserDropdown } from "@/app/(wallet)/_components/UserDropDown"
import { LangDropdown } from "@/app/(wallet)/_components/LangDropdown"
import { headerTranslations } from "./translations/header.translations"
import { XchTicker } from "./XchTicker"

interface UnifiedHeaderProps {
  variant?: "public" | "wallet"
  currentLang?: WalletLanguage
}

export const Header = React.memo(function UnifiedHeader({ 
  variant = "public", 
  currentLang = "en" 
}: UnifiedHeaderProps) {
  
  const isWallet = variant === "wallet"
  const t = headerTranslations[currentLang]
  
  const homeHref = `/${currentLang}`
  const walletHref = "/wallet"
  const explorerHref = `/${currentLang}/explorer`

  return (
    <header className="w-full h-14 flex items-center justify-between border-b border-zinc-900/40 backdrop-blur-sm bg-zinc-950/10 rounded-xl px-2 relative z-50 select-none">
      
      {/* 🟢 ЛЕВАЯ ЧАСТЬ: Бренд-логотип + Курс XCH (Горит ВСЕГДА) */}
      <div className="flex items-center gap-3">
        <Link 
          href={homeHref} 
          className="relative bg-zinc-900/40 border border-zinc-850 text-white font-black text-xs px-3 py-1 rounded-xl transition-all hover:border-zinc-700 active:scale-[0.98]"
        >
          XCH<span className="text-[#FF2E93]">IA</span>
          {!isWallet && (
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#FF2E93]" />
          )}
        </Link>
        
        <XchTicker />
      </div>

      {/* 🎯 ЦЕНТРАЛЬНЫЙ СПЕЙСЕР */}
      <div className="flex-1" />

      {/* 🟢 ПРАВАЯ ЧАСТЬ: Динамический контент кнопок */}
      <div className="flex items-center gap-2">
        {isWallet ? (
          <>
            <UserDropdown />
            <LangDropdown />
          </>
        ) : (
          <>
            <Link 
              href={explorerHref} 
              className="text-[10px] font-bold uppercase text-zinc-400 hover:text-white transition-all px-2 py-1.5"
            >
              {t.explorer}
            </Link>
            
            <Link 
              href={walletHref} 
              className="text-[11px] font-bold uppercase bg-white text-zinc-950 px-3.5 py-1.5 rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-md shadow-white/5"
            >
              {t.login}
            </Link>

            <LangDropdown />
          </>
        )}
      </div>

    </header>
  )
})

export default Header
