import React from "react"

export const landingTranslations = {
  en: {
    badge: "100% OPEN SOURCE & NO DOWNLOADS REQUIRED",
    titlePre: "Secure wallet",
    titleMid: "for Chia (XCH)",
    titlePost: "in your browser",
    description: (
      <>
        Your 24-word seed phrase and private keys <strong className="text-zinc-200 font-bold">are never sent to our server</strong>. 
        Our project is <strong className="text-[#FF2E93] font-bold">fully open-source on GitHub</strong> — everything is completely verifiable and transparent. 
        We only act as a messenger between you and the Chia blockchain.
      </>
    ),
    btnWallet: "Open Web Wallet",
    btnExplorer: "Open Explorer"
  },
  ru: {
    badge: "100% OPEN SOURCE & БЕЗ СКАЧИВАНИЙ",
    titlePre: "Безопасный кошелек",
    titleMid: "для Chia (XCH)",
    titlePost: "в твоем браузере",
    description: (
      <>
        Ваша случайная фраза из 24 слов и ключи <strong className="text-zinc-200 font-bold">никогда не отправляются на наш server</strong>. 
        Наш проект имеет <strong className="text-[#FF2E93] font-bold">полностью открытый исходный код на GitHub</strong> — всё проверяемо и прозрачно. 
        Мы лишь выступаем в роли посыльного между вами и блокчейном Chia.
      </>
    ),
    btnWallet: "Открыть веб-кошелек",
    btnExplorer: "Открыть Explorer"
  }
} as const
