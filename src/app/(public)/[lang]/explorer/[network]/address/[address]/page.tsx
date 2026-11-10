import React, { Suspense } from "react"
import { Metadata } from "next"
import { AddressExplorerClient } from "./AddressExplorerClient"
import { AddressErrorView } from "./AddressErrorView"
import { validateChiaAddress } from "@/lib/utils/chia-validator"
import { ExplorerBreadcrumbs } from "../../../ExplorerBreadcrumbs"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"
import { addressTranslations } from "./address.translations"

interface PageProps {
  params: Promise<{ lang: string; network: string; address: string }>
  searchParams: Promise<{ page?: string }>
}
export const instant = false 

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang, network, address } = await params, sParams = await searchParams
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en", isRu = currentLang === "ru"
  const safeNet = network || "mainnet", safeAddr = address.trim(), curPage = Number(sParams?.page) || 1
  const t = addressTranslations[currentLang]

  if (!validateChiaAddress(safeAddr, safeNet).isValid) {
    return { title: t.invalidTitle + " | XCHIA", robots: { index: false, follow: true } }
  }
  const shortAddr = `${safeAddr.slice(0, 8)}...${safeAddr.slice(-6)}`
  const pSuffix = curPage > 1 ? (isRu ? ` — Страница ${curPage}` : ` — Page ${curPage}`) : ""
  const title = `${t.seoTitle} ${shortAddr} (${safeNet})${pSuffix} | XCHIA`
  const description = `${t.seoDesc} ${safeAddr} (${safeNet})${pSuffix}`
  const fullPath = `/explorer/${safeNet}/address/${safeAddr}${curPage > 1 ? `?page=${curPage}` : ""}`

  return {
    title, description,
    alternates: { canonical: `https://xchia.io{currentLang}${fullPath}`, languages: { "en": `https://xchia.io{fullPath}`, "ru": `https://xchia.io{fullPath}`, "x-default": `https://xchia.io{fullPath}` } },
    openGraph: { title, description, url: `https://xchia.io{currentLang}${fullPath}`, siteName: "XCHIA Explorer", locale: isRu ? "ru_RU" : "en_US", type: "website" },
    twitter: { card: "summary_large_image", title, description }
  }
}

export default async function AddressExplorerPage({ params, searchParams }: PageProps) {
  const { lang, network, address } = await params, sParams = await searchParams
  const safeNet = network || "mainnet", safeAddr = address.trim(), curPage = Number(sParams?.page) || 1
  const t = addressTranslations[isSupportedLanguage(lang) ? lang : "en"]

  const { isValid, error: addressError } = validateChiaAddress(safeAddr, safeNet)
  if (!isValid) return <AddressErrorView lang={lang} net={safeNet} err={addressError || ""} />

  const dataPromise = (async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/addresses/track-address?puzzleHash=${safeAddr}&network=${safeNet}&page=${curPage}&perPage=10`)
      return res.ok ? await res.json() : null
    } catch { return null }
  })()

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6 flex-1 text-white font-mono">
      <div className="lg:col-span-12 space-y-6 w-full">
        <div className="space-y-1.5 text-left">
          <ExplorerBreadcrumbs items={[{ label: `explorer (${safeNet})`, href: `/${lang}/explorer/${safeNet}` }, { label: "address", isActive: true }]} />
          <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">{t.pageTitle}</h1>
        </div>
        <Suspense fallback={<div className="w-full space-y-4 animate-pulse"><div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 min-h-[300px]" /></div>}>
          <AddressExplorerClient dataPromise={dataPromise} net={safeNet} addr={safeAddr} lang={lang} page={curPage} />
        </Suspense>
      </div>
    </div>
  )
}
