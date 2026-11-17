import { WalletLanguage } from "@/config/i18n"

export const bundleTranslations: Record<WalletLanguage, {
  pageTitle: string
  errorNav: string
  syncBlock: string
  block: string
  findCoin: string
}> = {
  ru: {
    pageTitle: "Spend Bundle Tracker",
    errorNav: "Ошибка навигации параметров бандла.",
    syncBlock: "Синхронизация высоты блока #",
    block: "блок",
    findCoin: "найти монету:"
  },
  en: {
    pageTitle: "Spend Bundle Tracker",
    errorNav: "Bundle parameter navigation error.",
    syncBlock: "Synchronizing block height #",
    block: "block",
    findCoin: "find Coin:"
  }
}
