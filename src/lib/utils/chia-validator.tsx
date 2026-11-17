import { bech32m } from "bech32" // 🚀 Импортируем именно bech32m экспорт!

export function validateChiaAddress(address: string, expectedNetwork: string) {
  const clean = address.trim().toLowerCase()
  const isMainnet = expectedNetwork === "mainnet"
  const expectedHrp = isMainnet ? "xch" : "txch"

  if (isMainnet) {
    if (!clean.startsWith("xch1")) {
      return { isValid: false, error: "В выбранной сети mainnet адрес должен начинаться на xch" }
    }
    if (clean.length !== 62) {
      return { isValid: false, error: `Неверная длина адреса (ожидалось 62, получено ${clean.length})` }
    }
  } else {
    if (!clean.startsWith("txch1")) {
      return { isValid: false, error: "В выбранной сети testnet11 адрес должен начинаться на txch" }
    }
    if (clean.length !== 63) {
      return { isValid: false, error: `Неверная длина адреса (ожидалось 63, получено ${clean.length})` }
    }
  }

  try {
    // 🚀 Используем честный метод decode от bech32m с лимитом длины. 
    // Он вернет стандартный объект { prefix, words }, не ругаясь на константы
    const decoded = bech32m.decode(clean, 100)

    if (decoded.prefix !== expectedHrp) {
      return { 
        isValid: false, 
        error: `Адрес принадлежит другой сети (вы на ${expectedNetwork}, а адрес от ${decoded.prefix})` 
      }
    }

    return { isValid: true, error: null }
  } catch (err: any) {
    return { 
      isValid: false, 
      error: "Ошибка декодирования контрольной суммы Bech32m" 
    }
  }
}
