import { WalletLanguage } from "@/config/i18n"

export const networkTranslations: Record<WalletLanguage, {
  searchPlaceholder: string; blocksTitle: string; coinsTitle: string;
  blockLabel: string; coinLabel: string; emptyData: string;
  searchBtn: string; ledgerActivity: string;
}> = {
  ru: {
    searchPlaceholder: "Введи адрес (xch1...), высоту блока или Coin ID...",
    blocksTitle: "Последние блоки 🔥",
    coinsTitle: "Свежие монеты 🌱",
    blockLabel: "Блок",
    coinLabel: "Монета ID",
    emptyData: "Синхронизация данных...",
    searchBtn: "Поиск",
    ledgerActivity: "Активность сети"
  },
  en: {
    searchPlaceholder: "Enter address (xch1...), block height or Coin ID...",
    blocksTitle: "Latest Blocks 🔥",
    coinsTitle: "Fresh Coins 🌱",
    blockLabel: "Block",
    coinLabel: "Coin ID",
    emptyData: "Syncing network data...",
    searchBtn: "Search",
    ledgerActivity: "Network Activity"
  }
}
