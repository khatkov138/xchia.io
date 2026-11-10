import React from "react"
import { notFound } from "next/navigation"

interface ExplorerNetworkLayoutProps {
  children: React.ReactNode
  params: Promise<{ network: string , lang:string}>
}


export default async function ExplorerNetworkLayout({ children, params }: ExplorerNetworkLayoutProps) {
  const resolvedParams = await params
  const network = resolvedParams?.network
  const currentLang = resolvedParams?.lang;
  // 🛡️ ЖЕСТКИЙ СЕРВЕРНЫЙ ФИЛЬТР: Пропускаем только mainnet и testnet11
  const allowedNetworks = ["mainnet", "testnet11"]

  if (!network || !allowedNetworks.includes(network)) {
    // Если в URL ввели левую дичь — Next.js мгновенно прервет рендер и выдаст 404 страницу
    notFound()
  }

  return <div>
    {/* 🚀 НАТИВНЫЙ РЕКЛАМНЫЙ БАННЕР BINGX ВМЕСТО "123" */}
    {/* 🚀 БАННЕР СТРОГО ПО ШИРИНЕ КОНТЕНТА */}
<div className="w-full mb-6 text-left animate-in fade-in slide-in-from-top-4 duration-500">
  {/* 🎯 Заменили w-full на inline-flex, чтобы блок сжимался по контенту */}
  <div className="relative inline-flex flex-col sm:flex-row items-center justify-start gap-6 bg-[#0c0c0e]/60 border border-zinc-900 rounded-[20px] p-4 pr-5 overflow-hidden backdrop-blur-md max-w-full">
    
    {/* Декоративное неоновое свечение на фоне баннера */}
    <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#FF2E93]/5 blur-3xl pointer-events-none" />
    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#8B5CF6]/5 blur-3xl pointer-events-none" />

    {/* Блок описания оффера */}
    <div className="space-y-0.5 max-w-xl text-left relative z-10">
      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
        {currentLang === 'ru' ? 'Пополняйте Chia (XCH) без ограничений' : 'Deposit Chia (XCH) Instantly'}
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2E93] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF2E93]"></span>
        </span>
      </h4>
      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
        {currentLang === 'ru' 
          ? 'Торгуйте XCH на BingX. Низкие комиссии, высокая ликвидность и быстрый вывод на кошелек.' 
          : 'Trade XCH on BingX with top tier liquidity, ultra-low fees, and fast secure withdrawals to XCHIA.'}
      </p>
    </div>

    {/* Кнопка: стоит вплотную к тексту через gap-6, а сам баннер заканчивается сразу за ней */}
    <a 
      href="/api/deposit" 
      target="_blank" 
      rel="noopener noreferrer nofollow" 
      className="text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#FF2E93] to-[#8B5CF6] hover:from-[#ff40a1] hover:to-[#996ff7] px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 text-center shadow-lg shadow-[#FF2E93]/10 whitespace-nowrap cursor-pointer block w-full sm:w-auto relative z-10"
    >
      {currentLang === 'ru' ? 'Buy XCH →' : 'Claim Offer →'}
    </a>

  </div>
</div>


    {children}

  </div>
}
