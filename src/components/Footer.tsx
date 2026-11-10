'use client'

import React from "react"
import Link from "next/link"
import { WalletLanguage } from "@/config/i18n"
import { ChiaIcon } from "@/components/icons/ChiaIcon"
import { footerTranslations } from "./translations/footer.translations"
import { NodeStatusBadge } from "./NodeStatusBade"

interface UnifiedFooterProps {
  variant?: "public" | "wallet"
  currentLang?: WalletLanguage
}

export function Footer({ variant = "public", currentLang = "en" }: UnifiedFooterProps) {
  const isWallet = variant === "wallet"
  const langPrefix = `/${currentLang}`
  const t = footerTranslations[currentLang]

  // 🟢 ВАРИАНТ 1: РЕЖИМ КОШЕЛЬКА (Wallet)
  if (isWallet) {
    return (
      <footer className="w-full text-center pt-8 flex flex-col items-center gap-3 select-none font-sans text-[10px]">
        <div className="flex items-center justify-center gap-3 w-full border-t border-zinc-900/60 pt-4">
          
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-200 group text-[10px] font-medium tracking-wide uppercase"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current transition-transform duration-200 group-hover:scale-110">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>GitHub</span>
          </a>
          
          <span className="text-zinc-800 text-[10px] select-none">•</span>
          
          <a
            href="https://chia.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors duration-200 group text-[10px] font-medium tracking-wide uppercase"
          >
            <ChiaIcon className="w-5.5 h-5.5 transition-transform duration-200 group-hover:scale-110" />
            <span>Chia.net</span>
          </a>
          
          <span className="text-zinc-800 text-[10px] select-none">•</span>
          
          <NodeStatusBadge />

        </div>
        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest mt-1">
          XCH Ecosystem • Secure Wallet Solution
        </p>
      </footer>
    )
  }

  {/* 🔴 ВАРИАНТ 2: РЕЖИМ ПУБЛИЧНЫЙ (Public) */}
  return (
    <footer className="w-full select-none font-sans text-[10px] mt-12">
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-4 text-left">
        
        {/* БЛОК БРЕНДА */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-black text-xs tracking-tight">
              XCH<span className="text-[#FF2E93]">IA</span>
            </span>
          </div>
          <p className="text-zinc-550 font-medium leading-relaxed max-w-[200px]">
            {t.description}
          </p>
          <div className="flex items-center gap-3 pt-1 text-zinc-650">
            <span className="hover:text-white transition-colors cursor-pointer">Twitter</span>
            <span className="hover:text-white transition-colors cursor-pointer">Discord</span>
          </div>
        </div>

        {/* СЕТКА ССЫЛОК */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
          
          <div className="space-y-2.5">
            <h4 className="font-black text-zinc-400 uppercase tracking-wider text-[9px]">{t.networks}</h4>
            <ul className="space-y-2 font-medium text-zinc-500 font-mono">
              <li>
                <Link href={`${langPrefix}/explorer/mainnet`} className="hover:text-emerald-400 transition-colors">
                  Mainnet
                </Link>
              </li>
              <li>
                <Link href={`${langPrefix}/explorer/testnet11`} className="hover:text-[#FF2E93] transition-colors">
                  Testnet11
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-black text-zinc-400 uppercase tracking-wider text-[9px]">{t.discover}</h4>
            <ul className="space-y-2 font-medium text-zinc-500">
              <li>
                <Link href={`${langPrefix}/explorer`} className="hover:text-white transition-colors">
                  {t.explorer}
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-white transition-colors">
                  {t.wallet}
                </Link>
              </li>
              <li>
                <Link href={`${langPrefix}/nodes/status`} className="hover:text-white transition-colors flex items-center gap-1">
                  {t.status}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-black text-zinc-400 tracking-wider text-[9px] uppercase">{t.resources}</h4>
            <ul className="space-y-2 font-medium text-zinc-500">
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">{t.source}</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">{t.docs}</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between border-t border-zinc-900/30 mt-8 pt-4 gap-4 text-zinc-650 font-medium text-[9px]">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
          <p>Copyright © 2026 - xchia.io | T&C</p>
          
          <span className="text-zinc-800 hidden sm:inline">|</span>
          
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" /></svg>
            <span>GitHub</span>
          </a>

          <a href="https://chia.net" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
            <ChiaIcon className="w-4 h-4" />
            <span>Chia.net</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-zinc-950/20 border border-zinc-900/60 px-3.5 py-2 rounded-xl">
          <NodeStatusBadge overrideNetwork="mainnet" />
          <span className="text-zinc-800 hidden sm:inline select-none">•</span>
          <NodeStatusBadge overrideNetwork="testnet11" />
        </div>

        <p className="font-mono text-zinc-700 hidden md:block">Next.js 16 & React 19</p>
      </div>
    </footer>
  )
}
