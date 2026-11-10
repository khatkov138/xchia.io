import React, { Suspense } from "react"
import { Metadata } from "next"
import { CoinExplorerClient } from "./CoinExplorerClient"
import { Layers, Cpu, HardDrive } from "lucide-react"
import { ExplorerBreadcrumbs } from "../../../ExplorerBreadcrumbs"
import { isSupportedLanguage, WalletLanguage } from "@/config/i18n"

interface PageProps {
  params: Promise<{ lang: string; network: string; coinId: string }>
}

export const instant = false 

// 📡 Изолированная функция запроса данных монеты для генерации метаданных
async function fetchCoinData(coinId: string, network: string) {
  try {
    const safeCoinId = coinId.startsWith("0x") ? coinId : `0x${coinId}`
    const safeNetwork = network || "mainnet"
    const backendUrl = "http://localhost:3000"
    
    const res = await fetch(
      `${backendUrl}/api/v1/coins/track-coin?coinId=${safeCoinId}&network=${safeNetwork}`,
      { next: { revalidate: 15 } } // Кэш на 15 секунд для актуального статуса SPENT/UNSPENT
    )
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("🔴 API Metadata Proxy Connection Refused:", err)
    return null
  }
}

// 🌐 ДИНАМИЧЕСКИЕ МЕТАДАННЫЕ ДЛЯ СТРАНИЦЫ АУДИТА МОНЕТЫ
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, network, coinId } = await params
  const currentLang: WalletLanguage = isSupportedLanguage(lang) ? lang : "en"
  const isRu = currentLang === "ru"
  
  const coin = await fetchCoinData(coinId, network)
  const shortCoinId = `${coinId.slice(0, 10)}...${coinId.slice(-6)}`
  const safeNetwork = network || "mainnet"

  if (!coin) {
    return {
      title: isRu ? `Аудит монеты ${shortCoinId} | XCHIA Explorer` : `Coin Audit ${shortCoinId} | XCHIA Explorer`,
      robots: { index: false, follow: true }
    }
  }

  const title = isRu
    ? `Аудит монеты Chia ${shortCoinId} (${safeNetwork}) | XCHIA`
    : `Chia Coin Audit ${shortCoinId} (${safeNetwork}) | XCHIA`

  const description = isRu
    ? `Аудит смарт-контракта монеты Chia ID: ${coinId}. Сумма: ${coin.amount_mojo} mojo, статус: ${coin.status}. Сеть: ${safeNetwork}.`
    : `Smart contract audit for Chia coin ID: ${coinId}. Amount: ${coin.amount_mojo} mojo, status: ${coin.status}. Network: ${safeNetwork}.`

  const APP_URL = "https://xchia.io"

  return {
    title,
    description,
    alternates: {
      canonical: `${APP_URL}/${currentLang}/explorer/${safeNetwork}/coin/${coinId}`,
      languages: {
        "en": `${APP_URL}/en/explorer/${safeNetwork}/coin/${coinId}`,
        "ru": `${APP_URL}/ru/explorer/${safeNetwork}/coin/${coinId}`,
        "x-default": `${APP_URL}/en/explorer/${safeNetwork}/coin/${coinId}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/${currentLang}/explorer/${safeNetwork}/coin/${coinId}`,
      siteName: "XCHIA Explorer",
      locale: isRu ? "ru_RU" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function CoinExplorerPage({ params }: PageProps) {
  const { lang, network, coinId } = await params
  const safeNetwork = network || "mainnet"
 
  // Чистый промис запроса — только для получения данных конкретной монеты CoinID
  const dataPromise = (async () => {
    try {
      const safeCoinId = coinId.startsWith("0x") ? coinId : `0x${coinId}`
      const backendUrl = "http://localhost:3000"
      
      // Бьем строго по ID монеты без подмешивания txId
      const res = await fetch(
        `${backendUrl}/api/v1/coins/track-coin?coinId=${safeCoinId}&network=${safeNetwork}`,
      )
      if (!res.ok) {
        console.error(`🔴 Coin Fetch Failed with status: ${res.status}`)
        return null
      }
      return await res.json()
    } catch (err) {
      console.error("🔴 API Proxy Connection Refused on 3000:", err)
      return null
    }
  })()

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-6 flex-1 text-white">
      
      {/* ЛЕВАЯ ЧАСТЬ (7 КОЛОНОК) */}
      <div className="lg:col-span-7 space-y-6 w-full">
        
        {/* Хлебные крошки */}
        <div className="space-y-1.5 text-left">
          <ExplorerBreadcrumbs 
            items={[
              { label: `explorer (${safeNetwork})`, href: `/${lang}/explorer/${safeNetwork}` },
              { label: "coin", isActive: true }
            ]}
          />

          <h1 className="text-2xl font-black tracking-tight text-white pt-0.5">
            Coin Contract Audit
          </h1>
        </div>

        <Suspense fallback={
          <div className="w-full space-y-4 animate-pulse">
            <div className="h-16 w-full bg-zinc-900 border border-zinc-850 rounded-[24px]" />
            <div className="bg-[#0c0c0e] border border-zinc-900 rounded-[24px] p-5 space-y-4 min-h-[300px]">
              <div className="h-10 bg-zinc-900/60 rounded-xl w-full" />
              <div className="h-10 bg-zinc-900/60 rounded-xl w-full" />
              <div className="h-12 bg-zinc-900/40 rounded-xl w-full mt-4" />
            </div>
          </div>
        }>
          <CoinExplorerClient 
            dataPromise={dataPromise}
            paramsPromise={params}
          />
        </Suspense>
      </div>

      {/* ПРАВАЯ ЧАСТЬ (5 КОЛОНОК) */}
      <div className="lg:col-span-5 space-y-4 w-full h-full lg:pt-16">
        
        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-4.5 rounded-[20px] space-y-2 text-left">
          <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Cpu size={14} className="text-[#FF2E93]" /> Что такое Coin ID?
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
            Каждая монета в сети Chia — это уникальный смарт-контракт. Её ID (имя) создаётся детерминированно на основе трёх параметров: ID родительской монеты, Puzzle Hash (хэша скрипта) и суммы в mojo.
          </p>
        </div>

        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-4.5 rounded-[20px] space-y-2 text-left">
          <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-blue-400" /> Состояние монеты
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
            В блокчейне Chia монеты неизменяемы. Монета может находиться либо в состоянии ожидания создания, быть нерасходуемой в блоке (<span className="text-emerald-400 font-bold font-mono">UNSPENT</span>), либо навсегда перейти в статус потраченной (<span className="text-zinc-500 font-bold font-mono">SPENT</span>) после включения в Spend Bundle.
          </p>
        </div>

        <div className="bg-[#0c0c0e]/60 border border-zinc-900 p-4.5 rounded-[20px] space-y-2 text-left">
          <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <HardDrive size={14} className="text-zinc-500" /> Публичный аудит смарт-контракта
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
            Данные запрашиваются напрямую у нод блокчейна Chia. Информация является полностью открытой. Эту страницу можно использовать для проверки того, дошли ли средства на конкретный скрипт-адрес.
          </p>
        </div>

      </div>
      
    </div>
  )
}
