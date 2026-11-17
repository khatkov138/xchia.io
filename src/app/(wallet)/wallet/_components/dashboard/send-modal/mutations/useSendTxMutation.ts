'use client'

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useWalletAuth } from "@/hooks/useWalletAuth"
import { calculateChiaCoinId, signChiaTransaction } from "@/lib/utils/crypto"
import { useUserSettingsStore } from "@/providers/UserSettnigsProvider"
import { useSendModalContext } from "../SendModalContext"
import { packageSignedSpendBundle } from "@/lib/utils/chia-bundle-packager"
import { callChiaRpc, ChiaNetwork } from "@/lib/utils/chia-rpc-client"

export function useSendTxMutation(sentTransactionsRef: React.MutableRefObject<Set<string>>) {
  const queryClient = useQueryClient()
  const { getMnemonicForSigning } = useWalletAuth()
  const network = useUserSettingsStore((state) => state.network) as ChiaNetwork
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
        const calculatedId = calculateChiaCoinId(
          item.coin.parent_coin_info,
          item.coin.puzzle_hash,
          item.coin.amount
        ).toLowerCase()
        if (item.message_to_sign_hex.substring(64, 128).toLowerCase() !== calculatedId) {
          throw new Error("Критическая ошибка: Несоответствие Coin ID!")
        }
      }

      if (preparedSpendData.verified_target_address !== localSnapshot.targetAddress) {
        throw new Error("Атака подмены: Целевой адрес изменен!")
      }

      const flatMessagesList = coinSpendsList.map((cs: any) => cs.message_to_sign_hex)
      const transactionFingerprint = flatMessagesList.join("|")
      if (sentTransactionsRef.current.has(transactionFingerprint)) {
        throw new Error("Транзакция уже находится в процессе отправки")
      }

      sentTransactionsRef.current.add(transactionFingerprint)
      const releaseIdempotencyLock = () => sentTransactionsRef.current.delete(transactionFingerprint)

      try {
        ctx.setStatusMessage("🔐 Подписание транзакции...")
        const clearMnemonic = await getMnemonicForSigning(pin)

        const signatures = await Promise.all(
          coinSpendsList.map((item: any) =>
            signChiaTransaction({
              mnemonic: clearMnemonic,
              walletIndex: Number(item.wallet_index),
              messageHex: item.message_to_sign_hex,
              syntheticOffsetHex: item.synthetic_offset_hex,
            })
          )
        )

        ctx.setStatusMessage("⚙️ Упаковка SpendBundle...")
        const { txIdHex, spendBundleJson, trackedInfo } = packageSignedSpendBundle({
          coinSpendsList,
          signaturesList: signatures,
          network,
        })

        ctx.setStatusMessage("🚀 Отправка в сеть...")
        const nodeResponse = await callChiaRpc(network, "push_tx", {
          spend_bundle: spendBundleJson,
        })

        const isSuccess = Boolean(nodeResponse?.success)
        const nodeStatus = String(nodeResponse?.status || "FAILED")

        if (!isSuccess) {
          throw new Error(nodeResponse?.error || "Транзакция отклонена мемпулом ноды")
        }

        return {
          success: true,
          tx_id: txIdHex,
          status: nodeStatus,
          timestamp: Math.floor(Date.now() / 1000),
          tracked_info: trackedInfo,
        }
      } catch (error) {
        releaseIdempotencyLock()
        throw error
      }
    },
    onSuccess: (resData) => {
      ctx.setTxResponseData(resData)
      ctx.setPin("")
      ctx.setStep(3)

      const nowTimestamp = resData.timestamp
      const serverCreatedCoins: any[] = resData?.tracked_info?.created_coins || []

      // Оптимистично добавляем отправленную транзакцию в кэш истории (useWalletTransactions)
      queryClient.setQueriesData(
        { queryKey: ["wallet-transactions-client-v2", network] },
        (oldTxData: any) => {
          const optimisticMempoolBlock = {
            block: null,
            ts: nowTimestamp,
            received: [],
            sent: [
              {
                fee_mojo: resData?.tracked_info?.fee_mojo || 0,
                is_bundle: (resData?.tracked_info?.spent_coins || []).length > 1,
                spent: (resData?.tracked_info?.spent_coins || []).map((c: any) => ({
                  id: String(c.coin_id).toLowerCase(),
                  mojo: Number(c.amount || 0),
                  addr: c.addr || "txch1...",
                  puzzle_hash: String(c.puzzle_hash).toLowerCase(),
                })),
                created: serverCreatedCoins.map((c: any) => ({
                  id: String(c.coin_id).toLowerCase(),
                  mojo: Number(c.amount || 0),
                  addr: c.addr || "txch1...",
                  puzzle_hash: String(c.puzzle_hash).toLowerCase(),
                  change: c.is_change === true,
                })),
              },
            ],
          }


          if (!Array.isArray(oldTxData)) return [optimisticMempoolBlock]
          return [optimisticMempoolBlock, ...oldTxData]
        },

      )
      // Запускаем фоновую пересинхронизацию баланса
      queryClient.invalidateQueries({ queryKey: ["xchia-wallet-dashboard-v2", network] })
    },
    onError: (err: any) => {
      console.error("❌ Ошибка отправки транзакции:", err)
      ctx.setStatusMessage(`❌ Ошибка отправки: ${err?.message || "Неизвестный сбой"}`)
    },

  })
}
