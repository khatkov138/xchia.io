import { WalletLanguage } from "@/config/i18n"

export const addressTranslations: Record<WalletLanguage, {
  invalidTitle: string; invalidBadge: string; backToSearch: string;
  pageTitle: string; seoTitle: string; seoDesc: string;
}> = {
  ru: {
    invalidTitle: "Невалидный адрес",
    invalidBadge: "Адрес не валиден",
    backToSearch: "Вернуться в поиск",
    pageTitle: "Обзор Адреса",
    seoTitle: "Обзор адреса Chia",
    seoDesc: "Баланс, транзакции и история изменений для Chia-адреса"
  },
  en: {
    invalidTitle: "Invalid Address",
    invalidBadge: "Address is invalid",
    backToSearch: "Back to Search",
    pageTitle: "Address Overview",
    seoTitle: "Chia Address Overview",
    seoDesc: "Balance, transaction history, and records for Chia address"
  }
}
