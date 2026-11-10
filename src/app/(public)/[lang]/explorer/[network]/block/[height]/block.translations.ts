import { WalletLanguage } from "@/config/i18n"

export const blockTranslations: Record<WalletLanguage, {
  explorerTitle: string; blockHeight: string; blockHash: string;
  copied: string; copyNumber: string; copyHash: string;
  fee: string; time: string; activity: string; moons: string;
  tabRemovals: string; tabAdditions: string; empty: string;
  bundle: string; notFound: string; pageOverview: string;
}> = {
  ru: {
    explorerTitle: "Chia Block Explorer",
    blockHeight: "Block Height:",
    blockHash: "Block Hash:",
    copied: "Скопировано",
    copyNumber: "Копировать номер",
    copyHash: "Копировать хеш",
    fee: "Комиссия",
    time: "Время (UTC)",
    activity: "Активность Ledger",
    moons: "МОНЕТ",
    tabRemovals: "Сжигания",
    tabAdditions: "Создания",
    empty: "НЕТ МОНЕТ В ДАННОМ РАЗДЕЛЕ",
    bundle: "Бандл",
    notFound: "Блок не найден нодой",
    pageOverview: "Обзор Блока"
  },
  en: {
    explorerTitle: "Chia Block Explorer",
    blockHeight: "Block Height:",
    blockHash: "Block Hash:",
    copied: "Copied",
    copyNumber: "Copy Number",
    copyHash: "Copy Hash",
    fee: "Fees",
    time: "Time (UTC)",
    activity: "Ledger Activity",
    moons: "COINS",
    tabRemovals: "Removals",
    tabAdditions: "Additions",
    empty: "NO COINS IN THIS SECTION",
    bundle: "Bundle",
    notFound: "Block not found by node",
    pageOverview: "Block Overview"
  }
}
