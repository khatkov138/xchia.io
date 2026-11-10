// types.ts / tx-history-core.ts
// ⚡️ ИЗОЛИРОВАННЫЙ СЛОЙ ДАННЫХ И ХЕЛПЕРОВ ДЛЯ XCHIA.IO

export interface CoinInfo {
  id: string
  mojo: number
  addr: string
  change?: boolean
  puzzle_hash?: string // Прокинули на будущее, если бэк созреет
}

export interface ParsedTx {
  row_key: string
  type: "RECEIVE" | "SENT"
  display_id: string
  mojo: number
  blk: number
  ts: number
  puzzle_hash?: string
  raw_sent?: {
    fee_mojo: number
    is_bundle?: boolean // Железная поддержка совместных транзакций
    spent: CoinInfo[]
    created: CoinInfo[]
  }
}

export interface TxHistoryViewProps {
  historyList: ParsedTx[]
  net: string
  lang: string
  compact?: boolean
}

// 🚀 ШИРОКИЕ, СЛЕНГОВЫЕ ХЕЛПЕРЫ ДЛЯ UI БЕЗ ОБРЕЗАНИЯ СТРОК
export const fMojo = (m: number): string => {
  return (m / 1_000_000_000_000).toFixed(4)
}

export const fHash = (h: string): string => {
  if (!h) return ""
  return `${h.slice(0, 6)}...${h.slice(-6)}`
}

export const fDate = (ts: number): string => {
  if (!ts) return "Только что"
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
