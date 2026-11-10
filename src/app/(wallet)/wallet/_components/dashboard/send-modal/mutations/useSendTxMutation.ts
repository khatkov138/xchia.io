'use client'

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useWalletAuth } from "@/hooks/useWalletAuth"
import { calculateChiaCoinId, signChiaTransaction } from "@/lib/utils/crypto"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useWalletSessionStore } from "@/store/useWalletSessessionStore"
import { useSendModalContext } from "../SendModalContext"

export function useSendTxMutation(sentTransactionsRef: React.MutableRefObject<Set<string>>) {
  const queryClient = useQueryClient()
  const { getMnemonicForSigning } = useWalletAuth()
  const network = useUserSettingsStore((state) => state.network)
  const ctx = useSendModalContext()

  return useMutation({
    mutationKey: ["send-transaction"],
    mutationFn: async () => {
      const { preparedSpendData, pin, localSnapshot } = ctx
      if (!preparedSpendData?.coin_spends || !pin || !localSnapshot) {
        throw new Error("Отсутствуют критические данные для отправки спендов")
      }
      
      const coinSpendsList = preparedSpendData.coin_spends
      for (const item of coinSpendsList) {
        const calculatedId = calculateChiaCoinId(item.coin.parent_coin_info, item.coin.puzzle_hash, item.coin.amount).toLowerCase()
        if (item.message_to_sign_hex.substring(64, 128).toLowerCase() !== calculatedId) throw new Error("Критическая ошибка: Несоответствие Coin ID!")
      }
      if (preparedSpendData.verified_target_address !== localSnapshot.targetAddress) throw new Error("Атака подмены: Целевой адрес изменен!")
      const flatMessagesList = coinSpendsList.map((cs: any) => cs.message_to_sign_hex)
      const transactionFingerprint = flatMessagesList.join("|")
      if (sentTransactionsRef.current.has(transactionFingerprint)) throw new Error("Транзакция уже находится в процессе отправки")
      sentTransactionsRef.current.add(transactionFingerprint)
      const releaseIdempotencyLock = () => sentTransactionsRef.current.delete(transactionFingerprint)

      try {
        ctx.setStatusMessage("🔐 Подписание транзакции...")
        const clearMnemonic = await getMnemonicForSigning(pin)
        const signatures = await Promise.all(coinSpendsList.map((item: any) => signChiaTransaction({ mnemonic: clearMnemonic, walletIndex: Number(item.wallet_index), messageHex: item.message_to_sign_hex, syntheticOffsetHex: item.synthetic_offset_hex })))
        ctx.setStatusMessage("🚀 Отправка в сеть...")
        const res = await fetch("/api/v1/transactions/send-tx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network, signatures_list: signatures, coin_spends: coinSpendsList.map((cs: any) => ({ wallet_index: cs.wallet_index, synthetic_offset_hex: cs.synthetic_offset_hex, coin: cs.coin, puzzle_reveal: cs.puzzle_reveal, solution: cs.solution })), integrity_token: preparedSpendData.integrity_token, messages_signed_hex: flatMessagesList })
        })
        if (!res.ok) throw new Error(`Сбой сетевого узла: Статус ${res.status}`)
        const result = await res.json()
        if (!result.success) throw new Error(result.error || "Транзакция отклонена мемпулом ноды")
        return result
      } catch (error) { releaseIdempotencyLock(); throw error }
    },
       onSuccess: (resData) => {
      ctx.setTxResponseData(resData)
      ctx.setPin("")
      ctx.setStep(3) 

      const txId = resData?.tx_id || "unknown_tx"
      const nowTimestamp = resData?.timestamp || Math.floor(Date.now() / 1000)
      const serverCreatedCoins: any[] = resData?.tracked_info?.created_coins || []
      
      // 🎯 Находим самую жирную монету получателя для правильной детерминированной ссылки в модалке
      const recipientCoins = serverCreatedCoins.filter((c: any) => !c.is_change)
      const targetCoin = recipientCoins.length > 0 
        ? [...recipientCoins].sort((a: any, b: any) => Number(b.amount) - Number(a.amount))[0]
        : (serverCreatedCoins[0] || null)

      const trueTargetCoinId = targetCoin?.coin_id || txId

      // === 🚀 ОПТИМИСТИЧНЫЙ ПУШ СТРОГО В ИСТОРИЮ ТРАНЗАКЦИЙ ===
      const activePk = useWalletSessionStore.getState().unhardenedPkHex
      const activeIndexes = useWalletSessionStore.getState().activeIndexes
      
      // Вычисляем точную строку индексов деривации, чтобы попасть в ключ кэша истории
      const activeIndexesStr = queryClient.getQueryData<any>([
        "xchia-wallet-dashboard", network, activePk, activeIndexes
      ])?.meta?.active_indexes?.join(",") || activeIndexes || "0"

      // Ключ первой страницы пула транзакций, где отображается «Последняя активность»
      const txHistoryQueryKey = ["wallet-transactions-pool", network, activePk, activeIndexesStr, 1]

      queryClient.setQueryData(txHistoryQueryKey, (oldTxData: any) => {
        // Формируем структуру блока-мемпула в точном соответствии с твоим бэкенд-JSON истории
        const optimisticMempoolBlock = {
          block: null, // Важно! Сигнализирует useWalletTransactions пропустить дедупликатор seenBlocks
          ts: nowTimestamp,
          received: [], // Исходящая транзакция — входящие оставляем пустыми
          sent: [
            {
              fee_mojo: resData?.tracked_info?.fee_mojo || 0,
              is_bundle: (resData?.tracked_info?.spent_coins || []).length > 1, // Если входов > 1, то это bundle
              // Мапим абсолютно ВСЕ потраченные монеты бандла из ответа ноды
              spent: (resData?.tracked_info?.spent_coins || []).map((c: any) => ({
                id: String(c.coin_id).toLowerCase(),
                mojo: Number(c.amount || 0),
                addr: c.addr || "txch1...", 
                puzzle_hash: String(c.puzzle_hash).toLowerCase()
              })),
              // Мапим абсолютно ВСЕ созданные монеты бандла (целевые выходы и сдачу)
              created: serverCreatedCoins.map((c: any) => ({
                id: String(c.coin_id).toLowerCase(),
                mojo: Number(c.amount || 0),
                addr: c.addr || "txch1...",
                puzzle_hash: String(c.puzzle_hash).toLowerCase(),
                change: c.is_change === true // Прокидываем честный флаг сдачи для разбора распила в модалке
              }))
            }
          ]
        }

        if (!oldTxData) {
          return {
            total_blocks: 1,
            page: 1,
            per_page: 10,
            history: [optimisticMempoolBlock]
          }
        }

        return {
          ...oldTxData,
          history: [optimisticMempoolBlock, ...(oldTxData.history || [])]
        }
      })
    }

     
  })
}
