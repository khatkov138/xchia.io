'use client'
import React from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { ExplorerBreadcrumbs } from "../../../ExplorerBreadcrumbs"
import { addressTranslations } from "./address.translations"
import { WalletLanguage } from "@/config/i18n"

interface ErrorViewProps { lang: string; net: string; err: string }

export function AddressErrorView({ lang, net, err }: ErrorViewProps) {
  const t = addressTranslations[lang as WalletLanguage] || addressTranslations.en
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6 flex-1 text-white font-mono text-[11px]">
      <div className="lg:col-span-12 space-y-6 w-full">
        <div className="space-y-1.5 text-left">
          <ExplorerBreadcrumbs items={[{ label: `explorer (${net})`, href: `/${lang}/explorer/${net}` }, { label: "address", isActive: true }]} />
          <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">{t.pageTitle}</h1>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-[24px] p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
            <AlertTriangle size={24} className="stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">{t.invalidBadge}</h3>
          <p className="text-xs text-zinc-400 max-w-md mt-2 leading-relaxed">{err}</p>
          <div className="mt-5">
            <Link href={`/${lang}/explorer/${net}`} className="px-4 py-2 bg-zinc-950 border border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl transition-all active:scale-95">{t.backToSearch}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
